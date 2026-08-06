from fastapi import FastAPI

app = FastAPI(
    title="Chloe的工作台",
    description="宝月小学 Chloe老师的全流程教学工作台后端",
    version="1.0.0"
)


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
    """返回全校课程总表数据占位接口。"""
    return {"message": "课程总表 API 已就绪"}
