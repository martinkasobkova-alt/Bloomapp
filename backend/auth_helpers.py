import re
import uuid
from datetime import datetime, timezone

import httpx
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import bcrypt
import jwt
import time
from collections import defaultdict
from database import db, JWT_SECRET, JWT_ALGORITHM, FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, FRONTEND_URL

security = HTTPBearer()


class RateLimiter:
    """In-memory rate limiter. Restarting backend clears all limits."""
    def __init__(self):
        self.requests = defaultdict(list)

    def check(self, key: str, max_requests: int, window_seconds: int) -> bool:
        now = time.time()
        self.requests[key] = [t for t in self.requests[key] if now - t < window_seconds]
        if len(self.requests[key]) >= max_requests:
            return False
        self.requests[key].append(now)
        return True

    def get_info(self, key: str, window_seconds: int) -> dict:
        """Return current count and oldest timestamp for a key."""
        now = time.time()
        self.requests[key] = [t for t in self.requests[key] if now - t < window_seconds]
        timestamps = self.requests[key]
        oldest = min(timestamps) if timestamps else None
        reset_at = (oldest + window_seconds) if oldest else None
        return {
            "count": len(timestamps),
            "reset_at": reset_at,
            "reset_in_seconds": int(reset_at - now) if reset_at else 0,
        }

    def clear(self, key_prefix: str = None) -> int:
        """Clear rate limit entries. If key_prefix given, clear only matching keys. Returns count cleared."""
        if key_prefix is None:
            cleared = len(self.requests)
            self.requests.clear()
            return cleared
        to_remove = [k for k in self.requests if k.startswith(key_prefix)]
        for k in to_remove:
            del self.requests[k]
        return len(to_remove)


rate_limiter = RateLimiter()


def get_client_ip(request) -> str:
    """Získá IP klienta. Trust X-Forwarded-For/X-Real-IP pouze když request přichází z trusted proxy (TRUSTED_PROXY_IPS)."""
    from rate_limits import get_client_ip_for_limiter
    return get_client_ip_for_limiter(request)


def validate_password_strength(password: str) -> None:
    """Raise HTTPException if password does not meet requirements."""
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Heslo musí mít alespoň 8 znaků.")
    if not re.search(r'[a-z]', password):
        raise HTTPException(status_code=400, detail="Heslo musí obsahovat alespoň jedno malé písmeno.")
    if not re.search(r'[A-Z]', password):
        raise HTTPException(status_code=400, detail="Heslo musí obsahovat alespoň jedno velké písmeno.")
    if not re.search(r'[0-9]', password):
        raise HTTPException(status_code=400, detail="Heslo musí obsahovat alespoň jedno číslo.")
    if not re.search(r'[^a-zA-Z0-9]', password):
        raise HTTPException(status_code=400, detail="Heslo musí obsahovat alespoň jeden speciální znak.")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


def create_token(user_id: str, role: str) -> str:
    from datetime import datetime, timezone
    payload = {
        "user_id": user_id,
        "role": (role or "user").lower(),
        "exp": datetime.now(timezone.utc).timestamp() + 86400 * 7
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Uživatel nenalezen")
        if is_user_blocked(user):
            msg = await get_blocked_user_message()
            raise HTTPException(status_code=403, detail=msg)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Platnost tokenu vypršela")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Neplatný token")


def role_matches(user: dict, *roles: str) -> bool:
    """Check if user's role (case-insensitive) matches any of the given roles."""
    r = user.get("role")
    if r is None:
        return False
    return str(r).lower() in {x.lower() for x in roles}


def is_user_blocked(user: dict) -> bool:
    """Check if user is blocked (role banned)."""
    return role_matches(user, "banned")


async def get_blocked_user_message() -> str:
    """Return error message for blocked users. Uses contact_email from settings if available."""
    try:
        setting = await db.app_settings.find_one({"key": "contact_email"}, {"_id": 0})
        email = (setting.get("value") or "").strip() if setting else ""
        if email and "@" in email:
            return f"Tento účet byl zablokován. Pokud se domníváte, že jde o chybu, kontaktujte administrátora na {email}."
    except Exception:
        pass
    return "Tento účet byl zablokován. Pokud se domníváte, že jde o chybu, kontaktujte administrátora."


async def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    user = await get_current_user(credentials)
    if not role_matches(user, "admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Vyžadován přístup administrátora")
    return user


async def get_superadmin_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    user = await get_current_user(credentials)
    if not role_matches(user, "superadmin"):
        raise HTTPException(status_code=403, detail="Vyžadován přístup superadministrátora")
    return user


async def get_admin_or_lawyer_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    user = await get_current_user(credentials)
    if not role_matches(user, "admin", "superadmin", "lawyer"):
        raise HTTPException(status_code=403, detail="Vyžadován přístup administrátora nebo ověřeného odborníka")
    return user


async def require_verified_email(user: dict = Depends(get_current_user)):
    if not user.get("email_verified", False):
        raise HTTPException(
            status_code=403,
            detail="Pro tuto akci musíte nejprve ověřit svůj e-mail. Zkontrolujte svou schránku nebo znovu odešlete ověřovací e-mail."
        )
    return user


def compute_badges(user_doc):
    badges = []
    rating_count = user_doc.get("rating_count", 0)
    avg_rating = user_doc.get("avg_rating", 0)
    role = (user_doc.get("role") or "user").lower()
    if rating_count >= 3:
        badges.append("overeny-clen")
    if rating_count >= 10 and avg_rating >= 4.0:
        badges.append("aktivni-pomocnik")
    if rating_count >= 5 and avg_rating >= 4.5:
        badges.append("duveryhodny")
    if role == "admin":
        badges.append("admin")
    if role == "superadmin":
        badges.append("superadmin")
    if role == "lawyer":
        badges.append("pravnik")
    if role == "specialist":
        badges.append("overeny-specialista")
    return badges


def user_response_dict(user_doc):
    return {
        "id": user_doc["id"],
        "email": user_doc["email"],
        "username": user_doc["username"],
        "pronouns": user_doc.get("pronouns", ""),
        "avatar": user_doc.get("avatar", "fem-pink"),
        "location": user_doc.get("location", ""),
        "district": user_doc.get("district", ""),
        "phone": user_doc.get("phone", ""),
        "bio": user_doc.get("bio", ""),
        "custom_avatar": user_doc.get("custom_avatar"),
        "role": user_doc.get("role", "user"),
        "avg_rating": user_doc.get("avg_rating", 0),
        "rating_count": user_doc.get("rating_count", 0),
        "badges": compute_badges(user_doc),
        "created_at": user_doc.get("created_at", ""),
        "email_verified": user_doc.get("email_verified", False),
        "notification_prefs": user_doc.get("notification_prefs", {"messages": True, "services": True, "news": True}),
        "instagram": user_doc.get("instagram", ""),
        "facebook": user_doc.get("facebook", ""),
        "linkedin": user_doc.get("linkedin", ""),
        "specialization_label": user_doc.get("specialization_label", ""),
    }


def parse_token_expiry(expires_val) -> datetime:
    """Parse expires_at value from DB (either ISO string or datetime) into aware datetime."""
    if isinstance(expires_val, str):
        return datetime.fromisoformat(expires_val)
    if expires_val.tzinfo is None:
        return expires_val.replace(tzinfo=timezone.utc)
    return expires_val


async def handle_google_session(session_id: str, mode: str) -> dict:
    """
    Fetch Google OAuth data, then find or create the user.
    Returns dict: {token, user, is_new}
    Raises HTTPException on any failure.
    """
    try:
        async with httpx.AsyncClient() as http_client:
            resp = await http_client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Neplatná Google session")
            google_data = resp.json()
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Nepodařilo se ověřit Google session")

    google_email = google_data.get("email")
    google_name = google_data.get("name", "")
    google_picture = google_data.get("picture", "")

    if not google_email:
        raise HTTPException(status_code=400, detail="Google session neobsahuje email")

    existing_user = await db.users.find_one({"email": google_email}, {"_id": 0})

    if existing_user:
        if is_user_blocked(existing_user):
            msg = await get_blocked_user_message()
            raise HTTPException(status_code=403, detail=msg)
        if not existing_user.get("google_linked"):
            await db.users.update_one(
                {"id": existing_user["id"]},
                {"$set": {"google_linked": True, "google_name": google_name, "google_picture": google_picture}}
            )
        user_doc = await db.users.find_one({"id": existing_user["id"]}, {"_id": 0})
        token = create_token(user_doc["id"], user_doc.get("role", "user"))
        return {"token": token, "user": user_response_dict(user_doc), "is_new": False}

    if mode == "login":
        raise HTTPException(status_code=404, detail="no_account")

    user_id = str(uuid.uuid4())
    username = google_name.replace(" ", "_")[:20] or f"user_{user_id[:8]}"
    existing_username = await db.users.find_one(
        {"username": {"$regex": f"^{username}$", "$options": "i"}}
    )
    if existing_username:
        username = f"{username}_{user_id[:4]}"

    user_doc = {
        "id": user_id,
        "email": google_email,
        "password": "",
        "username": username,
        "pronouns": "",
        "avatar": "fem-pink",
        "location": "", "district": "", "phone": "", "bio": "",
        "role": "user",
        "email_verified": True,
        "verification_token": None,
        "google_linked": True,
        "google_name": google_name,
        "google_picture": google_picture,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "photos": [],
        "gallery_settings": {"is_public": True, "password": ""},
        "journey": None,
    }
    await db.users.insert_one(user_doc)
    user_doc.pop("_id", None)

    token = create_token(user_id, "user")
    return {"token": token, "user": user_response_dict(user_doc), "is_new": True}


async def handle_facebook_oauth(code: str, mode: str, redirect_uri: str) -> dict:
    """
    Exchange Facebook OAuth code for access token, fetch user info, then find or create user.
    Returns dict: {token, user, is_new}
    Raises HTTPException on any failure.
    """
    if not FACEBOOK_APP_ID or not FACEBOOK_APP_SECRET:
        raise HTTPException(status_code=503, detail="Facebook přihlášení není nakonfigurováno")

    try:
        async with httpx.AsyncClient() as http_client:
            # Exchange code for access token
            token_resp = await http_client.get(
                "https://graph.facebook.com/v21.0/oauth/access_token",
                params={
                    "client_id": FACEBOOK_APP_ID,
                    "client_secret": FACEBOOK_APP_SECRET,
                    "redirect_uri": redirect_uri,
                    "code": code,
                },
            )
            if token_resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Neplatný Facebook kód")
            token_data = token_resp.json()
            access_token = token_data.get("access_token")
            if not access_token:
                raise HTTPException(status_code=401, detail="Facebook nevrátil access token")

            # Fetch user info
            me_resp = await http_client.get(
                "https://graph.facebook.com/v21.0/me",
                params={
                    "fields": "id,name,email,picture.type(large)",
                    "access_token": access_token,
                },
            )
            if me_resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Nepodařilo se načíst Facebook profil")
            fb_data = me_resp.json()
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Nepodařilo se ověřit Facebook přihlášení")

    fb_email = fb_data.get("email")
    fb_name = fb_data.get("name", "")
    fb_picture = ""
    if fb_data.get("picture", {}).get("data", {}).get("url"):
        fb_picture = fb_data["picture"]["data"]["url"]

    if not fb_email:
        raise HTTPException(
            status_code=400,
            detail="Facebook účet nemá přístupný e-mail. Povolte sdílení e-mailu nebo se zaregistrujte e-mailem.",
        )

    existing_user = await db.users.find_one({"email": fb_email}, {"_id": 0})

    if existing_user:
        if is_user_blocked(existing_user):
            msg = await get_blocked_user_message()
            raise HTTPException(status_code=403, detail=msg)
        if not existing_user.get("facebook_linked"):
            await db.users.update_one(
                {"id": existing_user["id"]},
                {"$set": {"facebook_linked": True, "facebook_name": fb_name, "facebook_picture": fb_picture}},
            )
        user_doc = await db.users.find_one({"id": existing_user["id"]}, {"_id": 0})
        token = create_token(user_doc["id"], user_doc.get("role", "user"))
        return {"token": token, "user": user_response_dict(user_doc), "is_new": False}

    if mode == "login":
        raise HTTPException(status_code=404, detail="no_account")

    user_id = str(uuid.uuid4())
    username = fb_name.replace(" ", "_")[:20] or f"user_{user_id[:8]}"
    existing_username = await db.users.find_one(
        {"username": {"$regex": f"^{username}$", "$options": "i"}}
    )
    if existing_username:
        username = f"{username}_{user_id[:4]}"

    user_doc = {
        "id": user_id,
        "email": fb_email,
        "password": "",
        "username": username,
        "pronouns": "",
        "avatar": "fem-pink",
        "location": "", "district": "", "phone": "", "bio": "",
        "role": "user",
        "email_verified": True,
        "verification_token": None,
        "facebook_linked": True,
        "facebook_name": fb_name,
        "facebook_picture": fb_picture,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "photos": [],
        "gallery_settings": {"is_public": True, "password": ""},
        "journey": None,
    }
    await db.users.insert_one(user_doc)
    user_doc.pop("_id", None)

    token = create_token(user_id, "user")
    return {"token": token, "user": user_response_dict(user_doc), "is_new": True}
