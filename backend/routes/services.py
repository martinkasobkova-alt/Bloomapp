import asyncio
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request

from auth_helpers import get_current_user, require_verified_email, get_admin_user, role_matches
from rate_limits import limiter, LIMIT_PUBLIC_POSTING
from database import db
from models import ServiceCreate, ServiceResponse
from utils import send_broadcast_push_notification, sanitize_html

router = APIRouter()


@router.post("/services", response_model=ServiceResponse)
@limiter.limit(LIMIT_PUBLIC_POSTING)
async def create_service(request: Request, service: ServiceCreate, user: dict = Depends(require_verified_email)):
    service_id = str(uuid.uuid4())
    expiry_setting = await db.app_settings.find_one({"key": "offer_expiry_days"}, {"_id": 0})
    expiry_days = int(expiry_setting["value"]) if expiry_setting else 30
    expires_at = (datetime.now(timezone.utc) + timedelta(days=expiry_days)).isoformat()
    service_doc = {
        "id": service_id,
        "user_id": user["id"],
        "username": user["username"],
        "avatar": user.get("avatar", "fem-pink"),
        "custom_avatar": user.get("custom_avatar", ""),
        "offer": service.offer,
        "need": service.need,
        "description": service.description,
        "location": service.location,
        "service_type": service.service_type,
        "post_type": service.post_type,
        "service_status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": expires_at,
    }
    await db.services.insert_one(service_doc)

    post_label = "nabídka" if service.post_type == "offer" else "poptávka"
    push_body = (service.offer or service.description or "")[:80]
    asyncio.create_task(send_broadcast_push_notification(
        f"Nová {post_label} – Bloom",
        f"{user['username']}: {push_body}",
        url="/support",
        exclude_user_id=user["id"],
        notif_type="service",
    ))

    return ServiceResponse(**service_doc)


@router.get("/services", response_model=List[ServiceResponse])
async def get_services(
    service_status: str = "active",
    search: str = "",
    location: str = "",
    service_type: str = "",
    post_type: str = "",
    country: str = "",
):
    now_iso = datetime.now(timezone.utc).isoformat()
    query = {
        "service_status": service_status,
        "$or": [
            {"expires_at": {"$gt": now_iso}},
            {"expires_at": {"$exists": False}},
            {"expires_at": None},
        ],
    }
    if search:
        query["$and"] = [
            {
                "$or": [
                    {"offer": {"$regex": search, "$options": "i"}},
                    {"need": {"$regex": search, "$options": "i"}},
                    {"description": {"$regex": search, "$options": "i"}},
                ]
            }
        ]
    if country and country in ("CZ", "WORLD"):
        country_locs = await db.locations.find({"country": country}, {"_id": 0, "name": 1}).to_list(200)
        country_loc_names = [loc["name"] for loc in country_locs]
        if location and location != "all":
            # Specific location filter — also show entries with no location set
            query["$or"] = [
                {"location": {"$regex": location, "$options": "i"}},
                {"location": ""},
                {"location": {"$exists": False}},
            ]
        elif country_loc_names:
            # Country filter — include entries with no location (they apply everywhere)
            query["location"] = {"$in": country_loc_names + [""]}
        else:
            query["location"] = {"$in": []}
    elif location and location != "all":
        query["location"] = {"$regex": location, "$options": "i"}
    if service_type and service_type != "all":
        query["service_type"] = service_type
    if post_type and post_type != "all":
        query["post_type"] = post_type
    services = await db.services.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [ServiceResponse(**s) for s in services]


@router.get("/services/nearby", response_model=List[ServiceResponse])
async def get_nearby_services(location: str, user: dict = Depends(get_current_user)):
    now_iso = datetime.now(timezone.utc).isoformat()
    query = {
        "service_status": "active",
        "location": {"$regex": location, "$options": "i"},
        "$or": [
            {"expires_at": {"$gt": now_iso}},
            {"expires_at": {"$exists": False}},
            {"expires_at": None},
        ],
    }
    services = await db.services.find(query, {"_id": 0}).sort("created_at", -1).to_list(50)
    return [ServiceResponse(**s) for s in services]


@router.get("/services/my", response_model=List[ServiceResponse])
async def get_my_services(user: dict = Depends(get_current_user)):
    services = await db.services.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [ServiceResponse(**s) for s in services]


@router.delete("/services/{service_id}")
async def delete_service(service_id: str, user: dict = Depends(require_verified_email)):
    service = await db.services.find_one({"id": service_id})
    if not service:
        raise HTTPException(status_code=404, detail="Nabídka nenalezena")
    if service["user_id"] != user["id"] and not role_matches(user, "admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Nemáte oprávnění")
    await db.services.delete_one({"id": service_id})
    return {"message": "Nabídka smazána"}


@router.put("/services/{service_id}", response_model=ServiceResponse)
async def update_service(service_id: str, data: dict, user: dict = Depends(require_verified_email)):
    service = await db.services.find_one({"id": service_id})
    if not service:
        raise HTTPException(status_code=404, detail="Nabídka nenalezena")
    if service["user_id"] != user["id"] and not role_matches(user, "admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Nemáte oprávnění")
    allowed = {"offer", "need", "description", "location", "service_type", "post_type"}
    updates = {k: v for k, v in data.items() if k in allowed}
    for f in ("offer", "need", "description"):
        if f in updates and updates[f] is not None:
            updates[f] = sanitize_html(updates[f] or "")
    if updates:
        await db.services.update_one({"id": service_id}, {"$set": updates})
    updated = await db.services.find_one({"id": service_id}, {"_id": 0})
    return ServiceResponse(**updated)


@router.get("/service-types")
async def get_service_types():
    types = await db.service_types.find({}, {"_id": 0}).to_list(100)
    if not types:
        return [
            {"id": "beauty", "name": "Krása a péče"},
            {"id": "health", "name": "Zdraví a wellness"},
            {"id": "skills", "name": "Dovednosti a kurzy"},
            {"id": "transport", "name": "Doprava a stěhování"},
            {"id": "tech", "name": "Technika a IT"},
            {"id": "creative", "name": "Kreativní služby"},
            {"id": "other", "name": "Ostatní"},
        ]
    return types


@router.post("/service-types")
async def create_service_type(name: str, user: dict = Depends(get_admin_user)):
    type_id = str(uuid.uuid4())
    await db.service_types.insert_one({"id": type_id, "name": name})
    return {"id": type_id, "name": name}


@router.put("/service-types/{type_id}")
async def update_service_type(type_id: str, name: str, admin: dict = Depends(get_admin_user)):
    result = await db.service_types.update_one({"id": type_id}, {"$set": {"name": name}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Typ nenalezen")
    return {"id": type_id, "name": name}


@router.delete("/service-types/{type_id}")
async def delete_service_type(type_id: str, admin: dict = Depends(get_admin_user)):
    await db.service_types.delete_one({"id": type_id})
    return {"message": "Typ smazán"}


@router.get("/admin/locations")
async def get_managed_locations(user: dict = Depends(get_current_user)):
    locs = await db.locations.find({}, {"_id": 0}).sort("name", 1).to_list(200)
    return locs


@router.post("/admin/locations")
async def add_location(name: str, country: str = "CZ", admin: dict = Depends(get_admin_user)):
    loc_id = str(uuid.uuid4())
    await db.locations.insert_one({"id": loc_id, "name": name, "country": country})
    return {"id": loc_id, "name": name, "country": country}


@router.put("/admin/locations/{loc_id}")
async def update_location(loc_id: str, name: str, country: str = "CZ", admin: dict = Depends(get_admin_user)):
    await db.locations.update_one({"id": loc_id}, {"$set": {"name": name, "country": country}})
    return {"id": loc_id, "name": name, "country": country}


@router.delete("/admin/locations/{loc_id}")
async def delete_location(loc_id: str, admin: dict = Depends(get_admin_user)):
    await db.locations.delete_one({"id": loc_id})
    return {"message": "Lokalita smazána"}


@router.get("/locations")
async def get_public_locations(country: Optional[str] = None):
    """Public endpoint for getting admin-managed locations (no auth required)."""
    q = {}
    if country:
        q["country"] = country
    locs = await db.locations.find(q, {"_id": 0}).sort("name", 1).to_list(200)
    return locs
