import json
from typing import Set
from fastapi import WebSocket


class WebSocketManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast(self, message: dict):
        if not self.active_connections:
            return
        dead = set()
        for conn in self.active_connections:
            try:
                await conn.send_json(message)
            except Exception:
                dead.add(conn)
        for conn in dead:
            self.active_connections.discard(conn)


ws_manager = WebSocketManager()


def broadcast_spot_update(spot_data: dict):
    import asyncio
    try:
        loop = asyncio.get_running_loop()
        asyncio.ensure_future(
            ws_manager.broadcast({"type": "spot_update", "data": spot_data})
        )
    except RuntimeError:
        pass