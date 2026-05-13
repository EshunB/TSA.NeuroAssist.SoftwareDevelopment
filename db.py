"""SQLite access for NeuroAssist (same schema as the former Prisma migrations)."""

from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Generator
from uuid import uuid4

ROOT = Path(__file__).resolve().parent
DEFAULT_DB_PATH = ROOT / "prisma" / "dev.db"
MIGRATION_SQL = ROOT / "prisma" / "migrations" / "20260226125929_init" / "migration.sql"

DEFAULT_USER_EMAIL = "user@neuroassist.local"


def database_path() -> Path:
    override = os.environ.get("NEUROASSIST_DATABASE")
    return Path(override) if override else DEFAULT_DB_PATH


@contextmanager
def get_connection() -> Generator[sqlite3.Connection, None, None]:
    path = database_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def ensure_schema() -> None:
    with get_connection() as conn:
        cur = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='User'"
        )
        if cur.fetchone() is not None:
            return
        if not MIGRATION_SQL.is_file():
            raise FileNotFoundError(
                f"Missing migration SQL at {MIGRATION_SQL}. "
                "Restore prisma/migrations or run init from repo."
            )
        sql = MIGRATION_SQL.read_text(encoding="utf-8")
        conn.executescript(sql)


def _new_id() -> str:
    return uuid4().hex[:24]


def get_or_create_default_user(conn: sqlite3.Connection) -> str:
    row = conn.execute(
        'SELECT "id" FROM "User" WHERE "email" = ?', (DEFAULT_USER_EMAIL,)
    ).fetchone()
    if row:
        return str(row["id"])
    uid = _new_id()
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    conn.execute(
        'INSERT INTO "User" ("id", "email", "name", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?)',
        (uid, DEFAULT_USER_EMAIL, "NeuroAssist User", now, now),
    )
    return uid


def list_transcript_sessions(limit: int = 50) -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT "id", "title", "createdAt", "languageSource", "languageTarget", "mode"
            FROM "TranscriptSession"
            ORDER BY "createdAt" DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return [dict(r) for r in rows]


def get_transcript_session(session_id: str) -> dict[str, Any] | None:
    with get_connection() as conn:
        sess = conn.execute(
            """
            SELECT "id", "title", "createdAt", "languageSource", "languageTarget", "mode"
            FROM "TranscriptSession"
            WHERE "id" = ?
            """,
            (session_id,),
        ).fetchone()
        if not sess:
            return None
        segs = conn.execute(
            """
            SELECT "id", "startTimeMs", "endTimeMs", "originalText", "translatedText", "confidence"
            FROM "TranscriptSegment"
            WHERE "sessionId" = ?
            ORDER BY "startTimeMs" ASC
            """,
            (session_id,),
        ).fetchall()
    out = dict(sess)
    out["segments"] = [dict(s) for s in segs]
    return out


def create_transcript_session(
    *,
    title: str,
    language_source: str,
    language_target: str | None,
    mode: str,
    segments: list[dict[str, Any]],
) -> str:
    if not segments:
        raise ValueError("segments required")

    duration_ms = segments[-1]["endTimeMs"]

    with get_connection() as conn:
        user_id = get_or_create_default_user(conn)
        sid = _new_id()
        now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        conn.execute(
            """
            INSERT INTO "TranscriptSession"
            ("id", "userId", "title", "createdAt", "durationMs", "languageSource", "languageTarget", "mode", "tags")
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
            """,
            (
                sid,
                user_id,
                title,
                now,
                duration_ms,
                language_source,
                language_target,
                mode,
            ),
        )
        for seg in segments:
            seg_id = _new_id()
            conn.execute(
                """
                INSERT INTO "TranscriptSegment"
                ("id", "sessionId", "startTimeMs", "endTimeMs", "speakerLabel", "originalText", "translatedText", "confidence")
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    seg_id,
                    sid,
                    int(seg["startTimeMs"]),
                    int(seg["endTimeMs"]),
                    seg.get("speakerLabel"),
                    seg["originalText"],
                    seg.get("translatedText"),
                    seg.get("confidence"),
                ),
            )
    return sid


def save_contact_message(*, from_name: str, email: str, message: str) -> None:
    mid = _new_id()
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO "ContactMessage" ("id", "fromName", "email", "message", "createdAt")
            VALUES (?, ?, ?, ?, ?)
            """,
            (mid, from_name, email, message, now),
        )
