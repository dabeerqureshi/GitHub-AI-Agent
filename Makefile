.PHONY: install start stop restart status dev-backend dev-frontend test lint format clean

VENV := backend/.venv
PYTHON := $(VENV)/bin/python
PIP := $(VENV)/bin/pip
RUFF := $(VENV)/bin/ruff
PYTEST := $(VENV)/bin/pytest

start:
	./manage.sh start

stop:
	./manage.sh stop

restart:
	./manage.sh restart

status:
	./manage.sh status

install:
	@echo "Setting up Python 3.12 virtual environment..."
	/opt/homebrew/bin/python3.12 -m venv $(VENV)
	$(PIP) install --upgrade pip
	$(PIP) install -r backend/requirements.txt -r backend/requirements-dev.txt
	@echo "Installing frontend dependencies..."
	cd frontend && npm install

dev-backend:
	cd backend && $(PYTHON) -m uvicorn app.main:app --reload --port 8000 --host 0.0.0.0

dev-frontend:
	cd frontend && npm run dev

test-backend:
	cd backend && $(PYTEST) tests/ -v

test-frontend:
	cd frontend && npm run test

test: test-backend test-frontend

lint-backend:
	$(RUFF) check backend/ scripts/
	$(RUFF) format --check backend/ scripts/

lint-frontend:
	cd frontend && npm run lint

lint: lint-backend lint-frontend

format:
	$(RUFF) format backend/ scripts/
	cd frontend && npm run format || true

backup:
	./scripts/backup_database.sh

verify:
	./scripts/verify_deployment.sh

docker-prod:
	docker compose -f docker-compose.prod.yml up --build -d

docker-prod-down:
	docker compose -f docker-compose.prod.yml down

clean:
	rm -rf $(VENV) frontend/node_modules frontend/.next
