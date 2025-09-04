from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Annotated
import models, auth
from database import engine, SessionLocal
from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from passlib.context import CryptContext


app = FastAPI()
models.Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class SignUpBase(BaseModel):
    username: str
    email: str
    password: str

class User(BaseModel):
    username: str
    email: str | None = None

member = []

@app.post("/sign_up")
async def add_account(account: SignUpBase, db: db_dependency):
    try:
        db_account = models.Accounts(username=account.username,
                                    email=account.email,
                                    password=auth.get_password_hash(account.password))
        db.add(db_account)
        db.commit()
        db.refresh(db_account)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Username or email already registered",
        )
    return {
        "id": db_account.id,
        "username": db_account.username,
        "email": db_account.email,
        "created_at": db_account.created_at.isoformat(),
    }

@app.get("/accounts/{account_id}")
async def get_account(account_id: int, db: db_dependency):
    result = db.query(models.Accounts).filter(models.Accounts.id == account_id).first()
    if not result:
        raise HTTPException(status_code=404, detail='Account not found')
    return result.username

