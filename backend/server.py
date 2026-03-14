import os
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException, Request
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from database import db, client, logger
from rate_limits import limiter


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Přidá bezpečnostní hlavičky do všech odpovědí."""
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response
from routes.auth import router as auth_router
from routes.users import router as users_router
from routes.messages import router as messages_router
from routes.services import router as services_router
from routes.specialists import router as specialists_router
from routes.news import router as news_router
from routes.settings import router as settings_router
from routes.admin import router as admin_router
from routes.push import router as push_router
from routes.community import router as community_router
from routes.search import router as search_router

app = FastAPI(title="Bloom API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(SecurityHeadersMiddleware)
_cors_origins = os.environ.get("CORS_ORIGINS")
if not _cors_origins or not _cors_origins.strip():
    raise RuntimeError("CORS_ORIGINS must be set in .env – app cannot start without it")
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[o.strip() for o in _cors_origins.split(",") if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all route modules under /api prefix
app.include_router(auth_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(messages_router, prefix="/api")
app.include_router(services_router, prefix="/api")
app.include_router(specialists_router, prefix="/api")
app.include_router(news_router, prefix="/api")
app.include_router(settings_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(push_router, prefix="/api")
app.include_router(community_router, prefix="/api")
app.include_router(search_router, prefix="/api")


@app.get("/api/")
async def root():
    return {"message": "Bloom API běží", "status": "ok"}


@app.get("/api/health")
async def health():
    return {"status": "healthy"}


@app.get("/api/auth/clear-reset-rate-limit")
@app.post("/api/auth/clear-reset-rate-limit")
async def clear_reset_rate_limit(request: Request):
    """Dev only: clear password reset rate limit. Works only from localhost."""
    from auth_helpers import get_client_ip, rate_limiter
    client_ip = get_client_ip(request)
    if client_ip not in ("127.0.0.1", "::1"):
        raise HTTPException(status_code=403, detail="Pouze pro localhost")
    cleared = rate_limiter.clear("reset")
    logger.info(f"[reset-password] Rate limit cleared from {client_ip}, keys removed: {cleared}")
    return {"ok": True, "cleared": cleared}


# Explicit routes for frontend (ensure they're always available)
@app.get("/api/stats")
async def get_stats():
    from routes.community import get_community_stats
    return await get_community_stats()


@app.get("/api/settings/marker-colors")
async def api_marker_colors():
    from routes.settings import get_marker_colors
    return await get_marker_colors()


@app.get("/api/settings/texts")
async def api_text_settings():
    from routes.settings import get_text_settings
    return await get_text_settings()


@app.get("/api/settings/sections")
async def api_section_settings():
    from routes.settings import get_section_settings
    return await get_section_settings()


@app.on_event("startup")
async def seed_default_data():
    """Seed default data if missing."""
    print("[FORGOT_PASSWORD_DEBUG] auth debug logging active", flush=True)
    default_types = [
        {"id": "beauty", "name": "Krása a péče"},
        {"id": "health", "name": "Zdraví a wellness"},
        {"id": "skills", "name": "Dovednosti a kurzy"},
        {"id": "transport", "name": "Doprava a stěhování"},
        {"id": "tech", "name": "Technika a IT"},
        {"id": "creative", "name": "Kreativní služby"},
        {"id": "other", "name": "Ostatní"},
    ]
    for t in default_types:
        existing = await db.service_types.find_one({"id": t["id"]})
        if not existing:
            await db.service_types.insert_one(t)

    existing_pw = await db.app_settings.find_one({"key": "community_password"})
    if not existing_pw:
        await db.app_settings.insert_one({
            "key": "community_password",
            "value": "Transfortrans",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })

    existing_ep = await db.app_settings.find_one({"key": "entry_password_enabled"})
    if not existing_ep:
        await db.app_settings.insert_one({
            "key": "entry_password_enabled",
            "value": True,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })

    existing_email = await db.app_settings.find_one({"key": "contact_email"})
    if not existing_email:
        await db.app_settings.insert_one({
            "key": "contact_email",
            "value": "martinasobku@gmail.com",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })

    text_defaults = {
        "about_text": "Bloom je soukromý a bezpečný prostor pro trans komunitu v České republice. Naším cílem je vytvořit místo, kde se každý může svobodně vyjádřit, najít podporu a navázat kontakty s ostatními.",
        "contact_text": "Máte dotazy nebo potřebujete pomoc? Neváhejte nás kontaktovat. Snažíme se odpovídat co nejrychleji.",
        "help_text": "Bloom je soukromý prostor pro trans komunitu. Komunitní heslo slouží k ochraně tohoto prostoru. Požádejte někoho z komunity nebo kontaktujte administrátora.",
        "footer_text": "Bezpečný prostor pro trans komunitu v ČR",
    }
    for key, value in text_defaults.items():
        existing = await db.app_settings.find_one({"key": key})
        if not existing:
            await db.app_settings.insert_one({"key": key, "value": value, "updated_at": datetime.now(timezone.utc).isoformat()})

    existing_exp = await db.article_categories.find_one({"id": "zkusenosti"})
    if not existing_exp:
        await db.article_categories.insert_one({
            "id": "zkusenosti",
            "name": "Zkušenosti komunity",
            "description": "Osobní zkušenosti členů komunity. Příběhy mohou být anonymní.",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    spec_cat_count = await db.specialist_categories.count_documents({})
    if spec_cat_count == 0:
        default_spec_cats = [
            "Psychologie, psychiatrie a sexuologie",
            "Plastická chirurgie obličeje",
            "Plastická chirurgie těla",
            "Méně invazivní zákroky",
            "Fitness, kadeřnice, kosmetiky",
        ]
        for name in default_spec_cats:
            await db.specialist_categories.insert_one({"id": str(uuid.uuid4()), "name": name})

    news_cat_count = await db.news_categories.count_documents({})
    if news_cat_count == 0:
        default_news_cats = [
            {"id": "zkusenosti", "name": "Zkušenosti komunity", "order": 0},
            {"id": "world", "name": "Ze světa", "order": 1},
            {"id": "local", "name": "Domácí", "order": 2},
            {"id": "tips", "name": "Tipy a triky", "order": 3},
            {"id": "events", "name": "Eventy", "order": 4},
            {"id": "interviews", "name": "Rozhovory", "order": 5},
        ]
        for cat in default_news_cats:
            await db.news_categories.insert_one(cat)

    loc_count = await db.locations.count_documents({})
    if loc_count == 0:
        default_locations = [
            ("Praha", "CZ"), ("Středočeský kraj", "CZ"), ("Jihočeský kraj", "CZ"),
            ("Plzeňský kraj", "CZ"), ("Karlovarský kraj", "CZ"), ("Ústecký kraj", "CZ"),
            ("Liberecký kraj", "CZ"), ("Královéhradecký kraj", "CZ"), ("Pardubický kraj", "CZ"),
            ("Kraj Vysočina", "CZ"), ("Jihomoravský kraj", "CZ"), ("Olomoucký kraj", "CZ"),
            ("Zlínský kraj", "CZ"), ("Moravskoslezský kraj", "CZ"), ("Svět", "WORLD"),
        ]
        for name, country in default_locations:
            await db.locations.insert_one({"id": str(uuid.uuid4()), "name": name, "country": country})
    else:
        await db.locations.update_many(
            {"country": {"$exists": False}, "name": "Svět"},
            {"$set": {"country": "WORLD"}},
        )
        await db.locations.update_many(
            {"country": {"$exists": False}},
            {"$set": {"country": "CZ"}},
        )

    logger.info("Default data seeded.")

    # Ensure database indexes for fast lookups
    try:
        await db.users.create_index("id")
        await db.users.create_index("email")
        await db.users.create_index("username")
        await db.messages.create_index([("to_user_id", 1), ("read", 1)])
        await db.messages.create_index("from_user_id")
        await db.services.create_index("user_id")
        await db.services.create_index([("service_status", 1), ("expires_at", 1)])
        await db.notifications.create_index([("user_id", 1), ("read", 1)])
        await db.push_subscriptions.create_index("user_id")
        await db.push_subscriptions.create_index("endpoint")
        await db.password_resets.create_index("token")
        await db.gallery_access.create_index([("viewer_id", 1), ("owner_id", 1)])
        await db.gallery_access.create_index("expires_at", expireAfterSeconds=0)
        # TTL index: MongoDB auto-deletes expired reset tokens (requires BSON Date type in expires_at)
        await db.password_resets.create_index("expires_at", expireAfterSeconds=0)
        logger.info("Database indexes ensured.")
    except Exception as exc:
        logger.warning(f"Index creation warning (non-fatal): {exc}")

    # MIGRATION: Mark existing users without email_verified as verified
    await db.users.update_many(
        {"email_verified": {"$exists": False}},
        {"$set": {"email_verified": True}},
    )
    logger.info("Email verification migration done (existing users marked as verified).")

    # MIGRATION: Normalize all user roles to lowercase
    try:
        normalized = 0
        async for user in db.users.find({"role": {"$exists": True}}, {"_id": 0, "id": 1, "role": 1}):
            r = user.get("role")
            if r is not None:
                r_lower = str(r).lower()
                if r != r_lower:
                    await db.users.update_one({"id": user["id"]}, {"$set": {"role": r_lower}})
                    normalized += 1
        if normalized:
            logger.info(f"Role normalization migration: normalized {normalized} user(s) to lowercase.")
    except Exception as e:
        logger.warning(f"Role normalization migration skipped or failed: {e}")

    # MIGRATION: Promote martinkasobkova@gmail.com to superadmin if user exists (case-insensitive)
    try:
        promo_user = await db.users.find_one({"email": {"$regex": r"^martinkasobkova@gmail\.com$", "$options": "i"}})
        if promo_user:
            await db.users.update_one({"id": promo_user["id"]}, {"$set": {"role": "superadmin"}})
            logger.info("Superadmin migration: promoted martinkasobkova@gmail.com to superadmin.")
    except Exception as e:
        logger.warning(f"Superadmin migration skipped or failed: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
