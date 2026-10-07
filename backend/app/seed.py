import datetime
from sqlalchemy.orm import Session
from app.database import SessionLocal, Base, engine
from app.models import User, Meeting, Participant, ChatMessage
from app.crud import get_or_create_default_user, generate_zoom_meeting_id, generate_passcode

def seed_database():
    """Initializes tables and populates realistic seed data."""
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # Check if already seeded
        existing_meetings = db.query(Meeting).count()
        if existing_meetings > 0:
            print("Database already seeded with meetings.")
            return

        print("Seeding database with default user and sample meetings...")

        # 1. Host User
        host = get_or_create_default_user(db)

        # 2. Additional team users
        users_data = [
            ("Sarah Chen (Product)", "sarah.chen@zoomclone.app", "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80"),
            ("Michael Scott (Eng Lead)", "michael.scott@zoomclone.app", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80"),
            ("Emily Davis (UX Design)", "emily.davis@zoomclone.app", "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=256&q=80"),
            ("David Kim (Fullstack)", "david.kim@zoomclone.app", "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80")
        ]
        created_users = [host]
        for name, email, avatar in users_data:
            u = db.query(User).filter(User.email == email).first()
            if not u:
                u = User(name=name, email=email, avatar_url=avatar, role="member")
                db.add(u)
                db.commit()
                db.refresh(u)
            created_users.append(u)

        now = datetime.datetime.utcnow()

        # 3. Upcoming Meetings
        upcoming_samples = [
            {
                "title": "Weekly Sprint Planning & Review",
                "description": "Review current sprint progress, blockers, and backlog prioritization.",
                "delta": datetime.timedelta(hours=1, minutes=30),
                "duration": 45,
                "meeting_id": "8349281042"
            },
            {
                "title": "Frontend Architecture & WebRTC Deep Dive",
                "description": "Technical discussion on peer-to-peer audio/video streaming and latency tuning.",
                "delta": datetime.timedelta(hours=4),
                "duration": 60,
                "meeting_id": "9124018593"
            },
            {
                "title": "Design System & Zoom UI Review",
                "description": "Evaluate icon fidelity, dark mode color grading, and responsive layouts.",
                "delta": datetime.timedelta(days=1, hours=2),
                "duration": 30,
                "meeting_id": "7483921045"
            },
            {
                "title": "Q4 Roadmap & Leadership Sync",
                "description": "Executive alignment on milestones, cloud deployment, and hiring targets.",
                "delta": datetime.timedelta(days=2, hours=5),
                "duration": 60,
                "meeting_id": "6293847190"
            }
        ]

        for s in upcoming_samples:
            m = Meeting(
                meeting_id=s["meeting_id"],
                title=s["title"],
                description=s["description"],
                host_id=host.id,
                meeting_type="scheduled",
                status="upcoming",
                scheduled_start_time=now + s["delta"],
                duration_minutes=s["duration"],
                passcode=generate_passcode(),
                invite_link=f"/meeting/{s['meeting_id']}",
                created_at=now - datetime.timedelta(hours=3)
            )
            db.add(m)
            db.commit()
            db.refresh(m)

            # Add host participant
            p = Participant(
                meeting_id=m.id,
                user_id=host.id,
                display_name=host.name,
                role="host"
            )
            db.add(p)
            db.commit()

        # 4. Recent Past Meetings
        recent_samples = [
            {
                "title": "Daily Standup - Core Services",
                "description": "Quick round-robin updates from frontend and backend engineers.",
                "delta_ago": datetime.timedelta(days=1, hours=3),
                "duration": 25,
                "meeting_id": "4920193841"
            },
            {
                "title": "Client Demo - Real-time Collaboration",
                "description": "Demonstration of live screen sharing, host mute controls, and meeting chat.",
                "delta_ago": datetime.timedelta(days=2, hours=1),
                "duration": 40,
                "meeting_id": "3049182745"
            },
            {
                "title": "Backend API & SQLite Schema Walkthrough",
                "description": "Architecture sign-off on database indexing, relational cascades, and WebSocket signaling.",
                "delta_ago": datetime.timedelta(days=3, hours=4),
                "duration": 50,
                "meeting_id": "1829472019"
            }
        ]

        for r in recent_samples:
            started = now - r["delta_ago"]
            ended = started + datetime.timedelta(minutes=r["duration"])
            m = Meeting(
                meeting_id=r["meeting_id"],
                title=r["title"],
                description=r["description"],
                host_id=host.id,
                meeting_type="scheduled",
                status="ended",
                scheduled_start_time=started,
                duration_minutes=r["duration"],
                passcode=generate_passcode(),
                invite_link=f"/meeting/{r['meeting_id']}",
                created_at=started - datetime.timedelta(days=1),
                started_at=started,
                ended_at=ended
            )
            db.add(m)
            db.commit()
            db.refresh(m)

            # Add participants
            for u in created_users[:3]:
                p = Participant(
                    meeting_id=m.id,
                    user_id=u.id,
                    display_name=u.name,
                    role="host" if u.id == host.id else "participant",
                    joined_at=started,
                    left_at=ended
                )
                db.add(p)

            # Add sample messages
            sample_chat = [
                (host.name, "Welcome everyone, let's get started promptly."),
                (created_users[1].name, "I have uploaded the latest slides to the drive."),
                (created_users[2].name, "Audio and screen share look crisp! Proceeding with agenda.")
            ]
            for sname, smsg in sample_chat:
                msg = ChatMessage(
                    meeting_id=m.id,
                    sender_id=str(host.id),
                    sender_name=sname,
                    recipient="everyone",
                    message=smsg,
                    timestamp=started + datetime.timedelta(minutes=3)
                )
                db.add(msg)

            db.commit()

        print("Database seeded successfully with realistic meetings and users!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
