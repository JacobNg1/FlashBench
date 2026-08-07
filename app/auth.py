import os
import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import bcrypt
import jwt
from pydantic import BaseModel
from app.db import create_user, get_user_by_username, get_user_by_id

router = APIRouter(tags=["auth"])

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


class RegisterRequest(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def create_access_token(user_id: int) -> str:
    expire = datetime.datetime.utcnow() + datetime.timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user_id(token: str = Depends(oauth2_scheme)) -> int:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="登录已过期，请重新登录",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: Optional[str] = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        return int(user_id)
    except jwt.ExpiredSignatureError:
        raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception


async def get_current_user(token: str = Depends(oauth2_scheme)):
    user_id = await get_current_user_id(token)
    user = await get_user_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="用户不存在")
    return user


@router.post("/register", response_model=TokenOut)
async def register(body: RegisterRequest):
    if len(body.username) < 2 or len(body.username) > 32:
        raise HTTPException(status_code=400, detail="用户名长度需在 2-32 位之间")
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="密码长度至少 6 位")

    existing = await get_user_by_username(body.username)
    if existing:
        raise HTTPException(status_code=409, detail="用户名已被注册")

    password_hash = get_password_hash(body.password)
    user_id = await create_user(body.username, password_hash)
    access_token = create_access_token(user_id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {"id": user_id, "username": body.username},
    }


@router.post("/login", response_model=TokenOut)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await get_user_by_username(form_data.username)
    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    access_token = create_access_token(user["id"])
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {"id": user["id"], "username": user["username"]},
    }


@router.get("/me", response_model=UserOut)
async def read_me(current_user=Depends(get_current_user)):
    return {"id": current_user["id"], "username": current_user["username"]}
