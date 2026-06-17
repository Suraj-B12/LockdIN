"""Ephemeral in-room chat — deliberately NOT persisted.

A process-local ring buffer per room (collections.deque), guarded by a Lock,
mirroring services/cache.py. Messages get a server-assigned monotonic id + ts so
clients can poll with ?after=<id> and can't forge ordering. Lazy TTL eviction
bounds memory: a room's buffer is dropped when its newest message is older than
_TTL_SECONDS (checked on every access). Wiped on restart by design — the chat is
meant to be throwaway company for one session.

Single-worker / single-instance only (see render.yaml — uvicorn with no
--workers). If ever scaled horizontally this fragments per process, the same
caveat already documented for services/cache.py.
"""

import time
from collections import deque
from threading import Lock

_MAX_PER_ROOM = 50           # ring-buffer cap per room
_TTL_SECONDS = 60 * 60       # drop a room's buffer 1h after its last message

# room_id -> {"buf": deque[dict], "seq": int}
_rooms: dict[str, dict] = {}
_lock = Lock()


def _evict_locked(now: float) -> None:
    """Drop buffers whose newest message is stale. Caller must hold _lock."""
    stale = [
        rid for rid, rec in _rooms.items()
        if not rec["buf"] or (now - rec["buf"][-1]["ts"]) > _TTL_SECONDS
    ]
    for rid in stale:
        _rooms.pop(rid, None)


def post(room_id: str, user_id: str, display_name: str, text: str) -> dict:
    """Append a message with a server-assigned id + timestamp; return it."""
    now = time.time()
    with _lock:
        _evict_locked(now)
        rec = _rooms.get(room_id)
        if rec is None:
            rec = {"buf": deque(maxlen=_MAX_PER_ROOM), "seq": 0}
            _rooms[room_id] = rec
        rec["seq"] += 1
        msg = {
            "id": rec["seq"],
            "user_id": user_id,
            "display_name": display_name,
            "text": text,
            "ts": now,
        }
        rec["buf"].append(msg)
        return dict(msg)


def since(room_id: str, after_id: int = 0) -> tuple[list[dict], int]:
    """Return (messages with id > after_id, latest id). Empty + 0 on cold start."""
    now = time.time()
    with _lock:
        _evict_locked(now)
        rec = _rooms.get(room_id)
        if rec is None:
            return [], 0
        msgs = [dict(m) for m in rec["buf"] if m["id"] > after_id]
        return msgs, rec["seq"]
