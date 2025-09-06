from fastapi import FastAPI, HTTPException, Depends, status
from pydantic import BaseModel
from typing import List, Annotated
import models, auth
from database import engine, SessionLocal, get_db
from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from passlib.context import CryptContext
from auth import (create_access_token, authenticate_user, ACCESS_TOKEN_EXPIRE_MINUTES, Token,
                  get_current_active_user
)
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta


app = FastAPI()
models.Base.metadata.create_all(bind=engine)

db_dependency = Annotated[Session, Depends(get_db)]
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class SignUpBase(BaseModel):
    username: str
    email: str
    password: str

class GroupChatBase(BaseModel):
    name: str

class GroupChatOut(BaseModel):
    id: int
    name: str
    created_by: int
    created_at: str

class UserOut(BaseModel):
    username: str
    email: str | None = None

class MessageBase(BaseModel):
    text: str

class MessageOut(BaseModel):
    id: int
    chat_id: int
    account_id: int
    text: str
    created_at: str
    author_username: str

member = []

@app.post("/sign_up")
async def add_account(account: SignUpBase, db: db_dependency):
    existing_user = db.query(models.Accounts).filter(
    (models.Accounts.username == account.username) |
    (models.Accounts.email == account.email)
    ).first()

    if existing_user:
        if existing_user.username == account.username:
            raise HTTPException(status_code=400, detail="Username already in use")
        if existing_user.email == account.email:
            raise HTTPException(status_code=400, detail="Email already in use")
    
    new_chat = models.Accounts(username=account.username,
                                email=account.email,
                                password=auth.get_password_hash(account.password))
    db.add(new_chat)
    try:
        db.commit()
        db.refresh(new_chat)
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=409, detail="Username or email already in use.")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Unexpected server error.")

    return {
        "id": new_chat.id,
        "username": new_chat.username,
        "email": new_chat.email,
        "created_at": new_chat.created_at.isoformat(),
    }
    
@app.get("/accounts/{account_id}")
async def get_account(account_id: int, db: db_dependency):
    result = db.query(models.Accounts).filter(models.Accounts.id == account_id).first()
    if not result:
        raise HTTPException(status_code=404, detail='Account not found')
    return result.username

@app.post("/token", response_model=Token)
async def login_for_access_token(db: db_dependency, form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password", headers={"WWW-Authenciate" : "Bearer"})
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(data={"sub" : str(user.id)}, expires_delta=access_token_expires)
    return {"access_token" : token, "token_type" : "bearer"}

@app.get("/users/me/", response_model=UserOut)
async def read_users_me(current_user: models.Accounts = Depends(get_current_active_user)):
    return UserOut(username=current_user.username, email=current_user.email)

@app.post("/gc", response_model=GroupChatOut)
async def create_group_chat(db:db_dependency, group_chat: GroupChatBase, current_user: models.Accounts = Depends(get_current_active_user)):
    existing = db.query(models.Chats).filter_by(
        name=group_chat.name, created_by=current_user.id
    ).first()
    if existing:
        raise HTTPException(409, "Chat with that name already exists")
    new_chat = models.Chats(name=group_chat.name, created_by=current_user.id)
    db.add(new_chat)
    try:
        db.flush()
        db.add(models.ChatMembers(account_id=current_user.id, chat_id=new_chat.id))
        db.commit()
        db.refresh(new_chat)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Unexpected server error.")
    return {
        "id": new_chat.id,
        "name": new_chat.name,
        "created_by" : new_chat.created_by,
        "created_at": new_chat.created_at.isoformat(),
    }

@app.post("/gc/{chat_id}/messages", response_model=MessageOut)
async def send_message(db: db_dependency, chat_id: int, message: MessageBase, current_user: models.Accounts = Depends(get_current_active_user)):
    chat = db.query(models.Chats).filter(chat_id == models.Chats.id).first()

    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found.")
    
    member = db.query(models.ChatMembers).filter_by(account_id=current_user.id, chat_id=chat_id).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this chat.")
    
    m = models.Messages(
        account_id = current_user.id,
        chat_id = chat_id,
        text = message.text,
        author_username = current_user.username
    )

    db.add(m)
    try:
        db.commit()
        db.refresh(m)
    except:
        db.rollback()
        raise HTTPException(status_code=500, detail="Unexpected server error.")
    
    return {
        "id" : m.id,
        "account_id" : m.account_id,
        "chat_id" : m.chat_id,
        "text" : m.text,
        "created_at" : m.created_at.isoformat(),
        "author_username" : m.author_username
    }

@app.get("/gc/{chat_id}/messages", response_model=list[MessageOut])
async def get_message(db: db_dependency, chat_id: int, limit: int = 50, current_user: models.Accounts = Depends(get_current_active_user)):
    member = db.query(models.ChatMembers).filter_by(account_id=current_user.id, chat_id=chat_id).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this chat.")
    
    messages = db.query(models.Messages).filter(models.Messages.chat_id == chat_id)

    rows = messages.order_by(models.Messages.created_at.desc()).limit(min(max(limit, 1), 200)).all()

    out = []
    
    for m in rows:
        out.append({
            "id" : m.id,
            "account_id" : m.account_id if m.account_id is not None else 0,
            "chat_id" : m.chat_id,
            "text" : m.text,
            "created_at" : m.created_at.isoformat(),
            "author_username" : m.author_username
        })

    return list(reversed(out))



