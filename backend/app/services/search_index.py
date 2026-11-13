"""Pluggable code search and symbol indexing layer."""

import re
from abc import ABC, abstractmethod

from app.schemas.intelligence import SearchResultItem


class BaseSearchIndexer(ABC):
    """Abstract interface for repository search indexing."""

    @abstractmethod
    def index_repository_files(self, repo_id: str, files: dict[str, str]) -> None:
        """Index a collection of file paths and their contents."""
        pass

    @abstractmethod
    def search(self, repo_id: str, query: str, limit: int = 50) -> list[SearchResultItem]:
        """Search repository files for matching query."""
        pass


class LocalSymbolSearchIndexer(BaseSearchIndexer):
    """In-memory symbol and token indexer for fast local repository search."""

    def __init__(self):
        # repo_id -> file_path -> list of (line_no, line_content)
        self._index: dict[str, dict[str, list[tuple[int, str]]]] = {}

    def index_repository_files(self, repo_id: str, files: dict[str, str]) -> None:
        """Parse files into indexed lines."""
        repo_data: dict[str, list[tuple[int, str]]] = {}
        for file_path, content in files.items():
            lines = content.splitlines()
            indexed_lines = [(i + 1, line) for i, line in enumerate(lines)]
            repo_data[file_path] = indexed_lines
        self._index[repo_id] = repo_data

    def search(self, repo_id: str, query: str, limit: int = 50) -> list[SearchResultItem]:
        """Perform case-insensitive code search returning line numbers and citations."""
        results: list[SearchResultItem] = []
        if repo_id not in self._index or not query.strip():
            return results

        pattern = re.compile(re.escape(query.strip()), re.IGNORECASE)
        repo_files = self._index[repo_id]

        for file_path, lines in repo_files.items():
            for line_no, line_content in lines:
                if pattern.search(line_content):
                    results.append(
                        SearchResultItem(
                            path=file_path,
                            line_number=line_no,
                            line_content=line_content.strip(),
                            matched_term=query,
                            citation=f"[{file_path}#L{line_no}]",
                        )
                    )
                    if len(results) >= limit:
                        return results

        return results
