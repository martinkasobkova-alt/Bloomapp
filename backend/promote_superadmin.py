#!/usr/bin/env python3
"""
One-time script to promote martinkasobkova@gmail.com to superadmin.
Run from backend dir: python promote_superadmin.py
"""
import asyncio
import os
from pathlib import Path

# Load .env before importing database
ROOT_DIR = Path(__file__).parent
from dotenv import load_dotenv
load_dotenv(ROOT_DIR / '.env')

from motor.motor_asyncio import AsyncIOMotorClient


async def main():
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME')
    if not mongo_url or not db_name:
        print("Error: MONGO_URL and DB_NAME must be set in .env")
        return
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    user = await db.users.find_one({"email": {"$regex": r"^martinkasobkova@gmail\.com$", "$options": "i"}})
    if not user:
        print("User martinkasobkova@gmail.com not found in database.")
        return
    result = await db.users.update_one({"id": user["id"]}, {"$set": {"role": "superadmin"}})
    if result.modified_count:
        print("OK: martinkasobkova@gmail.com promoted to superadmin. Please log out and log back in.")
    else:
        print("User already has role superadmin.")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
