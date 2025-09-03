from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Annotated
#import models
from database import engine, SessionLocal
from sqlalchemy import func
from sqlalchemy.orm import Session

app = FastAPI()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class User(BaseModel):
    username: str
    email: str
    password: str

member = []

@app.post("/sign_up")
async def add_account(user: User):
    member.append(user)
    return True

@app.get("/sign_up")
async def get_members():
    members = {}
    for m in member:
        members[m.username] = (m.email, m.password)
    return members

