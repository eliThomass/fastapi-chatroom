# fastapi-chatroom

# Live Group Chat Web Application

A full-stack group chat app with JWT authentication, group membership & invitations, message history, and **real-time messaging** via WebSockets (or polling fallback).  
Backend: **FastAPI + PostgreSQL + SQLAlchemy + JWT** · Frontend: **React (Vite)**

---

## Features

- **User accounts**: signup, login (OAuth2 password flow), hashed passwords (bcrypt)  
- **JWT auth**: short-lived access tokens  
- **Group chats**: create chats, auto-join creator  
- **Memberships**: invite users to chats, accept invites  
- **Messaging**: send/receive messages
- **Real-time**: WebSocket updates for messages  
- **Secure defaults**: least-privilege endpoints, FK constraints, cascade rules  

---

## Tech Stack

- **Backend**: FastAPI, SQLAlchemy, Pydantic, python-jose (JWT), passlib[bcrypt]  
- **Database**: PostgreSQL  
- **Frontend**: React (Vite), fetch API  
- **Dev**: Uvicorn, npm, Vite  

---

## Project Structure
```
repo/
backend/
main.py # FastAPI app + routes
auth.py # JWT, password hashing, dependencies
models.py # SQLAlchemy ORM models
database.py # engine, SessionLocal, get_db()
requirements.txt
frontend/
package.json
vite.config.* # Vite config
index.html
src/
api.js
App.jsx
main.jsx
```

## Prerequisites

- Python 3.11+ (3.13 works too)  
- Node.js 18+ and npm  
- PostgreSQL 14+ (local or remote)

## Environment Variables

Create `backend/.env`

```env
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/chatapp # RENAME FOR YOUR DB
JWT_SECRET= CHANGE_ME # CHANGE
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

Create `frontend/.env` for dev:

```env
VITE_API_BASE=http://localhost:8000 # FOR LOCALHOST

# FOR CLOUDFLARE DON'T HAVE ANY VITE_API_BASE VALUE
```

## Backend Setup

```bash
cd backend
python -m venv env
source env/bin/activate        # Windows: env\Scripts\activate
pip install -r requirements.txt
```
**Then run the API (dev) FROM /backend**
```bash
uvicorn main:app --reload --port 8000 # FOR LOCALHOST
uvicorn main:app --host 127.0.0.1 --port 8000 # FOR CLOUDFLARE
```
## Frontend Setup (Vite + React)

```bash
cd frontend
npm install

# FOR LOCALHOST
npm run dev         # http://localhost:5173

# FOR CLOUDFLARE
npm run dev -- --host
```

# Cloudflare Setup (so others can access)

```bash
brew install cloudflared # for Mac OS
```

Then run server from /backend
```bash
uvicorn main:app --host 127.0.0.1
```

Then get Cloudflare tunnel
```bash
cloudflared tunnel --url http://localhost:5173
```

Cloudflare will output the random domain name in the terminal. You can then use the application through that domain.

```
