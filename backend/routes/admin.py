import asyncio
import os
import secrets
import uuid
from datetime import datetime, timezone, timedelta

import resend
from fastapi import APIRouter, Depends, HTTPException

from auth_helpers import get_admin_user, get_superadmin_user, get_current_user, user_response_dict, role_matches
from database import db, SENDER_EMAIL, FRONTEND_URL, logger
from utils import validate_safe_url
from models import (
    CommunityPasswordUpdate,
    EntryPasswordToggle,
    SetupFirstAdminBody,
    BugReportCreate,
    BugReportStatusUpdate,
    UserReportCreate,
    ServiceResponse,
    SpecialistCreate,
    SpecialistResponse,
)

router = APIRouter()


@router.post("/admin/setup-first-admin")
async def setup_first_admin(body: SetupFirstAdminBody):
    existing_admin = await db.users.find_one({"role": {"$in": ["admin", "superadmin"]}})
    if existing_admin:
        raise HTTPException(status_code=404, detail="Not found")
    admin_setup_secret = os.environ.get("ADMIN_SETUP_SECRET")
    if not admin_setup_secret or not admin_setup_secret.strip():
        raise HTTPException(status_code=503, detail="Setup not configured")
    if body.secret != admin_setup_secret.strip():
        raise HTTPException(status_code=403, detail="Neplatný tajný klíč")
    result = await db.users.update_one({"email": body.email}, {"$set": {"role": "admin"}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Uživatel nenalezen - nejprve se zaregistrujte")
    return {"message": f"Uživatel {body.email} je nyní administrátor"}


@router.post("/admin/make-admin/{user_id}")
async def make_admin(user_id: str, superadmin: dict = Depends(get_superadmin_user)):
    result = await db.users.update_one({"id": user_id}, {"$set": {"role": "admin"}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Uživatel nenalezen")
    return {"message": "Uživatel povýšen na administrátora"}


@router.post("/admin/set-role/{user_id}")
async def set_user_role(user_id: str, role: str, current: dict = Depends(get_admin_user)):
    valid_roles = ["user", "admin", "superadmin", "lawyer", "specialist", "banned"]
    role_lower = role.lower().strip()
    if role_lower not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Neplatná role. Povolené: {', '.join(valid_roles)}")
    target = await db.users.find_one({"id": user_id}, {"_id": 0, "role": 1})
    if not target:
        raise HTTPException(status_code=404, detail="Uživatel nenalezen")
    target_role = (target.get("role") or "user").lower()
    # Only superadmin can assign/remove admin or superadmin roles; admin cannot edit other admins
    if target_role in ("admin", "superadmin") or role_lower in ("admin", "superadmin"):
        if not role_matches(current, "superadmin"):
            raise HTTPException(status_code=403, detail="Pouze superadministrátor může měnit role administrátorů")
        if role_lower == "superadmin" and target_role != "superadmin":
            pass  # promoting to superadmin - ok
        elif role_lower != "superadmin" and target_role == "superadmin":
            superadmin_count = await db.users.count_documents({"role": "superadmin"})
            if superadmin_count <= 1:
                raise HTTPException(status_code=400, detail="Nelze odebrat posledního superadministrátora")
    result = await db.users.update_one({"id": user_id}, {"$set": {"role": role_lower}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Uživatel nenalezen")
    return {"message": f"Role nastavena na: {role_lower}"}


@router.get("/admin/users")
async def get_all_users(admin: dict = Depends(get_admin_user)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).sort("username", 1).to_list(500)
    return [user_response_dict(u) for u in users]


@router.put("/admin/reviews/{review_id}")
async def update_review(review_id: str, data: dict, admin: dict = Depends(get_admin_user)):
    review = await db.reviews.find_one({"id": review_id})
    if not review:
        raise HTTPException(status_code=404, detail="Recenze nenalezena")
    update = {}
    if "content" in data and data["content"].strip():
        update["content"] = data["content"].strip()
    if "rating" in data and 1 <= int(data["rating"]) <= 5:
        update["rating"] = int(data["rating"])
    if not update:
        raise HTTPException(status_code=400, detail="Žádná platná data k uložení")
    await db.reviews.update_one({"id": review_id}, {"$set": update})
    # Recalculate specialist avg_rating if rating changed
    if "rating" in update:
        specialist_id = review["specialist_id"]
        remaining = await db.reviews.find({"specialist_id": specialist_id}, {"_id": 0}).to_list(1000)
        avg = sum(r["rating"] for r in remaining) / len(remaining) if remaining else 0
        await db.specialists.update_one(
            {"id": specialist_id}, {"$set": {"avg_rating": round(avg, 1)}}
        )
    return {"message": "Recenze aktualizována"}


@router.delete("/admin/reviews/{review_id}")
async def delete_review(review_id: str, admin: dict = Depends(get_admin_user)):
    review = await db.reviews.find_one({"id": review_id})
    if not review:
        raise HTTPException(status_code=404, detail="Recenze nenalezena")
    await db.reviews.delete_one({"id": review_id})
    specialist_id = review["specialist_id"]
    remaining = await db.reviews.find({"specialist_id": specialist_id}, {"_id": 0}).to_list(1000)
    avg = sum(r["rating"] for r in remaining) / len(remaining) if remaining else 0
    await db.specialists.update_one(
        {"id": specialist_id}, {"$set": {"avg_rating": round(avg, 1), "review_count": len(remaining)}}
    )
    return {"message": "Recenze smazána"}


@router.get("/admin/reviews")
async def get_all_reviews_admin(admin: dict = Depends(get_admin_user)):
    reviews = await db.reviews.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    result = []
    for r in reviews:
        specialist = await db.specialists.find_one({"id": r["specialist_id"]}, {"_id": 0})
        r["specialist_name"] = specialist["name"] if specialist else "Neznámý odborník"
        result.append(r)
    return result


@router.get("/admin/services")
async def get_all_services_admin(admin: dict = Depends(get_admin_user)):
    services = await db.services.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [ServiceResponse(**s) for s in services]


@router.get("/admin/settings/offer-expiry-days")
async def get_offer_expiry_days(admin: dict = Depends(get_admin_user)):
    setting = await db.app_settings.find_one({"key": "offer_expiry_days"}, {"_id": 0})
    return {"days": int(setting["value"]) if setting else 30}


@router.put("/admin/settings/offer-expiry-days")
async def update_offer_expiry_days(days: int, admin: dict = Depends(get_admin_user)):
    if days not in (14, 30, 60, 90):
        raise HTTPException(status_code=400, detail="Povolené hodnoty: 14, 30, 60, 90 dní")
    await db.app_settings.update_one(
        {"key": "offer_expiry_days"},
        {"$set": {"key": "offer_expiry_days", "value": str(days), "updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": admin["id"]}},
        upsert=True,
    )
    return {"message": f"Platnost nabídek nastavena na {days} dní"}


@router.put("/admin/services/{service_id}/reactivate")
async def reactivate_service(service_id: str, admin: dict = Depends(get_admin_user)):
    service = await db.services.find_one({"id": service_id})
    if not service:
        raise HTTPException(status_code=404, detail="Nabídka nenalezena")
    expiry_setting = await db.app_settings.find_one({"key": "offer_expiry_days"}, {"_id": 0})
    expiry_days = int(expiry_setting["value"]) if expiry_setting else 30
    new_expires_at = (datetime.now(timezone.utc) + timedelta(days=expiry_days)).isoformat()
    await db.services.update_one(
        {"id": service_id},
        {"$set": {"expires_at": new_expires_at, "service_status": "active"}},
    )
    return {"message": "Nabídka byla obnovena", "expires_at": new_expires_at}


@router.get("/admin/settings/community-password")
async def get_community_password(admin: dict = Depends(get_admin_user)):
    setting = await db.app_settings.find_one({"key": "community_password"}, {"_id": 0})
    enabled_setting = await db.app_settings.find_one({"key": "entry_password_enabled"}, {"_id": 0})
    return {
        "password": setting["value"] if setting else "Transfortrans",
        "enabled": enabled_setting["value"] if enabled_setting else True,
    }


@router.put("/admin/settings/community-password")
async def update_community_password(data: CommunityPasswordUpdate, admin: dict = Depends(get_admin_user)):
    if not data.password or len(data.password) < 4:
        raise HTTPException(status_code=400, detail="Heslo musí mít alespoň 4 znaky")
    await db.app_settings.update_one(
        {"key": "community_password"},
        {"$set": {"key": "community_password", "value": data.password, "updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": admin["id"]}},
        upsert=True,
    )
    return {"message": "Komunitní heslo bylo změněno"}


@router.put("/admin/settings/entry-password-toggle")
async def toggle_entry_password(data: EntryPasswordToggle, admin: dict = Depends(get_admin_user)):
    await db.app_settings.update_one(
        {"key": "entry_password_enabled"},
        {"$set": {"key": "entry_password_enabled", "value": data.enabled, "updated_at": datetime.now(timezone.utc).isoformat(), "updated_by": admin["id"]}},
        upsert=True,
    )
    status = "zapnuta" if data.enabled else "vypnuta"
    return {"message": f"Ochrana vstupním heslem byla {status}", "enabled": data.enabled}


@router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(get_admin_user)):
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Nemůžete smazat vlastní účet")
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Uživatel nenalezen")
    await db.users.delete_one({"id": user_id})
    await db.password_resets.delete_many({"email": user.get("email")})
    await db.user_reports.delete_many({"reporter_id": user_id})
    logger.info(f"Admin {admin['email']} deleted user {user.get('email')} (id={user_id})")
    return {"message": f"Uživatel {user.get('username', user_id)} byl smazán"}


@router.post("/admin/users/{user_id}/send-reset")
async def admin_send_reset(user_id: str, admin: dict = Depends(get_admin_user)):
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="Uživatel nenalezen")
    email = target_user.get("email")
    token = secrets.token_urlsafe(32)
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    await db.password_resets.delete_many({"email": email})
    await db.password_resets.insert_one({
        "id": str(uuid.uuid4()),
        "email": email,
        "token": token,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": expires_at,
    })
    reset_url = f"{FRONTEND_URL}/reset-password?token={token}"
    logger.info(f"Admin {admin['email']} triggered password reset for {email}")
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #FCFBFF; padding: 40px 32px; border-radius: 12px;">
      <div style="height: 4px; background: linear-gradient(90deg, #5BCEFA 0%, #F5A9B8 25%, #FFFFFF 50%, #F5A9B8 75%, #5BCEFA 100%); border-radius: 2px; margin-bottom: 28px;"></div>
      <h1 style="color: #8A7CFF; font-size: 26px; margin: 0 0 4px; font-weight: 700;">Bloom</h1>
      <p style="color: #5D6472; font-size: 13px; margin: 0 0 28px;">Bezpecny prostor pro trans komunitu</p>
      <h2 style="color: #2F3441; font-size: 18px; margin-bottom: 12px;">Obnoveni hesla</h2>
      <p style="color: #5D6472; line-height: 1.6; margin-bottom: 24px;">
        Administrátor vám zaslal odkaz pro obnovení hesla. Zkopírujte odkaz níže a vložte jej do prohlížeče.
      </p>
      <p style="color: #5D6472; font-size: 13px; margin-bottom: 8px;">Váš odkaz pro obnovení hesla:</p>
      <div style="background: #f0eeff; border: 1px solid #c7bfff; border-radius: 6px; padding: 12px 16px; word-break: break-all; font-family: monospace; font-size: 13px; color: #8A7CFF;">{reset_url}</div>
      <p style="color: #9DA3AE; font-size: 12px; text-align: center; margin-top: 24px;">Odkaz je platný 1 hodinu.</p>
      <div style="height: 4px; background: linear-gradient(90deg, #5BCEFA 0%, #F5A9B8 25%, #FFFFFF 50%, #F5A9B8 75%, #5BCEFA 100%); border-radius: 2px; margin-top: 24px;"></div>
    </div>
    """
    try:
        await asyncio.to_thread(
            resend.Emails.send,
            {
                "from": SENDER_EMAIL,
                "to": [email],
                "subject": "Bloom – Obnovení hesla (od administrátora)",
                "html": html_content,
                "text": f"Administrátor vám zaslal odkaz pro obnovení hesla:\n{reset_url}\n\nOdkaz je platný 1 hodinu.",
            },
        )
    except Exception as e:
        logger.error(f"Admin reset email failed for {email}: {e}")
        raise HTTPException(status_code=503, detail=f"Email se nepodařilo odeslat: {str(e)}")
    return {"message": f"Odkaz pro obnovení hesla byl odeslán na {email}"}


@router.post("/users/{user_id}/report")
async def report_user(user_id: str, data: UserReportCreate, reporter: dict = Depends(get_current_user)):
    if user_id == reporter["id"]:
        raise HTTPException(status_code=400, detail="Nemůžete nahlásit sebe")
    target = await db.users.find_one({"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="Uživatel nenalezen")
    existing = await db.user_reports.find_one({"reporter_id": reporter["id"], "reported_user_id": user_id})
    if existing:
        raise HTTPException(status_code=400, detail="Tohoto uživatele jste již nahlásili")
    report_doc = {
        "id": str(uuid.uuid4()),
        "reporter_id": reporter["id"],
        "reporter_name": reporter["username"],
        "reported_user_id": user_id,
        "reported_user_name": target["username"],
        "reason": data.reason,
        "description": data.description,
        "status": "open",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.user_reports.insert_one(report_doc)
    return {"message": "Nahlášení bylo odesláno administrátorovi"}


@router.get("/admin/reports")
async def get_reports(admin: dict = Depends(get_admin_user)):
    reports = await db.user_reports.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return reports


@router.put("/admin/reports/{report_id}/resolve")
async def resolve_report(report_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.user_reports.update_one(
        {"id": report_id},
        {"$set": {"status": "resolved", "resolved_at": datetime.now(timezone.utc).isoformat(), "resolved_by": admin["id"]}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Nahlášení nenalezeno")
    return {"message": "Nahlášení vyřešeno"}


@router.post("/bug-reports")
async def create_bug_report(data: BugReportCreate, current_user: dict = Depends(get_current_user)):
    report_id = str(uuid.uuid4())
    doc = {
        "id": report_id,
        "user_id": current_user["id"],
        "username": current_user.get("username", ""),
        "report_type": data.report_type,
        "description": data.description,
        "page_url": data.page_url,
        "browser_info": data.browser_info,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "new",
    }
    await db.bug_reports.insert_one(doc)
    type_labels = {
        "app_error": "Chyba v aplikaci",
        "not_working": "Něco nefunguje",
        "suggestion": "Návrh zlepšení",
        "security": "Bezpečnostní problém",
        "other": "Jiný problém",
    }
    contact_setting = await db.app_settings.find_one({"key": "contact_email"}, {"_id": 0})
    admin_email = contact_setting["value"] if contact_setting else None
    if admin_email and resend.api_key:
        html = f"""<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;">
        <h2 style="color:#8A7CFF;">Nový bug report – Bloom</h2>
        <p><strong>Typ:</strong> {type_labels.get(data.report_type, data.report_type)}</p>
        <p><strong>Uživatel:</strong> {current_user.get('username')} ({current_user.get('email', '')})</p>
        <p><strong>Stránka:</strong> {data.page_url}</p>
        <p><strong>Popis:</strong></p>
        <p style="background:#f5f5f5;padding:12px;border-radius:6px;">{data.description}</p>
        <p style="color:#888;font-size:12px;">{data.browser_info}</p>
        </div>"""
        try:
            await asyncio.to_thread(
                resend.Emails.send,
                {
                    "from": SENDER_EMAIL,
                    "to": [admin_email],
                    "subject": f"Bloom – Bug report: {type_labels.get(data.report_type, data.report_type)}",
                    "html": html,
                    "text": f"Nový bug report od {current_user.get('username')}: {data.description}",
                },
            )
        except Exception as e:
            logger.error(f"Bug report email failed: {e}")
    return {"message": "Hlášení bylo odesláno, děkujeme!"}


@router.get("/admin/bug-reports")
async def get_bug_reports(admin: dict = Depends(get_admin_user)):
    reports = await db.bug_reports.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return reports


@router.put("/admin/bug-reports/{report_id}/status")
async def update_bug_report_status(report_id: str, data: BugReportStatusUpdate, admin: dict = Depends(get_admin_user)):
    allowed = {"new", "investigating", "fixed"}
    if data.status not in allowed:
        raise HTTPException(status_code=400, detail="Neplatný stav")
    result = await db.bug_reports.update_one(
        {"id": report_id},
        {"$set": {"status": data.status, "resolved_by": admin["id"], "resolved_at": datetime.now(timezone.utc).isoformat()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Hlášení nenalezeno")
    return {"message": "Stav aktualizován"}


@router.delete("/admin/reports/{report_id}")
async def delete_report(report_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.user_reports.delete_one({"id": report_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Nahlášení nenalezeno")
    return {"message": "Nahlášení smazáno"}


@router.delete("/admin/bug-reports/{report_id}")
async def delete_bug_report(report_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.bug_reports.delete_one({"id": report_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Hlášení nenalezeno")
    return {"message": "Bug report smazán"}



# --- Verification Requests ---

@router.post("/verification-requests")
async def submit_verification_request(data: dict, user: dict = Depends(get_current_user)):
    """User submits a request to become verified specialist or lawyer."""
    existing = await db.verification_requests.find_one({"user_id": user["id"], "status": "pending"})
    if existing:
        raise HTTPException(status_code=400, detail="Již máte otevřenou žádost o ověření. Počkejte na její vyřízení.")
    req_id = str(uuid.uuid4())
    profile_link_raw = (data.get("profile_link") or "").strip()
    doc = {
        "id": req_id,
        "user_id": user["id"],
        "username": user["username"],
        "email": user.get("email", ""),
        "requested_role": data.get("requested_role", "specialist"),  # "specialist" or "lawyer"
        "specialization_text": data.get("specialization_text", "").strip(),
        "profile_link": validate_safe_url(profile_link_raw, "Odkaz na profil") if profile_link_raw else "",
        "message": data.get("message", "").strip(),
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.verification_requests.insert_one(doc)
    return {"message": "Žádost o ověření byla odeslána", "id": req_id}


@router.get("/verification-requests/my")
async def get_my_verification_request(user: dict = Depends(get_current_user)):
    """Returns the user's most recent pending verification request, or 404."""
    req = await db.verification_requests.find_one(
        {"user_id": user["id"], "status": "pending"},
        {"_id": 0},
    )
    if not req:
        raise HTTPException(status_code=404, detail="Žádná čekající žádost")
    return req


@router.get("/admin/verification-requests")
async def get_verification_requests(admin: dict = Depends(get_admin_user)):
    requests_list = await db.verification_requests.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return requests_list


@router.put("/admin/verification-requests/{req_id}/status")
async def update_verification_request_status(req_id: str, data: dict, admin: dict = Depends(get_admin_user)):
    status = data.get("status")  # "approved" or "rejected"
    if status not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="Stav musí být 'approved' nebo 'rejected'")

    req = await db.verification_requests.find_one({"id": req_id}, {"_id": 0})
    if not req:
        raise HTTPException(status_code=404, detail="Žádost nenalezena")

    update_fields = {"status": status, "reviewed_at": datetime.now(timezone.utc).isoformat(), "reviewed_by": admin["id"]}

    # Allow admin to override the role when approving (always store lowercase)
    override_role = (data.get("role") or "").strip().lower()
    if override_role in ("specialist", "lawyer"):
        update_fields["requested_role"] = override_role

    await db.verification_requests.update_one({"id": req_id}, {"$set": update_fields})

    # If approved → set user role automatically (always lowercase)
    if status == "approved":
        role_to_set = override_role if override_role in ("specialist", "lawyer") else (req.get("requested_role") or "specialist").lower()
        if role_to_set not in ("specialist", "lawyer"):
            role_to_set = "specialist"
        await db.users.update_one({"id": req["user_id"]}, {"$set": {"role": role_to_set}})

    # If rejected → reset user role to regular user
    if status == "rejected":
        current_user = await db.users.find_one({"id": req["user_id"]}, {"_id": 0})
        if current_user and role_matches(current_user, "specialist", "lawyer"):
            await db.users.update_one({"id": req["user_id"]}, {"$set": {"role": "user"}})

    msg = "Žádost schválena – role přiřazena" if status == "approved" else "Žádost zamítnuta – role odebrána"
    return {"message": msg}


# --- Specialization Label ---

@router.put("/admin/users/{user_id}/specialization-label")
async def set_specialization_label(user_id: str, data: dict, admin: dict = Depends(get_admin_user)):
    """Admin sets the public specialization label for a verified specialist or lawyer."""
    target = await db.users.find_one({"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="Uživatel nenalezen")
    if not role_matches(target, "specialist", "lawyer"):
        raise HTTPException(status_code=400, detail="Specializační štítek lze nastavit pouze ověřeným odborníkům nebo právníkům")
    label = data.get("label", "").strip()
    await db.users.update_one({"id": user_id}, {"$set": {"specialization_label": label}})
    return {"message": "Specializační štítek aktualizován"}
