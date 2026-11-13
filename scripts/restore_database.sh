#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [ $# -lt 1 ]; then
    echo "Usage: $0 <path_to_backup.db.bak> [target_db_path]"
    echo ""
    echo "Available backups in storage/backups/:"
    ls -lht "${ROOT_DIR}/backend/storage/backups/"*.db.bak 2>/dev/null || echo "No backups found."
    exit 1
fi

BACKUP_FILE="$1"
TARGET_DB="${2:-"${ROOT_DIR}/backend/storage/github_agent.db"}"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "Error: Backup file '${BACKUP_FILE}' does not exist." >&2
    exit 1
fi

echo "=========================================================="
echo " Restoring GitHub AI Workspace Database                   "
echo "=========================================================="
echo "Backup File: ${BACKUP_FILE}"
echo "Target DB:   ${TARGET_DB}"

# Verify backup integrity using sqlite3
echo "Verifying backup file integrity..."
sqlite3 "${BACKUP_FILE}" "PRAGMA integrity_check;" | grep -q "ok" || {
    echo "Error: Backup file failed SQLite integrity check!" >&2
    exit 1
}

# If target DB exists, archive it first
if [ -f "${TARGET_DB}" ]; then
    PRE_RESTORE_ARCHIVE="${TARGET_DB}.pre_restore_$(date +%s)"
    echo "Archiving current DB to ${PRE_RESTORE_ARCHIVE}..."
    cp "${TARGET_DB}" "${PRE_RESTORE_ARCHIVE}"
    rm -f "${TARGET_DB}-wal" "${TARGET_DB}-shm"
fi

# Copy backup to target DB
echo "Restoring database..."
cp "${BACKUP_FILE}" "${TARGET_DB}"

# Enable WAL and verify restored database
sqlite3 "${TARGET_DB}" "PRAGMA journal_mode=WAL; PRAGMA integrity_check;" | grep -q "ok" || {
    echo "Error: Restored database failed post-restore integrity check!" >&2
    exit 1
}

echo "Database restore completed successfully and verified."
