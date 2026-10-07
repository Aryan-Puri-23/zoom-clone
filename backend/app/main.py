import json
import logging
import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.config import settings
from app.database import engine, Base, get_db
from app.routes.meetings import router as meetings_router
from app.routes.users import router as users_router
from app.seed import seed_database
from app.websocket_manager import ws_manager
from app.crud import (
    get_meeting_by_meeting_id,
    add_chat_message,
    end_meeting,
    mute_all_participants,
    remove_participant_record
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("zoom_backend")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist and seed sample data
    logger.info("Initializing database and seeding data...")
    Base.metadata.create_all(bind=engine)
    seed_database()
    logger.info("Database ready!")
    yield
    logger.info("Application shutting down...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount REST API Routers
app.include_router(meetings_router, prefix=settings.API_V1_STR)
app.include_router(users_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "message": "Zoom Clone Video Conferencing Platform API",
        "docs": "/docs",
        "health": "/health",
        "version": settings.PROJECT_VERSION
    }

@app.get("/health")
@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "zoom-clone-backend"}

# Real-time WebSocket for WebRTC Signaling & Meeting Controls
@app.websocket("/ws/meeting/{meeting_id}/{peer_id}")
async def websocket_meeting_endpoint(
    websocket: WebSocket,
    meeting_id: str,
    peer_id: str,
    name: str = Query("Guest"),
    role: str = Query("participant"),
    db: Session = Depends(get_db)
):
    clean_meeting_id = meeting_id.replace("-", "").replace(" ", "")
    
    await ws_manager.connect(
        meeting_id=clean_meeting_id,
        peer_id=peer_id,
        websocket=websocket,
        display_name=name,
        role=role
    )
    
    try:
        while True:
            raw_data = await websocket.receive_text()
            try:
                data = json.loads(raw_data)
            except Exception:
                continue

            msg_type = data.get("type")

            # 1. WebRTC Signaling: Offer, Answer, ICE Candidate forwarding
            if msg_type in ["offer", "answer", "ice-candidate"]:
                target_peer = data.get("target")
                if target_peer:
                    # Forward with origin sender identity
                    data["sender"] = peer_id
                    data["sender_name"] = name
                    await ws_manager.send_direct(clean_meeting_id, target_peer, data)

            # 2. Participant State Updates (Audio / Video / Hand raise)
            elif msg_type == "state-change":
                key = data.get("key")
                val = data.get("value")
                if key:
                    ws_manager.update_metadata(clean_meeting_id, peer_id, key, val)
                    await ws_manager.broadcast(clean_meeting_id, {
                        "type": "peer-state-changed",
                        "peer_id": peer_id,
                        "key": key,
                        "value": val
                    })

            # 3. Meeting Chat Message
            elif msg_type == "chat-message":
                chat_text = data.get("message", "").strip()
                recipient = data.get("recipient", "everyone")
                if chat_text:
                    meeting = get_meeting_by_meeting_id(db, clean_meeting_id)
                    if meeting:
                        add_chat_message(
                            db=db,
                            meeting_id=meeting.id,
                            sender_id=peer_id,
                            sender_name=name,
                            message=chat_text,
                            recipient=recipient
                        )
                    payload = {
                        "type": "chat-broadcast",
                        "sender_id": peer_id,
                        "sender_name": name,
                        "message": chat_text,
                        "recipient": recipient,
                        "timestamp": datetime.datetime.utcnow().isoformat()
                    }
                    if recipient == "everyone":
                        await ws_manager.broadcast(clean_meeting_id, payload)
                    else:
                        # Private message: send to target and echo to sender
                        await ws_manager.send_direct(clean_meeting_id, recipient, payload)
                        await websocket.send_text(json.dumps(payload))

            # 4. Reaction Broadcast
            elif msg_type == "reaction":
                emoji = data.get("emoji", "👍")
                await ws_manager.broadcast(clean_meeting_id, {
                    "type": "reaction-broadcast",
                    "peer_id": peer_id,
                    "sender_name": name,
                    "emoji": emoji
                })

            # 5. Host Control: Mute All
            elif msg_type == "mute-all":
                if role == "host":
                    meeting = get_meeting_by_meeting_id(db, clean_meeting_id)
                    if meeting:
                        mute_all_participants(db, meeting.id)
                    await ws_manager.broadcast(clean_meeting_id, {
                        "type": "force-mute",
                        "initiated_by": name
                    }, exclude_peer=peer_id)

            # 6. Host Control: Remove Participant
            elif msg_type == "remove-peer":
                if role == "host":
                    target_peer = data.get("target_peer_id")
                    if target_peer:
                        await ws_manager.send_direct(clean_meeting_id, target_peer, {
                            "type": "removed-by-host",
                            "reason": "You have been removed from the meeting by the host."
                        })

            # 7. Host Control: End Meeting For All
            elif msg_type == "end-meeting":
                if role == "host":
                    meeting = get_meeting_by_meeting_id(db, clean_meeting_id)
                    if meeting:
                        end_meeting(db, meeting)
                    await ws_manager.broadcast(clean_meeting_id, {
                        "type": "meeting-ended-by-host"
                    })

    except WebSocketDisconnect:
        await ws_manager.disconnect(clean_meeting_id, peer_id)
    except Exception as e:
        logger.error(f"WebSocket exception for peer {peer_id}: {e}")
        await ws_manager.disconnect(clean_meeting_id, peer_id)
