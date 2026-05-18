from typing import Dict, Optional
from datetime import datetime
import json

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")


class ChatMessage(BaseModel):
    type: str
    nickname: Optional[str] = None
    content: Optional[str] = None
    target: Optional[str] = None


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, nickname: str) -> bool:
        if nickname in self.active_connections:
            return False
        await websocket.accept()
        self.active_connections[nickname] = websocket
        return True

    def disconnect(self, nickname: str):
        if nickname in self.active_connections:
            del self.active_connections[nickname]

    async def broadcast(self, message: dict):
        for connection in self.active_connections.values():
            await connection.send_json(message)

    async def send_private(self, message: dict, target_nickname: str):
        if target_nickname in self.active_connections:
            await self.active_connections[target_nickname].send_json(message)

    async def send_to_user(self, message: dict, nickname: str):
        if nickname in self.active_connections:
            await self.active_connections[nickname].send_json(message)

    def get_online_users(self):
        return list(self.active_connections.keys())


manager = ConnectionManager()


@app.get("/")
async def get():
    return FileResponse("static/index.html")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    current_nickname = None
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message_data = json.loads(data)
                msg = ChatMessage(**message_data)
            except Exception:
                await websocket.send_json({
                    "type": "error",
                    "content": "消息格式错误"
                })
                continue

            if msg.type == "join":
                if current_nickname:
                    await websocket.send_json({
                        "type": "error",
                        "content": "您已经加入了聊天室"
                    })
                    continue

                if not msg.nickname:
                    await websocket.send_json({
                        "type": "error",
                        "content": "昵称不能为空"
                    })
                    continue

                nickname = msg.nickname.strip()
                if not nickname:
                    await websocket.send_json({
                        "type": "error",
                        "content": "昵称不能为空"
                    })
                    continue

                if len(nickname) > 20:
                    await websocket.send_json({
                        "type": "error",
                        "content": "昵称长度不能超过20个字符"
                    })
                    continue

                if nickname in manager.active_connections:
                    await websocket.send_json({
                        "type": "error",
                        "content": "该昵称已被使用，请选择其他昵称"
                    })
                    continue

                manager.active_connections[nickname] = websocket
                current_nickname = nickname

                await websocket.send_json({
                    "type": "join_success",
                    "nickname": current_nickname,
                    "users": manager.get_online_users()
                })

                await manager.broadcast({
                    "type": "system",
                    "content": f"{current_nickname} 加入了聊天室",
                    "timestamp": int(datetime.now().timestamp() * 1000),
                    "users": manager.get_online_users()
                })

            elif msg.type == "message":
                if not current_nickname:
                    continue

                await manager.broadcast({
                    "type": "message",
                    "sender": current_nickname,
                    "content": msg.content or "",
                    "timestamp": int(datetime.now().timestamp() * 1000)
                })

            elif msg.type == "private":
                if not current_nickname or not msg.target:
                    continue

                if msg.target not in manager.active_connections:
                    await manager.send_to_user({
                        "type": "error",
                        "content": f"用户 {msg.target} 不在线"
                    }, current_nickname)
                    continue

                timestamp = int(datetime.now().timestamp() * 1000)
                await manager.send_private({
                    "type": "private",
                    "sender": current_nickname,
                    "target": msg.target,
                    "content": msg.content or "",
                    "timestamp": timestamp
                }, msg.target)

                await manager.send_to_user({
                    "type": "private",
                    "sender": current_nickname,
                    "target": msg.target,
                    "content": msg.content or "",
                    "timestamp": timestamp,
                    "is_sender": True
                }, current_nickname)

    except WebSocketDisconnect:
        if current_nickname:
            manager.disconnect(current_nickname)
            await manager.broadcast({
                "type": "system",
                "content": f"{current_nickname} 离开了聊天室",
                "timestamp": int(datetime.now().timestamp() * 1000),
                "users": manager.get_online_users()
            })
    except Exception:
        if current_nickname:
            manager.disconnect(current_nickname)
            await manager.broadcast({
                "type": "system",
                "content": f"{current_nickname} 离开了聊天室",
                "timestamp": int(datetime.now().timestamp() * 1000),
                "users": manager.get_online_users()
            })


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
