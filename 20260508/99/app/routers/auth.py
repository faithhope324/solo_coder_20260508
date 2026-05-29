from fastapi import APIRouter, Depends, HTTPException, Request, Form, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.services.auth import (
    hash_password,
    verify_password,
    create_access_token,
    require_current_user,
    get_current_user,
)
from app.config import CATEGORIES

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/register")
def register_page(request: Request, user: User = Depends(get_current_user)):
    if user:
        return Response(status_code=302, headers={"Location": "/"})
    return request.app.state.templates.TemplateResponse(
        "register.html", {"request": request, "categories": CATEGORIES}
    )


@router.post("/register")
def register(
    request: Request,
    username: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
):
    if db.query(User).filter(User.username == username).first():
        return request.app.state.templates.TemplateResponse(
            "register.html",
            {"request": request, "error": "用户名已存在", "categories": CATEGORIES},
            status_code=400,
        )
    if db.query(User).filter(User.email == email).first():
        return request.app.state.templates.TemplateResponse(
            "register.html",
            {"request": request, "error": "邮箱已注册", "categories": CATEGORIES},
            status_code=400,
        )
    user = User(
        username=username,
        email=email,
        hashed_password=hash_password(password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": str(user.id)})
    response = Response(status_code=302, headers={"Location": "/"})
    response.set_cookie(
        key="access_token",
        value=f"Bearer {token}",
        httponly=True,
        max_age=60 * 60 * 24,
    )
    return response


@router.get("/login")
def login_page(request: Request, user: User = Depends(get_current_user)):
    if user:
        return Response(status_code=302, headers={"Location": "/"})
    return request.app.state.templates.TemplateResponse(
        "login.html", {"request": request, "categories": CATEGORIES}
    )


@router.post("/login")
def login(
    request: Request,
    username: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(password, user.hashed_password):
        return request.app.state.templates.TemplateResponse(
            "login.html",
            {"request": request, "error": "用户名或密码错误", "categories": CATEGORIES},
            status_code=400,
        )
    token = create_access_token({"sub": str(user.id)})
    response = Response(status_code=302, headers={"Location": "/"})
    response.set_cookie(
        key="access_token",
        value=f"Bearer {token}",
        httponly=True,
        max_age=60 * 60 * 24,
    )
    return response


@router.get("/logout")
def logout():
    response = Response(status_code=302, headers={"Location": "/"})
    response.delete_cookie("access_token")
    return response
