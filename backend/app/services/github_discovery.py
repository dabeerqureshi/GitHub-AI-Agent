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
    Supports Fine-Grained Personal Access Tokens (PATs) and classic PATs.
    """
    clean_token = token.strip()
    headers = {
        "Authorization": f"Bearer {clean_token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "GitHub-AI-Workspace",
    }

    user_data: dict[str, Any] = {}
    raw_repos: list[dict[str, Any]] = []

    async with httpx.AsyncClient(timeout=15.0) as client:
        # 1. Fetch user profile
        try:
            user_res = await client.get("https://api.github.com/user", headers=headers)
            if user_res.status_code == 200:
                user_data = user_res.json()
            elif user_res.status_code in (401, 403) and "Bad credentials" in user_res.text:
                raise ValueError("Invalid GitHub Personal Access Token (Bad credentials). Please check your token.")
            else:
                user_data = {"login": "github-user", "name": "Authenticated Developer"}
        except (httpx.RequestError, httpx.TimeoutException) as exc:
            logger.warning("Could not reach GitHub /user endpoint: %s", str(exc))
            user_data = {"login": "github-user", "name": "Authenticated Developer (Offline Mode)"}

        # 2. Fetch accessible user repositories
        try:
            repos_res = await client.get(
                "https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member",
                headers=headers,
            )
            if repos_res.status_code == 200:
                items = repos_res.json()
                if isinstance(items, list):
                    raw_repos.extend(items)
            else:
                repos_res_alt = await client.get(
                    "https://api.github.com/user/repos?per_page=100&sort=updated",
                    headers=headers,
                )
                if repos_res_alt.status_code == 200:
                    items = repos_res_alt.json()
                    if isinstance(items, list):
                        raw_repos.extend(items)
        except Exception as exc:
            logger.warning("Error fetching /user/repos: %s", str(exc))

        # 3. If login is known, query /users/{login}/repos for public/accessible repos
        login = user_data.get("login")
        if login and login not in ("github-user", "unknown"):
            try:
                user_public_repos_res = await client.get(
                    f"https://api.github.com/users/{login}/repos?per_page=100&sort=updated",
                    headers=headers,
                )
                if user_public_repos_res.status_code == 200:
                    items = user_public_repos_res.json()
                    if isinstance(items, list):
                        raw_repos.extend(items)
            except Exception as exc:
                logger.warning("Error fetching /users/%s/repos: %s", login, str(exc))

        # 4. If target_repo specified in payload, fetch directly
        if target_repo:
            target = target_repo.strip()
            if "/" in target:
                try:
                    target_res = await client.get(f"https://api.github.com/repos/{target}", headers=headers)
                    if target_res.status_code == 200:
                        raw_repos.append(target_res.json())
                except Exception:
                    pass

        # 5. Fallback identity if login is still generic
        if user_data.get("login") in ("github-user", "unknown") and raw_repos:
            first_owner = raw_repos[0].get("owner", {}).get("login")
            if first_owner:
                user_data["login"] = first_owner
                user_data["name"] = first_owner
                user_data["avatar_url"] = raw_repos[0].get("owner", {}).get("avatar_url")
                user_data["html_url"] = f"https://github.com/{first_owner}"

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
