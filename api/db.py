import os
import json
from typing import Optional, Dict, Any
from libsql_client import create_client

TURSO_DATABASE_URL = os.getenv("TURSO_DATABASE_URL", "")
TURSO_AUTH_TOKEN = os.getenv("TURSO_AUTH_TOKEN", "")

_client = None


def get_client():
    global _client
    if _client is None:
        url = TURSO_DATABASE_URL
        token = TURSO_AUTH_TOKEN
        if not url:
            raise RuntimeError("Missing TURSO_DATABASE_URL environment variable")
        _client = create_client(url=url, auth_token=token or None)
    return _client


async def init_schema():
    """初始化数据库表结构（幂等）。"""
    client = get_client()
    await client.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    await client.execute(
        """
        CREATE TABLE IF NOT EXISTS workbench_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL UNIQUE,
            data_json TEXT NOT NULL,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """
    )


async def create_user(username: str, password_hash: str) -> int:
    client = get_client()
    result = await client.execute(
        "INSERT INTO users (username, password_hash) VALUES (?, ?) RETURNING id",
        [username, password_hash],
    )
    return result.rows[0][0]


async def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
    client = get_client()
    result = await client.execute(
        "SELECT id, username, password_hash, created_at FROM users WHERE username = ?",
        [username],
    )
    if not result.rows:
        return None
    row = result.rows[0]
    return {
        "id": row[0],
        "username": row[1],
        "password_hash": row[2],
        "created_at": row[3],
    }


async def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    client = get_client()
    result = await client.execute(
        "SELECT id, username, created_at FROM users WHERE id = ?",
        [user_id],
    )
    if not result.rows:
        return None
    row = result.rows[0]
    return {"id": row[0], "username": row[1], "created_at": row[2]}


async def load_data(user_id: int) -> Optional[Dict[str, Any]]:
    client = get_client()
    result = await client.execute(
        "SELECT data_json FROM workbench_data WHERE user_id = ?",
        [user_id],
    )
    if not result.rows:
        return None
    return json.loads(result.rows[0][0])


async def save_data(user_id: int, data: Dict[str, Any]):
    client = get_client()
    data_json = json.dumps(data, ensure_ascii=False)
    await client.execute(
        """
        INSERT INTO workbench_data (user_id, data_json, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id) DO UPDATE SET
            data_json = excluded.data_json,
            updated_at = CURRENT_TIMESTAMP
        """,
        [user_id, data_json],
    )
