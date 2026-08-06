import os
import uvicorn
from fastapi.staticfiles import StaticFiles
from api.index import app

# 本地开发时，FastAPI 也负责托管 public/ 下的前端资源
public_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public")
app.mount("/", StaticFiles(directory=public_dir, html=True), name="public")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
