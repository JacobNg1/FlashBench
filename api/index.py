import os
import traceback
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

_startup_error = None

try:
    from .db import init_schema
    from .auth import router as auth_router
    from .data import router as data_router

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        # 启动时初始化数据库表（Turso 支持幂等 CREATE TABLE IF NOT EXISTS）
        await init_schema()
        yield

    app = FastAPI(
        title="Chloe的超能工作台",
        description="宝月小学 Chloe老师的全流程教学工作台后端",
        version="2.0.0",
        lifespan=lifespan,
    )

    app.include_router(auth_router)
    app.include_router(data_router)

    @app.get("/api/health")
    async def health_check():
        return {"status": "ok", "service": "chloe-workbench"}

    @app.get("/api/info")
    async def app_info():
        return {
            "name": "Chloe的超能工作台",
            "description": "宝月小学 Chloe老师的全流程教学工作台",
            "version": "2.0.0",
        }

except Exception as e:
    _startup_error = traceback.format_exc()

    app = FastAPI()

    @app.get("/{path:path}")
    async def startup_error_handler(request: Request, path: str):
        env_check = {
            "TURSO_DATABASE_URL_set": bool(os.getenv("TURSO_DATABASE_URL")),
            "TURSO_AUTH_TOKEN_set": bool(os.getenv("TURSO_AUTH_TOKEN")),
            "JWT_SECRET_KEY_set": bool(os.getenv("JWT_SECRET_KEY")),
        }
        return JSONResponse(
            status_code=500,
            content={
                "error": "后端启动失败",
                "detail": str(e),
                "traceback": _startup_error,
                "env_check": env_check,
            },
        )
