import os

class Settings:
    PROJECT_NAME: str = "Zoom Clone Video Conferencing API"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # SQLite Database URL
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./zoom_clone.db")
    
    # CORS Origins (support local Next.js frontend dev & production)
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "*"
    ]
    
    # Default User Details (as per assignment specification: assume default user is logged in)
    DEFAULT_USER_EMAIL: str = "alex.johnson@zoomclone.app"
    DEFAULT_USER_NAME: str = "Alex Johnson (Host)"
    DEFAULT_USER_AVATAR: str = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80"

settings = Settings()
