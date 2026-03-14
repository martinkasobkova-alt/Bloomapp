import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException

from auth_helpers import get_current_user, get_admin_user
from database import db
from models import TextSettingUpdate, SpecialistCategoryUpdate, ContactEmailUpdate

router = APIRouter()

DEFAULT_SECTION_SETTINGS = {
    "specialists": {"title": "Trans-friendly odborníci", "subtitle": "Najděte ověřené odborníky, kteří vám pomohou na vaší cestě", "color": "#8A7CFF", "visible": True, "order": 3},
    "legal": {"title": "Právní poradna", "subtitle": "Odborné právní informace pro trans komunitu", "color": "#5BCEFA", "visible": True, "order": 4},
    "news": {"title": "Aktuality", "subtitle": "Novinky ze světa trans komunity", "color": "#5BCEFA", "visible": True, "order": 5},
    "stories": {"title": "Zkušenosti komunity", "subtitle": "Tady se sdílí příběhy.", "color": "#F5A9B8", "visible": True, "order": 6},
    "community": {"title": "Komunita", "subtitle": "Bezpečný prostor pro sdílení", "color": "#8A7CFF", "visible": True, "order": 7},
    "support": {"title": "Vzájemná podpora", "subtitle": "Nabídněte své dovednosti a získejte pomoc od ostatních", "color": "#F5A9B8", "visible": True, "order": 2},
    "nearby": {"title": "V mém okolí", "subtitle": "Najděte lidi a odborníky ve svém okolí", "color": "#A8E6CF", "visible": True, "order": 8},
}

# Barvy odpovídají mobilnímu menu (Rychlé odkazy) – jednotné na webu i mobilu
DEFAULT_MARKER_COLORS = {
    "support": "#F5A9B8",      # Vzájemná podpora – pastel růžová
    "specialists": "#B8A9F5",  # Odborníci – pastel fialová
    "legal": "#A9E5F5",       # Právní poradna – pastel tyrkysová
    "news": "#A9F5B8",        # Aktuality – pastel zelená
    "nearby": "#F5D4A9",      # V mém okolí – pastel broskvová
    "stories": "#F5E6A9",     # Zkušenosti komunity – pastel žlutá
    "community": "#8A7CFF",
    "messages": "#8A7CFF",
    "profile": "#F5A9B8",
    "featured": "#F5A9B8",
    "default": "#8A7CFF",
}


@router.get("/settings/sections")
async def get_section_settings():
    setting = await db.app_settings.find_one({"key": "section_settings"}, {"_id": 0})
    db_value = setting.get("value", {}) if setting else {}
    # Deep merge per-key so defaults (visible, color) are preserved when DB doesn't have them
    result = {}
    for key, defaults in DEFAULT_SECTION_SETTINGS.items():
        result[key] = {**defaults, **(db_value.get(key) or {})}
    return result


@router.put("/admin/settings/sections")
async def update_section_settings(sections: dict, admin: dict = Depends(get_admin_user)):
    await db.app_settings.update_one(
        {"key": "section_settings"},
        {"$set": {"key": "section_settings", "value": sections, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"message": "Nastavení sekcí uloženo", "sections": sections}


@router.get("/featured-items")
async def get_featured_items():
    items = await db.featured_items.find({}, {"_id": 0}).sort("order", 1).to_list(20)
    result = []
    for item in items:
        if item["type"] == "specialist":
            s = await db.specialists.find_one({"id": item["item_id"]}, {"_id": 0})
            if s:
                result.append({"id": item["id"], "type": "specialist", "order": item["order"], "data": s})
        elif item["type"] == "news":
            n = await db.news.find_one({"id": item["item_id"]}, {"_id": 0})
            if n:
                result.append({"id": item["id"], "type": "news", "order": item["order"], "data": n})
    return result


@router.post("/admin/featured-items")
async def add_featured_item(item_type: str, item_id: str, admin: dict = Depends(get_admin_user)):
    count = await db.featured_items.count_documents({"type": item_type})
    if count >= 3:
        raise HTTPException(status_code=400, detail=f"Maximálně 3 doporučené položky typu {item_type}")
    existing = await db.featured_items.find_one({"type": item_type, "item_id": item_id})
    if existing:
        raise HTTPException(status_code=400, detail="Položka je již doporučena")
    order = await db.featured_items.count_documents({})
    await db.featured_items.insert_one({"id": str(uuid.uuid4()), "type": item_type, "item_id": item_id, "order": order})
    return {"message": "Přidáno mezi doporučené"}


@router.delete("/admin/featured-items/{item_type}/{item_id}")
async def remove_featured_item(item_type: str, item_id: str, admin: dict = Depends(get_admin_user)):
    await db.featured_items.delete_one({"type": item_type, "item_id": item_id})
    return {"message": "Odebráno z doporučených"}


@router.put("/admin/featured-items/reorder")
async def reorder_featured_items(item_ids: List[str], admin: dict = Depends(get_admin_user)):
    for i, fid in enumerate(item_ids):
        await db.featured_items.update_one({"id": fid}, {"$set": {"order": i}})
    return {"message": "Pořadí aktualizováno"}


DEFAULT_NEWS_CATS = [
    {"id": "zkusenosti", "name": "Zkušenosti komunity"},
    {"id": "world", "name": "Ze světa"},
    {"id": "local", "name": "Domácí"},
    {"id": "tips", "name": "Tipy a triky"},
    {"id": "events", "name": "Eventy"},
    {"id": "interviews", "name": "Rozhovory"},
]

DEFAULT_ARTICLE_CATS = [
    {"id": "pravni", "name": "Právní"},
    {"id": "zdravi", "name": "Zdraví"},
    {"id": "socialni", "name": "Sociální"},
    {"id": "prava", "name": "Práva a legislativa"},
    {"id": "ostatni", "name": "Ostatní"},
]

# Roles that may post in each news category by default
DEFAULT_NEWS_POSTING_ROLES = {
    "zkusenosti": ["user", "specialist", "admin", "lawyer"],
}

def _apply_allowed_roles_defaults(cats: list, default_roles: dict = None, fallback: list = None) -> list:
    """Ensure every category has an allowed_roles list with safe defaults."""
    if default_roles is None:
        default_roles = DEFAULT_NEWS_POSTING_ROLES
    if fallback is None:
        fallback = ["admin"]
    result = []
    for c in cats:
        c = dict(c)
        if not c.get("allowed_roles"):
            c["allowed_roles"] = default_roles.get(c["id"], fallback)
        result.append(c)
    return result


def _merge_news_cats(db_cats: list) -> list:
    """Merge DB categories with defaults so no default category is ever missing."""
    merged = {c["id"]: c for c in DEFAULT_NEWS_CATS}
    for c in db_cats:
        merged[c["id"]] = c  # DB entry overrides default
    cats = list(merged.values())
    # Sort by order field if present, else keep insertion order
    cats.sort(key=lambda c: c.get("order", 999))
    return cats


def _merge_article_cats(db_cats: list) -> list:
    """Merge DB article categories with defaults."""
    merged = {c["id"]: c for c in DEFAULT_ARTICLE_CATS}
    for c in db_cats:
        merged[c["id"]] = c
    return sorted(merged.values(), key=lambda c: c.get("name", ""))


@router.get("/news-categories")
async def get_news_categories_public():
    db_cats = await db.news_categories.find({}, {"_id": 0}).sort("order", 1).to_list(50)
    cats = _merge_news_cats(db_cats)
    return _apply_allowed_roles_defaults(cats)


@router.get("/admin/news-categories")
async def get_news_categories_admin(admin: dict = Depends(get_admin_user)):
    db_cats = await db.news_categories.find({}, {"_id": 0}).sort("order", 1).to_list(50)
    cats = _merge_news_cats(db_cats)
    return _apply_allowed_roles_defaults(cats)


@router.get("/article-categories")
async def get_article_categories_public():
    db_cats = await db.article_categories.find({}, {"_id": 0}).sort("name", 1).to_list(50)
    cats = _merge_article_cats(db_cats)
    return _apply_allowed_roles_defaults(cats, default_roles={}, fallback=["admin", "lawyer"])


@router.post("/admin/news-categories")
async def add_news_category(name: str, admin: dict = Depends(get_admin_user)):
    cat_id = str(uuid.uuid4())
    count = await db.news_categories.count_documents({})
    await db.news_categories.insert_one({"id": cat_id, "name": name, "order": count})
    return {"id": cat_id, "name": name}


@router.put("/admin/news-categories/{cat_id}")
async def update_news_category(cat_id: str, name: str, admin: dict = Depends(get_admin_user)):
    await db.news_categories.update_one({"id": cat_id}, {"$set": {"name": name}})
    return {"id": cat_id, "name": name}


@router.delete("/admin/news-categories/{cat_id}")
async def delete_news_category(cat_id: str, admin: dict = Depends(get_admin_user)):
    await db.news_categories.delete_one({"id": cat_id})
    return {"message": "Kategorie smazána"}


@router.put("/admin/news-categories/{cat_id}/allowed-roles")
async def update_news_category_roles(cat_id: str, allowed_roles: List[str], admin: dict = Depends(get_admin_user)):
    valid_roles = {"user", "specialist", "lawyer", "admin", "superadmin"}
    roles = [r.lower() for r in allowed_roles if r and r.lower() in valid_roles]
    if not roles:
        raise HTTPException(status_code=400, detail="Alespoň jedna platná role je povinná")
    # Check if category exists in DB; if not, we need to create it first from defaults
    cat = await db.news_categories.find_one({"id": cat_id}, {"_id": 0})
    if not cat:
        # Category lives only in defaults – insert it so we can persist allowed_roles
        default = next((c for c in DEFAULT_NEWS_CATS if c["id"] == cat_id), None)
        if not default:
            raise HTTPException(status_code=404, detail="Kategorie nenalezena")
        count = await db.news_categories.count_documents({})
        await db.news_categories.insert_one({**default, "order": count, "allowed_roles": roles})
    else:
        await db.news_categories.update_one({"id": cat_id}, {"$set": {"allowed_roles": roles}})
    return {"id": cat_id, "allowed_roles": roles}


@router.get("/admin/article-categories")
async def get_article_categories_admin(user: dict = Depends(get_current_user)):
    db_cats = await db.article_categories.find({}, {"_id": 0}).sort("name", 1).to_list(50)
    cats = _merge_article_cats(db_cats)
    return _apply_allowed_roles_defaults(cats, default_roles={}, fallback=["admin", "lawyer"])


@router.post("/admin/article-categories")
async def add_article_category(name: str, admin: dict = Depends(get_admin_user)):
    cat_id = str(uuid.uuid4())
    await db.article_categories.insert_one({"id": cat_id, "name": name})
    return {"id": cat_id, "name": name}


@router.delete("/admin/article-categories/{cat_id}")
async def delete_article_category(cat_id: str, admin: dict = Depends(get_admin_user)):
    await db.article_categories.delete_one({"id": cat_id})
    return {"message": "Kategorie smazána"}


@router.put("/admin/article-categories/{cat_id}/allowed-roles")
async def update_article_category_roles(cat_id: str, allowed_roles: List[str], admin: dict = Depends(get_admin_user)):
    valid_roles = {"user", "specialist", "lawyer", "admin", "superadmin"}
    roles = [r.lower() for r in allowed_roles if r and r.lower() in valid_roles]
    if not roles:
        raise HTTPException(status_code=400, detail="Alespoň jedna platná role je povinná")
    cat = await db.article_categories.find_one({"id": cat_id}, {"_id": 0})
    if not cat:
        default = next((c for c in DEFAULT_ARTICLE_CATS if c["id"] == cat_id), None)
        if not default:
            raise HTTPException(status_code=404, detail="Kategorie nenalezena")
        await db.article_categories.insert_one({**default, "allowed_roles": roles})
    else:
        await db.article_categories.update_one({"id": cat_id}, {"$set": {"allowed_roles": roles}})
    return {"id": cat_id, "allowed_roles": roles}


@router.get("/specialist-categories")
async def get_specialist_categories_public():
    """Public endpoint - returns specialist categories for Q&A filtering."""
    cats = await db.specialist_categories.find({}, {"_id": 0}).sort("name", 1).to_list(50)
    return cats if cats else []


@router.get("/admin/specialist-categories")
async def get_specialist_categories(user: dict = Depends(get_current_user)):
    cats = await db.specialist_categories.find({}, {"_id": 0}).sort("name", 1).to_list(50)
    if not cats:
        return [
            {"id": "Psychologie, psychiatrie a sexuologie", "name": "Psychologie, psychiatrie a sexuologie"},
            {"id": "Plastická chirurgie obličeje", "name": "Plastická chirurgie obličeje"},
            {"id": "Plastická chirurgie těla", "name": "Plastická chirurgie těla"},
            {"id": "Méně invazivní zákroky", "name": "Méně invazivní zákroky"},
            {"id": "Fitness, kadeřnice, kosmetiky", "name": "Fitness, kadeřnice, kosmetiky"},
        ]
    return cats


@router.post("/admin/specialist-categories")
async def add_specialist_category(name: str, admin: dict = Depends(get_admin_user)):
    cat_id = str(uuid.uuid4())
    await db.specialist_categories.insert_one({"id": cat_id, "name": name})
    return {"id": cat_id, "name": name}


@router.delete("/admin/specialist-categories/{cat_id}")
async def delete_specialist_category(cat_id: str, admin: dict = Depends(get_admin_user)):
    await db.specialist_categories.delete_one({"id": cat_id})
    return {"message": "Kategorie smazána"}


@router.put("/admin/specialist-categories/{cat_id}")
async def update_specialist_category(cat_id: str, data: SpecialistCategoryUpdate, admin: dict = Depends(get_admin_user)):
    if not data.name.strip():
        raise HTTPException(status_code=400, detail="Název nesmí být prázdný")
    result = await db.specialist_categories.update_one({"id": cat_id}, {"$set": {"name": data.name.strip()}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Kategorie nenalezena")
    return {"message": "Kategorie upravena"}


@router.get("/settings/texts")
async def get_text_settings():
    settings = await db.app_settings.find(
        {"key": {"$in": ["about_text", "contact_text", "help_text", "footer_text"]}},
        {"_id": 0, "key": 1, "value": 1},
    ).to_list(10)
    return {s["key"]: s["value"] for s in settings}


@router.put("/admin/settings/texts")
async def update_text_setting(data: TextSettingUpdate, admin: dict = Depends(get_admin_user)):
    allowed = {"about_text", "contact_text", "help_text", "footer_text"}
    if data.key not in allowed:
        raise HTTPException(status_code=400, detail="Neplatný klíč nastavení")
    await db.app_settings.update_one(
        {"key": data.key},
        {"$set": {"key": data.key, "value": data.value, "updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": admin["id"]}},
        upsert=True,
    )
    return {"message": f"Text '{data.key}' byl uložen"}


@router.get("/settings/marker-colors")
async def get_marker_colors():
    setting = await db.app_settings.find_one({"key": "marker_colors"}, {"_id": 0})
    if setting and setting.get("value"):
        # Merge defaults first so newly added keys are always returned even when DB has older snapshot
        return {**DEFAULT_MARKER_COLORS, **setting["value"]}
    return DEFAULT_MARKER_COLORS


@router.put("/admin/settings/marker-colors")
async def update_marker_colors(colors: dict, admin: dict = Depends(get_admin_user)):
    await db.app_settings.update_one(
        {"key": "marker_colors"},
        {"$set": {"key": "marker_colors", "value": colors, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"message": "Barvy markerů uloženy", "colors": colors}


@router.get("/settings/entry-password-status")
async def get_entry_password_status():
    setting = await db.app_settings.find_one({"key": "entry_password_enabled"}, {"_id": 0})
    return {"enabled": setting["value"] if setting else True}


@router.get("/settings/contact-email")
async def get_contact_email():
    setting = await db.app_settings.find_one({"key": "contact_email"}, {"_id": 0})
    return {"email": setting["value"] if setting else ""}


@router.put("/admin/settings/contact-email")
async def update_contact_email(data: ContactEmailUpdate, admin: dict = Depends(get_admin_user)):
    if not data.email or "@" not in data.email:
        raise HTTPException(status_code=400, detail="Neplatná e-mailová adresa")
    await db.app_settings.update_one(
        {"key": "contact_email"},
        {"$set": {"key": "contact_email", "value": data.email, "updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": admin["id"]}},
        upsert=True,
    )
    return {"message": "Kontaktní email byl změněn"}
