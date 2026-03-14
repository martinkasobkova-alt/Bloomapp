import asyncio
import os
import secrets
import uuid
from datetime import datetime, timezone, timedelta

import httpx
import resend
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse

from auth_helpers import (
    create_token, get_blocked_user_message, get_client_ip, get_current_user, handle_facebook_oauth,
    handle_google_session, hash_password, is_user_blocked, parse_token_expiry, rate_limiter,
    require_verified_email, user_response_dict, verify_password, validate_password_strength,
)
from rate_limits import limiter, LIMIT_LOGIN, LIMIT_REGISTER, LIMIT_FORGOT_PASSWORD, LIMIT_RESEND_VERIFICATION
from database import FRONTEND_URL, FACEBOOK_APP_ID, SENDER_EMAIL, db, logger
from utils import sanitize_html, validate_safe_url
from models import PasswordResetConfirm, PasswordResetRequest, UserCreate, UserLogin
from utils import bloom_email_html

router = APIRouter()


async def _verify_turnstile(token: str | None, remote_ip: str) -> bool:
    """Verify Cloudflare Turnstile token. Returns True if valid or Turnstile disabled."""
    secret = os.environ.get("TURNSTILE_SECRET_KEY")
    if not secret:
        return True  # Turnstile disabled when no secret
    if not token or not token.strip():
        return False
    try:
        async with httpx.AsyncClient() as client:
            r = await client.post(
                "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                json={"secret": secret, "response": token, "remoteip": remote_ip},
                timeout=10.0,
            )
            data = r.json()
            return data.get("success") is True
    except Exception:
        return False


@router.post("/auth/register")
@limiter.limit(LIMIT_REGISTER)
async def register(request: Request, user_data: UserCreate):
    if user_data.website:
        raise HTTPException(status_code=400, detail="Registrace se nezdařila")

    client_ip = get_client_ip(request)

    # Cloudflare Turnstile verification
    if not await _verify_turnstile(user_data.turnstile_token, client_ip):
        raise HTTPException(
            status_code=400,
            detail="Ověření proti robotům selhalo. Prosím zkuste to znovu.",
        )

    entry_pw_setting = await db.app_settings.find_one({"key": "entry_password_enabled"})
    entry_pw_enabled = entry_pw_setting["value"] if entry_pw_setting else True

    if entry_pw_enabled:
        setting = await db.app_settings.find_one({"key": "community_password"})
        community_password = setting["value"] if setting else "Transfortrans"
        if user_data.secret_code != community_password:
            raise HTTPException(status_code=400, detail="Nesprávný tajný kód pro registraci")

    existing_email = await db.users.find_one({"email": user_data.email})
    if existing_email:
        raise HTTPException(status_code=400, detail="Tento e-mail je již registrován")

    existing_username = await db.users.find_one({"username": {"$regex": f"^{user_data.username}$", "$options": "i"}})
    if existing_username:
        raise HTTPException(status_code=400, detail="Tato přezdívka je již obsazena, zkuste jinou")

    user_id = str(uuid.uuid4())
    verification_token = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "username": user_data.username,
        "pronouns": user_data.pronouns,
        "avatar": user_data.avatar,
        "location": user_data.location,
        "district": user_data.district,
        "phone": user_data.phone,
        "bio": sanitize_html(user_data.bio or ""),
        "custom_avatar": user_data.custom_avatar,
        "role": "user",
        "avg_rating": 0,
        "rating_count": 0,
        "email_verified": False,
        "verification_token": verification_token,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)

    if resend.api_key:
        try:
            verify_url = f"{FRONTEND_URL}/verify-email?token={verification_token}"
            profile_url = f"{FRONTEND_URL}/users/{user_id}"
            guidelines_url = f"{FRONTEND_URL}/community#guidelines"
            contact_setting = await db.app_settings.find_one({"key": "contact_email"}, {"_id": 0})
            contact_email_val = contact_setting["value"] if contact_setting else "podpora@bloom.cz"
            welcome_html = bloom_email_html(f"""
<p style="color: #5D6472; font-size: 13px; margin: 0 0 28px;">Bezpecny prostor pro trans komunitu</p>
<h2 style="color: #2F3441; font-size: 20px; margin-bottom: 12px;">Vitame te v Bloom, {user_data.username}!</h2>
<p style="color: #5D6472; line-height: 1.7; margin-bottom: 24px;">Jsme radi, ze jsi se k nam pridala/pridalo. Abys mohla/mohl naplno pouzivat Bloom, prosim potvrdte sve e-mailova adresu kliknutim na tlacitko nize.</p>
<div style="text-align: center; margin: 28px 0;">
  <a href="{verify_url}" style="background: #8A7CFF; color: white; text-decoration: none; padding: 14px 36px; border-radius: 10px; font-weight: 700; font-size: 16px; display: inline-block; letter-spacing: 0.3px;">Overit e-mail</a>
</div>
<p style="color: #9DA3AE; font-size: 12px; text-align: center; margin: 8px 0 24px;">Nebo zkopirujte tento odkaz do prohlizece:<br/><a href="{verify_url}" style="color: #8A7CFF; word-break: break-all;">{verify_url}</a></p>
<div style="background: #f0eeff; border-radius: 8px; padding: 16px 20px; margin-bottom: 20px;">
  <p style="margin: 0 0 10px; color: #5D6472; font-size: 14px; font-weight: 600;">Rychle odkazy:</p>
  <p style="margin: 0 0 8px;"><a href="{profile_url}" style="color: #8A7CFF; text-decoration: none;">Muj profil</a> — upravte si svuj profil a sdílejte nabídky pomoci</p>
  <p style="margin: 0 0 8px;"><a href="{guidelines_url}" style="color: #8A7CFF; text-decoration: none;">Komunitni pravidla</a> — prectete si, jak funguje nase komunita</p>
  <p style="margin: 0;"><a href="mailto:{contact_email_val}" style="color: #8A7CFF; text-decoration: none;">{contact_email_val}</a> — napiste nam, pokud potrebujete pomoc</p>
</div>
<p style="color: #9DA3AE; font-size: 12px; text-align: center; margin-top: 24px;">Tento e-mail byl odeslán, protože jste se zaregistroval/a do komunity Bloom.</p>
""")
            await asyncio.to_thread(resend.Emails.send, {
                "from": SENDER_EMAIL,
                "to": [user_data.email],
                "subject": "Overte svou e-mailovou adresu – Bloom",
                "html": welcome_html,
                "text": f"Vitej v Bloom, {user_data.username}!\n\nPros overeni e-mailu klikni na tento odkaz:\n{verify_url}\n\nKontakt: {contact_email_val}"
            })
            logger.info(f"Verification + welcome email sent to {user_data.email}")
        except Exception as exc:
            logger.error(f"Welcome/verification email failed for {user_data.email}: {exc}")

    token = create_token(user_id, "user")
    return {"token": token, "user": user_response_dict(user_doc)}


@router.post("/auth/login")
async def login(request: Request, credentials: UserLogin):
    client_ip = request.client.host if request.client else "unknown"
    if not rate_limiter.check(f"login:{client_ip}", 10, 300):
        raise HTTPException(status_code=429, detail="Příliš mnoho pokusů o přihlášení. Zkuste to za chvíli.")

    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Nesprávný e-mail nebo heslo")

    if is_user_blocked(user):
        msg = await get_blocked_user_message()
        raise HTTPException(status_code=403, detail=msg)

    token = create_token(user["id"], user.get("role", "user"))
    return {"token": token, "user": user_response_dict(user)}


@router.get("/auth/verify-email/{token}")
async def verify_email(token: str):
    user = await db.users.find_one({"verification_token": token})
    if not user:
        raise HTTPException(status_code=400, detail="Neplatný nebo expirovaný ověřovací odkaz")
    if user.get("email_verified", False):
        return {"message": "E-mail je již ověřen!", "username": user["username"]}
    await db.users.update_one({"id": user["id"]}, {"$set": {"email_verified": True}})
    return {"message": "E-mail byl úspěšně ověřen!", "username": user["username"]}


@router.post("/auth/google/session")
async def google_auth_session(request: Request):
    body = await request.json()
    session_id = body.get("session_id")
    mode = body.get("mode", "login")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id is required")

    client_ip = get_client_ip(request)
    if not rate_limiter.check(f"google_auth:{client_ip}", 10, 300):
        raise HTTPException(status_code=429, detail="Příliš mnoho pokusů.")

    return await handle_google_session(session_id, mode)


@router.post("/auth/facebook")
async def facebook_auth(request: Request):
    """Exchange Facebook OAuth code for token and login/register user."""
    if not FACEBOOK_APP_ID:
        raise HTTPException(status_code=503, detail="Facebook přihlášení není nakonfigurováno")

    body = await request.json()
    code = body.get("code")
    mode = body.get("mode", "login")
    redirect_uri = body.get("redirect_uri")
    if not code or not redirect_uri:
        raise HTTPException(status_code=400, detail="code a redirect_uri jsou povinné")

    client_ip = request.client.host if request.client else "unknown"
    if not rate_limiter.check(f"facebook_auth:{client_ip}", 10, 300):
        raise HTTPException(status_code=429, detail="Příliš mnoho pokusů.")

    return await handle_facebook_oauth(code, mode, redirect_uri)


# Resend verification: 1 pokus za 24 hodin na uživatele
RESEND_VERIF_MAX = 1
RESEND_VERIF_WINDOW_SECONDS = 86400  # 24 h


@router.post("/auth/resend-verification")
@limiter.limit(LIMIT_RESEND_VERIFICATION)
async def resend_verification(request: Request, user: dict = Depends(get_current_user)):
    if user.get("email_verified", False):
        return {"message": "E-mail je již ověřen"}

    limit_key = f"resend_verif:{user['id']}"
    info = rate_limiter.get_info(limit_key, RESEND_VERIF_WINDOW_SECONDS)
    if not rate_limiter.check(limit_key, RESEND_VERIF_MAX, RESEND_VERIF_WINDOW_SECONDS):
        reset_min = max(0, info.get("reset_in_seconds", 0) // 60)
        raise HTTPException(
            status_code=429,
            detail=f"Ověřovací e-mail lze odeslat jen 1× za 24 hodin. Zkuste to znovu za {reset_min} minut."
        )
    token = str(uuid.uuid4())
    await db.users.update_one({"id": user["id"]}, {"$set": {"verification_token": token}})
    if resend.api_key:
        try:
            verify_url = f"{FRONTEND_URL}/verify-email?token={token}"
            html = bloom_email_html(f"""
<h2 style="color: #2F3441; font-size: 20px; margin: 0 0 12px;">Overeni e-mailove adresy</h2>
<p style="color: #5D6472; line-height: 1.7; margin-bottom: 24px;">Kliknutim na tlacitko nize overite svou e-mailovou adresu v komunite Bloom.</p>
<div style="text-align: center; margin: 28px 0;">
  <a href="{verify_url}" style="background: #8A7CFF; color: white; text-decoration: none; padding: 14px 36px; border-radius: 10px; font-weight: 700; font-size: 16px; display: inline-block;">Overit e-mail</a>
</div>
<p style="color: #9DA3AE; font-size: 12px; text-align: center;"><a href="{verify_url}" style="color: #8A7CFF; word-break: break-all;">{verify_url}</a></p>
""")
            await asyncio.to_thread(resend.Emails.send, {
                "from": SENDER_EMAIL, "to": [user["email"]],
                "subject": "Bloom – Overeni e-mailove adresy",
                "html": html,
                "text": f"Overte svuj e-mail kliknutim na: {verify_url}"
            })
        except Exception as exc:
            logger.error(f"Resend verification email failed: {exc}")
    return {"message": "Ověřovací e-mail byl odeslán"}


@router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user_response_dict(user)


@router.put("/auth/profile")
async def update_profile(
    username: str = None,
    pronouns: str = None,
    avatar: str = None,
    location: str = None,
    district: str = None,
    phone: str = None,
    bio: str = None,
    custom_avatar: str = None,
    instagram: str = None,
    facebook: str = None,
    linkedin: str = None,
    user: dict = Depends(require_verified_email)
):
    updates = {}
    if username:
        existing = await db.users.find_one({"username": {"$regex": f"^{username}$", "$options": "i"}, "id": {"$ne": user["id"]}})
        if existing:
            raise HTTPException(status_code=400, detail="Tato přezdívka je již obsazena")
        updates["username"] = username
    if pronouns:
        updates["pronouns"] = pronouns
    if avatar:
        updates["avatar"] = avatar
    if location is not None:
        updates["location"] = location
    if district is not None:
        updates["district"] = district
    if phone is not None:
        updates["phone"] = phone
    if bio is not None:
        updates["bio"] = sanitize_html(bio)
    if custom_avatar is not None:
        updates["custom_avatar"] = custom_avatar
    # Social links — empty string clears the field; validate scheme (http/https only)
    if instagram is not None:
        updates["instagram"] = validate_safe_url(instagram, "Instagram")
    if facebook is not None:
        updates["facebook"] = validate_safe_url(facebook, "Facebook")
    if linkedin is not None:
        updates["linkedin"] = validate_safe_url(linkedin, "LinkedIn")
    if updates:
        await db.users.update_one({"id": user["id"]}, {"$set": updates})
    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password": 0})
    return user_response_dict(updated_user)


# Rate limit config for password reset
RESET_MAX_ATTEMPTS_PER_EMAIL = 10
RESET_MAX_ATTEMPTS_PER_IP = 40  # global per-IP cap
RESET_WINDOW_SECONDS = 300  # 5 minutes


def _normalize_email(email: str) -> str:
    """Lowercase and strip email for rate limit key."""
    return (email or "").lower().strip()


async def _find_user_by_email(email: str):
    """Find user by email (case-insensitive). Returns (user_doc, stored_email)."""
    import re
    norm = (email or "").strip().lower()
    if not norm:
        return None, None
    try:
        user = await db.users.find_one({"email": {"$regex": f"^{re.escape(norm)}$", "$options": "i"}})
    except Exception:
        user = await db.users.find_one({"email": email})
    if user:
        return user, user.get("email")
    return None, None


def _is_localhost_dev() -> bool:
    """True when FRONTEND_URL suggests local dev (localhost) – rate limit bypass for forgot-password."""
    url = (FRONTEND_URL or "").lower()
    return "localhost" in url or "127.0.0.1" in url


def _is_dev_debug_allowed(request) -> bool:
    """True when request is from localhost – debug endpoints always allowed from localhost for troubleshooting."""
    client_ip = get_client_ip(request)
    return client_ip in ("127.0.0.1", "::1")


# ─── DEBUG ENDPOINTS (localhost/dev only) ─────────────────────────────────────
@router.get("/auth/reset-password-request/debug-rate-limit")
async def debug_reset_rate_limit(request: Request, email: str = ""):
    """Dev only: inspect forgot-password rate limiter state. ?email=xxx to simulate keys."""
    if not _is_dev_debug_allowed(request):
        raise HTTPException(status_code=403, detail="Pouze pro localhost v dev režimu (FRONTEND_URL obsahuje localhost)")
    from auth_helpers import rate_limiter
    client_ip = get_client_ip(request)
    norm = _normalize_email(email)
    limit_key = f"reset:{client_ip}:{norm}" if norm else f"reset:{client_ip}:"
    ip_limit_key = f"reset_ip:{client_ip}"
    info = rate_limiter.get_info(limit_key, RESET_WINDOW_SECONDS)
    ip_info = rate_limiter.get_info(ip_limit_key, RESET_WINDOW_SECONDS)
    all_reset_keys = [k for k in rate_limiter.requests.keys() if k.startswith("reset")]
    return {
        "client_ip": client_ip,
        "normalized_email": norm or "(empty)",
        "limit_key": limit_key,
        "ip_limit_key": ip_limit_key,
        "per_email": {"count": info["count"], "max": RESET_MAX_ATTEMPTS_PER_EMAIL, "window_sec": RESET_WINDOW_SECONDS, "reset_in_sec": info.get("reset_in_seconds", 0)},
        "per_ip": {"count": ip_info["count"], "max": RESET_MAX_ATTEMPTS_PER_IP, "window_sec": RESET_WINDOW_SECONDS, "reset_in_sec": ip_info.get("reset_in_seconds", 0)},
        "all_reset_keys": all_reset_keys,
        "is_localhost_dev": _is_localhost_dev(),
    }


@router.post("/auth/reset-password-request/clear-rate-limit")
async def clear_reset_rate_limit_v2(request: Request):
    """Dev only: clear forgot-password rate limiter. Localhost only."""
    if not _is_dev_debug_allowed(request):
        raise HTTPException(status_code=403, detail="Pouze pro localhost")
    from auth_helpers import rate_limiter
    # Clear both reset:... and reset_ip:... keys (prefix "reset" catches all)
    cleared = rate_limiter.clear("reset")
    logger.info(f"[reset-password] DEBUG: Rate limit cleared, keys removed: {cleared}")
    return {"ok": True, "cleared": cleared}


# ─── MAIN ENDPOINT ────────────────────────────────────────────────────────────
@router.post("/auth/reset-password-request")
@limiter.limit(LIMIT_FORGOT_PASSWORD)
async def reset_password_request(request: Request, data: PasswordResetRequest):
    from datetime import datetime as dt, timezone as tz

    # Explicit print() so logs always appear – do not rely on logger
    print("[FORGOT_PASSWORD_DEBUG] ENTER forgot-password endpoint", flush=True)

    # 2. Client identification
    client_ip = get_client_ip(request)
    xff = request.headers.get("X-Forwarded-For", "(absent)")
    xri = request.headers.get("X-Real-IP", "(absent)")
    print(f"[FORGOT_PASSWORD_DEBUG] detected IP: {client_ip} | X-Forwarded-For: {xff} | X-Real-IP: {xri}", flush=True)

    # 3. Request data
    normalized_email = _normalize_email(data.email)
    print(f"[FORGOT_PASSWORD_DEBUG] normalized email: {normalized_email}", flush=True)

    limit_key = f"reset:{client_ip}:{normalized_email}"
    ip_limit_key = f"reset_ip:{client_ip}"
    print(f"[FORGOT_PASSWORD_DEBUG] limiter keys: per_email={limit_key} | per_ip={ip_limit_key}", flush=True)

    # 4. Rate limiter details – bypass only when request comes from localhost (not based on FRONTEND_URL)
    skip_rate_limit = client_ip in ("127.0.0.1", "::1")
    blocked_by = None
    detail_msg = "Příliš mnoho pokusů. Zkuste to za chvíli."

    info = rate_limiter.get_info(limit_key, RESET_WINDOW_SECONDS)
    ip_info = rate_limiter.get_info(ip_limit_key, RESET_WINDOW_SECONDS)
    print(f"[FORGOT_PASSWORD_DEBUG] limiter counts: per_email={info['count']}/{RESET_MAX_ATTEMPTS_PER_EMAIL} | per_ip={ip_info['count']}/{RESET_MAX_ATTEMPTS_PER_IP} | skip_rate_limit={skip_rate_limit}", flush=True)

    if not skip_rate_limit:
        check_email = rate_limiter.check(limit_key, RESET_MAX_ATTEMPTS_PER_EMAIL, RESET_WINDOW_SECONDS)
        check_ip = rate_limiter.check(ip_limit_key, RESET_MAX_ATTEMPTS_PER_IP, RESET_WINDOW_SECONDS)
        if not check_email:
            blocked_by = "per_email"
        elif not check_ip:
            blocked_by = "per_ip"

    # 5. Final decision
    if blocked_by:
        print(f"[FORGOT_PASSWORD_DEBUG] DECISION: BLOCKED by {blocked_by} | reason=rate limit exceeded", flush=True)
        print(f"[FORGOT_PASSWORD_DEBUG] block reason: per_email limit={RESET_MAX_ATTEMPTS_PER_EMAIL} per_ip limit={RESET_MAX_ATTEMPTS_PER_IP} window={RESET_WINDOW_SECONDS}s", flush=True)
        print(f"[FORGOT_PASSWORD_DEBUG] response sent: status=429 detail={detail_msg}", flush=True)
        raise HTTPException(status_code=429, detail=detail_msg)

    print(f"[FORGOT_PASSWORD_DEBUG] DECISION: ALLOWED | skip={skip_rate_limit}", flush=True)

    # 1. User lookup (case-insensitive)
    user, stored_email = await _find_user_by_email(data.email)
    logger.info(f"[reset-password] DEBUG: user_found={user is not None} stored_email={repr(stored_email)} normalized={normalized_email}")

    if not user:
        logger.info(f"[reset-password] USER NOT FOUND for email={data.email} - returning generic success (no email sent)")
        return {"message": "Pokud je e-mail registrován, obdržíte odkaz pro obnovení hesla."}

    # Account type: password vs social-only
    has_password = bool(user.get("password"))
    is_social_only = bool(user.get("google_linked") or user.get("facebook_linked")) and not has_password
    logger.info(f"[reset-password] user_id={user.get('id')} has_password={has_password} google_linked={user.get('google_linked')} facebook_linked={user.get('facebook_linked')}")

    if not resend.api_key:
        logger.error("RESEND_API_KEY not configured - cannot send password reset email")
        raise HTTPException(status_code=503, detail="E-mailová služba není nakonfigurována. Nastavte RESEND_API_KEY v backend/.env.")

    # 2. Token generation
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    await db.password_resets.delete_many({"email": stored_email or data.email})
    await db.password_resets.insert_one({
        "id": str(uuid.uuid4()),
        "email": stored_email or data.email,
        "token": token,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": expires_at,
    })
    logger.info("[reset-password] token generated")

    # 3. Reset URL
    reset_url = f"{FRONTEND_URL}/reset-password?token={token}"
    logger.info(f"[reset-password] FRONTEND_URL={FRONTEND_URL} SENDER_EMAIL={SENDER_EMAIL}")

    html_content = bloom_email_html(f"""
<h2 style="color: #2F3441; font-size: 18px; margin-bottom: 12px;">Obnoveni hesla</h2>
<p style="color: #5D6472; line-height: 1.6; margin-bottom: 24px;">Obdrzeli jsme pozadavek na obnoveni hesla pro vas ucet.</p>
<div style="text-align: center; margin: 28px 0;">
  <a href="{reset_url}" style="background: #8A7CFF; color: white; text-decoration: none; padding: 14px 36px; border-radius: 10px; font-weight: 700; font-size: 16px; display: inline-block;">Obnovit heslo</a>
</div>
<p style="color: #9DA3AE; font-size: 12px; text-align: center; margin: 8px 0 24px;">Nebo zkopirujte odkaz: <a href="{reset_url}" style="color: #8A7CFF; word-break: break-all;">{reset_url}</a></p>
<p style="color: #9DA3AE; font-size: 12px; text-align: center; margin-top: 24px;">Odkaz je platny 1 hodinu.</p>
""")
    to_email = stored_email or data.email
    payload = {
        "from": SENDER_EMAIL,
        "to": [to_email],
        "subject": "Bloom – Obnoveni hesla",
        "html": html_content,
        "text": f"Bloom – Obnoveni hesla\n\nPro obnoveni hesla zkopirujte tento odkaz:\n{reset_url}\n\nOdkaz je platny 1 hodinu."
    }
    logger.info(f"[reset-password] Resend payload (no secrets): from={payload['from']} to={payload['to']} subject={payload['subject']}")
    logger.info(f"[reset-password] sending email from {SENDER_EMAIL} to {to_email}")

    try:
        email_result = await asyncio.to_thread(resend.Emails.send, payload)
        logger.info(f"[reset-password] Resend ACCEPTED to={to_email} resend_id={email_result.get('id')} response={email_result}")
    except Exception as exc:
        error_msg = str(exc)
        logger.error(f"[reset-password] Resend REJECTED to={to_email} error={error_msg}")
        if "invalid" in error_msg.lower() or "api key" in error_msg.lower():
            raise HTTPException(status_code=503, detail="E-mailová služba není nakonfigurována. Zkontrolujte RESEND_API_KEY v backend/.env.")
        raise HTTPException(status_code=503, detail=f"Email se nepodařilo odeslat. Chyba: {error_msg}")

    return {"message": "Odkaz pro obnovení hesla byl odeslán na váš e-mail."}


@router.get("/auth/reset/{token}")
async def reset_password_redirect(token: str):
    reset_doc = await db.password_resets.find_one({"token": token})
    if not reset_doc:
        logger.warning("Reset redirect: token not found or expired")
        return RedirectResponse(url=f"{FRONTEND_URL}/auth?error=reset-expired", status_code=302)
    expires_at = parse_token_expiry(reset_doc["expires_at"])
    if expires_at < datetime.now(timezone.utc):
        await db.password_resets.delete_one({"token": token})
        return RedirectResponse(url=f"{FRONTEND_URL}/auth?error=reset-expired", status_code=302)
    return RedirectResponse(url=f"{FRONTEND_URL}/reset-password?token={token}", status_code=302)


@router.post("/auth/reset-password")
async def reset_password(data: PasswordResetConfirm):
    reset_doc = await db.password_resets.find_one({"token": data.token})
    if not reset_doc:
        raise HTTPException(status_code=400, detail="Neplatný nebo expirovaný odkaz pro obnovení hesla.")
    expires_at = parse_token_expiry(reset_doc["expires_at"])
    if expires_at < datetime.now(timezone.utc):
        await db.password_resets.delete_one({"token": data.token})
        raise HTTPException(status_code=400, detail="Odkaz pro obnovení hesla vypršel. Požádejte o nový.")
    validate_password_strength(data.new_password)
    await db.users.update_one(
        {"email": reset_doc["email"]},
        {"$set": {"password": hash_password(data.new_password)}}
    )
    await db.password_resets.delete_one({"token": data.token})
    return {"message": "Heslo bylo úspěšně obnoveno. Nyní se můžete přihlásit."}


@router.delete("/auth/profile")
async def delete_profile(user: dict = Depends(get_current_user)):
    """Uživatel si může zrušit vlastní profil. Smaže uživatele a související data z databáze."""
    user_id = user["id"]
    email = user.get("email")
    await db.users.delete_one({"id": user_id})
    await db.password_resets.delete_many({"email": email})
    await db.user_reports.delete_many({"reporter_id": user_id})
    await db.services.delete_many({"user_id": user_id})
    await db.push_subscriptions.delete_many({"user_id": user_id})
    await db.messages.delete_many({"$or": [{"from_user_id": user_id}, {"to_user_id": user_id}]})
    await db.notifications.delete_many({"user_id": user_id})
    if hasattr(db, "user_photos"):
        await db.user_photos.delete_many({"user_id": user_id})
    if hasattr(db, "user_ratings"):
        await db.user_ratings.delete_many({"$or": [{"from_user_id": user_id}, {"to_user_id": user_id}]})
    logger.info(f"User {email} (id={user_id}) deleted their own profile")
    return {"message": "Profil byl úspěšně zrušen"}


@router.put("/auth/notification-prefs")
async def update_notification_prefs(request: Request, user: dict = Depends(get_current_user)):
    body = await request.json()
    prefs = {
        "messages": bool(body.get("messages", True)),
        "services": bool(body.get("services", True)),
        "news": bool(body.get("news", True)),
    }
    await db.users.update_one({"id": user["id"]}, {"$set": {"notification_prefs": prefs}})
    return {"notification_prefs": prefs}
