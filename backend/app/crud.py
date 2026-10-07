import random
import string
import datetime
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc
from app.models import User, Meeting, Participant, ChatMessage
from app.config import settings

def generate_zoom_meeting_id() -> str:
    """Generate authentic Zoom-style meeting ID: 3-3-4 or 3-4-4 digits, e.g., 849 203 9182."""
    p1 = random.randint(100, 999)
    p2 = random.randint(100, 999)
    p3 = random.randint(1000, 9999)
    return f"{p1} {p2} {p3}"

def generate_passcode(length: int = 6) -> str:
    """Generate a random 6-character alphanumeric passcode."""
    chars = string.ascii_letters + string.digits
    return "".join(random.choice(chars) for _ in range(length))

def get_or_create_default_user(db: Session) -> User:
    """Retrieve or create default host user (Alex Johnson)."""
    user = db.query(User).filter(User.email == settings.DEFAULT_USER_EMAIL).first()
    if not user:
        user = User(
            name=settings.DEFAULT_USER_NAME,
            email=settings.DEFAULT_USER_EMAIL,
            avatar_url=settings.DEFAULT_USER_AVATAR,
            role="host"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.query(User).filter(User.id == user_id).first()

def create_instant_meeting(db: Session, title: str | None = None, host_id: int | None = None) -> Meeting:
    """Create an instant active Zoom meeting."""
    host = get_user_by_id(db, host_id) if host_id else get_or_create_default_user(db)
    if not host:
        host = get_or_create_default_user(db)

    clean_title = title if title and title.strip() else f"{host.name}'s Personal Meeting"
    raw_meeting_id = generate_zoom_meeting_id()
    passcode = generate_passcode()
    normalized_id = raw_meeting_id.replace(" ", "")
    invite_link = f"/meeting/{normalized_id}"

    meeting = Meeting(
        meeting_id=normalized_id,
        title=clean_title,
        description="Instant meeting room created on the fly.",
        host_id=host.id,
        meeting_type="instant",
        status="active",
        scheduled_start_time=datetime.datetime.utcnow(),
        duration_minutes=45,
        passcode=passcode,
        invite_link=invite_link,
        started_at=datetime.datetime.utcnow()
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)

    # Register host as initial participant
    host_participant = Participant(
        meeting_id=meeting.id,
        user_id=host.id,
        display_name=host.name,
        role="host",
        is_muted=False,
        is_video_off=False
    )
    db.add(host_participant)
    db.commit()
    db.refresh(meeting)
    return meeting

def create_scheduled_meeting(
    db: Session,
    title: str,
    scheduled_start_time: datetime.datetime,
    duration_minutes: int = 30,
    description: str | None = None,
    host_id: int | None = None
) -> Meeting:
    """Schedule a future Zoom meeting."""
    host = get_user_by_id(db, host_id) if host_id else get_or_create_default_user(db)
    if not host:
        host = get_or_create_default_user(db)

    raw_meeting_id = generate_zoom_meeting_id()
    passcode = generate_passcode()
    normalized_id = raw_meeting_id.replace(" ", "")
    invite_link = f"/meeting/{normalized_id}"

    meeting = Meeting(
        meeting_id=normalized_id,
        title=title,
        description=description or "",
        host_id=host.id,
        meeting_type="scheduled",
        status="upcoming",
        scheduled_start_time=scheduled_start_time,
        duration_minutes=duration_minutes,
        passcode=passcode,
        invite_link=invite_link
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting

def get_meeting_by_meeting_id(db: Session, meeting_id: str) -> Meeting | None:
    """Look up meeting by ID string (formatted or unformatted)."""
    clean_id = meeting_id.replace("-", "").replace(" ", "")
    return db.query(Meeting).filter(Meeting.meeting_id == clean_id).first()

def get_upcoming_meetings(db: Session, limit: int = 20) -> list[Meeting]:
    """Retrieve upcoming and active meetings."""
    return db.query(Meeting).filter(
        Meeting.status.in_(["upcoming", "active"])
    ).order_by(asc(Meeting.scheduled_start_time)).limit(limit).all()

def get_recent_meetings(db: Session, limit: int = 20) -> list[Meeting]:
    """Retrieve recent / completed meetings."""
    return db.query(Meeting).filter(
        Meeting.status == "ended"
    ).order_by(desc(Meeting.created_at)).limit(limit).all()

def join_or_add_participant(
    db: Session,
    meeting: Meeting,
    display_name: str,
    user_id: int | None = None
) -> Participant:
    """Register or look up a participant joining the meeting."""
    is_host = (user_id is not None and user_id == meeting.host_id)
    role = "host" if is_host else "participant"

    participant = Participant(
        meeting_id=meeting.id,
        user_id=user_id,
        display_name=display_name,
        role=role,
        is_muted=False,
        is_video_off=False
    )
    db.add(participant)
    if meeting.status == "upcoming":
        meeting.status = "active"
        if not meeting.started_at:
            meeting.started_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(participant)
    return participant

def update_participant_state(
    db: Session,
    participant_id: int,
    is_muted: bool | None = None,
    is_video_off: bool | None = None,
    is_hand_raised: bool | None = None
) -> Participant | None:
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if not participant:
        return None
    if is_muted is not None:
        participant.is_muted = is_muted
    if is_video_off is not None:
        participant.is_video_off = is_video_off
    if is_hand_raised is not None:
        participant.is_hand_raised = is_hand_raised
    db.commit()
    db.refresh(participant)
    return participant

def mute_all_participants(db: Session, meeting_id: int, exclude_host: bool = True) -> int:
    """Host control: Mute all non-host participants."""
    query = db.query(Participant).filter(
        Participant.meeting_id == meeting_id,
        Participant.left_at.is_(None)
    )
    if exclude_host:
        query = query.filter(Participant.role != "host")
    count = query.update({Participant.is_muted: True}, synchronize_session=False)
    db.commit()
    return count

def remove_participant_record(db: Session, participant_id: int) -> bool:
    """Mark participant as left or remove."""
    p = db.query(Participant).filter(Participant.id == participant_id).first()
    if p:
        p.left_at = datetime.datetime.utcnow()
        db.commit()
        return True
    return False

def end_meeting(db: Session, meeting: Meeting) -> Meeting:
    """End the meeting for all participants."""
    meeting.status = "ended"
    meeting.ended_at = datetime.datetime.utcnow()
    # Mark participants as left
    db.query(Participant).filter(
        Participant.meeting_id == meeting.id,
        Participant.left_at.is_(None)
    ).update({Participant.left_at: datetime.datetime.utcnow()}, synchronize_session=False)
    db.commit()
    db.refresh(meeting)
    return meeting

def add_chat_message(
    db: Session,
    meeting_id: int,
    sender_id: str,
    sender_name: str,
    message: str,
    recipient: str = "everyone"
) -> ChatMessage:
    msg = ChatMessage(
        meeting_id=meeting_id,
        sender_id=sender_id,
        sender_name=sender_name,
        recipient=recipient,
        message=message
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg

def get_meeting_messages(db: Session, meeting_id: int) -> list[ChatMessage]:
    return db.query(ChatMessage).filter(ChatMessage.meeting_id == meeting_id).order_by(asc(ChatMessage.timestamp)).all()
