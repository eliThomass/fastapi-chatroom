from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Annotated
import models, auth
from database import engine, SessionLocal
from sqlalchemy import func
from sqlalchemy.orm import Session
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

passwo = auth.get_password_hash()

class SignUp(BaseModel):
    username: str
    email: str
    password: str

class User(BaseModel):
    username: str
    email: str | None = None

member = []

@app.post("/sign_up")
async def add_account(account: SignUp, db: db_dependency):
    
    return True

@app.get("/sign_up")
async def get_account(id: int, db: db_dependency):
    result = db.query(models.Accounts).filter(models.Accounts.id == id).first()
    if not result:
        raise HTTPException(status_code=404, detail='Question not found')
    return result

