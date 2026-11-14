#!/usr/bin/env bash
# ==============================================================================
# GitHub AI Workspace - Enterprise Lifecycle Manager
# Starts and stops frontend (Next.js) & backend (FastAPI) from repository root.
# ==============================================================================

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="${ROOT_DIR}/.pids"
LOG_DIR="${ROOT_DIR}/logs"
BACKEND_PID_FILE="${PID_DIR}/backend.pid"
FRONTEND_PID_FILE="${PID_DIR}/frontend.pid"
BACKEND_LOG="${LOG_DIR}/backend.log"
FRONTEND_LOG="${LOG_DIR}/frontend.log"

# Colors for terminal output
BOLD="\033[1m"
GREEN="\033[32m"
BLUE="\033[34m"
YELLOW="\033[33m"
RED="\033[31m"
RESET="\033[0m"

mkdir -p "${PID_DIR}" "${LOG_DIR}"

is_running() {
  local pid=$1
  if [ -n "${pid}" ] && kill -0 "${pid}" 2>/dev/null; then
    return 0
  fi
  return 1
}

kill_process_tree() {
  local pid=$1
  if [ -n "${pid}" ] && is_running "${pid}"; then
    python3 -c "
import os, signal, sys
pid = int(sys.argv[1])
try:
    pgid = os.getpgid(pid)
    os.killpg(pgid, signal.SIGTERM)
except Exception:
    try:
        os.kill(pid, signal.SIGTERM)
    except Exception:
        pass
" "${pid}" 2>/dev/null || true
    sleep 1
    if is_running "${pid}"; then
      python3 -c "
import os, signal, sys
pid = int(sys.argv[1])
try:
    pgid = os.getpgid(pid)
    os.killpg(pgid, signal.SIGKILL)
except Exception:
    try:
        os.kill(pid, signal.SIGKILL)
    except Exception:
        pass
" "${pid}" 2>/dev/null || true
    fi
  fi
}

kill_port_process() {
  local port=$1
  local pids
  pids=$(lsof -ti:"${port}" 2>/dev/null || true)
  if [ -n "${pids}" ]; then
    for p in ${pids}; do
      echo -e "${YELLOW}  [!] Cleaning up lingering process ${p} on port ${port}...${RESET}"
      kill -TERM "${p}" 2>/dev/null || true
      sleep 0.5
      kill -9 "${p}" 2>/dev/null || true
    done
  fi
}

start_services() {
  echo -e "\n${BOLD}${BLUE}=== Starting GitHub AI Workspace ===${RESET}\n"

  # 1. Check Python virtual environment
  if [ ! -f "${ROOT_DIR}/backend/.venv/bin/uvicorn" ]; then
    echo -e "${RED}[Error] Backend virtual environment not found in backend/.venv${RESET}"
    echo -e "${YELLOW}Please run 'make install' first.${RESET}"
    exit 1
  fi

  # 2. Check Node modules
  if [ ! -d "${ROOT_DIR}/frontend/node_modules" ]; then
    echo -e "${RED}[Error] Frontend node_modules not found in frontend/${RESET}"
    echo -e "${YELLOW}Please run 'cd frontend && npm install' first.${RESET}"
    exit 1
  fi

  # 3. Clean up any stale instances or ports
  if [ -f "${BACKEND_PID_FILE}" ]; then
    local old_bpid
    old_bpid=$(cat "${BACKEND_PID_FILE}")
    if is_running "${old_bpid}"; then
      echo -e "${YELLOW}[!] Stopping existing backend process (${old_bpid})...${RESET}"
      kill_process_tree "${old_bpid}"
    fi
    rm -f "${BACKEND_PID_FILE}"
  fi
  kill_port_process 8000

  if [ -f "${FRONTEND_PID_FILE}" ]; then
    local old_fpid
    old_fpid=$(cat "${FRONTEND_PID_FILE}")
    if is_running "${old_fpid}"; then
      echo -e "${YELLOW}[!] Stopping existing frontend process (${old_fpid})...${RESET}"
      kill_process_tree "${old_fpid}"
    fi
    rm -f "${FRONTEND_PID_FILE}"
  fi
  kill_port_process 3000

  # 4. Start Backend Server (Detached process session)
  echo -e "${BLUE}[1/2] Starting Backend API (FastAPI / Uvicorn)...${RESET}"
  python3 -c "
import subprocess, os
with open('${BACKEND_LOG}', 'a') as f:
    env = os.environ.copy()
    env['PYTHONPATH'] = '${ROOT_DIR}/backend'
    p = subprocess.Popen(
        ['${ROOT_DIR}/backend/.venv/bin/uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', '8000'],
        cwd='${ROOT_DIR}/backend',
        env=env,
        stdout=f,
        stderr=f,
        start_new_session=True
    )
    with open('${BACKEND_PID_FILE}', 'w') as pid_f:
        pid_f.write(str(p.pid))
"
  BACKEND_PID=$(cat "${BACKEND_PID_FILE}")
  echo -e "      Backend PID: ${BOLD}${BACKEND_PID}${RESET} | Logs: ${BACKEND_LOG}"

  # 5. Start Frontend Server (Detached process session)
  echo -e "${BLUE}[2/2] Starting Frontend App (Next.js)...${RESET}"
  python3 -c "
import subprocess
with open('${FRONTEND_LOG}', 'a') as f:
    p = subprocess.Popen(
        ['npm', 'run', 'dev'],
        cwd='${ROOT_DIR}/frontend',
        stdout=f,
        stderr=f,
        start_new_session=True
    )
    with open('${FRONTEND_PID_FILE}', 'w') as pid_f:
        pid_f.write(str(p.pid))
"
  FRONTEND_PID=$(cat "${FRONTEND_PID_FILE}")
  echo -e "      Frontend PID: ${BOLD}${FRONTEND_PID}${RESET} | Logs: ${FRONTEND_LOG}"

  # 6. Verify Health Readiness
  echo -e "\n${BLUE}Verifying service readiness...${RESET}"
  local backend_ready=false
  local frontend_ready=false

  for i in {1..20}; do
    if ! "${backend_ready}" && curl -s http://localhost:8000/api/v1/healthz >/dev/null 2>&1; then
      backend_ready=true
      echo -e "  ${GREEN}✓ Backend is healthy on port 8000${RESET}"
    fi

    if ! "${frontend_ready}" && curl -sI http://localhost:3000 >/dev/null 2>&1; then
      frontend_ready=true
      echo -e "  ${GREEN}✓ Frontend is ready on port 3000${RESET}"
    fi

    if "${backend_ready}" && "${frontend_ready}"; then
      break
    fi
    sleep 1
  done

  echo -e "\n${BOLD}${GREEN}====================================================${RESET}"
  echo -e "${BOLD}${GREEN}  GitHub AI Workspace is RUNNING!${RESET}"
  echo -e "${BOLD}${GREEN}====================================================${RESET}"
  echo -e "  ${BOLD}Frontend Web App:${RESET}    ${BLUE}http://localhost:3000${RESET}"
  echo -e "  ${BOLD}Backend API Docs:${RESET}    ${BLUE}http://localhost:8000/docs${RESET}"
  echo -e "  ${BOLD}Health Endpoint:${RESET}     ${BLUE}http://localhost:8000/api/v1/health${RESET}"
  echo -e "  ${BOLD}Stop Command:${RESET}        ${YELLOW}./manage.sh stop${RESET} (or ./stop.sh)"
  echo -e "  ${BOLD}Logs Command:${RESET}        ${YELLOW}./manage.sh logs${RESET}"
  echo -e "${BOLD}${GREEN}====================================================${RESET}\n"
}

stop_services() {
  echo -e "\n${BOLD}${YELLOW}=== Stopping GitHub AI Workspace ===${RESET}\n"

  # Stop Backend
  if [ -f "${BACKEND_PID_FILE}" ]; then
    local bpid
    bpid=$(cat "${BACKEND_PID_FILE}")
    if is_running "${bpid}"; then
      echo -e "Stopping Backend (PID: ${bpid})..."
      kill_process_tree "${bpid}"
      echo -e "  ${GREEN}✓ Backend stopped.${RESET}"
    else
      echo -e "  ${YELLOW}Backend PID file present but process not running.${RESET}"
    fi
    rm -f "${BACKEND_PID_FILE}"
  fi
  kill_port_process 8000

  # Stop Frontend
  if [ -f "${FRONTEND_PID_FILE}" ]; then
    local fpid
    fpid=$(cat "${FRONTEND_PID_FILE}")
    if is_running "${fpid}"; then
      echo -e "Stopping Frontend (PID: ${fpid})..."
      kill_process_tree "${fpid}"
      echo -e "  ${GREEN}✓ Frontend stopped.${RESET}"
    else
      echo -e "  ${YELLOW}Frontend PID file present but process not running.${RESET}"
    fi
    rm -f "${FRONTEND_PID_FILE}"
  fi
  kill_port_process 3000

  echo -e "\n${BOLD}${GREEN}✓ All services have been stopped successfully.${RESET}\n"
}

status_services() {
  echo -e "\n${BOLD}${BLUE}=== Service Status ===${RESET}\n"

  local backend_running=false
  local frontend_running=false

  if [ -f "${BACKEND_PID_FILE}" ]; then
    local bpid
    bpid=$(cat "${BACKEND_PID_FILE}")
    if is_running "${bpid}"; then
      backend_running=true
      echo -e "  Backend:  ${GREEN}RUNNING${RESET} (PID: ${bpid}, Port: 8000)"
    fi
  fi
  if ! "${backend_running}"; then
    local b_port_pid
    b_port_pid=$(lsof -ti:8000 2>/dev/null || true)
    if [ -n "${b_port_pid}" ]; then
      echo -e "  Backend:  ${GREEN}RUNNING on port 8000${RESET} (External PID: ${b_port_pid})"
    else
      echo -e "  Backend:  ${RED}STOPPED${RESET}"
    fi
  fi

  if [ -f "${FRONTEND_PID_FILE}" ]; then
    local fpid
    fpid=$(cat "${FRONTEND_PID_FILE}")
    if is_running "${fpid}"; then
      frontend_running=true
      echo -e "  Frontend: ${GREEN}RUNNING${RESET} (PID: ${fpid}, Port: 3000)"
    fi
  fi
  if ! "${frontend_running}"; then
    local f_port_pid
    f_port_pid=$(lsof -ti:3000 2>/dev/null || true)
    if [ -n "${f_port_pid}" ]; then
      echo -e "  Frontend: ${GREEN}RUNNING on port 3000${RESET} (External PID: ${f_port_pid})"
    else
      echo -e "  Frontend: ${RED}STOPPED${RESET}"
    fi
  fi

  echo ""
}

show_logs() {
  local target=${1:-"all"}
  if [ "${target}" = "backend" ]; then
    echo -e "${BLUE}Tailing backend log (${BACKEND_LOG})... (Ctrl+C to exit)${RESET}"
    tail -f "${BACKEND_LOG}"
  elif [ "${target}" = "frontend" ]; then
    echo -e "${BLUE}Tailing frontend log (${FRONTEND_LOG})... (Ctrl+C to exit)${RESET}"
    tail -f "${FRONTEND_LOG}"
  else
    echo -e "${BLUE}Showing last 20 lines of logs:${RESET}\n"
    echo -e "${BOLD}--- Backend Log (${BACKEND_LOG}) ---${RESET}"
    tail -n 20 "${BACKEND_LOG}" 2>/dev/null || echo "(no logs yet)"
    echo -e "\n${BOLD}--- Frontend Log (${FRONTEND_LOG}) ---${RESET}"
    tail -n 20 "${FRONTEND_LOG}" 2>/dev/null || echo "(no logs yet)"
  fi
}

case "$1" in
  start)
    start_services
    ;;
  stop)
    stop_services
    ;;
  restart)
    stop_services
    sleep 1
    start_services
    ;;
  status)
    status_services
    ;;
  logs)
    show_logs "$2"
    ;;
  *)
    echo -e "${BOLD}Usage:${RESET} $0 {start|stop|restart|status|logs [backend|frontend]}"
    exit 1
    ;;
esac
