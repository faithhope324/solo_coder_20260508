from fastapi import APIRouter, Depends, Request, Response, Form, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.item import Item
from app.models.message import Message
from app.services.auth import require_current_user
from app.services.image import save_image, delete_image
from app.config import CATEGORIES

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me")
def my_profile(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_current_user),
):
    my_items = db.query(Item).filter(Item.owner_id == user.id).order_by(Item.created_at.desc()).all()
    unread_count = db.query(Message).filter(Message.receiver_id == user.id, Message.is_read == 0).count()
    return request.app.state.templates.TemplateResponse(
        "users/profile.html",
        {
            "request": request,
            "current_user": user,
            "items": my_items,
            "categories": CATEGORIES,
            "unread_count": unread_count,
            "is_owner": True,
        },
    )


@router.get("/{user_id}")
def user_profile(
    request: Request,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_current_user),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="用户不存在")
    user_items = db.query(Item).filter(Item.owner_id == user_id, Item.is_sold == 0).order_by(Item.created_at.desc()).all()
    unread_count = db.query(Message).filter(Message.receiver_id == current_user.id, Message.is_read == 0).count()
    return request.app.state.templates.TemplateResponse(
        "users/profile.html",
        {
            "request": request,
            "current_user": current_user,
            "profile_user": target,
            "items": user_items,
            "categories": CATEGORIES,
            "unread_count": unread_count,
            "is_owner": target.id == current_user.id,
        },
    )


@router.post("/me/avatar")
async def update_avatar(
    request: Request,
    avatar: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_current_user),
):
    filename = await save_image(avatar)
    if user.avatar:
        delete_image(user.avatar)
    user.avatar = filename
    db.commit()
    return Response(status_code=302, headers={"Location": "/users/me"})
