from fastapi import APIRouter, Depends, HTTPException, Request, Response, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.item import Item
from app.models.message import Message
from app.services.auth import require_current_user, get_current_user
from app.config import CATEGORIES

router = APIRouter(prefix="/messages", tags=["messages"])


@router.get("/")
def inbox(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_current_user),
):
    conversations = (
        db.query(Message)
        .filter((Message.sender_id == user.id) | (Message.receiver_id == user.id))
        .order_by(Message.created_at.desc())
        .all()
    )
    partners = {}
    for msg in conversations:
        partner_id = msg.receiver_id if msg.sender_id == user.id else msg.sender_id
        if partner_id not in partners:
            partner = db.query(User).filter(User.id == partner_id).first()
            partners[partner_id] = {
                "user": partner,
                "last_message": msg,
                "unread": 0,
            }
        if msg.receiver_id == user.id and msg.is_read == 0:
            partners[partner_id]["unread"] += 1

    partner_list = sorted(partners.values(), key=lambda x: x["last_message"].created_at, reverse=True)
    unread_count = db.query(Message).filter(Message.receiver_id == user.id, Message.is_read == 0).count()
    return request.app.state.templates.TemplateResponse(
        "messages/inbox.html",
        {
            "request": request,
            "current_user": user,
            "partners": partner_list,
            "categories": CATEGORIES,
            "unread_count": unread_count,
        },
    )


@router.get("/{partner_id}")
def conversation(
    request: Request,
    partner_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_current_user),
):
    partner = db.query(User).filter(User.id == partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="用户不存在")
    messages = (
        db.query(Message)
        .filter(
            ((Message.sender_id == user.id) & (Message.receiver_id == partner_id))
            | ((Message.sender_id == partner_id) & (Message.receiver_id == user.id))
        )
        .order_by(Message.created_at.asc())
        .all()
    )
    for msg in messages:
        if msg.receiver_id == user.id and msg.is_read == 0:
            msg.is_read = 1
    db.commit()
    unread_count = db.query(Message).filter(Message.receiver_id == user.id, Message.is_read == 0).count()
    return request.app.state.templates.TemplateResponse(
        "messages/conversation.html",
        {
            "request": request,
            "current_user": user,
            "partner": partner,
            "messages": messages,
            "categories": CATEGORIES,
            "unread_count": unread_count,
        },
    )


@router.post("/{partner_id}")
def send_message(
    request: Request,
    partner_id: int,
    content: str = Form(...),
    item_id: int = Form(None),
    db: Session = Depends(get_db),
    user: User = Depends(require_current_user),
):
    partner = db.query(User).filter(User.id == partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="用户不存在")
    if partner_id == user.id:
        raise HTTPException(status_code=400, detail="不能给自己发消息")
    msg = Message(
        sender_id=user.id,
        receiver_id=partner_id,
        content=content,
        item_id=item_id if item_id else None,
    )
    db.add(msg)
    db.commit()
    return Response(status_code=302, headers={"Location": f"/messages/{partner_id}"})
