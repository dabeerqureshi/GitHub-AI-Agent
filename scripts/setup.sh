#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "=========================================================="
echo " GitHub AI Workspace Automated Environment Setup          "
echo "=========================================================="

cd "${ROOT_DIR}"

# 1. Check prerequisites
echo "Checking prerequisites..."
command -v python3 >/dev/null 2>&1 || { echo "Error: Python 3.12+ is required." >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Error: Node.js 18+ is required." >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "Error: npm is required." >&2; exit 1; }

# 2. Setup environment variables
if [ ! -f "${ROOT_DIR}/.env" ]; then
    echo "Creating .env from .env.example..."
    cp "${ROOT_DIR}/.env.example" "${ROOT_DIR}/.env"
fi

# 3. Create storage directories
echo "Creating storage directories..."
mkdir -p "${ROOT_DIR}/backend/storage/workspaces"
mkdir -p "${ROOT_DIR}/backend/storage/backups"

# 4. Backend Python environment
echo "Setting up Python virtual environment..."
if [ ! -d "${ROOT_DIR}/backend/.venv" ]; then
    python3 -m venv "${ROOT_DIR}/backend/.venv"
fi

echo "Installing backend dependencies..."
"${ROOT_DIR}/backend/.venv/bin/pip" install --upgrade pip
"${ROOT_DIR}/backend/.venv/bin/pip" install -r "${ROOT_DIR}/backend/requirements.txt"

# 5. Database migrations
echo "Applying database schema migrations..."
(cd "${ROOT_DIR}/backend" && "${ROOT_DIR}/backend/.venv/bin/alembic" upgrade head)

# 6. Frontend installation
echo "Installing frontend dependencies..."
(cd "${ROOT_DIR}/frontend" && npm install)

# 7. Make scripts executable
chmod +x "${SCRIPT_DIR}"/*.sh "${SCRIPT_DIR}"/*.py

echo ""
echo "=========================================================="
echo " Setup complete! To start the workspace:                  "
echo "                                                          "
echo " Backend: cd backend && .venv/bin/uvicorn app.main:app    "
echo " Frontend: cd frontend && npm run dev                     "
echo "=========================================================="
