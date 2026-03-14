import logging
import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request

logger = logging.getLogger(__name__)

from auth_helpers import get_current_user, get_admin_user, require_verified_email
from database import db
from rate_limits import limiter, LIMIT_PUBLIC_POSTING
from models import SpecialistCreate, SpecialistResponse, ReviewCreate, ReviewResponse
from utils import create_notification, sanitize_html, validate_safe_url

router = APIRouter()


@router.post("/specialists", response_model=SpecialistResponse)
async def create_specialist(specialist: SpecialistCreate, user: dict = Depends(get_admin_user)):
    specialist_id = str(uuid.uuid4())
    specialist_doc = {
        "id": specialist_id,
        "name": specialist.name,
        "specialty": specialist.specialty,
        "description": specialist.description or "",
        "subcategory": specialist.subcategory,
        "address": specialist.address,
        "city": specialist.city,
        "region": specialist.region,
        "country": specialist.country,
        "phone": specialist.phone or "",
        "email": specialist.email or "",
        "website": specialist.website or "",
        "lat": specialist.lat,
        "lng": specialist.lng,
        "avg_rating": 0,
        "review_count": 0,
        "status": "approved",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.specialists.insert_one(specialist_doc)
    return SpecialistResponse(**specialist_doc)


@router.post("/specialists/submit", response_model=SpecialistResponse)
@limiter.limit(LIMIT_PUBLIC_POSTING)
async def submit_specialist(request: Request, specialist: SpecialistCreate, user: dict = Depends(require_verified_email)):
    specialist_id = str(uuid.uuid4())
    specialist_doc = {
        "id": specialist_id,
        "name": specialist.name,
        "specialty": specialist.specialty,
        "description": specialist.description or "",
        "subcategory": specialist.subcategory,
        "address": specialist.address,
        "city": specialist.city,
        "region": specialist.region,
        "country": specialist.country,
        "phone": specialist.phone or "",
        "email": specialist.email or "",
        "website": validate_safe_url(specialist.website or "", "Web"),
        "lat": specialist.lat,
        "lng": specialist.lng,
        "avg_rating": 0,
        "review_count": 0,
        "status": "pending",
        "submitted_by": user["id"],
        "submitted_by_name": user["username"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.specialists.insert_one(specialist_doc)
    return SpecialistResponse(**specialist_doc)


@router.get("/specialists", response_model=List[SpecialistResponse])
async def get_specialists(country: str = "", specialty: str = "", region: str = "", search: str = "", sort: str = "rating"):
    query = {"$or": [{"status": "approved"}, {"status": {"$exists": False}}, {"status": ""}]}
    if country and country != "all":
        query = {"$and": [query, {"country": country}]}
    if specialty and specialty != "all":
        query = {"$and": [query, {"specialty": {"$regex": specialty, "$options": "i"}}]}
    if region and region != "all":
        query = {"$and": [query, {"region": {"$regex": region, "$options": "i"}}]}
    if search:
        search_q = {
            "$or": [
                {"name": {"$regex": search, "$options": "i"}},
                {"city": {"$regex": search, "$options": "i"}},
                {"specialty": {"$regex": search, "$options": "i"}},
                {"assigned_locations": {"$elemMatch": {"$regex": search, "$options": "i"}}},
            ]
        }
        query = {"$and": [query, search_q]}
    sort_field = ("name", 1) if sort == "name" else ("avg_rating", -1)
    specialists = await db.specialists.find(query, {"_id": 0}).sort(*sort_field).to_list(100)
    return [SpecialistResponse(**s) for s in specialists]


@router.get("/specialists/{specialist_id}", response_model=SpecialistResponse)
async def get_specialist(specialist_id: str):
    specialist = await db.specialists.find_one({"id": specialist_id}, {"_id": 0})
    if not specialist:
        raise HTTPException(status_code=404, detail="Odborník nenalezen")
    return SpecialistResponse(**specialist)


@router.post("/specialists/{specialist_id}/reviews", response_model=ReviewResponse)
@limiter.limit(LIMIT_PUBLIC_POSTING)
async def create_review(request: Request, specialist_id: str, review: ReviewCreate, user: dict = Depends(require_verified_email)):
    # DEBUG 1: incoming specialist_id from URL
    logger.info("[REVIEW] POST create_review called, specialist_id from URL=%s", specialist_id)
    # DEBUG 2: parsed request body
    logger.info("[REVIEW] Request body: specialist_id=%s, rating=%s, content=%s", review.specialist_id, review.rating, review.content)
    # DEBUG 3: authenticated user identity
    logger.info("[REVIEW] Authenticated user: id=%s, username=%s", user.get("id"), user.get("username"))
    try:
        specialist = await db.specialists.find_one({"id": specialist_id})
        if not specialist:
            logger.warning("[REVIEW] Specialist not found: %s", specialist_id)
            raise HTTPException(status_code=404, detail="Odborník nenalezen")
        # DEBUG 4: validation passed
        logger.info("[REVIEW] Validation passed, specialist found")

        review_id = str(uuid.uuid4())
        review_doc = {
            "id": review_id,
            "specialist_id": specialist_id,
            "user_id": user["id"],
            "username": user["username"],
            "rating": review.rating,
            "content": sanitize_html(review.content or ""),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.reviews.insert_one(review_doc)
        # DEBUG 5: insert to database happened
        logger.info("[REVIEW] Insert to database succeeded, review_id=%s", review_id)

        reviews = await db.reviews.find({"specialist_id": specialist_id}, {"_id": 0}).to_list(1000)
        avg_rating = sum(r["rating"] for r in reviews) / len(reviews) if reviews else 0
        await db.specialists.update_one(
            {"id": specialist_id},
            {"$set": {"avg_rating": round(avg_rating, 1), "review_count": len(reviews)}},
        )

        await create_notification(
            user_id=user["id"],
            type="review",
            title="Nová recenze",
            message=f"Vaše recenze pro {specialist['name']} byla přidána.",
            link="/specialists",
        )

        response = ReviewResponse(**review_doc)
        # DEBUG 6: success response payload
        logger.info("[REVIEW] Success, returning payload id=%s", response.id)
        return response
    except HTTPException:
        raise
    except Exception as ex:
        # DEBUG 7: full exception if it fails
        logger.exception("[REVIEW] create_review failed: %s", ex)
        raise


@router.get("/specialists/{specialist_id}/reviews", response_model=List[ReviewResponse])
async def get_reviews(specialist_id: str):
    reviews = await db.reviews.find({"specialist_id": specialist_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [ReviewResponse(**r) for r in reviews]


@router.delete("/specialists/{specialist_id}")
async def delete_specialist(specialist_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.specialists.delete_one({"id": specialist_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Odborník nenalezen")
    await db.reviews.delete_many({"specialist_id": specialist_id})
    return {"message": "Odborník a jeho recenze byly smazány"}


@router.get("/admin/specialists/pending")
async def get_pending_specialists(admin: dict = Depends(get_admin_user)):
    specialists = await db.specialists.find({"status": "pending"}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return specialists


@router.put("/admin/specialists/{specialist_id}/approve")
async def approve_specialist(specialist_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.specialists.update_one({"id": specialist_id}, {"$set": {"status": "approved"}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Odborník nenalezen")
    return {"message": "Odborník schválen"}


@router.put("/admin/specialists/{specialist_id}/reject")
async def reject_specialist(specialist_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.specialists.update_one({"id": specialist_id}, {"$set": {"status": "rejected"}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Odborník nenalezen")
    return {"message": "Odborník zamítnut"}


@router.put("/admin/specialists/{specialist_id}")
async def update_specialist(specialist_id: str, specialist: SpecialistCreate, admin: dict = Depends(get_admin_user)):
    existing = await db.specialists.find_one({"id": specialist_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Odborník nenalezen")
    update_data = specialist.model_dump()
    update_data["website"] = validate_safe_url(update_data.get("website") or "", "Web")
    await db.specialists.update_one({"id": specialist_id}, {"$set": update_data})
    updated = await db.specialists.find_one({"id": specialist_id}, {"_id": 0})
    return SpecialistResponse(**updated)
