#!/usr/bin/env python3
"""Vytvoří admin účet v databázi Bloom."""
import asyncio
import uuid
from datetime import datetime, timezone

# Načti .env před importem databáze
from database import db
from auth_helpers import hash_password


async def create_admin(email: str, password: str, username: str = "admin"):
    existing = await db.users.find_one({"email": email})
    if existing:
        # Aktualizuj na admin
        await db.users.update_one({"email": email}, {"$set": {"role": "admin", "email_verified": True}})
        print(f"Účet {email} byl povýšen na administrátora.")
        return

    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": email,
        "password": hash_password(password),
        "username": username,
        "pronouns": "",
        "avatar": "fem-pink",
        "location": "",
        "district": "",
        "phone": "",
        "bio": "",
        "custom_avatar": None,
        "role": "admin",
        "avg_rating": 0,
        "rating_count": 0,
        "email_verified": True,
        "verification_token": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "photos": [],
        "gallery_settings": {"is_public": True, "password": ""},
        "journey": None,
    }
    await db.users.insert_one(user_doc)
    print(f"Admin účet vytvořen: {email}")
    print(f"  Přihlášení: {email} / (heslo které jsi zadal/a)")


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3:
        print("Použití: python create_admin.py EMAIL HESLO [USERNAME]")
        print("Příklad: python create_admin.py admin@bloom.cz Admin123! admin")
        sys.exit(1)
    email = sys.argv[1]
    password = sys.argv[2]
    username = sys.argv[3] if len(sys.argv) > 3 else email.split("@")[0]
    asyncio.run(create_admin(email, password, username))
