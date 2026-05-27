from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from database import engine, Base
from redis_client import close_redis
from websocket_manager import ws_manager
from parking_manager import parking_manager

from routers import auth, parking, reservation, orders, admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    parking_manager.initialize_grid()
    yield
    close_redis()


app = FastAPI(title="停车场车位预订系统", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(parking.router)
app.include_router(reservation.router)
app.include_router(orders.router)
app.include_router(admin.router)


@app.websocket("/ws/parking")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


@app.get("/")
def root():
    html_path = Path(__file__).parent / "index.html"
    if html_path.exists():
        return FileResponse(str(html_path))
    return {
        "name": "停车场车位预订系统",
        "docs": "/docs",
        "websocket": "/ws/parking",
    }