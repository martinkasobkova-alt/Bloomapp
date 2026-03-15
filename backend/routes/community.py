from fastapi import APIRouter

from database import db
from models import SpecialistResponse

router = APIRouter()


@router.get("/stats")
async def get_community_stats():
    members = await db.users.count_documents({})
    # "sdílených zkušeností" = only stories (news with category zkusenosti), not all news/aktuality
    experiences = await db.news.count_documents({"category": "zkusenosti"})
    specialists = await db.specialists.count_documents({})
    services = await db.services.count_documents({})
    return {
        "members": members,
        "experiences": experiences,
        "specialists": specialists,
        "services": services,
    }


@router.get("/community/highlights")
async def get_community_highlights():
    new_members = await db.users.find({}, {"_id": 0, "id": 1, "username": 1, "avatar": 1, "custom_avatar": 1, "created_at": 1}).sort("created_at", -1).to_list(5)

    pipeline = [
        {"$group": {"_id": "$user_id", "count": {"$sum": 1}, "username": {"$first": "$username"}, "avatar": {"$first": "$avatar"}}},
        {"$sort": {"count": -1}},
        {"$limit": 5},
    ]
    active_helpers = await db.services.aggregate(pipeline).to_list(5)

    top_specialists = await db.specialists.find({}, {"_id": 0}).sort("avg_rating", -1).to_list(5)

    return {
        "new_members": [
            {"id": u["id"], "username": u["username"], "avatar": u.get("avatar", "fem-pink"), "created_at": u.get("created_at", "")}
            for u in new_members
        ],
        "active_helpers": [
            {"user_id": h["_id"], "username": h.get("username", ""), "avatar": h.get("avatar", "fem-pink"), "service_count": h["count"]}
            for h in active_helpers
        ],
        "top_specialists": [SpecialistResponse(**s).model_dump() for s in top_specialists if s.get("review_count", 0) > 0],
    }
