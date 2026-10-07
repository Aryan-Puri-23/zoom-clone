import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    avatar_url = Column(String(500), nullable=True)
    role = Column(String(50), default="user")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    hosted_meetings = relationship("Meeting", back_populates="host", cascade="all, delete-orphan")
    participations = relationship("Participant", back_populates="user")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "avatar_url": self.avatar_url,
            "role": self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    meeting_id = Column(String(30), unique=True, index=True, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    host_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    meeting_type = Column(String(20), default="instant")  # "instant" | "scheduled"
    status = Column(String(20), default="upcoming")        # "upcoming" | "active" | "ended"
    scheduled_start_time = Column(DateTime, nullable=True)
    duration_minutes = Column(Integer, default=45)
    passcode = Column(String(20), nullable=False)
    invite_link = Column(String(500), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)

    # Relationships
    host = relationship("User", back_populates="hosted_meetings")
    participants = relationship("Participant", back_populates="meeting", cascade="all, delete-orphan")
    messages = relationship("ChatMessage", back_populates="meeting", cascade="all, delete-orphan")

    def to_dict(self, include_participants=False):
        data = {
            "id": self.id,
            "meeting_id": self.meeting_id,
            "title": self.title,
            "description": self.description,
            "host_id": self.host_id,
            "host_name": self.host.name if self.host else "Host",
            "host_email": self.host.email if self.host else "",
            "host_avatar": self.host.avatar_url if self.host else "",
            "meeting_type": self.meeting_type,
            "status": self.status,
            "scheduled_start_time": self.scheduled_start_time.isoformat() if self.scheduled_start_time else None,
            "duration_minutes": self.duration_minutes,
            "passcode": self.passcode,
            "invite_link": self.invite_link,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "ended_at": self.ended_at.isoformat() if self.ended_at else None,
            "participant_count": len(self.participants) if self.participants else 0
        }
        if include_participants:
            data["participants"] = [p.to_dict() for p in self.participants]
        return data


class Participant(Base):
    __tablename__ = "participants"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    display_name = Column(String(100), nullable=False)
    role = Column(String(20), default="participant")  # "host" | "co-host" | "participant"
    is_muted = Column(Boolean, default=False)
    is_video_off = Column(Boolean, default=False)
    is_hand_raised = Column(Boolean, default=False)
    joined_at = Column(DateTime, default=datetime.datetime.utcnow)
    left_at = Column(DateTime, nullable=True)

    # Relationships
    meeting = relationship("Meeting", back_populates="participants")
    user = relationship("User", back_populates="participations")

    def to_dict(self):
        return {
            "id": self.id,
            "meeting_id": self.meeting_id,
            "user_id": self.user_id,
            "display_name": self.display_name,
            "role": self.role,
            "is_muted": self.is_muted,
            "is_video_off": self.is_video_off,
            "is_hand_raised": self.is_hand_raised,
            "joined_at": self.joined_at.isoformat() if self.joined_at else None,
            "left_at": self.left_at.isoformat() if self.left_at else None
        }


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(String(100), nullable=False)
    sender_name = Column(String(100), nullable=False)
    recipient = Column(String(100), default="everyone")
    message = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    meeting = relationship("Meeting", back_populates="messages")

    def to_dict(self):
        return {
            "id": self.id,
            "meeting_id": self.meeting_id,
            "sender_id": self.sender_id,
            "sender_name": self.sender_name,
            "recipient": self.recipient,
            "message": self.message,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None
        }
