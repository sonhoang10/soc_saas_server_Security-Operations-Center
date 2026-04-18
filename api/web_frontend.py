import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="Flux Security")

# BASE_DIR là thư mục gốc (/root)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST_DIR = os.path.join(BASE_DIR, "Flux", "dist")

# Kiểm tra xem thư mục dist đã tồn tại chưa
if os.path.isdir(DIST_DIR):
    # Mount toàn bộ thư mục Flux/dist
    # html=True giúp tự động load file index.html khi vào route "/"
    # và tự động load "SignIn.html" nếu bạn vào route "/SignIn.html"
    app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="frontend")
else:
    @app.get("/")
    def not_found():
        return {"error": "Thư mục Flux/dist không tồn tại. Vui lòng chạy 'npm run build' trong thư mục Flux."}
