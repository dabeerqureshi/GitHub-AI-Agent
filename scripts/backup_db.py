#!/usr/bin/env python3
"""Online hot backup utility for SQLite database with WAL checkpointing and integrity verification."""

import argparse
import logging
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

# Add backend to path to allow importing app config
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from app.core.config import DEFAULT_DB_PATH

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger("backup")


def backup_database(db_path: Path, output_dir: Path) -> Path:
    """Execute an online hot backup of the SQLite database."""
    if not db_path.exists():
        raise FileNotFoundError(f"Source database file not found at: {db_path}")

    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    backup_filename = f"{db_path.stem}_{timestamp}.db.bak"
    target_path = output_dir / backup_filename

    logger.info("Opening connection to source database: %s", db_path)
    src_conn = sqlite3.connect(str(db_path))

    try:
        # 1. Truncate WAL journal into main DB
        logger.info("Executing WAL checkpoint (TRUNCATE)...")
        checkpoint_res = src_conn.execute("PRAGMA wal_checkpoint(TRUNCATE)").fetchall()
        logger.info("Checkpoint result: %s", checkpoint_res)

        # 2. Check source integrity
        logger.info("Verifying source database integrity...")
        integrity = src_conn.execute("PRAGMA integrity_check").fetchone()
        if not integrity or integrity[0] != "ok":
            raise RuntimeError(f"Source database failed integrity check: {integrity}")

        # 3. Perform online hot backup
        logger.info("Streaming online backup to: %s", target_path)
        dest_conn = sqlite3.connect(str(target_path))
        try:
            with dest_conn:
                src_conn.backup(dest_conn, pages=100)
            logger.info("Backup stream finished successfully.")
        finally:
            dest_conn.close()

        # 4. Verify destination integrity
        verify_conn = sqlite3.connect(str(target_path))
        try:
            dest_integrity = verify_conn.execute("PRAGMA integrity_check").fetchone()
            if not dest_integrity or dest_integrity[0] != "ok":
                raise RuntimeError(
                    f"Backup target failed integrity check: {dest_integrity}"
                )
            logger.info("Backup integrity check passed: ok")
        finally:
            verify_conn.close()

        file_size_kb = round(target_path.stat().st_size / 1024, 2)
        logger.info("Backup verified: %s (%s KB)", target_path.name, file_size_kb)
        return target_path

    finally:
        src_conn.close()


def main():
    parser = argparse.ArgumentParser(description="SQLite Online Database Backup Tool")
    parser.add_argument(
        "--db-path",
        type=Path,
        default=DEFAULT_DB_PATH,
        help=f"Path to SQLite database (default: {DEFAULT_DB_PATH})",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parent.parent
        / "backend"
        / "storage"
        / "backups",
        help="Directory to save timestamped backups",
    )

    args = parser.parse_args()

    try:
        dest = backup_database(args.db_path, args.output_dir)
        print(f"SUCCESS: Backup written to {dest}")
        sys.exit(0)
    except Exception:
        logger.exception("Database backup failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
