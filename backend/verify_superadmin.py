#!/usr/bin/env python3
"""Verify superadmin flow: /auth/me, /admin/users, /admin/verification-requests."""
import asyncio
import os
import sys
from pathlib import Path

# Load .env from backend dir
ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))
os.chdir(ROOT)
from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

from database import db
from auth_helpers import create_token

try:
    import httpx
except ImportError:
    print("Install httpx: pip install httpx")
    sys.exit(1)

EMAIL = "martinkasobkova@gmail.com"
BASE = "http://127.0.0.1:8000/api"


async def main():
    # Find user
    user = await db.users.find_one(
        {"email": {"$regex": rf"^{EMAIL.replace('.', r'\.')}$", "$options": "i"}},
        {"_id": 0, "id": 1, "role": 1, "email": 1},
    )
    if not user:
        print(f"ERROR: User {EMAIL} not found in database")
        return

    token = create_token(user["id"], user.get("role", "user"))
    headers = {"Authorization": f"Bearer {token}"}

    results = []

    async with httpx.AsyncClient(timeout=10.0) as client:
        # 1. /auth/me
        r = await client.get(f"{BASE}/auth/me", headers=headers)
        role = r.json().get("role") if r.status_code == 200 else None
        results.append(("GET /auth/me", r.status_code, f'role="{role}"' if role else r.text[:80]))

        # 2. /admin/users
        r2 = await client.get(f"{BASE}/admin/users", headers=headers)
        results.append(("GET /admin/users", r2.status_code, f"{len(r2.json())} users" if r2.status_code == 200 else (r2.json().get("detail") or r2.text)[:80]))

        # 3. /admin/verification-requests
        r3 = await client.get(f"{BASE}/admin/verification-requests", headers=headers)
        results.append(("GET /admin/verification-requests", r3.status_code, f"{len(r3.json())} requests" if r3.status_code == 200 else (r3.json().get("detail") or r3.text)[:80]))

    # Output
    print("DB user:", user.get("email"), "role:", user.get("role"))
    print()
    for name, status, detail in results:
        ok = "OK" if status == 200 else "FAIL"
        print(f"{name}: {status} {ok} | {detail}")


if __name__ == "__main__":
    asyncio.run(main())
