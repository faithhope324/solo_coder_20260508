from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.database import engine, Base
from app.api import generate, convert, feedback

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI 音乐生成与风格迁移 API",
    description="基于深度学习的音乐生成与风格转换后端服务",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(generate.router, prefix="/api/generate", tags=["Music Generation"])
app.include_router(convert.router, prefix="/api/convert", tags=["Audio Conversion"])
app.include_router(feedback.router, prefix="/api/feedback", tags=["User Feedback"])


@app.get("/")
async def root():
    return {
        "name": "AI 音乐生成与风格迁移 API",
        "version": "1.0.0",
        "endpoints": {
            "generate": "/api/generate",
            "convert": "/api/convert",
            "feedback": "/api/feedback"
        }
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "music-generation-api"}
