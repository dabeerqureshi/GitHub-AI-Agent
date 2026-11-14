"""Service for GitHub user authentication, profile resolution, and repository discovery."""

import logging
import re
import subprocess
from typing import Any

import httpx
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.repository import RepositoryRecord

logger = logging.getLogger("app.services.github_discovery")


def detect_local_git_repo() -> str | None:
    """Detect repository owner/name from local git remote origin."""
    try:
        url = subprocess.check_output(
            ["git", "config", "--get", "remote.origin.url"],
            text=True,
            timeout=2.0,
        ).strip()
        match = re.search(r"github\.com[:/]([^/]+)/([^/.]+)", url)
        if match:
            return f"{match.group(1)}/{match.group(2)}"
    except Exception:
        pass
    return None


async def fetch_github_user_and_repos(
    token: str, target_repo: str | None = None
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """
    Query GitHub API with the given token to retrieve user profile and all accessible repositories.
    Optimized for high-speed concurrent execution (supports Fine-Grained & classic PATs).
    """
    import asyncio

    clean_token = token.strip()
    headers = {
        "Authorization": f"Bearer {clean_token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "GitHub-AI-Workspace",
    }

    user_data: dict[str, Any] = {}
    raw_repos: list[dict[str, Any]] = []

    # Detect local git repo as immediate fallback target if none provided
    effective_target = target_repo.strip() if target_repo else detect_local_git_repo()

    timeout_cfg = httpx.Timeout(5.0, connect=3.0, read=4.5)

    async with httpx.AsyncClient(timeout=timeout_cfg) as client:
        # Define concurrent fetch tasks
        async def fetch_user() -> dict[str, Any] | None:
            try:
                res = await client.get("https://api.github.com/user", headers=headers)
                if res.status_code == 200:
                    return res.json()
                if res.status_code in (401, 403) and "Bad credentials" in res.text:
                    raise ValueError("Invalid GitHub Personal Access Token (Bad credentials). Please check your token.")
            except ValueError:
                raise
            except Exception as e:
                logger.debug("Fetch user profile soft error: %s", e)
            return None

        async def fetch_repos() -> list[dict[str, Any]]:
            try:
                res = await client.get(
                    "https://api.github.com/user/repos?per_page=100&sort=updated",
                    headers=headers,
                )
                if res.status_code == 200:
                    data = res.json()
                    if isinstance(data, list):
                        return data
            except Exception as e:
                logger.debug("Fetch user repos soft error: %s", e)
            return []

        async def fetch_target(target: str) -> dict[str, Any] | None:
            if "/" not in target:
                return None
            try:
                res = await client.get(f"https://api.github.com/repos/{target}", headers=headers)
                if res.status_code == 200:
                    return res.json()
            except Exception as e:
                logger.debug("Fetch target repo soft error: %s", e)
            return None

        # Execute requests in parallel
        tasks = [fetch_user(), fetch_repos()]
        if effective_target:
            tasks.append(fetch_target(effective_target))

        results = await asyncio.gather(*tasks, return_exceptions=True)

        user_result = results[0]
        if isinstance(user_result, Exception):
            raise user_result
        if isinstance(user_result, dict):
            user_data = user_result

        repos_result = results[1]
        if isinstance(repos_result, list):
            raw_repos.extend(repos_result)

        if len(results) > 2:
            target_result = results[2]
            if isinstance(target_result, dict) and target_result.get("full_name"):
                if not any(r.get("full_name") == target_result["full_name"] for r in raw_repos):
                    raw_repos.append(target_result)

        # Fallback profile inference for Fine-Grained PATs (which often omit /user permissions)
        if not user_data or user_data.get("login") in ("github-user", "unknown", None):
            if raw_repos:
                first_owner = raw_repos[0].get("owner", {}).get("login")
                if first_owner:
                    user_data = {
                        "login": first_owner,
                        "name": first_owner,
                        "avatar_url": raw_repos[0].get("owner", {}).get("avatar_url"),
                        "html_url": f"https://github.com/{first_owner}",
                    }
            elif effective_target and "/" in effective_target:
                owner = effective_target.split("/")[0]
                user_data = {
                    "login": owner,
                    "name": owner,
                    "html_url": f"https://github.com/{owner}",
                }
            else:
                user_data = {
                    "login": "github-user",
                    "name": "Authenticated Developer",
                }

    return user_data, raw_repos


async def sync_repositories_to_db(
    db: AsyncSession, raw_repos: list[dict[str, Any]]
) -> int:
    """Upsert discovered repositories into the database."""
    # Only remove dummy repository if real repos exist to sync
    if raw_repos:
        await db.execute(
            delete(RepositoryRecord).where(RepositoryRecord.full_name == "octocat/Hello-World")
        )

    synced_count = 0
    seen_full_names: set[str] = set()
    local_repo = detect_local_git_repo()

    for r in raw_repos:
        if not isinstance(r, dict):
            continue
        full_name = r.get("full_name")
        if not full_name or full_name in seen_full_names or full_name == "octocat/Hello-World":
            continue
        seen_full_names.add(full_name)

        owner = r.get("owner", {}).get("login", full_name.split("/")[0])
        name = r.get("name", full_name.split("/")[-1])
        default_branch = r.get("default_branch", "main")
        is_private = bool(r.get("private", False))
        description = r.get("description")

        existing = await db.execute(
            select(RepositoryRecord).where(RepositoryRecord.full_name == full_name)
        )
        repo = existing.scalar_one_or_none()
        if not repo:
            repo = RepositoryRecord(
                full_name=full_name,
                owner=owner,
                name=name,
                description=description,
                default_branch=default_branch,
                is_private=is_private,
                is_cloned=bool(local_repo and local_repo.lower() == full_name.lower()),
            )
            db.add(repo)
        else:
            repo.description = description
            repo.default_branch = default_branch
            repo.is_private = is_private
            if local_repo and local_repo.lower() == full_name.lower():
                repo.is_cloned = True

        synced_count += 1

    await db.commit()
    return synced_count
