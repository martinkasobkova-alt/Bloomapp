"""
Inspect reviews and specialists collections to find ID mismatch.
Run from backend dir: python inspect_reviews.py
"""
import asyncio
import json
import os
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'bloom')


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    print("=" * 60)
    print("1. REVIEWS COLLECTION (db.reviews)")
    print("=" * 60)
    reviews_count = await db.reviews.count_documents({})
    print(f"Total documents: {reviews_count}\n")

    reviews = await db.reviews.find({}).limit(5).to_list(5)
    for i, r in enumerate(reviews, 1):
        # Convert ObjectId to str for JSON
        doc = {k: str(v) if hasattr(v, '__str__') and 'ObjectId' in type(v).__name__ else v for k, v in r.items()}
        print(f"--- Review #{i} ---")
        print(json.dumps(doc, indent=2, default=str))
        print()

    print("=" * 60)
    print("2. SPECIALISTS COLLECTION (db.specialists)")
    print("=" * 60)
    specialists_count = await db.specialists.count_documents({})
    print(f"Total documents: {specialists_count}\n")

    specialists = await db.specialists.find({}).limit(3).to_list(3)
    for i, s in enumerate(specialists, 1):
        doc = {k: str(v) if hasattr(v, '__str__') and 'ObjectId' in type(v).__name__ else v for k, v in s.items()}
        print(f"--- Specialist #{i} ---")
        print(json.dumps(doc, indent=2, default=str))
        print()

    print("=" * 60)
    print("3. FIELD ANALYSIS")
    print("=" * 60)
    if reviews:
        first_review = reviews[0]
        specialist_link_fields = [k for k in first_review.keys() if 'specialist' in k.lower() or 'expert' in k.lower() or k == 'id']
        print(f"Review document keys: {list(first_review.keys())}")
        print(f"Potential specialist link fields in review: {specialist_link_fields}")
        for f in specialist_link_fields:
            print(f"  -> {f} = {repr(first_review.get(f))}")
    if specialists:
        first_spec = specialists[0]
        print(f"\nSpecialist document keys: {list(first_spec.keys())}")
        print(f"Specialist 'id' field: {repr(first_spec.get('id'))}")
        print(f"Specialist '_id' (MongoDB): {repr(first_spec.get('_id'))}")

    print("\n" + "=" * 60)
    print("4. VERIFICATION: Do any reviews match specialists?")
    print("=" * 60)
    if specialists and reviews:
        spec_ids = {s.get('id') for s in specialists}
        for r in reviews:
            sid = r.get('specialist_id') or r.get('specialistId') or r.get('expert_id')
            match = "MATCH" if sid in spec_ids else "NO MATCH"
            print(f"  Review specialist_id/specialistId/expert_id = {repr(sid)} -> {match}")


if __name__ == "__main__":
    asyncio.run(main())
