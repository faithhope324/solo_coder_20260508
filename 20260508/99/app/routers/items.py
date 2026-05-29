from fastapi import APIRouter, Depends, HTTPException, Request, Response, Form, File, UploadFile, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
from app.database import get_db
from app.models.user import User
from app.models.item import Item
from app.models.message import Message
from app.services.auth import require_current_user, get_current_user
from app.services.image import save_image, delete_image
from app.config import CATEGORIES

router = APIRouter(prefix="/items", tags=["items"])


@router.get("/")
def item_list(
    request: Request,
    category: Optional[str] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Item).filter(Item.is_sold == 0)
    if category and category in CATEGORIES:
        query = query.filter(Item.category == category)
    if q:
        query = query.filter(or_(Item.title.contains(q), Item.description.contains(q)))
    items = query.order_by(Item.created_at.desc()).all()
    unread_count = 0
    if user:
        unread_count = db.query(Message).filter(Message.receiver_id == user.id, Message.is_read == 0).count()
    return request.app.state.templates.TemplateResponse(
        "items/list.html",
        {
            "request": request,
            "items": items,
            "current_user": user,
            "current_category": category,
            "search_query": q or "",
            "categories": CATEGORIES,
            "unread_count": unread_count,
        },
    )


@router.get("/create")
def create_page(
    request: Request,
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    unread_count = db.query(Message).filter(Message.receiver_id == user.id, Message.is_read == 0).count()
    return request.app.state.templates.TemplateResponse(
        "items/create.html",
        {
            "request": request,
            "current_user": user,
            "categories": CATEGORIES,
            "unread_count": unread_count,
        },
    )


@router.post("/create")
async def create_item(
    request: Request,
    title: str = Form(...),
    description: str = Form(""),
    price: float = Form(...),
    category: str = Form("其他"),
    image: UploadFile = File(None),
    db: Session = Depends(get_db),
    user: User = Depends(require_current_user),
):
    image_url = ""
    if image and image.filename:
        image_url = await save_image(image)
    item = Item(
        title=title,
        description=description,
        price=price,
        category=category,
        image_url=image_url,
        owner_id=user.id,
    )
    db.add(item)
    db.commit()
    return Response(status_code=302, headers={"Location": f"/items/{item.id}"})


@router.get("/{item_id}")
def item_detail(
    request: Request,
    item_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="物品不存在")
    owner = db.query(User).filter(User.id == item.owner_id).first()
    unread_count = 0
    if user:
        unread_count = db.query(Message).filter(Message.receiver_id == user.id, Message.is_read == 0).count()
    return request.app.state.templates.TemplateResponse(
        "items/detail.html",
        {
            "request": request,
            "item": item,
            "owner": owner,
            "current_user": user,
            "categories": CATEGORIES,
            "unread_count": unread_count,
        },
    )


@router.get("/{item_id}/edit")
def edit_page(
    request: Request,
    item_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_current_user),
):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="物品不存在")
    if item.owner_id != user.id:
        raise HTTPException(status_code=403, detail="无权编辑")
    unread_count = db.query(Message).filter(Message.receiver_id == user.id, Message.is_read == 0).count()
    return request.app.state.templates.TemplateResponse(
        "items/edit.html",
        {
            "request": request,
            "item": item,
            "current_user": user,
            "categories": CATEGORIES,
            "unread_count": unread_count,
        },
    )


@router.post("/{item_id}/edit")
async def edit_item(
    request: Request,
    item_id: int,
    title: str = Form(...),
    description: str = Form(""),
    price: float = Form(...),
    category: str = Form("其他"),
    is_sold: str = Form("0"),
    image: UploadFile = File(None),
    db: Session = Depends(get_db),
    user: User = Depends(require_current_user),
):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="物品不存在")
    if item.owner_id != user.id:
        raise HTTPException(status_code=403, detail="无权编辑")
    item.title = title
    item.description = description
    item.price = price
    item.category = category
    item.is_sold = 1 if is_sold == "1" else 0
    if image and image.filename:
        old_image = item.image_url
        item.image_url = await save_image(image)
        delete_image(old_image)
    db.commit()
    return Response(status_code=302, headers={"Location": f"/items/{item.id}"})


@router.post("/{item_id}/delete")
def delete_item(
    request: Request,
    item_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_current_user),
):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="物品不存在")
    if item.owner_id != user.id:
        raise HTTPException(status_code=403, detail="无权删除")
    delete_image(item.image_url)
    db.delete(item)
    db.commit()
    return Response(status_code=302, headers={"Location": "/users/me"})
