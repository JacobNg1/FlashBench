import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

app = FastAPI(
    title="Chloe的工作台",
    description="宝月小学 Chloe老师的全流程教学工作台后端",
    version="1.0.0"
)


# ---- API 路由 ----

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "chloe-workbench"}


@app.get("/api/info")
async def app_info():
    return {
        "name": "Chloe的工作台",
        "description": "宝月小学 Chloe老师的全流程教学工作台",
        "version": "1.0.0"
    }


@app.get("/api/data/seed")
async def seed_data():
    """返回前端种子数据结构示例，供后续替换 localStorage 使用。"""
    return {
        "schemaVersion": 4,
        "classes": [
            {"id": "c01", "name": "五（1）班", "studentCount": 48},
            {"id": "c02", "name": "五（2）班", "studentCount": 48}
        ],
        "currentClassId": "c02"
    }


@app.get("/api/schedule/master")
async def master_schedule():
    """返回全校课程总表数据（由 static/master_schedule_data.js 提供）。"""
    # 为简单起见，直接返回一个占位提示；需要时可读取 static/master_schedule_data.js 并解析。
    return {"message": "课程总表 API 已就绪"}


# ---- 静态文件服务 ----
# 在 Vercel Serverless 中，函数入口通常位于 /var/task/api/index.py，
# static 目录位于 /var/task/static，因此使用相对于本文件的 .. 路径。
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "..", "static")

if os.path.isdir(STATIC_DIR):
    # html=True 会在访问目录时自动返回 index.html
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
else:
    @app.get("/")
    async def fallback():
        return JSONResponse(
            status_code=404,
            content={"detail": "Static files directory not found."}
        )
