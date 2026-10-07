import json
import logging
from typing import Dict, Any
from fastapi import WebSocket

logger = logging.getLogger("zoom_signaling")

class ConnectionManager:
    def __init__(self):
        # meeting_id -> { peer_id: WebSocket }
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}
        # meeting_id -> { peer_id: { "display_name": str, "role": str, "is_muted": bool, "is_video_off": bool, "is_hand_raised": bool } }
        self.peer_metadata: Dict[str, Dict[str, Dict[str, Any]]] = {}

    async def connect(
        self,
        meeting_id: str,
        peer_id: str,
        websocket: WebSocket,
        display_name: str,
        role: str = "participant",
        is_muted: bool = False,
        is_video_off: bool = False
    ):
        await websocket.accept()
        if meeting_id not in self.active_connections:
            self.active_connections[meeting_id] = {}
            self.peer_metadata[meeting_id] = {}

        self.active_connections[meeting_id][peer_id] = websocket
        self.peer_metadata[meeting_id][peer_id] = {
            "peer_id": peer_id,
            "display_name": display_name,
            "role": role,
            "is_muted": is_muted,
            "is_video_off": is_video_off,
            "is_hand_raised": False
        }

        # Send newcomer the list of existing peers
        existing_peers = [
            meta for pid, meta in self.peer_metadata[meeting_id].items() if pid != peer_id
        ]
        await websocket.send_text(json.dumps({
            "type": "room-info",
            "self": self.peer_metadata[meeting_id][peer_id],
            "existing_peers": existing_peers
        }))

        # Notify existing peers that this user joined
        await self.broadcast(meeting_id, {
            "type": "user-joined",
            "peer": self.peer_metadata[meeting_id][peer_id]
        }, exclude_peer=peer_id)

    async def disconnect(self, meeting_id: str, peer_id: str):
        if meeting_id in self.active_connections:
            if peer_id in self.active_connections[meeting_id]:
                del self.active_connections[meeting_id][peer_id]
            if peer_id in self.peer_metadata.get(meeting_id, {}):
                meta = self.peer_metadata[meeting_id].pop(peer_id)
                # Notify remaining peers
                await self.broadcast(meeting_id, {
                    "type": "user-left",
                    "peer_id": peer_id,
                    "display_name": meta.get("display_name", "A participant")
                })

            if not self.active_connections[meeting_id]:
                del self.active_connections[meeting_id]
                if meeting_id in self.peer_metadata:
                    del self.peer_metadata[meeting_id]

    async def send_direct(self, meeting_id: str, target_peer_id: str, message: dict):
        """Send message directly to a target peer."""
        if meeting_id in self.active_connections:
            ws = self.active_connections[meeting_id].get(target_peer_id)
            if ws:
                try:
                    await ws.send_text(json.dumps(message))
                except Exception as e:
                    logger.error(f"Error sending direct message to {target_peer_id}: {e}")

    async def broadcast(self, meeting_id: str, message: dict, exclude_peer: str | None = None):
        """Broadcast message to all connected peers in meeting."""
        if meeting_id in self.active_connections:
            payload = json.dumps(message)
            for pid, ws in list(self.active_connections[meeting_id].items()):
                if exclude_peer and pid == exclude_peer:
                    continue
                try:
                    await ws.send_text(payload)
                except Exception as e:
                    logger.error(f"Error broadcasting to {pid}: {e}")

    def update_metadata(self, meeting_id: str, peer_id: str, key: str, value: Any):
        if meeting_id in self.peer_metadata and peer_id in self.peer_metadata[meeting_id]:
            self.peer_metadata[meeting_id][peer_id][key] = value

    def get_participants(self, meeting_id: str) -> list[dict]:
        if meeting_id in self.peer_metadata:
            return list(self.peer_metadata[meeting_id].values())
        return []

ws_manager = ConnectionManager()
