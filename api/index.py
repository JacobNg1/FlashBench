from contextlib import asynccontextmanager
from fastapi import FastAPI
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
        "version": "2.0.0"
    }
