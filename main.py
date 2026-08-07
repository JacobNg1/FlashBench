import os
import uvicorn
from fastapi.staticfiles import StaticFiles
from api.index import app

# 本地开发时，FastAPI 也负责托管 public/ 下的前端资源
# Vercel 上 public/ 会被原生静态托管，不存在于 /var/task/public，因此需要判断
public_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public")
if os.path.isdir(public_dir):
    app.mount("/", StaticFiles(directory=public_dir, html=True), name="public")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
