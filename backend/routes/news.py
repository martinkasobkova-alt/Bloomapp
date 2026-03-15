import asyncio
import os
import resend
import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from fastapi.responses import FileResponse

from auth_helpers import get_current_user, require_verified_email, get_admin_user, get_admin_or_lawyer_user, role_matches
from rate_limits import limiter, LIMIT_PUBLIC_POSTING, LIMIT_UPLOADS
from cloudinary_storage import upload_media as cloudinary_upload, _is_configured as cloudinary_configured
from database import db, NEWS_MEDIA_DIR, SENDER_EMAIL, FRONTEND_URL, logger
from models import (
    NewsCreate,
    NewsResponse,
    ArticleCreate,
    ArticleUpdate,
    ArticleResponse,
    QuestionCreate,
    AnswerCreate,
    QuestionResponse,
)
from utils import create_notification, send_broadcast_push_notification, sanitize_html, bloom_email_html

router = APIRouter()


@router.post("/news", response_model=NewsResponse)
async def create_news(news: NewsCreate, user: dict = Depends(require_verified_email)):
    user_role = (user.get("role") or "user").lower()

    # Superadmin má vždy plná oprávnění – obchází omezení kategorií
    if user_role != "superadmin":
        # Fetch the category's allowed_roles from the DB
        cat_doc = await db.news_categories.find_one({"id": news.category}, {"_id": 0})
        if cat_doc:
            allowed_roles = cat_doc.get("allowed_roles") or (
                ["user", "specialist", "admin", "superadmin", "lawyer"] if news.category == "zkusenosti" else ["admin", "superadmin"]
            )
        else:
            # Default categories not yet persisted to DB
            allowed_roles = ["user", "specialist", "admin", "superadmin", "lawyer"] if news.category == "zkusenosti" else ["admin", "superadmin"]
        allowed_roles = [r.lower() for r in allowed_roles]

        if user_role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Nemáte oprávnění přispívat do této kategorie")

    news_id = str(uuid.uuid4())
    is_community = news.category == "zkusenosti" and user_role not in ("admin", "superadmin")
    news_doc = {
        "id": news_id,
        "title": news.title,
        "content": sanitize_html(news.content),
        "image_url": news.image_url or "",
        "video_url": news.video_url or "",
        "thumbnail_url": news.thumbnail_url or "",
        "category": news.category,
        "image_fit": (news.image_fit or "cover").strip() or "cover",
        "admin_id": user["id"] if not is_community else "",
        "admin_name": user["username"] if not is_community else "",
        "author_id": user["id"],
        "author_name": user["username"],
        "is_community_story": is_community,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.news.insert_one(news_doc)

    # Push notification for admin-published news (not community stories)
    if not is_community:
        asyncio.create_task(send_broadcast_push_notification(
            "Nová aktualita – Bloom",
            news.title[:100],
            url=f"/news/{news_id}",
            notif_type="news",
        ))

    return NewsResponse(**news_doc)


@router.get("/news", response_model=List[NewsResponse])
async def get_news(category: str = ""):
    query = {}
    if category and category != "all":
        query["category"] = category
    news_list = await db.news.find(query, {"_id": 0}).sort("created_at", -1).to_list(50)
    valid_fit = {"cover", "contain", "cover-top", "cover-center", "cover-bottom"}
    for n in news_list:
        if "image_fit" not in n or n["image_fit"] not in valid_fit:
            n["image_fit"] = "cover"
    return [NewsResponse(**n) for n in news_list]


# Map validated content-type to safe extension (do not trust client filename)
_NEWS_MEDIA_EXT_MAP = {
    "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp",
    "video/mp4": "mp4", "video/webm": "webm",
}


@router.post("/news/upload-media")
@limiter.limit(LIMIT_UPLOADS)
async def upload_news_media(request: Request, file: UploadFile = File(...), user: dict = Depends(require_verified_email)):
    ct = (file.content_type or "").split(";")[0].strip().lower()
    if not ct.startswith("image") and not ct.startswith("video"):
        raise HTTPException(status_code=400, detail="Pouze obrázky nebo videa")
    content = await file.read()
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Soubor je příliš velký (max 50MB)")
    if not cloudinary_configured():
        raise HTTPException(status_code=503, detail="Media storage not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in backend/.env")
    resource_type = "image" if ct.startswith("image") else "video"
    result = cloudinary_upload(content, folder="bloom/news", resource_type=resource_type, content_type=ct)
    if not result:
        raise HTTPException(status_code=503, detail="Upload failed")
    media_type = "image" if ct.startswith("image") else "video"
    return {
        "url": result["secure_url"],
        "media_type": media_type,
        "public_id": result.get("public_id"),
        "resource_type": result.get("resource_type"),
    }


@router.get("/media/news/{filename}")
async def serve_news_media(filename: str):
    safe_filename = os.path.basename(filename)
    if not safe_filename or safe_filename != filename or ".." in safe_filename or "/" in safe_filename or "\\" in safe_filename:
        raise HTTPException(status_code=400, detail="Neplatná cesta k souboru")
    file_path = NEWS_MEDIA_DIR / safe_filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Soubor nenalezen")
    try:
        resolved = file_path.resolve()
        base = NEWS_MEDIA_DIR.resolve()
        if not str(resolved).startswith(str(base)):
            raise HTTPException(status_code=400, detail="Neplatná cesta k souboru")
    except (OSError, ValueError):
        raise HTTPException(status_code=400, detail="Neplatná cesta k souboru")
    return FileResponse(str(file_path))


_VALID_IMAGE_FIT = {"cover", "contain", "cover-top", "cover-center", "cover-bottom"}


@router.get("/news/{news_id}", response_model=NewsResponse)
async def get_news_item(news_id: str):
    news = await db.news.find_one({"id": news_id}, {"_id": 0})
    if not news:
        raise HTTPException(status_code=404, detail="Aktualita nenalezena")
    if "image_fit" not in news or news["image_fit"] not in _VALID_IMAGE_FIT:
        news["image_fit"] = "cover"
    return NewsResponse(**news)


@router.get("/news/{news_id}/comments")
async def get_article_comments(news_id: str):
    comments = await db.article_comments.find({"article_id": news_id}, {"_id": 0}).sort("created_at", 1).to_list(200)
    return comments


@router.post("/news/{news_id}/comments")
async def add_article_comment(news_id: str, data: dict, user: dict = Depends(require_verified_email)):
    news = await db.news.find_one({"id": news_id}, {"_id": 0})
    if not news:
        raise HTTPException(status_code=404, detail="Příspěvek nenalezen")
    content = (data.get("content") or "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="Komentář nesmí být prázdný")
    comment = {
        "id": str(uuid.uuid4()),
        "article_id": news_id,
        "user_id": user["id"],
        "username": user["username"],
        "avatar": user.get("avatar", ""),
        "custom_avatar": user.get("custom_avatar", ""),
        "content": sanitize_html(content),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.article_comments.insert_one(comment)
    # Notify article author
    if news.get("author_id") and news["author_id"] != user["id"]:
        await create_notification(
            user_id=news["author_id"],
            type="comment",
            title="Nový komentář k vašemu příběhu",
            message=f'{user["username"]} okomentoval/a váš příběh "{news["title"]}"',
            link="/zkusenosti",
        )
    return {**comment}


@router.delete("/news/comments/{comment_id}")
async def delete_article_comment(comment_id: str, user: dict = Depends(require_verified_email)):
    comment = await db.article_comments.find_one({"id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Komentář nenalezen")
    if comment["user_id"] != user["id"] and not role_matches(user, "admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Nemáte oprávnění")
    await db.article_comments.delete_one({"id": comment_id})
    return {"message": "Komentář smazán"}



@router.delete("/news/{news_id}")
async def delete_news(news_id: str, user: dict = Depends(require_verified_email)):
    news_item = await db.news.find_one({"id": news_id}, {"_id": 0})
    if not news_item:
        raise HTTPException(status_code=404, detail="Aktualita nenalezena")
    if not role_matches(user, "admin", "superadmin") and news_item.get("author_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Nemáte oprávnění smazat tento příspěvek")
    await db.news.delete_one({"id": news_id})
    return {"message": "Aktualita smazána"}


@router.put("/news/{news_id}", response_model=NewsResponse)
async def update_news(news_id: str, data: dict, user: dict = Depends(require_verified_email)):
    news_item = await db.news.find_one({"id": news_id}, {"_id": 0})
    if not news_item:
        raise HTTPException(status_code=404, detail="Aktualita nenalezena")
    if user.get("role") not in ("admin", "superadmin") and news_item.get("author_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Nemáte oprávnění upravit tento příspěvek")
    allowed = {"title", "content", "category", "image_url", "video_url", "thumbnail_url", "image_fit"}
    valid_fit = {"cover", "contain", "cover-top", "cover-center", "cover-bottom"}
    updates = {k: v for k, v in data.items() if k in allowed}
    if "image_fit" in updates and updates["image_fit"] not in valid_fit:
        updates["image_fit"] = "cover"
    if "content" in updates:
        updates["content"] = sanitize_html(updates["content"] or "")
    if updates:
        await db.news.update_one({"id": news_id}, {"$set": updates})
    updated = await db.news.find_one({"id": news_id}, {"_id": 0})
    if not updated:
        raise HTTPException(status_code=404, detail="Aktualita nenalezena")
    if "image_fit" not in updated or updated["image_fit"] not in valid_fit:
        updated["image_fit"] = "cover"
    return NewsResponse(**updated)


@router.post("/articles", response_model=ArticleResponse)
@limiter.limit(LIMIT_PUBLIC_POSTING)
async def create_article(request: Request, article: ArticleCreate, user: dict = Depends(require_verified_email)):
    user_role = (user.get("role") or "user").lower()
    # Superadmin má vždy plná oprávnění – obchází omezení kategorií
    if user_role != "superadmin":
        # Fetch the article category's allowed_roles
        cat_doc = await db.article_categories.find_one({"id": article.category}, {"_id": 0})
        if cat_doc:
            allowed_roles = [r.lower() for r in (cat_doc.get("allowed_roles") or ["admin", "superadmin", "lawyer"])]
        else:
            allowed_roles = ["admin", "superadmin", "lawyer"]  # safe default for unconfigured categories
        if user_role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Nemáte oprávnění přispívat do této kategorie")
    article_id = str(uuid.uuid4())
    article_doc = {
        "id": article_id,
        "title": article.title,
        "content": sanitize_html(article.content),
        "category": article.category,
        "author_id": user["id"],
        "author_name": user["username"],
        "published": article.published,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.articles.insert_one(article_doc)
    return ArticleResponse(**article_doc)


@router.get("/articles", response_model=List[ArticleResponse])
async def get_articles(category: str = ""):
    query = {"published": {"$ne": False}}
    if category:
        query["category"] = category
    articles = await db.articles.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [ArticleResponse(**a) for a in articles]


@router.get("/admin/articles", response_model=List[ArticleResponse])
async def get_all_articles_admin(admin: dict = Depends(get_admin_or_lawyer_user)):
    articles = await db.articles.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [ArticleResponse(**a) for a in articles]


@router.get("/articles/{article_id}", response_model=ArticleResponse)
async def get_article(article_id: str):
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Článek nenalezen")
    return ArticleResponse(**article)


@router.put("/articles/{article_id}", response_model=ArticleResponse)
async def update_article(article_id: str, updates: ArticleUpdate, user: dict = Depends(get_admin_or_lawyer_user)):
    article = await db.articles.find_one({"id": article_id})
    if not article:
        raise HTTPException(status_code=404, detail="Článek nenalezen")
    if not role_matches(user, "admin", "superadmin") and article["author_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Nemáte oprávnění upravit tento článek")
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    if 'content' in update_data:
        update_data['content'] = sanitize_html(update_data['content'])
    await db.articles.update_one({"id": article_id}, {"$set": update_data})
    updated = await db.articles.find_one({"id": article_id}, {"_id": 0})
    return ArticleResponse(**updated)


@router.delete("/articles/{article_id}")
async def delete_article(article_id: str, user: dict = Depends(get_admin_or_lawyer_user)):
    article = await db.articles.find_one({"id": article_id})
    if not article:
        raise HTTPException(status_code=404, detail="Článek nenalezen")
    if not role_matches(user, "admin", "superadmin") and article["author_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Nemáte oprávnění")
    await db.articles.delete_one({"id": article_id})
    return {"message": "Článek smazán"}


@router.put("/articles/{article_id}/toggle-publish")
async def toggle_publish_article(article_id: str, admin: dict = Depends(get_admin_user)):
    article = await db.articles.find_one({"id": article_id})
    if not article:
        raise HTTPException(status_code=404, detail="Článek nenalezen")
    new_status = not article.get("published", True)
    await db.articles.update_one({"id": article_id}, {"$set": {"published": new_status}})
    return {"published": new_status, "message": "Publikováno" if new_status else "Skryto"}


@router.post("/questions", response_model=QuestionResponse)
@limiter.limit(LIMIT_PUBLIC_POSTING)
async def create_question(request: Request, question: QuestionCreate, user: dict = Depends(require_verified_email)):
    question_id = str(uuid.uuid4())
    question_doc = {
        "id": question_id,
        "user_id": user["id"],
        "username": user["username"],
        "title": question.title,
        "content": question.content,
        "section": question.section,
        "category": question.category,
        "answers": [],
        "vote_count": 0,
        "voters": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.questions.insert_one(question_doc)
    return QuestionResponse(**question_doc)


@router.get("/questions", response_model=List[QuestionResponse])
async def get_questions(search: str = "", section: str = "legal", category: str = "all"):
    base = {"$or": [{"section": section}, {"section": {"$exists": False}}]} if section == "legal" else {"section": section}
    conditions = [base]
    if category and category != "all":
        conditions.append({"$or": [{"category": category}, {"category": "all"}, {"category": {"$exists": False}}]})
    if search:
        conditions.append({"$or": [{"title": {"$regex": search, "$options": "i"}}, {"content": {"$regex": search, "$options": "i"}}]})
    query = {"$and": conditions} if len(conditions) > 1 else conditions[0]
    questions = await db.questions.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)

    # Collect unique user_ids from all answers to batch-refresh specialization_labels
    answer_user_ids = {a["user_id"] for q in questions for a in q.get("answers", []) if a.get("user_role") in ("specialist", "lawyer")}
    spec_labels: dict = {}
    if answer_user_ids:
        users_cursor = db.users.find(
            {"id": {"$in": list(answer_user_ids)}},
            {"_id": 0, "id": 1, "specialization_label": 1}
        )
        async for u in users_cursor:
            spec_labels[u["id"]] = u.get("specialization_label", "")

    # Inject fresh labels into answers
    for q in questions:
        for a in q.get("answers", []):
            if a.get("user_role") in ("specialist", "lawyer") and a.get("user_id") in spec_labels:
                a["specialization_label"] = spec_labels[a["user_id"]]

    return [QuestionResponse(**{**q, "category": q.get("category", "all")}) for q in questions]


@router.post("/questions/{question_id}/answers", response_model=QuestionResponse)
@limiter.limit(LIMIT_PUBLIC_POSTING)
async def create_answer(request: Request, question_id: str, answer: AnswerCreate, user: dict = Depends(require_verified_email)):
    question = await db.questions.find_one({"id": question_id})
    if not question:
        raise HTTPException(status_code=404, detail="Dotaz nenalezen")

    section = question.get("section", "legal")
    role = user.get("role", "user")
    # Legal questions: lawyer or admin; Specialist questions: specialist or admin
    # Stories section: any logged-in user can reply
    if section == "legal" and role not in ("lawyer", "admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Pouze právník nebo admin může odpovídat")
    if section == "specialists" and role not in ("specialist", "admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Pouze odborník nebo admin může odpovídat")
    # section == "stories": all authenticated users allowed (no additional check)

    answer_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "username": user["username"],
        "user_role": user.get("role", "user"),
        "specialization_label": user.get("specialization_label", "") if user.get("role") in ("specialist", "lawyer") else "",
        "content": sanitize_html(answer.content or ""),
        "signature": "",  # no longer used
        "thanked_by": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.questions.update_one({"id": question_id}, {"$push": {"answers": answer_doc}})

    if question["user_id"] != user["id"]:
        section_paths = {"legal": "pravni-poradna", "specialists": "odbornici", "stories": "zkusenosti"}
        section_path = section_paths.get(section, "pravni-poradna")
        section_labels = {"legal": "Právní poradna", "specialists": "Trans-friendly odborníci", "stories": "Zkušenosti komunity"}
        section_label = section_labels.get(section, "Právní poradna")
        await create_notification(
            user_id=question["user_id"],
            type="answer",
            title="Nová odpověď na váš příspěvek",
            message=f'{user["username"]} odpověděl/a na "{question["title"]}"',
            link=f"/{section_path}",
        )
        # Email notification to question/story author
        question_author = await db.users.find_one({"id": question["user_id"]}, {"_id": 0})
        if resend.api_key and question_author and question_author.get("email"):
            try:
                page_url = f"{FRONTEND_URL}/{section_path}"
                html_email = bloom_email_html(f"""
<p style="color: #5D6472; font-size: 13px; margin: 0 0 20px;">Nová odpověď na váš příspěvek v sekci {section_label}</p>
<div style="background: #F4F4F8; border-radius: 8px; padding: 16px; margin-bottom: 20px; border-left: 3px solid #8A7CFF;">
  <p style="color: #2F3441; margin: 0 0 8px; font-size: 13px; font-weight: 600;">{question["title"]}</p>
  <p style="color: #5D6472; margin: 0; font-size: 13px;">{user["username"]} vám odpověděl/a na váš příspěvek.</p>
</div>
<div style="text-align: center; margin: 24px 0;">
  <a href="{page_url}" style="background: #8A7CFF; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">Zobrazit odpověď</a>
</div>
""")
                await asyncio.to_thread(
                    resend.Emails.send,
                    {
                        "from": SENDER_EMAIL,
                        "to": [question_author["email"]],
                        "subject": f"Bloom – Nová odpověď na váš příspěvek: {question['title'][:50]}",
                        "html": html_email,
                        "text": f"{user['username']} odpověděl/a na váš příspěvek \"{question['title']}\" na Bloom.\n\nZobrazit: {page_url}",
                    },
                )
            except Exception as e:
                logger.warning(f"Answer email notification failed: {e}")

    updated_question = await db.questions.find_one({"id": question_id}, {"_id": 0})
    return QuestionResponse(**updated_question)


@router.delete("/questions/{question_id}")
async def delete_question(question_id: str, user: dict = Depends(require_verified_email)):
    question = await db.questions.find_one({"id": question_id})
    if not question:
        raise HTTPException(status_code=404, detail="Dotaz nenalezen")
    role = user.get("role", "user")
    section = question.get("section", "legal")
    if section == "legal" and role not in ("lawyer", "admin", "superadmin") and question.get("user_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Nemáte oprávnění smazat tuto otázku")
    if section == "specialists" and role not in ("specialist", "admin", "superadmin") and question.get("user_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Nemáte oprávnění smazat tuto otázku")
    # Stories: own author or admin can delete
    if question.get("user_id") != user["id"] and role not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Nemáte oprávnění smazat tento příspěvek")
    await db.questions.delete_one({"id": question_id})
    return {"message": "Otázka smazána"}


@router.post("/questions/{question_id}/vote")
async def vote_question(question_id: str, user: dict = Depends(require_verified_email)):
    question = await db.questions.find_one({"id": question_id})
    if not question:
        raise HTTPException(status_code=404, detail="Dotaz nenalezen")

    voter_id = user["id"]
    voters = question.get("voters", [])
    if voter_id in voters:
        await db.questions.update_one(
            {"id": question_id},
            {"$inc": {"vote_count": -1}, "$pull": {"voters": voter_id}},
        )
        already_voted = False
    else:
        await db.questions.update_one(
            {"id": question_id},
            {"$inc": {"vote_count": 1}, "$addToSet": {"voters": voter_id}},
        )
        already_voted = True

    updated = await db.questions.find_one({"id": question_id}, {"_id": 0})
    return {"vote_count": updated.get("vote_count", 0), "voted": already_voted}


@router.post("/questions/{question_id}/answers/{answer_id}/thank")
async def thank_answer(question_id: str, answer_id: str, user: dict = Depends(require_verified_email)):
    """Přidat/odebrat poděkování za odpověď odborníka (toggle)."""
    question = await db.questions.find_one({"id": question_id})
    if not question:
        raise HTTPException(status_code=404, detail="Dotaz nenalezen")
    answer = next((a for a in question.get("answers", []) if a.get("id") == answer_id), None)
    if not answer:
        raise HTTPException(status_code=404, detail="Odpověď nenalezena")
    user_id = user["id"]
    thanked_by = answer.get("thanked_by") or []
    if user_id in thanked_by:
        await db.questions.update_one(
            {"id": question_id, "answers.id": answer_id},
            {"$pull": {"answers.$.thanked_by": user_id}},
        )
        thanked = False
    else:
        await db.questions.update_one(
            {"id": question_id, "answers.id": answer_id},
            {"$addToSet": {"answers.$.thanked_by": user_id}},
        )
        thanked = True
    updated = await db.questions.find_one({"id": question_id}, {"_id": 0})
    a = next((x for x in updated.get("answers", []) if x.get("id") == answer_id), {})
    return {"thank_count": len(a.get("thanked_by", [])), "thanked": thanked}
