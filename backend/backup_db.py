"""
Daily PostgreSQL backup script for Health Line.
Keeps the last 7 backups in the backupdb/ folder.

Usage:
  python -m backend.backup_db           → waits and backs up daily at scheduled time
  python -m backend.backup_db --now     → takes a backup immediately and exits
"""

import os
import subprocess
import time
import glob
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
BACKUP_DIR = BASE_DIR / "backupdb"
MAX_BACKUPS = 7
BACKUP_HOUR = 3    # 0-23
BACKUP_MINUTE = 0  # 0-59


def _parse_db_url():
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL not set in .env")
    p = urlparse(url)
    return {
        "host": p.hostname or "localhost",
        "port": str(p.port or 5432),
        "user": p.username,
        "password": p.password,
        "dbname": p.path.lstrip("/"),
    }


def run_backup():
    BACKUP_DIR.mkdir(exist_ok=True)
    db = _parse_db_url()
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = BACKUP_DIR / f"healthline_{stamp}.sql"

    env = os.environ.copy()
    env["PGPASSWORD"] = db["password"]

    cmd = [
        "pg_dump",
        "-h", db["host"],
        "-p", db["port"],
        "-U", db["user"],
        "-F", "c",
        "-f", str(filename),
        db["dbname"],
    ]

    print(f"[{stamp}] Backing up to {filename} ...")
    result = subprocess.run(cmd, env=env, capture_output=True, text=True)

    if result.returncode != 0:
        print(f"  ERROR: {result.stderr.strip()}")
        return False

    size_kb = filename.stat().st_size / 1024
    print(f"  Done ({size_kb:.1f} KB)")
    _prune_old()
    return True


def _prune_old():
    backups = sorted(glob.glob(str(BACKUP_DIR / "healthline_*.sql")))
    while len(backups) > MAX_BACKUPS:
        old = backups.pop(0)
        os.remove(old)
        print(f"  Pruned old backup: {os.path.basename(old)}")


def loop():
    """Run continuously, triggering backup at BACKUP_HOUR:BACKUP_MINUTE every day."""
    print(f"Backup loop started. Will back up daily at {BACKUP_HOUR}:{BACKUP_MINUTE:02d}.")
    backed_up_today = False

    while True:
        now = datetime.now()
        if now.hour == BACKUP_HOUR and now.minute == BACKUP_MINUTE and not backed_up_today:
            run_backup()
            backed_up_today = True
        elif now.hour != BACKUP_HOUR or now.minute != BACKUP_MINUTE:
            backed_up_today = False
        time.sleep(30)


if __name__ == "__main__":
    import sys

    if "--now" in sys.argv:
        run_backup()
    else:
        loop()
