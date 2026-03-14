import uuid
import json as json_stdlib
from datetime import datetime, timezone
from urllib.parse import urlparse

from fastapi import HTTPException

from database import db, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY_FILE, VAPID_CLAIMS_EMAIL, FRONTEND_URL

_SAFE_SCHEMES = frozenset(("http", "https"))


def validate_safe_url(url: str, field_name: str = "URL") -> str:
    """Validate that URL uses only http/https. Returns stripped URL or empty string. Raises HTTPException if invalid."""
    if not url or not (s := url.strip()):
        return ""
    parsed = urlparse(s)
    scheme = (parsed.scheme or "").lower()
    if scheme not in _SAFE_SCHEMES:
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} musí začínat na http:// nebo https://. Nepovolené schéma: {scheme or '(žádné)'}",
        )
    return s

_BLOOM_GRADIENT = "linear-gradient(90deg, #5BCEFA 0%, #F5A9B8 25%, #FFFFFF 50%, #F5A9B8 75%, #5BCEFA 100%)"

# Maps push notification type to the notification_prefs field key
_PREF_KEY = {"message": "messages", "service": "services", "news": "news"}


def bloom_email_html(body_html: str) -> str:
    """Wrap email body content in the standard Bloom gradient template."""
    return (
        '<div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;'
        ' background: #FCFBFF; padding: 40px 32px; border-radius: 12px;">'
        f'<div style="height: 4px; background: {_BLOOM_GRADIENT}; border-radius: 2px; margin-bottom: 28px;"></div>'
        '<h1 style="color: #8A7CFF; font-size: 26px; margin: 0 0 24px; font-weight: 700;">Bloom</h1>'
        f'{body_html}'
        f'<div style="height: 4px; background: {_BLOOM_GRADIENT}; border-radius: 2px; margin-top: 24px;"></div>'
        '</div>'
    )


async def create_notification(user_id: str, type: str, title: str, message: str, link: str = ""):
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": type,
        "title": title,
        "message": message,
        "link": link,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })


def _do_webpush(sub_info, payload, private_key, claims):
    """Synchronous webpush call — run in background task."""
    from pywebpush import webpush
    webpush(
        subscription_info=sub_info,
        data=payload,
        vapid_private_key=private_key,
        vapid_claims=claims,
    )


async def send_push_notification(recipient_user_id: str, title: str, body: str,
                                  url: str = "/messages", notif_type: str = "message"):
    """Send a push notification to a single user (all their devices)."""
    if not VAPID_PUBLIC_KEY or not VAPID_PRIVATE_KEY_FILE:
        return
    # Check user's notification preference (default: enabled)
    pref_key = _PREF_KEY.get(notif_type)
    if pref_key:
        user_doc = await db.users.find_one({"id": recipient_user_id}, {"_id": 0, "notification_prefs": 1})
        prefs = (user_doc or {}).get("notification_prefs", {})
        if prefs.get(pref_key, True) is False:
            return
    subs = await db.push_subscriptions.find({"user_id": recipient_user_id}).to_list(20)
    if not subs:
        return
    try:
        from pywebpush import WebPushException
        payload = json_stdlib.dumps({
            "title": title, "body": body,
            "url": f"{FRONTEND_URL}{url}", "type": notif_type
        })
        for sub in subs:
            try:
                _do_webpush(sub["subscription"], payload, VAPID_PRIVATE_KEY_FILE, {"sub": VAPID_CLAIMS_EMAIL})
            except WebPushException as exc:
                if "410" in str(exc) or "404" in str(exc):
                    await db.push_subscriptions.delete_one({"_id": sub.get("_id")})
            except Exception:
                pass
    except Exception:
        pass


_ALLOWED_HTML_TAGS = [
    'h1', 'h2', 'h3', 'p', 'strong', 'em', 'b', 'i',
    'ul', 'ol', 'li', 'a', 'br', 'span',
    'table', 'thead', 'tbody', 'tr', 'td', 'th',
]
_ALLOWED_HTML_ATTRS = {
    'a': ['href', 'title', 'target'],
    'td': ['colspan', 'rowspan', 'style'],
    'th': ['colspan', 'rowspan', 'style'],
    'table': ['style'],
    'span': ['style'],
    'p': ['style'],
}


def sanitize_html(content: str) -> str:
    """Strip unsafe tags/attributes from user-supplied HTML. Allows only safe formatting tags."""
    if not content:
        return content
    import bleach
    return bleach.clean(content, tags=_ALLOWED_HTML_TAGS, attributes=_ALLOWED_HTML_ATTRS, strip=True)


async def send_broadcast_push_notification(title: str, body: str, url: str = "/",
                                            exclude_user_id: str = "", notif_type: str = ""):
    """Send a push notification to ALL subscribed users (broadcast), respecting per-user preferences."""
    if not VAPID_PUBLIC_KEY or not VAPID_PRIVATE_KEY_FILE:
        return
    # Infer type from URL if not provided
    if not notif_type:
        if "/news" in url:
            notif_type = "news"
        elif "/support" in url:
            notif_type = "service"
        else:
            notif_type = "message"
    # Fetch user_ids who have explicitly disabled this notification type
    pref_key = _PREF_KEY.get(notif_type)
    disabled_ids = set()
    if pref_key:
        disabled_cursor = db.users.find(
            {f"notification_prefs.{pref_key}": False},
            {"_id": 0, "id": 1}
        )
        disabled_ids = {u["id"] async for u in disabled_cursor}
    # Build subscription query
    query = {}
    if exclude_user_id:
        query["user_id"] = {"$ne": exclude_user_id}
    subs = await db.push_subscriptions.find(query).to_list(500)
    # Filter out users who disabled this notification type
    if disabled_ids:
        subs = [s for s in subs if s["user_id"] not in disabled_ids]
    if not subs:
        return
    try:
        from pywebpush import WebPushException
        payload = json_stdlib.dumps({
            "title": title, "body": body,
            "url": f"{FRONTEND_URL}{url}", "type": notif_type
        })
        for sub in subs:
            try:
                _do_webpush(sub["subscription"], payload, VAPID_PRIVATE_KEY_FILE, {"sub": VAPID_CLAIMS_EMAIL})
            except WebPushException as exc:
                if "410" in str(exc) or "404" in str(exc):
                    await db.push_subscriptions.delete_one({"_id": sub.get("_id")})
            except Exception:
                pass
    except Exception:
        pass
