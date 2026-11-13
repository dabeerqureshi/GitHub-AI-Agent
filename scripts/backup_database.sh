#!/usr/bin/env bash
set -euo pipefail

# Directory discovery
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

DB_PATH="${1:-"${ROOT_DIR}/backend/storage/github_agent.db"}"
BACKUP_DIR="${2:-"${ROOT_DIR}/backend/storage/backups"}"

echo "=========================================================="
echo " Starting GitHub AI Workspace SQLite Online Hot Backup    "
echo "=========================================================="
echo "Source DB:   ${DB_PATH}"
echo "Backup Dir:  ${BACKUP_DIR}"

mkdir -p "${BACKUP_DIR}"

PYTHON_BIN="python3"
if [ -x "${ROOT_DIR}/backend/.venv/bin/python" ]; then
    PYTHON_BIN="${ROOT_DIR}/backend/.venv/bin/python"
elif command -v python3.12 >/dev/null 2>&1; then
    PYTHON_BIN="python3.12"
fi

"${PYTHON_BIN}" "${SCRIPT_DIR}/backup_db.py" --db-path "${DB_PATH}" --output-dir "${BACKUP_DIR}"
