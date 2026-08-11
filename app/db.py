import os
import json
import secrets
import string
from typing import Optional, Dict, Any
from libsql_client import create_client

TURSO_DATABASE_URL = os.getenv("TURSO_DATABASE_URL", "").strip()
TURSO_AUTH_TOKEN = os.getenv("TURSO_AUTH_TOKEN", "").strip()

_client = None
NANO_ID_ALPHABET = string.ascii_letters + string.digits + "_-"


def generate_public_id(size: int = 12) -> str:
    """生成适合展示、不可预测且无需中心协调的 Nano ID。"""
    return "".join(secrets.choice(NANO_ID_ALPHABET) for _ in range(size))


def _normalize_turso_url(url: str) -> str:
    """强制使用 HTTPS（HTTP 协议），避免 Vercel Serverless 里 WebSocket 握手失败。"""
    url = url.strip()
    if url.startswith("libsql://"):
        url = "https://" + url[len("libsql://"):]
    elif url.startswith("wss://"):
        url = "https://" + url[len("wss://"):]
    elif url.startswith("ws://"):
        url = "http://" + url[len("ws://"):]
    return url


def get_client():
    global _client
    if _client is None:
        url = _normalize_turso_url(TURSO_DATABASE_URL)
        token = TURSO_AUTH_TOKEN
        if not url:
            raise RuntimeError("Missing TURSO_DATABASE_URL environment variable")
        print(f"[Turso] connecting with scheme: {url.split('://')[0]}://")
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
    # 兼容已部署数据库：内部整数主键继续供外键与 JWT 使用。
    for statement in (
        "ALTER TABLE users ADD COLUMN public_id TEXT",
        "ALTER TABLE users ADD COLUMN nickname TEXT",
    ):
        try:
            await client.execute(statement)
        except Exception as exc:
            if "duplicate column" not in str(exc).lower():
                raise

    pending = await client.execute(
        "SELECT id, username, public_id, nickname FROM users WHERE public_id IS NULL OR public_id = '' OR nickname IS NULL OR nickname = ''"
    )
    for row in pending.rows:
        await client.execute(
            "UPDATE users SET public_id = ?, nickname = ? WHERE id = ?",
            [row[2] or generate_public_id(), row[3] or row[1], row[0]],
        )
    await client.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_public_id ON users(public_id)")

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
        "INSERT INTO users (username, password_hash, public_id, nickname) VALUES (?, ?, ?, ?) RETURNING id",
        [username, password_hash, generate_public_id(), username],
    )
    return result.rows[0][0]


async def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
    client = get_client()
    result = await client.execute(
        "SELECT id, username, password_hash, created_at, public_id, nickname FROM users WHERE username = ?",
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
        "public_id": row[4],
        "nickname": row[5],
    }


async def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    client = get_client()
    result = await client.execute(
        "SELECT id, username, created_at, public_id, nickname FROM users WHERE id = ?",
        [user_id],
    )
    if not result.rows:
        return None
    row = result.rows[0]
    return {"id": row[0], "username": row[1], "created_at": row[2], "public_id": row[3], "nickname": row[4]}


async def update_user_nickname(user_id: int, nickname: str) -> Optional[Dict[str, Any]]:
    client = get_client()
    await client.execute("UPDATE users SET nickname = ? WHERE id = ?", [nickname, user_id])
    return await get_user_by_id(user_id)


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
