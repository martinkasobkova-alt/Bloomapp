"""
Backend tests for Bloom P0 fixes:
1. GET /api/service-types - must return 7 categories (beauty, health, skills, transport, tech, creative, other)
2. POST /api/services - create offer/request with correct service type
3. POST /api/auth/reset-password - e2e reset with a test token inserted into DB
"""
import pytest
import requests
import os
from datetime import datetime, timezone, timedelta
import pymongo

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ============ AUTH FIXTURES ============

@pytest.fixture(scope="module")
def admin_token():
    """Login as admin and return token"""
    r = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "test1@bloom.cz",
        "password": "test123"
    })
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    return r.json()["token"]

@pytest.fixture(scope="module")
def admin_client(admin_token):
    """Admin session with auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}"
    })
    return session

# ============ SERVICE TYPES ============

class TestServiceTypes:
    """Tests for GET /api/service-types endpoint"""

    def test_service_types_returns_7_categories(self):
        """Must return exactly 7 standard categories"""
        r = requests.get(f"{BASE_URL}/api/service-types")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        types = r.json()
        assert len(types) == 7, f"Expected 7 service types, got {len(types)}: {types}"

    def test_service_types_has_correct_ids(self):
        """Must contain all 7 expected IDs"""
        r = requests.get(f"{BASE_URL}/api/service-types")
        assert r.status_code == 200
        types = r.json()
        ids = {t["id"] for t in types}
        expected = {"beauty", "health", "skills", "transport", "tech", "creative", "other"}
        assert ids == expected, f"Expected IDs {expected}, got {ids}"

    def test_service_types_no_test_entries(self):
        """Must NOT contain test entries from old data"""
        r = requests.get(f"{BASE_URL}/api/service-types")
        assert r.status_code == 200
        types = r.json()
        for t in types:
            assert "TEST" not in t.get("name", "").upper(), f"Found test entry: {t}"
            assert "TEST" not in t.get("id", "").upper(), f"Found test entry: {t}"

    def test_service_types_data_structure(self):
        """Each type must have id and name fields"""
        r = requests.get(f"{BASE_URL}/api/service-types")
        assert r.status_code == 200
        types = r.json()
        for t in types:
            assert "id" in t, f"Missing 'id' field in {t}"
            assert "name" in t, f"Missing 'name' field in {t}"
            assert t["id"], "id must not be empty"
            assert t["name"], "name must not be empty"

    def test_service_types_czech_names(self):
        """Service types must have correct Czech names"""
        r = requests.get(f"{BASE_URL}/api/service-types")
        assert r.status_code == 200
        types = r.json()
        name_map = {t["id"]: t["name"] for t in types}
        assert name_map.get("beauty") == "Krása a péče", f"beauty name: {name_map.get('beauty')}"
        assert name_map.get("health") == "Zdraví a wellness", f"health name: {name_map.get('health')}"
        assert name_map.get("other") == "Ostatní", f"other name: {name_map.get('other')}"


# ============ SERVICE CREATION ============

class TestServiceCreation:
    """Tests for creating services (nabídky/poptávky)"""

    @pytest.fixture(scope="class")
    def created_service_id(self, admin_client):
        """Create a test service and return its ID"""
        r = admin_client.post(f"{BASE_URL}/api/services", json={
            "offer": "TEST_nabidka_testovaci",
            "need": "Fotografie",
            "description": "Testovaci nabidka - bude smazana",
            "service_type": "beauty",
            "post_type": "offer",
            "location": ""
        })
        assert r.status_code == 200, f"Service creation failed: {r.text}"
        data = r.json()
        yield data.get("id")
        # Cleanup
        if data.get("id"):
            admin_client.delete(f"{BASE_URL}/api/services/{data['id']}")

    def test_create_offer_success(self, admin_client):
        """Create a valid offer - must return 200"""
        r = admin_client.post(f"{BASE_URL}/api/services", json={
            "offer": "TEST_create_offer",
            "need": "Fotografie",
            "description": "Test description",
            "service_type": "beauty",
            "post_type": "offer",
            "location": ""
        })
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("offer") == "TEST_create_offer"
        assert data.get("service_type") == "beauty"
        assert data.get("post_type") == "offer"
        # Cleanup
        if data.get("id"):
            admin_client.delete(f"{BASE_URL}/api/services/{data['id']}")

    def test_create_request_success(self, admin_client):
        """Create a valid poptávka (request) - must return 200"""
        r = admin_client.post(f"{BASE_URL}/api/services", json={
            "offer": "TEST_create_request",
            "need": "Masaze",
            "description": "Test poptavka",
            "service_type": "health",
            "post_type": "request",
            "location": ""
        })
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data.get("post_type") == "request"
        # Cleanup
        if data.get("id"):
            admin_client.delete(f"{BASE_URL}/api/services/{data['id']}")

    def test_service_with_valid_service_type(self, admin_client):
        """Create service with each valid service type"""
        for type_id in ["beauty", "health", "skills", "transport", "tech", "creative", "other"]:
            r = admin_client.post(f"{BASE_URL}/api/services", json={
                "offer": f"TEST_{type_id}",
                "need": "test",
                "description": "test",
                "service_type": type_id,
                "post_type": "offer",
                "location": ""
            })
            assert r.status_code == 200, f"Failed for service_type={type_id}: {r.text}"
            data = r.json()
            assert data.get("service_type") == type_id
            # Cleanup
            if data.get("id"):
                admin_client.delete(f"{BASE_URL}/api/services/{data['id']}")

    def test_get_services_list(self):
        """GET /api/services must return list"""
        r = requests.get(f"{BASE_URL}/api/services")
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ============ PASSWORD RESET ============

class TestPasswordReset:
    """Tests for password reset endpoints"""

    def test_reset_password_bad_token_returns_400(self):
        """POST /api/auth/reset-password with bad token must return 400"""
        r = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": "totally_invalid_token_xyz_123",
            "new_password": "newpassword123"
        })
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
        data = r.json()
        assert "detail" in data

    def test_reset_password_short_password(self):
        """POST /api/auth/reset-password with < 6 char password must return 400"""
        r = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": "any_token",
            "new_password": "abc"
        })
        # Either 400 for invalid token or 400 for short password
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"

    def test_reset_password_request_nonexistent_email(self):
        """Reset request for non-existent email must NOT reveal email existence"""
        r = requests.post(f"{BASE_URL}/api/auth/reset-password-request", json={
            "email": "nonexistent_test_xyz@bloom.cz"
        })
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "message" in data

    def test_reset_password_e2e_with_db_token(self):
        """Full e2e: insert token into DB, reset password, verify login"""
        import pymongo
        import uuid
        import bcrypt

        # Connect directly to MongoDB to insert test token
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        db_name = os.environ.get('DB_NAME', 'test_database')
        client = pymongo.MongoClient(mongo_url)
        db = client[db_name]

        # Create a temp test user for password reset e2e
        test_email = f"TEST_reset_{uuid.uuid4().hex[:8]}@bloom.cz"
        original_password = "original123"
        new_password = "newpassword456"

        # Hash and insert test user
        hashed = bcrypt.hashpw(original_password.encode(), bcrypt.gensalt()).decode()
        user_id = str(uuid.uuid4())
        db.users.insert_one({
            "id": user_id,
            "email": test_email,
            "username": "TEST_reset_user",
            "password": hashed,
            "role": "user",
            "created_at": datetime.now(timezone.utc).isoformat()
        })

        # Insert a valid reset token
        test_token = "TEST_valid_token_" + uuid.uuid4().hex
        expires_at = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        db.password_resets.insert_one({
            "id": str(uuid.uuid4()),
            "email": test_email,
            "token": test_token,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": expires_at
        })

        try:
            # Verify original password login works
            r = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": test_email,
                "password": original_password
            })
            assert r.status_code == 200, f"Original login failed: {r.text}"

            # Reset password using the token
            r = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
                "token": test_token,
                "new_password": new_password
            })
            assert r.status_code == 200, f"Password reset failed: {r.text}"
            data = r.json()
            assert "message" in data

            # Verify old password no longer works
            r = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": test_email,
                "password": original_password
            })
            assert r.status_code == 401 or r.status_code == 400, f"Old password should fail: {r.status_code}"

            # Verify new password works
            r = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": test_email,
                "password": new_password
            })
            assert r.status_code == 200, f"New password login failed: {r.text}"

        finally:
            # Cleanup
            db.users.delete_one({"id": user_id})
            db.password_resets.delete_many({"email": test_email})
            client.close()

    def test_reset_password_expired_token(self):
        """Reset password with expired token must return 400"""
        import pymongo
        import uuid

        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        db_name = os.environ.get('DB_NAME', 'test_database')
        client = pymongo.MongoClient(mongo_url)
        db = client[db_name]

        # Insert expired token
        test_token = "EXPIRED_token_" + uuid.uuid4().hex
        expired_at = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
        db.password_resets.insert_one({
            "id": str(uuid.uuid4()),
            "email": "test1@bloom.cz",
            "token": test_token,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": expired_at
        })

        try:
            r = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
                "token": test_token,
                "new_password": "newpassword123"
            })
            assert r.status_code == 400, f"Expected 400 for expired token, got {r.status_code}: {r.text}"
            data = r.json()
            assert "detail" in data
            # Should mention expired
            assert "vypršel" in data["detail"].lower() or "expir" in data["detail"].lower() or "platný" in data["detail"].lower()
        finally:
            db.password_resets.delete_many({"token": test_token})
            client.close()
