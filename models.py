from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime, PrimaryKeyConstraint, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
from sqlalchemy import Index

class Accounts(Base):
    __tablename__ = 'account'

    id = Column(Integer, primary_key = True)
    username = Column(String(30), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password = Column(String, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)

    chats_created = relationship("Chats", 
                                 back_populates="creator", 
                                 cascade="all, delete-orphan")
    
    memberships = relationship("ChatMembers", back_populates="account", cascade="all, delete-orphan")

    chats = relationship("Chats",
                         secondary=lambda: ChatMembers.__table__,
                         primaryjoin=lambda: Accounts.id == ChatMembers.account_id,
                         secondaryjoin=lambda: Chats.id == ChatMembers.chat_id,
                         viewonly=True)

    messages = relationship("Messages", back_populates="author")

    sent_invites = relationship("Invites",
                                foreign_keys="Invites.sender_id",
                                back_populates="sender",
                                cascade="all, delete-orphan",
                                passive_deletes=True)
    
    received_invites = relationship("Invites",
                                    foreign_keys="Invites.receiver_id",
                                    back_populates="receiver",
                                    cascade="all, delete-orphan",
                                    passive_deletes=True,)

class Chats(Base):
    __tablename__ = 'group_chat'

    id = Column(Integer, primary_key = True)
    name = Column(String, nullable=False)
    created_by = Column(Integer, ForeignKey('account.id', ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint('name', 'created_by', name='uq_chat_name_creator'),
    )

    creator = relationship("Accounts", back_populates="chats_created", passive_deletes=True)
    members = relationship("ChatMembers", back_populates="chat", cascade="all, delete-orphan")
    messages = relationship("Messages", back_populates="chat", cascade="all, delete-orphan")
    invites = relationship("Invites", back_populates="chat", cascade="all, delete-orphan", passive_deletes=True)

class ChatMembers(Base):
    __tablename__ = 'gc_member'

    
    account_id = Column(Integer, ForeignKey('account.id', ondelete="CASCADE"), nullable=False)
    chat_id = Column(Integer, ForeignKey('group_chat.id', ondelete="CASCADE"), nullable=False)

    __table_args__ = (PrimaryKeyConstraint("account_id", "chat_id"),)

    account = relationship("Accounts", back_populates="memberships")
    chat = relationship("Chats", back_populates="members")

class Messages(Base):
    __tablename__ = 'message'

    id = Column(Integer, primary_key=True)
    account_id = Column(Integer, ForeignKey('account.id', ondelete='SET NULL'), index=True, nullable=True)
    chat_id = Column(Integer, ForeignKey('group_chat.id', ondelete="CASCADE"), nullable=False)
    text = Column(String, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    author_username = Column(String(30), nullable=False) 

    author = relationship("Accounts", back_populates="messages", passive_deletes=True)
    chat = relationship("Chats", back_populates="messages")

class Invites(Base):
    __tablename__ = 'invite'

    id = Column(Integer, primary_key=True)

    sender_id = Column(Integer, ForeignKey('account.id', ondelete='SET NULL'), index=True, nullable=True)
    receiver_id = Column(Integer, ForeignKey('account.id', ondelete='SET NULL'), index=True, nullable=True)
    chat_id = Column(Integer, ForeignKey('group_chat.id', ondelete="CASCADE"), index=True, nullable=False)

    text = Column(String, nullable=False)
    status = Column(String, nullable=False, default='pending')
    created_at = Column(DateTime, default=func.now(), nullable=False)

    sender = relationship("Accounts", foreign_keys=[sender_id], back_populates="sent_invites", passive_deletes=True)
    receiver = relationship("Accounts", foreign_keys=[receiver_id], back_populates="received_invites", passive_deletes=True)
    chat = relationship("Chats", back_populates="invites", passive_deletes=True)

Index("ix_message_chat_time", Messages.chat_id, Messages.created_at)

