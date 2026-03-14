import asyncio
import os
import re
import uuid
from datetime import datetime, timezone
from typing import List, Optional

import jwt
import resend
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from fastapi.responses import FileResponse, RedirectResponse, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from auth_helpers import get_current_user, require_verified_email
from rate_limits import limiter, LIMIT_PUBLIC_POSTING, LIMIT_UPLOADS
from cloudinary_storage import (
    _is_configured as cloudinary_configured,
    FOLDER_RESTRICTED_MESSAGES,
    upload_media as cloudinary_upload,
    upload_media_restricted as cloudinary_upload_restricted,
    generate_signed_url as cloudinary_generate_signed_url,
)
from database import db, MEDIA_DIR, JWT_SECRET, JWT_ALGORITHM, SENDER_EMAIL, FRONTEND_URL, logger
from models import MessageCreate, MessageResponse, ConversationResponse
from utils import create_notification, send_push_notification, bloom_email_html, sanitize_html

router = APIRouter()

_optional_bearer = HTTPBearer(auto_error=False)

MEDIA_TYPE_MAP = {
    "m4a": "audio/mp4",
    "mp4": "audio/mp4",
    "mp3": "audio/mpeg",
    "webm": "audio/webm",
    "ogg": "audio/ogg",
    "wav": "audio/wav",
}


@router.api_route("/media/messages/{filename}", methods=["GET", "HEAD"])
async def serve_message_media(
    request: Request,
    filename: str,
    token: Optional[str] = None,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
):
    """Serve message media file. Supports GET, HEAD, and Range requests for iOS AVPlayer.
    Legacy endpoint: requires requester to be sender or recipient of the message containing this media.
    """
    jwt_token = credentials.credentials if credentials else token or request.query_params.get("token")
    if not jwt_token:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        payload = jwt.decode(jwt_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        requester_id = payload.get("user_id")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    if not requester_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    safe_filename = os.path.basename(filename)
    if not safe_filename or safe_filename != filename or ".." in safe_filename or "/" in safe_filename or "\\" in safe_filename:
        raise HTTPException(status_code=400, detail="Neplatná cesta k souboru")
    file_path = MEDIA_DIR / safe_filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Soubor nenalezen")

    # Legacy media: verify requester is sender or recipient of message containing this file
    escaped = re.escape(safe_filename)
    pattern = r"(^|/)" + escaped + r"($|\?.*)$"
    msg = await db.messages.find_one(
        {"media_url": {"$regex": pattern}},
        {"_id": 0, "from_user_id": 1, "to_user_id": 1},
    )
    if not msg or (requester_id != msg["from_user_id"] and requester_id != msg["to_user_id"]):
        raise HTTPException(status_code=403, detail="Přístup odepřen")

    try:
        resolved = file_path.resolve()
        base = MEDIA_DIR.resolve()
        if not str(resolved).startswith(str(base)):
            raise HTTPException(status_code=400, detail="Neplatná cesta k souboru")
    except (OSError, ValueError):
        raise HTTPException(status_code=400, detail="Neplatná cesta k souboru")
    ext = safe_filename.lower().rsplit(".", 1)[-1] if "." in safe_filename else ""
    media_type = MEDIA_TYPE_MAP.get(ext)
    size = file_path.stat().st_size

    range_header = request.headers.get("range")
    if range_header and range_header.startswith("bytes="):
        m = re.match(r"bytes=(\d*)-(\d*)", range_header)
        if m:
            start = int(m.group(1)) if m.group(1) else 0
            end = int(m.group(2)) if m.group(2) else size - 1
            end = min(end, size - 1)
            if start > end or start < 0:
                return Response(status_code=416, headers={"Content-Range": f"bytes */{size}"})
            content = await asyncio.to_thread(_read_file_range, file_path, start, end)
            body_len = len(content)
            headers = {
                "Content-Type": media_type or "application/octet-stream",
                "Content-Length": str(body_len),
                "Content-Range": f"bytes {start}-{end}/{size}",
                "Accept-Ranges": "bytes",
            }
            return Response(content=content, status_code=206, headers=headers)

    content = await asyncio.to_thread(file_path.read_bytes) if request.method == "GET" else b""
    headers = {
        "Content-Type": media_type or "application/octet-stream",
        "Content-Length": str(size),
        "Accept-Ranges": "bytes",
    }
    return Response(content=content, status_code=200, headers=headers)


def _read_file_range(path, start: int, end: int) -> bytes:
    with open(path, "rb") as f:
        f.seek(start)
        return f.read(end - start + 1)


@router.get("/media/restricted/messages/{message_id}")
async def serve_restricted_message_media(
    request: Request,
    message_id: str,
    token: Optional[str] = None,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
):
    """
    Serve restricted message media. Only sender or recipient may access.
    Admin gets 403 unless admin is literally a participant.
    Returns 302 redirect to short-lived signed Cloudinary URL.
    Accepts Bearer header or ?token= query (for img/video/audio src).
    """
    jwt_token = credentials.credentials if credentials else token or request.query_params.get("token")
    if not jwt_token:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        payload = jwt.decode(jwt_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        requester_id = payload.get("user_id")
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    if not requester_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    msg = await db.messages.find_one({"id": message_id}, {"_id": 0, "from_user_id": 1, "to_user_id": 1, "media_public_id": 1, "media_resource_type": 1})
    if not msg:
        raise HTTPException(status_code=404, detail="Zpráva nenalezena")
    if not msg.get("media_public_id") or not msg.get("media_resource_type"):
        raise HTTPException(status_code=404, detail="Média nenalezena")

    from_user = msg["from_user_id"]
    to_user = msg["to_user_id"]
    if requester_id != from_user and requester_id != to_user:
        raise HTTPException(status_code=403, detail="Přístup odepřen")

    signed_url = cloudinary_generate_signed_url(
        public_id=msg["media_public_id"],
        resource_type=msg["media_resource_type"],
    )
    if not signed_url:
        raise HTTPException(status_code=503, detail="Nelze vygenerovat odkaz")
    return RedirectResponse(url=signed_url, status_code=302)


@router.post("/messages/upload-media")
@limiter.limit(LIMIT_UPLOADS)
async def upload_message_media(request: Request, file: UploadFile = File(...), user: dict = Depends(require_verified_email)):
    """Upload image, video or audio for a message. Returns the media URL."""
    ct = (file.content_type or "").split(";")[0].strip().lower()
    allowed_types = {"image/jpeg", "image/png", "image/gif", "video/mp4", "video/webm",
                     "audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav", "audio/x-m4a"}
    if ct not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Nepodporovaný formát '{ct}'. Povoleno: jpg, png, gif, mp4, webm, audio")
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Soubor je příliš velký (max 10 MB)")
    if not cloudinary_configured():
        raise HTTPException(status_code=503, detail="Media storage not configured. Set CLOUDINARY_* in backend/.env")
    if ct.startswith("image"):
        resource_type = "image"
        media_type = "image"
    elif ct.startswith("audio"):
        resource_type = "raw"
        media_type = "audio"
    else:
        resource_type = "video"
        media_type = "video"
    # RESTRICTED: store in Cloudinary type=authenticated, no public URL
    result = cloudinary_upload_restricted(
        content, folder=FOLDER_RESTRICTED_MESSAGES, resource_type=resource_type
    )
    if not result:
        raise HTTPException(status_code=503, detail="Upload failed")
    return {
        "media_access_type": "restricted",
        "media_public_id": result["public_id"],
        "media_resource_type": result["resource_type"],
        "media_type": media_type,
    }


@router.get("/messages/unread-count")
async def get_unread_count(user: dict = Depends(get_current_user)):
    count = await db.messages.count_documents({"to_user_id": user["id"], "read": False})
    return {"count": count}


@router.get("/notifications")
async def get_notifications(user: dict = Depends(get_current_user)):
    notifications = await db.notifications.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return notifications


@router.put("/notifications/read-all")
async def mark_all_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"], "read": False}, {"$set": {"read": True}})
    return {"message": "Všechna oznámení přečtena"}


@router.post("/messages", response_model=MessageResponse)
@limiter.limit(LIMIT_PUBLIC_POSTING)
async def send_message(request: Request, message: MessageCreate, user: dict = Depends(require_verified_email)):
    to_user = await db.users.find_one({"id": message.to_user_id}, {"_id": 0})
    if not to_user:
        raise HTTPException(status_code=404, detail="Příjemce nenalezen")

    message_id = str(uuid.uuid4())
    # Restricted: store public_id, resource_type; media_url will be backend path in API response
    # Legacy: store media_url (public Cloudinary URL)
    media_url = message.media_url or ""
    media_public_id = (message.media_public_id or "").strip()
    media_resource_type = (message.media_resource_type or "").strip()
    if media_public_id and media_resource_type:
        media_url = ""  # Restricted: no raw URL stored
    message_doc = {
        "id": message_id,
        "from_user_id": user["id"],
        "from_username": user["username"],
        "to_user_id": message.to_user_id,
        "to_username": to_user["username"],
        "content": sanitize_html(message.content or ""),
        "media_url": media_url,
        "media_type": message.media_type or "",
        "media_public_id": media_public_id or None,
        "media_resource_type": media_resource_type or None,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.messages.insert_one(message_doc)

    preview = (
        message.content[:80]
        if message.content
        else ("[Obrázek]" if message.media_type == "image" else "[Video]" if message.media_type == "video" else "[Hlas]" if message.media_type == "audio" else "")
    )
    await create_notification(
        user_id=message.to_user_id,
        type="message",
        title="Nová zpráva",
        message=f'{user["username"]}: {preview}',
        link="/messages",
    )

    if resend.api_key and to_user.get("email"):
        try:
            msg_preview = (
                message.content[:100] + ("..." if len(message.content) > 100 else "")
                if message.content
                else ("[Obrázek]" if message.media_type == "image" else "[Video]" if message.media_type == "video" else "[Hlas]" if message.media_type == "audio" else "")
            )
            messages_url = f"{FRONTEND_URL}/messages"
            html_email = bloom_email_html(f"""
<p style="color: #5D6472; font-size: 13px; margin: 0 0 20px;">Nová zpráva od {user["username"]}</p>
<div style="background: #F4F4F8; border-radius: 8px; padding: 16px; margin-bottom: 20px; border-left: 3px solid #8A7CFF;">
  <p style="color: #2F3441; margin: 0; font-size: 14px;">"{msg_preview}"</p>
</div>
<div style="text-align: center; margin: 24px 0;">
  <a href="{messages_url}" style="background: #8A7CFF; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">Odpovědět na zprávu</a>
</div>
""")
            await asyncio.to_thread(
                resend.Emails.send,
                {
                    "from": SENDER_EMAIL,
                    "to": [to_user["email"]],
                    "subject": f"Bloom – Nová zpráva od {user['username']}",
                    "html": html_email,
                    "text": f"Nova zprava od {user['username']} na Bloom:\n\n{msg_preview}\n\nOdpovedet: {messages_url}",
                },
            )
        except Exception as e:
            logger.warning(f"Message email notification failed for {to_user.get('email')}: {e}")

    push_body = f"{user['username']}: {preview}" if preview else f"Nová zpráva od {user['username']}"
    asyncio.create_task(send_push_notification(
        message.to_user_id,
        "Nová zpráva – Bloom",
        push_body,
        url="/messages",
        notif_type="message",
    ))

    return MessageResponse(**message_doc)


@router.get("/messages/conversations", response_model=List[ConversationResponse])
async def get_conversations(user: dict = Depends(get_current_user)):
    messages = await db.messages.find(
        {"$or": [{"from_user_id": user["id"]}, {"to_user_id": user["id"]}]},
        {"_id": 0, "id": 1, "from_user_id": 1, "to_user_id": 1, "content": 1, "created_at": 1, "read": 1, "media_type": 1, "media_url": 1}
    ).sort("created_at", -1).to_list(500)

    # Batch-fetch all other users to avoid N+1 queries
    other_user_ids = list(set(
        msg["to_user_id"] if msg["from_user_id"] == user["id"] else msg["from_user_id"]
        for msg in messages
    ))
    users_list = await db.users.find({"id": {"$in": other_user_ids}}, {"_id": 0, "id": 1, "username": 1, "avatar": 1}).to_list(len(other_user_ids))
    users_map = {u["id"]: u for u in users_list}

    conversations = {}
    for msg in messages:
        other_user_id = msg["to_user_id"] if msg["from_user_id"] == user["id"] else msg["from_user_id"]
        if other_user_id not in conversations:
            other_user = users_map.get(other_user_id)
            if other_user:
                unread_count = len(
                    [m for m in messages if m["from_user_id"] == other_user_id and m["to_user_id"] == user["id"] and not m["read"]]
                )
                conversations[other_user_id] = {
                    "user_id": other_user_id,
                    "username": other_user["username"],
                    "avatar": other_user.get("avatar", "fem-pink"),
                    "last_message": (
                        msg.get("content", "")[:50]
                        if msg.get("content")
                        else ("[Obrázek]" if msg.get("media_type") == "image" else "[Video]" if msg.get("media_type") == "video" else "[Hlas]" if msg.get("media_type") == "audio" else "")
                    ),
                    "last_message_time": msg["created_at"],
                    "unread_count": unread_count,
                }

    return [ConversationResponse(**c) for c in conversations.values()]


@router.get("/messages/{other_user_id}", response_model=List[MessageResponse])
async def get_messages_with_user(other_user_id: str, user: dict = Depends(get_current_user)):
    messages = await db.messages.find(
        {
            "$or": [
                {"from_user_id": user["id"], "to_user_id": other_user_id},
                {"from_user_id": other_user_id, "to_user_id": user["id"]},
            ]
        },
        {"_id": 0},
    ).sort("created_at", 1).to_list(200)

    await db.messages.update_many(
        {"from_user_id": other_user_id, "to_user_id": user["id"], "read": False},
        {"$set": {"read": True}},
    )

    for m in messages:
        if m.get("media_public_id") and m.get("media_resource_type"):
            m["media_url"] = f"/api/media/restricted/messages/{m['id']}"
        elif not m.get("media_url") and (m.get("media_public_id") or m.get("media_type")):
            m["media_url"] = f"/api/media/restricted/messages/{m['id']}"

    return [MessageResponse(**{k: v for k, v in m.items() if k not in ("media_public_id", "media_resource_type")}) for m in messages]


@router.delete("/messages/{message_id}")
async def delete_message(message_id: str, user: dict = Depends(get_current_user)):
    """Delete a message. Only sender or recipient may delete."""
    msg = await db.messages.find_one({"id": message_id}, {"_id": 0, "from_user_id": 1, "to_user_id": 1})
    if not msg:
        raise HTTPException(status_code=404, detail="Zpráva nenalezena")
    if user["id"] != msg["from_user_id"] and user["id"] != msg["to_user_id"]:
        raise HTTPException(status_code=403, detail="Přístup odepřen")
    result = await db.messages.delete_one({"id": message_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Zpráva nenalezena")
    return {"message": "Zpráva smazána"}
