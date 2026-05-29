from fastapi import FastAPI, Request, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware
from pathlib import Path
from app.database import engine, Base, get_db
from app.models import user, item, message
from app.routers import auth, items, messages, users
from app.services.auth import get_current_user
from app.config import CATEGORIES, UPLOAD_DIR
from sqlalchemy.orm import Session

Base.metadata.create_all(bind=engine)

app = FastAPI(title="二手交易平台")

app.add_middleware(SessionMiddleware, secret_key="super-secret-session-key")

templates = Jinja2Templates(directory=Path(__file__).parent / "templates")
app.state.templates = templates

import os
os.makedirs(UPLOAD_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory=Path(__file__).parent / "static"), name="static")
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(auth.router)
app.include_router(items.router)
app.include_router(messages.router)
app.include_router(users.router)


@app.get("/")
def index(
    request: Request,
    q: str = "",
    category: str = "",
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    from app.models.item import Item
    from app.models.message import Message
    from sqlalchemy import or_

    query = db.query(Item).filter(Item.is_sold == 0)
    if category and category in CATEGORIES:
        query = query.filter(Item.category == category)
    if q:
        query = query.filter(or_(Item.title.contains(q), Item.description.contains(q)))
    items = query.order_by(Item.created_at.desc()).all()

    unread_count = 0
    if current_user:
        unread_count = db.query(Message).filter(Message.receiver_id == current_user.id, Message.is_read == 0).count()

    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "items": items,
            "current_user": current_user,
            "current_category": category,
            "search_query": q,
            "categories": CATEGORIES,
            "unread_count": unread_count,
        },
    )
