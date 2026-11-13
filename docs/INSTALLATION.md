# Installation & Setup Guide — GitHub AI Workspace

This guide provides end-to-end instructions for deploying GitHub AI Workspace locally and in containerized production environments.

---

## 1. Prerequisites

Ensure your host system meets the following minimum requirements:

| Component | Minimum Version | Recommended Version |
|---|---|---|
| **Python** | 3.12+ | 3.12.x |
| **Node.js** | 18.17+ | 20.x or 22.x LTS |
| **npm** | 9.x+ | 10.x+ |
| **Git** | 2.38+ (Worktree support) | Latest |
| **Ollama** (for local AI) | 0.3.0+ | Latest |
| **Docker & Docker Compose** (optional) | 24.x+ | Latest |

---

## 2. Automated One-Click Setup

For macOS and Linux environments, use the provided automated setup script:

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

The script will:
1. Validate required runtimes (`python3`, `node`, `npm`, `git`).
2. Generate `.env` from `.env.example` if not already present.
3. Create local storage directories (`backend/storage/workspaces`, `backend/storage/backups`).
4. Establish the Python 3.12 virtual environment and install all dependencies.
5. Apply Alembic database migrations to the SQLite database.
6. Install frontend Next.js packages.
7. Configure executable permissions for management utilities.

---

## 3. Manual Step-by-Step Installation

### Step A: Clone Repository & Configure Environment

```bash
git clone https://github.com/your-org/github-ai-workspace.git
cd github-ai-workspace

cp .env.example .env
```

Edit `.env` to configure your settings:
- **`SECRET_KEY`**: Set a random high-entropy string (minimum 32 characters).
- **`GITHUB_PERSONAL_ACCESS_TOKEN`**: A fine-grained GitHub token with `Contents: Read/Write`, `Issues: Read/Write`, `Pull requests: Read/Write`, and `Actions: Read/Write` (or classic PAT with `repo` scope).

### Step B: Setup Local AI Provider (Ollama)

GitHub AI Workspace defaults to 100% local operation without requiring any cloud API credentials.

1. Install Ollama:
   - **macOS / Linux**: `curl -fsSL https://ollama.com/install.sh | sh`
   - **Windows**: Download installer from [ollama.com](https://ollama.com)

2. Pull the recommended coding model:
   ```bash
   ollama pull qwen2.5-coder:7b
   ```

3. Ensure Ollama is running:
   ```bash
   ollama serve
   ```

*(Optional)* If you wish to use cloud models:
- Set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` in `.env`.
- Explicitly set `ALLOW_CLOUD_CODE_ANALYSIS=true` if you permit transmission of code to cloud providers.

### Step C: Setup Backend

```bash
cd backend

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Create storage directory and run database migrations
mkdir -p storage/workspaces storage/backups
alembic upgrade head

# Start backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Verify backend health:
```bash
curl http://localhost:8000/healthz
curl http://localhost:8000/readyz
```

### Step D: Setup Frontend

In a separate terminal:

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 4. Production Deployment with Docker Compose

For a reproducible production environment:

1. Copy the production environment template:
   ```bash
   cp .env.production.example .env.production
   ```

2. Build and launch containers:
   ```bash
   docker compose -f docker-compose.prod.yml up --build -d
   ```

3. Verify container health:
   ```bash
   docker compose -f docker-compose.prod.yml ps
   ./scripts/verify_deployment.sh http://localhost:8000 http://localhost:3000
   ```

4. View logs:
   ```bash
   docker compose -f docker-compose.prod.yml logs -f
   ```

5. Stop containers:
   ```bash
   docker compose -f docker-compose.prod.yml down
   ```

---

## 5. Database Backup and Maintenance

### Automated Online Hot Backup

The SQLite database operates in WAL mode (`PRAGMA journal_mode=WAL`). Online hot backups can be taken without locking or stopping the application:

```bash
./scripts/backup_database.sh
```

Backups are saved to `backend/storage/backups/github_agent_YYYYMMDD_HHMMSS.db.bak`.

### Restoring a Backup

```bash
./scripts/restore_database.sh backend/storage/backups/github_agent_20261113_213848.db.bak
```

The restore script automatically archives the existing database before replacing it and runs a full SQLite integrity verification.
