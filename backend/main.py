from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from backend.config import get_settings
from backend.routers import medicine, batch, sale, analytics, search, third_party_sale

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    description="Pharmacy Inventory Management System",
    version="1.0.0",
)

# CORS — allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for uploaded images
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Register routers
app.include_router(medicine.router)
app.include_router(batch.router)
app.include_router(sale.router)
app.include_router(analytics.router)
app.include_router(search.router)
app.include_router(third_party_sale.router)


@app.get("/", tags=["Root"])
def root():
    return {
        "app": settings.APP_NAME,
        "status": "running",
        "docs": "/docs",
    }
