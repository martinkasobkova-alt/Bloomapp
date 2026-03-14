from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request

from auth_helpers import get_current_user
from database import db, VAPID_PUBLIC_KEY

router = APIRouter()


@router.get("/push/vapid-key")
async def get_vapid_key():
    return {"public_key": VAPID_PUBLIC_KEY}


@router.post("/push/subscribe")
async def push_subscribe(request: Request, user: dict = Depends(get_current_user)):
    body = await request.json()
    subscription = body.get("subscription")
    if not subscription or not subscription.get("endpoint"):
        raise HTTPException(status_code=400, detail="Invalid subscription")
    await db.push_subscriptions.update_one(
        {"user_id": user["id"], "endpoint": subscription["endpoint"]},
        {"$set": {"user_id": user["id"], "subscription": subscription, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"message": "Subscribed"}


@router.delete("/push/subscribe")
async def push_unsubscribe(request: Request, user: dict = Depends(get_current_user)):
    body = await request.json()
    endpoint = body.get("endpoint", "")
    await db.push_subscriptions.delete_many({"user_id": user["id"], "endpoint": endpoint})
    return {"message": "Unsubscribed"}
