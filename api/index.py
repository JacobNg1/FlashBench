import os
import sys
import traceback

_startup_error = None
_startup_traceback = None

try:
    # 确保项目根目录在 sys.path 中，适配 Vercel serverless
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    from fastapi import FastAPI, Request
    from fastapi.responses import JSONResponse
    from contextlib import asynccontextmanager

    from api.db import init_schema, get_client
    from api.auth import router as auth_router
    from api.data import router as data_router

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        try:
            await init_schema()
        except Exception as init_err:
            # 启动时初始化失败不要直接崩掉整个应用；记录日志，让后续请求能通过全局异常处理器返回具体错误。
            print(f"[lifespan] init_schema failed: {init_err}")
            traceback.print_exc()
        yield

    app = FastAPI(
        title="Chloe的超能工作台",
        description="宝月小学 Chloe老师的全流程教学工作台后端",
        version="2.0.0",
        lifespan=lifespan,
    )

    @app.middleware("http")
    async def strip_api_prefix(request: Request, call_next):
        """统一入口：Vercel 会把 /api/* 路由到本函数并剥离 /api 前缀；
        本地 main.py 直接运行时前端仍请求 /api/*，这里做兼容剥离。"""
        path = request.scope.get("path", "")
        if path.startswith("/api/"):
            request.scope["path"] = path[len("/api"):]
        elif path == "/api":
            request.scope["path"] = "/"
        return await call_next(request)

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        return JSONResponse(
            status_code=500,
            content={
                "error": "后端处理失败",
                "detail": str(exc),
                "traceback": traceback.format_exc(),
                "env_check": {
                    "TURSO_DATABASE_URL_set": bool(os.getenv("TURSO_DATABASE_URL")),
                    "TURSO_AUTH_TOKEN_set": bool(os.getenv("TURSO_AUTH_TOKEN")),
                    "JWT_SECRET_KEY_set": bool(os.getenv("JWT_SECRET_KEY")),
                },
            },
        )

    app.include_router(auth_router)
    app.include_router(data_router)

    @app.get("/health")
    async def health_check():
        db_status = "ok"
        db_error = None
        try:
            client = get_client()
            await client.execute("SELECT 1")
        except Exception as e:
            db_status = "error"
            db_error = str(e)
        return {
            "status": "ok",
            "service": "chloe-workbench",
            "db": {"status": db_status, "error": db_error},
            "env_check": {
                "TURSO_DATABASE_URL_set": bool(os.getenv("TURSO_DATABASE_URL")),
                "TURSO_AUTH_TOKEN_set": bool(os.getenv("TURSO_AUTH_TOKEN")),
                "JWT_SECRET_KEY_set": bool(os.getenv("JWT_SECRET_KEY")),
            },
        }

    @app.get("/info")
    async def app_info():
        return {
            "name": "Chloe的超能工作台",
            "description": "宝月小学 Chloe老师的全流程教学工作台",
            "version": "2.0.0",
        }

except Exception as e:
    _startup_error = str(e)
    _startup_traceback = traceback.format_exc()

    # 极简 ASGI fallback：任何请求都返回启动错误详情
    async def app(scope, receive, send):
        await send({
            "type": "http.response.start",
            "status": 500,
            "headers": [[b"content-type", b"application/json; charset=utf-8"]],
        })
        import json
        body = json.dumps(
            {
                "error": "后端启动失败",
                "detail": _startup_error,
                "traceback": _startup_traceback,
                "env_check": {
                    "TURSO_DATABASE_URL_set": bool(os.getenv("TURSO_DATABASE_URL")),
                    "TURSO_AUTH_TOKEN_set": bool(os.getenv("TURSO_AUTH_TOKEN")),
                    "JWT_SECRET_KEY_set": bool(os.getenv("JWT_SECRET_KEY")),
                },
            },
            ensure_ascii=False,
        )
        await send({"type": "http.response.body", "body": body.encode("utf-8")})
