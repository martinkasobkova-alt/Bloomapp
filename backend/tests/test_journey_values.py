"""
Test script: capture exact journey values for web vs mobile.
Run with: python -m pytest backend/tests/test_journey_values.py -v -s
Backend must be running on REACT_APP_BACKEND_URL (default http://localhost:8000)
"""
import os
import uuid
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8000").rstrip("/")

# Exact payload as WEB ProfileJourney.js constructs for "První návštěva terapeuta"
WEB_SAVE_PAYLOAD = {
    "stage": "therapist",
    "stage_label": "První návštěva terapeuta",
    "is_public": True,
    "note": "",
}

# Exact payload as MOBILE ProfileJourney.tsx constructs for "První návštěva terapeuta"
MOBILE_SAVE_PAYLOAD = {
    "stage": "therapist",
    "stage_label": "První návštěva terapeuta",
    "is_public": True,
    "note": "",
}


def register_and_login(email_prefix: str):
    email = f"{email_prefix}-{uuid.uuid4().hex[:8]}@journey-test.cz"
    password = "Test1234!"
    username = f"user_{uuid.uuid4().hex[:6]}"
    r = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": email, "password": password, "username": username,
        "pronouns": "ona/její", "avatar": "fem-pink", "location": "", "district": "",
        "phone": "", "bio": "", "website": "", "secret_code": "Transfortrans"
    })
    if r.status_code not in [200, 201]:
        raise RuntimeError(f"Register failed: {r.status_code} {r.text}")
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
    if r.status_code != 200:
        raise RuntimeError(f"Login failed: {r.status_code} {r.text}")
    token = r.json()["token"]
    return {"Authorization": f"Bearer {token}"}, r.json()["user"]["id"]


def run_test():
    print("=" * 60)
    print("JOURNEY VALUES TEST - První návštěva terapeuta")
    print("=" * 60)

    # 1. WEB user: register, save with web payload
    web_headers, web_user_id = register_and_login("web")
    print("\n1. WEB SAVE")
    print("   exact raw stage value sent:", repr(WEB_SAVE_PAYLOAD["stage"]))
    print("   exact raw stage_label sent:", repr(WEB_SAVE_PAYLOAD["stage_label"]))
    r = requests.put(f"{BASE_URL}/api/users/me/journey", json=WEB_SAVE_PAYLOAD, headers=web_headers)
    if r.status_code != 200:
        print("   ERROR:", r.status_code, r.text)
    else:
        print("   PUT response:", r.json())

    # 2. MOBILE user: register, save with mobile payload
    mobile_headers, mobile_user_id = register_and_login("mobile")
    print("\n2. MOBILE SAVE")
    print("   exact raw stage value sent:", repr(MOBILE_SAVE_PAYLOAD["stage"]))
    print("   exact raw stage_label sent:", repr(MOBILE_SAVE_PAYLOAD["stage_label"]))
    r = requests.put(f"{BASE_URL}/api/users/me/journey", json=MOBILE_SAVE_PAYLOAD, headers=mobile_headers)
    if r.status_code != 200:
        print("   ERROR:", r.status_code, r.text)
    else:
        print("   PUT response:", r.json())

    # 3. BACKEND after WEB save - stored journey.stage
    r = requests.get(f"{BASE_URL}/api/users/me", headers=web_headers)
    web_me = r.json() if r.status_code == 200 else {}
    web_journey = web_me.get("journey") or {}
    print("\n3. BACKEND after WEB save (user", web_user_id[:8], ")")
    print("   exact stored journey.stage:", repr(web_journey.get("stage")))
    print("   full journey:", web_journey)

    # 4. BACKEND after MOBILE save - stored journey.stage
    r = requests.get(f"{BASE_URL}/api/users/me", headers=mobile_headers)
    mobile_me = r.json() if r.status_code == 200 else {}
    mobile_journey = mobile_me.get("journey") or {}
    print("\n4. BACKEND after MOBILE save (user", mobile_user_id[:8], ")")
    print("   exact stored journey.stage:", repr(mobile_journey.get("stage")))
    print("   full journey:", mobile_journey)

    # 5. WEB find similar
    r = requests.get(f"{BASE_URL}/api/journey/similar", headers=web_headers)
    web_similar = r.json() if r.status_code == 200 else []
    web_matching = web_journey.get("stage")  # backend uses this from DB
    print("\n5. WEB find similar")
    print("   exact backend matching value (journey.stage from DB):", repr(web_matching))
    print("   exact number of users returned:", len(web_similar))
    print("   raw response payload:", web_similar)

    # 6. MOBILE find similar
    r = requests.get(f"{BASE_URL}/api/journey/similar", headers=mobile_headers)
    mobile_similar = r.json() if r.status_code == 200 else []
    mobile_matching = mobile_journey.get("stage")
    print("\n6. MOBILE find similar")
    print("   exact backend matching value (journey.stage from DB):", repr(mobile_matching))
    print("   exact number of users returned:", len(mobile_similar))
    print("   raw response payload:", mobile_similar)

    # 7. Compare
    print("\n7. COMPARE web vs mobile")
    stage_match = web_journey.get("stage") == mobile_journey.get("stage")
    print("   journey.stage match:", stage_match, "| web:", repr(web_journey.get("stage")), "vs mobile:", repr(mobile_journey.get("stage")))
    if web_journey.get("stage") != mobile_journey.get("stage"):
        print("   MISMATCH: stages differ")
    else:
        print("   No mismatch in stored stage values.")
    print("=" * 60)


if __name__ == "__main__":
    run_test()
