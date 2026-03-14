import base64
import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from fastapi.responses import FileResponse, Response

from auth_helpers import (
    compute_badges, get_current_user, require_verified_email, user_response_dict,
)
from rate_limits import limiter, LIMIT_UPLOADS
from cloudinary_storage import (
    _is_configured as cloudinary_configured,
    _is_cloudinary_url as is_cloudinary_url,
    delete_asset as cloudinary_delete,
    upload_media as cloudinary_upload,
)
from database import FRONTEND_URL, UPLOAD_DIR, db, JWT_SECRET, JWT_ALGORITHM
from models import (
    GallerySettingsUpdate, GalleryVerify, JourneyUpdate,
    PhotoTagsUpdate, ServiceResponse, UserRatingCreate,
)

router = APIRouter()


@router.get("/users/me")
async def get_me_with_journey(current_user: dict = Depends(get_current_user)):
    d = user_response_dict(current_user)
    d["journey"] = current_user.get("journey", None)
    return d


@router.get("/users/nearby")
async def get_nearby_users(location: str = "", current_user: dict = Depends(get_current_user)):
    if not location:
        return []
    users = await db.users.find(
        {"location": location, "id": {"$ne": current_user["id"]}},
        {"_id": 0, "id": 1, "username": 1, "avatar": 1, "custom_avatar": 1, "bio": 1, "pronouns": 1, "role": 1}
    ).limit(12).to_list(12)
    return users


@router.get("/users/search")
async def search_users(q: str = "", current_user: dict = Depends(get_current_user)):
    if not q or len(q) < 2:
        return []
    users = await db.users.find(
        {"username": {"$regex": q, "$options": "i"}, "role": {"$ne": "banned"}},
        {"_id": 0, "id": 1, "username": 1, "avatar": 1, "location": 1, "pronouns": 1}
    ).to_list(10)
    return users



@router.get("/users/{user_id}/profile")
async def get_user_profile(user_id: str):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Uživatel nenalezen")
    return user_response_dict(user)


@router.get("/users/{user_id}/public-profile")
async def get_public_profile(user_id: str, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Uživatel nenalezen")
    services = await db.services.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(20)
    existing_rating = await db.user_ratings.find_one(
        {"from_user_id": current_user["id"], "to_user_id": user_id}, {"_id": 0}
    )
    profile = user_response_dict(user)
    # Enrich with location_country for display (Česká republika / Svět)
    location = user.get("location", "") or ""
    location_country = ""
    if location:
        loc_doc = await db.locations.find_one({"name": location}, {"country": 1})
        if loc_doc:
            location_country = loc_doc.get("country", "")
        elif location == "Svět":
            location_country = "WORLD"
        else:
            location_country = "CZ"  # default for CZ regions
    profile["location_country"] = location_country
    profile["services"] = [ServiceResponse(**s).model_dump() for s in services]
    profile["already_rated"] = existing_rating is not None
    journey = user.get("journey", {})
    if journey and journey.get("is_public"):
        profile["journey"] = journey
    else:
        profile["journey"] = None
    return profile


@router.post("/users/me/upload-avatar")
async def upload_avatar(file: UploadFile = File(...), user: dict = Depends(require_verified_email)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Soubor musí být obrázek (JPEG, PNG, WebP).")
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Obrázek je příliš velký (max 5 MB).")
    if not cloudinary_configured():
        raise HTTPException(status_code=503, detail="Media storage not configured. Set CLOUDINARY_* in backend/.env")
    old_user = await db.users.find_one({"id": user["id"]}, {"_id": 0, "custom_avatar": 1, "custom_avatar_public_id": 1})
    result = cloudinary_upload(
        content,
        folder="bloom/avatars",
        resource_type="image",
        content_type=file.content_type or "",
        public_id_prefix=f"{user['id']}_",
    )
    if not result:
        raise HTTPException(status_code=503, detail="Upload failed")
    avatar_url = result["secure_url"]
    public_id = result.get("public_id", "")
    if old_user and old_user.get("custom_avatar_public_id") and is_cloudinary_url(old_user.get("custom_avatar", "")):
        cloudinary_delete(old_user["custom_avatar_public_id"], resource_type="image")
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"custom_avatar": avatar_url, "custom_avatar_public_id": public_id, "avatar": "custom"}}
    )
    return {"url": avatar_url}


@router.get("/uploads/avatars/{filename}")
async def serve_avatar(filename: str):
    # Sanitize against path traversal: use basename only, reject empty or invalid
    safe_name = os.path.basename(filename)
    if not safe_name or safe_name != filename or ".." in safe_name or "/" in safe_name or "\\" in safe_name:
        raise HTTPException(status_code=400, detail="Neplatná cesta k souboru")
    file_path = UPLOAD_DIR / safe_name
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Soubor nenalezen")
    # Ensure resolved path stays within UPLOAD_DIR
    try:
        resolved = file_path.resolve()
        base = UPLOAD_DIR.resolve()
        if not str(resolved).startswith(str(base)):
            raise HTTPException(status_code=400, detail="Neplatná cesta k souboru")
    except (OSError, ValueError):
        raise HTTPException(status_code=400, detail="Neplatná cesta k souboru")
    return FileResponse(str(file_path))


# ---- User ratings ----

@router.post("/users/{user_id}/rate")
async def rate_user(user_id: str, rating_data: UserRatingCreate, user: dict = Depends(require_verified_email)):
    if user_id == user["id"]:
        raise HTTPException(status_code=400, detail="Nemůžete hodnotit sami sebe")
    target = await db.users.find_one({"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="Uživatel nenalezen")
    existing = await db.user_ratings.find_one({"from_user_id": user["id"], "to_user_id": user_id})
    rating_doc = {
        "id": str(uuid.uuid4()),
        "from_user_id": user["id"],
        "from_username": user["username"],
        "to_user_id": user_id,
        "rating": rating_data.rating,
        "comment": rating_data.comment,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    if existing:
        await db.user_ratings.update_one({"id": existing["id"]}, {"$set": {"rating": rating_data.rating, "comment": rating_data.comment}})
    else:
        await db.user_ratings.insert_one(rating_doc)
    all_ratings = await db.user_ratings.find({"to_user_id": user_id}, {"_id": 0, "rating": 1}).to_list(1000)
    avg = sum(r["rating"] for r in all_ratings) / len(all_ratings) if all_ratings else 0
    await db.users.update_one({"id": user_id}, {"$set": {"avg_rating": round(avg, 1), "rating_count": len(all_ratings)}})
    return {"message": "Hodnocení uloženo", "avg_rating": round(avg, 1), "rating_count": len(all_ratings)}


@router.get("/users/{user_id}/ratings")
async def get_user_ratings(user_id: str):
    ratings = await db.user_ratings.find({"to_user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return ratings


# ---- Gallery ----

@router.post("/users/me/photos")
@limiter.limit(LIMIT_UPLOADS)
async def upload_photo(request: Request, file: UploadFile = File(...), current_user: dict = Depends(require_verified_email)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Soubor musí být obrázek")
    existing_count = await db.user_photos.count_documents({"user_id": current_user["id"]})
    if existing_count >= 12:
        raise HTTPException(status_code=400, detail="Maximální počet fotek je 12")
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Soubor je příliš velký (max 5 MB)")
    photo_data = base64.b64encode(contents).decode("utf-8")
    photo_id = str(uuid.uuid4())
    await db.user_photos.insert_one({
        "id": photo_id,
        "user_id": current_user["id"],
        "data": photo_data,
        "content_type": file.content_type,
        "tags": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"id": photo_id, "message": "Fotka nahrána"}


@router.put("/users/me/gallery-settings")
async def update_gallery_settings(data: GallerySettingsUpdate, current_user: dict = Depends(require_verified_email)):
    if data.privacy not in ("public", "protected"):
        raise HTTPException(status_code=400, detail="Neplatné nastavení soukromí")
    update = {"gallery_privacy": data.privacy}
    if data.privacy == "protected":
        if not data.password:
            raise HTTPException(status_code=400, detail="Heslo galerie je povinné")
        update["gallery_password"] = bcrypt.hashpw(data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    else:
        update["gallery_password"] = None
    await db.users.update_one({"id": current_user["id"]}, {"$set": update})
    return {"message": "Nastavení galerie uloženo"}


@router.get("/users/{user_id}/gallery-info")
async def get_gallery_info(user_id: str, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "gallery_privacy": 1})
    if not user:
        raise HTTPException(status_code=404, detail="Uživatel nenalezen")
    return {"privacy": user.get("gallery_privacy", "public")}


@router.post("/users/{user_id}/gallery-verify")
async def verify_gallery_password(user_id: str, data: GalleryVerify, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "gallery_privacy": 1, "gallery_password": 1})
    if not user:
        raise HTTPException(status_code=404, detail="Uživatel nenalezen")
    if user.get("gallery_privacy") != "protected":
        return {"verified": True}
    if not bcrypt.checkpw(data.password.encode('utf-8'), user.get("gallery_password", "").encode('utf-8')):
        raise HTTPException(status_code=403, detail="Nesprávné heslo galerie")
    return {"verified": True}


GALLERY_ACCESS_EXPIRY_HOURS = 1


@router.get("/users/{user_id}/photos")
async def get_user_photos(user_id: str, gallery_password: str = "", current_user: dict = Depends(get_current_user)):
    if user_id != current_user["id"]:
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "gallery_privacy": 1, "gallery_password": 1})
        if user and user.get("gallery_privacy") == "protected":
            stored_hash = user.get("gallery_password") or ""
            if not gallery_password or not stored_hash or not bcrypt.checkpw(gallery_password.encode('utf-8'), stored_hash.encode('utf-8')):
                raise HTTPException(status_code=403, detail="Galerie je chráněna heslem")
            expires_at = datetime.now(timezone.utc) + timedelta(hours=GALLERY_ACCESS_EXPIRY_HOURS)
            await db.gallery_access.update_one(
                {"viewer_id": current_user["id"], "owner_id": user_id},
                {"$set": {"expires_at": expires_at}},
                upsert=True,
            )
    photos = await db.user_photos.find(
        {"user_id": user_id},
        {"_id": 0, "id": 1, "content_type": 1, "tags": 1, "created_at": 1}
    ).sort("created_at", 1).to_list(12)
    return photos


@router.put("/users/me/photos/{photo_id}/tags")
async def update_photo_tags(photo_id: str, data: PhotoTagsUpdate, current_user: dict = Depends(require_verified_email)):
    photo = await db.user_photos.find_one({"id": photo_id, "user_id": current_user["id"]})
    if not photo:
        raise HTTPException(status_code=404, detail="Fotka nenalezena")
    tags = [{"user_id": t.get("user_id", ""), "username": t.get("username", "")} for t in data.tags if t.get("user_id")]
    await db.user_photos.update_one({"id": photo_id}, {"$set": {"tags": tags}})
    return {"message": "Tagy uloženy"}


@router.get("/users/me/photos/{photo_id}")
async def serve_photo(photo_id: str, current_user: dict = Depends(get_current_user)):
    photo = await db.user_photos.find_one({"id": photo_id, "user_id": current_user["id"]})
    if not photo:
        raise HTTPException(status_code=404, detail="Fotka nenalezena")
    return Response(content=base64.b64decode(photo["data"]), media_type=photo["content_type"])


@router.get("/photos/{photo_id}")
async def serve_photo_public(
    request: Request,
    photo_id: str,
    token: Optional[str] = None,
):
    """
    Serve gallery photo. Public galleries: anyone. Protected galleries: owner or
    viewer with valid gallery_access (correct password entered). No admin bypass.
    Accepts Bearer header or ?token= query for img src.
    """
    photo = await db.user_photos.find_one({"id": photo_id})
    if not photo:
        raise HTTPException(status_code=404, detail="Fotka nenalezena")
    owner_id = photo["user_id"]
    owner = await db.users.find_one({"id": owner_id}, {"_id": 0, "gallery_privacy": 1})
    privacy = (owner or {}).get("gallery_privacy", "public")

    if privacy == "public":
        return Response(content=base64.b64decode(photo["data"]), media_type=photo["content_type"])

    jwt_token = request.headers.get("Authorization", "").replace("Bearer ", "") or token or request.query_params.get("token")
    if not jwt_token:
        raise HTTPException(status_code=401, detail="Pro zobrazení této galerie se přihlaste")
    try:
        payload = jwt.decode(jwt_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        requester_id = payload.get("user_id")
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        raise HTTPException(status_code=401, detail="Neplatný nebo vypršený token")
    if not requester_id:
        raise HTTPException(status_code=401, detail="Neplatný token")

    if requester_id == owner_id:
        return Response(content=base64.b64decode(photo["data"]), media_type=photo["content_type"])
    access = await db.gallery_access.find_one(
        {"viewer_id": requester_id, "owner_id": owner_id, "expires_at": {"$gt": datetime.now(timezone.utc)}},
        {"_id": 1},
    )
    if not access:
        raise HTTPException(status_code=403, detail="Přístup odepřen")
    return Response(content=base64.b64decode(photo["data"]), media_type=photo["content_type"])


@router.delete("/users/me/photos/{photo_id}")
async def delete_photo(photo_id: str, current_user: dict = Depends(require_verified_email)):
    result = await db.user_photos.delete_one({"id": photo_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Fotka nenalezena")
    return {"message": "Fotka smazána"}


# ---- Journey ----

@router.put("/users/me/journey")
async def update_journey(data: JourneyUpdate, current_user: dict = Depends(require_verified_email)):
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"journey": {
            "stage": data.stage,
            "stage_label": data.stage_label,
            "is_public": data.is_public,
            "note": data.note,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}}
    )
    return {"message": "Cesta uložena"}


@router.get("/journey/similar")
async def find_similar_journey(stage: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    if not stage:
        user = await db.users.find_one({"id": current_user["id"]})
        if not user or not user.get("journey", {}).get("stage"):
            return []
        stage = user["journey"]["stage"]
    similar = await db.users.find(
        {"journey.stage": stage, "journey.is_public": True, "id": {"$ne": current_user["id"]}},
        {"_id": 0, "id": 1, "username": 1, "avatar": 1, "custom_avatar": 1, "location": 1, "journey": 1}
    ).to_list(20)
    return similar
