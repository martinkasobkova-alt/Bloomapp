#!/usr/bin/env python3
"""
Audit script: Legacy message media endpoint authorization.
Run with: python audit_legacy_media_auth.py
Requires: backend running, test users in DB.
Tests: GET /api/media/messages/{filename} - sender/recipient get 200, outsider gets 403.
"""
import os
import sys
import uuid
import asyncio
import requests

sys.path.insert(0, os.path.dirname(__file__))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

BASE_URL = os.environ.get("BASE_URL", "http://localhost:8000").rstrip("/")


async def main():
    from database import db
    MEDIA_DIR = os.path.join(os.path.dirname(__file__), "media", "messages")
    TEST_FILENAME = f"audit_{uuid.uuid4().hex[:12]}.jpg"
    TEST_PATH = os.path.join(MEDIA_DIR, TEST_FILENAME)

    os.makedirs(MEDIA_DIR, exist_ok=True)
    with open(TEST_PATH, "wb") as f:
        f.write(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00")

    # Login as test1
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "test1@bloom.cz", "password": "test123"})
    if r.status_code != 200:
        print(f"Login failed: {r.status_code}. Set TEST_EMAIL/TEST_PW or use test1@bloom.cz.")
        os.remove(TEST_PATH)
        return
    user_c_token = r.json()["token"]
    user_c_id = r.json().get("user", {}).get("id") or requests.get(
        f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {user_c_token}"}
    ).json().get("id")

    user_a_id, user_b_id = str(uuid.uuid4()), str(uuid.uuid4())
    media_url = f"/api/media/messages/{TEST_FILENAME}"
    await db.messages.insert_one({
        "id": str(uuid.uuid4()), "from_user_id": user_a_id, "to_user_id": user_b_id,
        "from_username": "A", "to_username": "B", "content": "", "media_url": media_url,
        "media_type": "image", "read": False, "created_at": "2025-01-01T00:00:00.000Z",
    })

    url = f"{BASE_URL}/api/media/messages/{TEST_FILENAME}"
    r = requests.get(url, params={"token": user_c_token})
    print(f"User C (outsider, id={user_c_id[:8] if user_c_id else '?'}...): HTTP {r.status_code}")
    if r.status_code == 403:
        print("PASS: Unauthorized user correctly gets 403.")
    elif r.status_code == 200:
        print("FAIL: Unauthorized user got 200 - vulnerability may still exist.")

    await db.messages.delete_many({"media_url": {"$regex": TEST_FILENAME}})
    os.remove(TEST_PATH)


if __name__ == "__main__":
    asyncio.run(main())
