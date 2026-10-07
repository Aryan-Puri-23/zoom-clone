from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# User Schemas
class UserBase(BaseModel):
    name: str
    email: str
    avatar_url: Optional[str] = None
    role: Optional[str] = "user"

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Participant Schemas
class ParticipantBase(BaseModel):
    display_name: str
    role: Optional[str] = "participant"
    is_muted: Optional[bool] = False
    is_video_off: Optional[bool] = False
    is_hand_raised: Optional[bool] = False

class ParticipantCreate(ParticipantBase):
    meeting_id: int
    user_id: Optional[int] = None

class ParticipantUpdate(BaseModel):
    is_muted: Optional[bool] = None
    is_video_off: Optional[bool] = None
    is_hand_raised: Optional[bool] = None

class ParticipantResponse(ParticipantBase):
    id: int
    meeting_id: int
    user_id: Optional[int] = None
    joined_at: Optional[datetime] = None
    left_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Chat Schemas
class ChatMessageCreate(BaseModel):
    sender_id: str
    sender_name: str
    recipient: Optional[str] = "everyone"
    message: str

class ChatMessageResponse(BaseModel):
    id: int
    meeting_id: int
    sender_id: str
    sender_name: str
    recipient: str
    message: str
    timestamp: Optional[datetime] = None

    class Config:
        from_attributes = True


# Meeting Schemas
class MeetingCreateInstant(BaseModel):
    title: Optional[str] = None
    host_id: Optional[int] = None

class MeetingCreateSchedule(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    scheduled_start_time: datetime
    duration_minutes: int = Field(default=30, ge=5, le=480)
    host_id: Optional[int] = None

class MeetingJoinRequest(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=100)
    passcode: Optional[str] = None

class MeetingResponse(BaseModel):
    id: int
    meeting_id: str
    title: str
    description: Optional[str] = None
    host_id: int
    host_name: Optional[str] = None
    host_email: Optional[str] = None
    host_avatar: Optional[str] = None
    meeting_type: str
    status: str
    scheduled_start_time: Optional[datetime] = None
    duration_minutes: int
    passcode: str
    invite_link: str
    created_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    participant_count: Optional[int] = 0
    participants: Optional[List[ParticipantResponse]] = None

    class Config:
        from_attributes = True
