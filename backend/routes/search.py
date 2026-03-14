from fastapi import APIRouter, Depends, Query
from database import db
from auth_helpers import get_current_user
import re

router = APIRouter()

# Each entry defines one searchable content type.
# "fields"      = MongoDB fields searched via $regex
# "project"     = fields returned in results
# "base_filter" = extra filter combined with the text search (optional)
SEARCH_CONFIGS = [
    {
        "key": "posts",
        "collection": "news",
        "fields": ["title", "content", "author_name"],
        "project": {"_id": 0, "id": 1, "title": 1, "category": 1, "author_name": 1, "created_at": 1, "content": 1},
        "label": "Příspěvky",
        "base_filter": None,
    },
    {
        "key": "users",
        "collection": "users",
        "fields": ["username", "bio"],
        "project": {"_id": 0, "id": 1, "username": 1, "bio": 1, "location": 1},
        "label": "Uživatelé",
        "base_filter": {"role": {"$ne": "banned"}},
    },
    {
        "key": "specialists",
        "collection": "specialists",
        "fields": ["name", "specialty", "description", "city"],
        "project": {"_id": 0, "id": 1, "name": 1, "specialty": 1, "city": 1, "description": 1},
        "label": "Odborníci",
        "base_filter": {"$or": [{"status": "approved"}, {"status": {"$exists": False}}, {"status": ""}]},
    },
    {
        "key": "services",
        "collection": "services",
        "fields": ["offer", "need", "description"],
        "project": {"_id": 0, "id": 1, "offer": 1, "need": 1, "description": 1, "post_type": 1, "location": 1},
        "label": "Nabídky pomoci",
        "base_filter": None,
    },
    {
        "key": "articles",
        "collection": "articles",
        "fields": ["title", "content", "author_name"],
        "project": {"_id": 0, "id": 1, "title": 1, "category": 1, "author_name": 1, "created_at": 1},
        "label": "Právní poradna – Články",
        "base_filter": {"published": True},
    },
    {
        "key": "questions",
        "collection": "questions",
        "fields": ["title", "content", "username"],
        "project": {"_id": 0, "id": 1, "title": 1, "content": 1, "username": 1, "created_at": 1, "vote_count": 1},
        "label": "Otázky komunity",
        "base_filter": None,
    },
    {
        "key": "reviews",
        "collection": "reviews",
        "fields": ["content", "username"],
        "project": {"_id": 0, "id": 1, "specialist_id": 1, "content": 1, "username": 1, "rating": 1, "created_at": 1},
        "label": "Recenze odborníků",
        "base_filter": None,
    },
]

PREVIEW_LENGTH = 180


def _truncate(text: str, length: int = PREVIEW_LENGTH) -> str:
    if not text:
        return ""
    return text[:length] + "…" if len(text) > length else text


@router.get("/search")
async def global_search(
    q: str = Query(..., min_length=2, max_length=100),
    limit: int = Query(5, ge=1, le=20),
    user: dict = Depends(get_current_user),
):
    q_clean = q.strip()
    if len(q_clean) < 2:
        return {"query": q, "results": {c["key"]: [] for c in SEARCH_CONFIGS}, "totals": {}}

    regex = {"$regex": re.escape(q_clean), "$options": "i"}
    results = {}
    totals = {}

    for config in SEARCH_CONFIGS:
        text_search = {"$or": [{field: regex} for field in config["fields"]]}
        if config.get("base_filter"):
            search_query = {"$and": [config["base_filter"], text_search]}
        else:
            search_query = text_search
        docs = await db[config["collection"]].find(search_query, config["project"]).limit(limit).to_list(limit)

        # Strip HTML tags from content and truncate for preview
        for doc in docs:
            for text_field in ("content", "bio", "description"):
                if doc.get(text_field):
                    clean = re.sub(r"<[^>]+>", "", doc[text_field])
                    doc[text_field] = _truncate(clean)

        results[config["key"]] = docs
        totals[config["key"]] = await db[config["collection"]].count_documents(search_query)

    return {"query": q_clean, "results": results, "totals": totals}
