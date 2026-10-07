from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from app.database import get_db
from app.crud import (
    create_instant_meeting,
    create_scheduled_meeting,
    get_meeting_by_meeting_id,
    get_upcoming_meetings,
    get_recent_meetings,
    join_or_add_participant,
    update_participant_state,
    mute_all_participants,
    remove_participant_record,
    end_meeting,
    add_chat_message,
    get_meeting_messages
)
from app.schemas import (
    MeetingCreateInstant,
    MeetingCreateSchedule,
    MeetingJoinRequest,
    MeetingResponse,
    ParticipantResponse,
    ParticipantUpdate,
    ChatMessageCreate,
    ChatMessageResponse
)

router = APIRouter(prefix="/meetings", tags=["Meetings"])

@router.post("/instant", response_model=MeetingResponse)
def create_instant(payload: MeetingCreateInstant, db: Session = Depends(get_db)):
    """Create an instant meeting and return full details with ID and invite link."""
    meeting = create_instant_meeting(db, title=payload.title, host_id=payload.host_id)
    return meeting.to_dict()

@router.post("/schedule", response_model=MeetingResponse)
def schedule_meeting(payload: MeetingCreateSchedule, db: Session = Depends(get_db)):
    """Schedule a future meeting with date, time, title, duration."""
    meeting = create_scheduled_meeting(
        db=db,
        title=payload.title,
        scheduled_start_time=payload.scheduled_start_time,
        duration_minutes=payload.duration_minutes,
        description=payload.description,
        host_id=payload.host_id
    )
    return meeting.to_dict()

@router.get("/upcoming", response_model=list[MeetingResponse])
def list_upcoming(limit: int = Query(20, ge=1, le=100), db: Session = Depends(get_db)):
    """Fetch all upcoming and currently active scheduled meetings."""
    meetings = get_upcoming_meetings(db, limit=limit)
    return [m.to_dict() for m in meetings]

@router.get("/recent", response_model=list[MeetingResponse])
def list_recent(limit: int = Query(20, ge=1, le=100), db: Session = Depends(get_db)):
    """Fetch past/ended meetings."""
    meetings = get_recent_meetings(db, limit=limit)
    return [m.to_dict() for m in meetings]

@router.get("/{meeting_id}", response_model=MeetingResponse)
def get_meeting(meeting_id: str, db: Session = Depends(get_db)):
    """Validate existence and retrieve meeting information by meeting ID."""
    meeting = get_meeting_by_meeting_id(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found. Please verify the Meeting ID.")
    return meeting.to_dict(include_participants=True)

@router.post("/{meeting_id}/join", response_model=ParticipantResponse)
def join_meeting(meeting_id: str, payload: MeetingJoinRequest, db: Session = Depends(get_db)):
    """Validate meeting existence and register participant entry."""
    meeting = get_meeting_by_meeting_id(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if meeting.status == "ended":
        raise HTTPException(status_code=400, detail="This meeting has already ended.")

    participant = join_or_add_participant(
        db=db,
        meeting=meeting,
        display_name=payload.display_name.strip()
    )
    return participant.to_dict()

@router.post("/{meeting_id}/end", response_model=MeetingResponse)
def end_meeting_endpoint(meeting_id: str, db: Session = Depends(get_db)):
    """Host control: End the meeting for all participants."""
    meeting = get_meeting_by_meeting_id(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    ended = end_meeting(db, meeting)
    return ended.to_dict()

@router.post("/{meeting_id}/mute-all")
def mute_all_endpoint(meeting_id: str, db: Session = Depends(get_db)):
    """Host control: Mute all attendees."""
    meeting = get_meeting_by_meeting_id(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    count = mute_all_participants(db, meeting.id)
    return {"status": "success", "muted_count": count}

@router.delete("/participants/{participant_id}")
def remove_participant_endpoint(participant_id: int, db: Session = Depends(get_db)):
    """Host control: Remove a participant from the meeting."""
    success = remove_participant_record(db, participant_id)
    if not success:
        raise HTTPException(status_code=404, detail="Participant not found")
    return {"status": "success", "removed_id": participant_id}

@router.get("/{meeting_id}/messages", response_model=list[ChatMessageResponse])
def get_chat_history(meeting_id: str, db: Session = Depends(get_db)):
    meeting = get_meeting_by_meeting_id(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    messages = get_meeting_messages(db, meeting.id)
    return [msg.to_dict() for msg in messages]

@router.post("/{meeting_id}/messages", response_model=ChatMessageResponse)
def post_chat_message(meeting_id: str, payload: ChatMessageCreate, db: Session = Depends(get_db)):
    meeting = get_meeting_by_meeting_id(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    msg = add_chat_message(
        db=db,
        meeting_id=meeting.id,
        sender_id=payload.sender_id,
        sender_name=payload.sender_name,
        message=payload.message,
        recipient=payload.recipient or "everyone"
    )
    return msg.to_dict()
