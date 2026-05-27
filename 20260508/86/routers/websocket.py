from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
from database import calculate_survey_stats
import json

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, survey_id: str):
        await websocket.accept()
        if survey_id not in self.active_connections:
            self.active_connections[survey_id] = []
        self.active_connections[survey_id].append(websocket)

    def disconnect(self, websocket: WebSocket, survey_id: str):
        if survey_id in self.active_connections:
            self.active_connections[survey_id].remove(websocket)
            if not self.active_connections[survey_id]:
                del self.active_connections[survey_id]

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, survey_id: str, message: dict):
        if survey_id in self.active_connections:
            for connection in self.active_connections[survey_id]:
                try:
                    await connection.send_json(message)
                except:
                    pass


manager = ConnectionManager()


async def broadcast_stats(survey_id: str):
    stats = calculate_survey_stats(survey_id)
    if stats:
        await manager.broadcast(survey_id, {
            "type": "stats_update",
            "data": stats.dict()
        })


@router.websocket("/{survey_id}")
async def websocket_endpoint(websocket: WebSocket, survey_id: str):
    await manager.connect(websocket, survey_id)
    try:
        stats = calculate_survey_stats(survey_id)
        if stats:
            await websocket.send_json({
                "type": "initial_stats",
                "data": stats.dict()
            })
        
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                if message.get("type") == "request_stats":
                    stats = calculate_survey_stats(survey_id)
                    if stats:
                        await websocket.send_json({
                            "type": "stats_update",
                            "data": stats.dict()
                        })
            except:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket, survey_id)
    except Exception as e:
        manager.disconnect(websocket, survey_id)
