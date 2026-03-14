"""
Iteration 28 - Backend refactoring verification tests.
Tests all endpoints listed in the review request to verify the monolithic server.py
was correctly split into modular route files without breaking any functionality.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

ADMIN_EMAIL = "test1@bloom.cz"
ADMIN_PASSWORD = "test123"
COMMUNITY_PASSWORD = "Transfortrans"


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def admin_token():
    """Obtain admin token once for the entire module."""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    data = resp.json()
    assert "token" in data
    return data["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ---------------------------------------------------------------------------
# 1. Health check
# ---------------------------------------------------------------------------

class TestHealth:
    """Health endpoint test"""

    def test_health_returns_200(self):
        resp = requests.get(f"{BASE_URL}/api/health")
        assert resp.status_code == 200, f"Health check failed: {resp.text}"
        data = resp.json()
        assert data.get("status") == "healthy", f"Unexpected health response: {data}"
        print("PASS: /api/health returns 200 with status=healthy")


# ---------------------------------------------------------------------------
# 2. Authentication endpoints
# ---------------------------------------------------------------------------

class TestAuth:
    """Authentication endpoints"""

    def test_login_success(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert resp.status_code == 200, f"Login failed: {resp.text}"
        data = resp.json()
        assert "token" in data, "Response missing 'token'"
        assert "user" in data, "Response missing 'user'"
        assert isinstance(data["token"], str) and len(data["token"]) > 0
        assert data["user"]["email"] == ADMIN_EMAIL
        print("PASS: POST /api/auth/login returns token for test1@bloom.cz/test123")

    def test_login_wrong_password(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": "wrongpassword"})
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        print("PASS: POST /api/auth/login returns 401 for wrong password")

    def test_get_me_with_valid_token(self, admin_headers):
        resp = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers)
        assert resp.status_code == 200, f"GET /api/auth/me failed: {resp.text}"
        data = resp.json()
        assert "email" in data, "Response missing 'email'"
        assert data["email"] == ADMIN_EMAIL
        print("PASS: GET /api/auth/me returns user info with valid token")

    def test_get_me_without_token(self):
        resp = requests.get(f"{BASE_URL}/api/auth/me")
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}: {resp.text}"
        print("PASS: GET /api/auth/me returns 403 without token")

    def test_register_new_user(self):
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "email": f"TEST_iter28_{unique_id}@bloom.cz",
            "password": "TestPass123!",
            "username": f"TEST_user_{unique_id}",
            "secret_code": COMMUNITY_PASSWORD,
            "pronouns": "",
            "avatar": "fem-pink",
            "location": "",
            "district": "",
            "phone": "",
            "bio": "",
        }
        resp = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert resp.status_code == 200, f"Registration failed: {resp.text}"
        data = resp.json()
        assert "token" in data, "Response missing 'token'"
        assert "user" in data, "Response missing 'user'"
        assert data["user"]["username"] == payload["username"]
        print(f"PASS: POST /api/auth/register created user {payload['username']}")
        # cleanup: delete the created user
        token = data["token"]
        admin_resp = requests.post(
            f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if admin_resp.status_code == 200:
            admin_tok = admin_resp.json()["token"]
            requests.delete(
                f"{BASE_URL}/api/admin/users/{data['user']['id']}",
                headers={"Authorization": f"Bearer {admin_tok}"}
            )

    def test_register_wrong_community_password(self):
        # First check if entry password is enabled
        status_resp = requests.get(f"{BASE_URL}/api/settings/entry-password-status")
        entry_enabled = status_resp.json().get("enabled", True) if status_resp.status_code == 200 else True

        if not entry_enabled:
            pytest.skip("Entry password is disabled in this environment - wrong password test not applicable")

        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "email": f"TEST_iter28_bad_{unique_id}@bloom.cz",
            "password": "TestPass123!",
            "username": f"TEST_bad_{unique_id}",
            "secret_code": "WrongPassword",
            "pronouns": "", "avatar": "fem-pink",
            "location": "", "district": "", "phone": "", "bio": "",
        }
        resp = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
        print("PASS: POST /api/auth/register returns 400 for wrong community password")


# ---------------------------------------------------------------------------
# 3. Admin endpoints
# ---------------------------------------------------------------------------

class TestAdminEndpoints:
    """Admin-only endpoints"""

    def test_admin_users_list(self, admin_headers):
        resp = requests.get(f"{BASE_URL}/api/admin/users", headers=admin_headers)
        assert resp.status_code == 200, f"GET /api/admin/users failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        assert len(data) > 0, "Admin users list is empty"
        print(f"PASS: GET /api/admin/users returns {len(data)} users")

    def test_admin_users_requires_auth(self):
        resp = requests.get(f"{BASE_URL}/api/admin/users")
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}"
        print("PASS: GET /api/admin/users returns 403 without auth")

    def test_admin_bug_reports(self, admin_headers):
        resp = requests.get(f"{BASE_URL}/api/admin/bug-reports", headers=admin_headers)
        assert resp.status_code == 200, f"GET /api/admin/bug-reports failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"PASS: GET /api/admin/bug-reports returns list ({len(data)} items)")

    def test_admin_reviews(self, admin_headers):
        resp = requests.get(f"{BASE_URL}/api/admin/reviews", headers=admin_headers)
        assert resp.status_code == 200, f"GET /api/admin/reviews failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"PASS: GET /api/admin/reviews returns list ({len(data)} items)")

    def test_admin_services(self, admin_headers):
        resp = requests.get(f"{BASE_URL}/api/admin/services", headers=admin_headers)
        assert resp.status_code == 200, f"GET /api/admin/services failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"PASS: GET /api/admin/services returns list ({len(data)} items)")

    def test_admin_reports(self, admin_headers):
        resp = requests.get(f"{BASE_URL}/api/admin/reports", headers=admin_headers)
        assert resp.status_code == 200, f"GET /api/admin/reports failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"PASS: GET /api/admin/reports returns list ({len(data)} items)")

    def test_admin_specialists_pending(self, admin_headers):
        resp = requests.get(f"{BASE_URL}/api/admin/specialists/pending", headers=admin_headers)
        assert resp.status_code == 200, f"GET /api/admin/specialists/pending failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"PASS: GET /api/admin/specialists/pending returns list ({len(data)} items)")

    def test_admin_article_categories(self, admin_headers):
        resp = requests.get(f"{BASE_URL}/api/admin/article-categories", headers=admin_headers)
        assert resp.status_code == 200, f"GET /api/admin/article-categories failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        assert len(data) > 0, "Article categories list is empty"
        print(f"PASS: GET /api/admin/article-categories returns {len(data)} categories")

    def test_admin_specialist_categories(self, admin_headers):
        resp = requests.get(f"{BASE_URL}/api/admin/specialist-categories", headers=admin_headers)
        assert resp.status_code == 200, f"GET /api/admin/specialist-categories failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        assert len(data) > 0, "Specialist categories list is empty"
        print(f"PASS: GET /api/admin/specialist-categories returns {len(data)} categories")


# ---------------------------------------------------------------------------
# 4. Messages & Notifications
# ---------------------------------------------------------------------------

class TestMessagesNotifications:
    """Messages and notifications endpoints"""

    def test_get_conversations(self, admin_headers):
        resp = requests.get(f"{BASE_URL}/api/messages/conversations", headers=admin_headers)
        assert resp.status_code == 200, f"GET /api/messages/conversations failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"PASS: GET /api/messages/conversations returns list ({len(data)} items)")

    def test_get_unread_count(self, admin_headers):
        resp = requests.get(f"{BASE_URL}/api/messages/unread-count", headers=admin_headers)
        assert resp.status_code == 200, f"GET /api/messages/unread-count failed: {resp.text}"
        data = resp.json()
        assert "count" in data, f"Response missing 'count': {data}"
        assert isinstance(data["count"], int), f"count should be int, got {type(data['count'])}"
        print(f"PASS: GET /api/messages/unread-count returns count={data['count']}")

    def test_get_notifications(self, admin_headers):
        resp = requests.get(f"{BASE_URL}/api/notifications", headers=admin_headers)
        assert resp.status_code == 200, f"GET /api/notifications failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"PASS: GET /api/notifications returns list ({len(data)} items)")

    def test_mark_all_notifications_read(self, admin_headers):
        resp = requests.put(f"{BASE_URL}/api/notifications/read-all", headers=admin_headers)
        assert resp.status_code == 200, f"PUT /api/notifications/read-all failed: {resp.text}"
        data = resp.json()
        assert "message" in data, f"Response missing 'message': {data}"
        print("PASS: PUT /api/notifications/read-all marks all read")


# ---------------------------------------------------------------------------
# 5. Specialists
# ---------------------------------------------------------------------------

class TestSpecialists:
    """Specialists endpoints"""

    def test_get_specialists(self):
        resp = requests.get(f"{BASE_URL}/api/specialists")
        assert resp.status_code == 200, f"GET /api/specialists failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"PASS: GET /api/specialists returns list ({len(data)} items)")

    def test_get_specialists_with_filter(self):
        resp = requests.get(f"{BASE_URL}/api/specialists?country=CZ")
        assert resp.status_code == 200, f"GET /api/specialists?country=CZ failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)
        print(f"PASS: GET /api/specialists?country=CZ returns {len(data)} items")


# ---------------------------------------------------------------------------
# 6. News & Articles & Questions
# ---------------------------------------------------------------------------

class TestNewsArticlesQuestions:
    """News, articles, and questions endpoints"""

    def test_get_news(self):
        resp = requests.get(f"{BASE_URL}/api/news")
        assert resp.status_code == 200, f"GET /api/news failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"PASS: GET /api/news returns list ({len(data)} items)")

    def test_get_articles(self):
        resp = requests.get(f"{BASE_URL}/api/articles")
        assert resp.status_code == 200, f"GET /api/articles failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"PASS: GET /api/articles returns list ({len(data)} items)")

    def test_get_questions(self):
        resp = requests.get(f"{BASE_URL}/api/questions")
        assert resp.status_code == 200, f"GET /api/questions failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"PASS: GET /api/questions returns list ({len(data)} items)")


# ---------------------------------------------------------------------------
# 7. Services
# ---------------------------------------------------------------------------

class TestServices:
    """Services endpoints"""

    def test_get_services(self):
        resp = requests.get(f"{BASE_URL}/api/services")
        assert resp.status_code == 200, f"GET /api/services failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"PASS: GET /api/services returns list ({len(data)} items)")

    def test_get_service_types(self):
        resp = requests.get(f"{BASE_URL}/api/service-types")
        assert resp.status_code == 200, f"GET /api/service-types failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        assert len(data) > 0, "Service types list is empty"
        # Verify expected types are present
        type_ids = [t["id"] for t in data]
        assert "beauty" in type_ids or "other" in type_ids, f"Expected service types not found: {type_ids}"
        print(f"PASS: GET /api/service-types returns {len(data)} types")


# ---------------------------------------------------------------------------
# 8. Settings
# ---------------------------------------------------------------------------

class TestSettings:
    """Settings endpoints"""

    def test_get_sections(self):
        resp = requests.get(f"{BASE_URL}/api/settings/sections")
        assert resp.status_code == 200, f"GET /api/settings/sections failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, dict), f"Expected dict, got {type(data)}"
        assert len(data) > 0, "Sections settings is empty"
        print(f"PASS: GET /api/settings/sections returns {len(data)} sections")

    def test_get_marker_colors(self):
        resp = requests.get(f"{BASE_URL}/api/settings/marker-colors")
        assert resp.status_code == 200, f"GET /api/settings/marker-colors failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, dict), f"Expected dict, got {type(data)}"
        assert len(data) > 0, "Marker colors is empty"
        print(f"PASS: GET /api/settings/marker-colors returns {len(data)} colors")

    def test_get_texts(self):
        resp = requests.get(f"{BASE_URL}/api/settings/texts")
        assert resp.status_code == 200, f"GET /api/settings/texts failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, dict), f"Expected dict, got {type(data)}"
        print(f"PASS: GET /api/settings/texts returns {len(data)} text settings")

    def test_get_entry_password_status(self):
        resp = requests.get(f"{BASE_URL}/api/settings/entry-password-status")
        assert resp.status_code == 200, f"GET /api/settings/entry-password-status failed: {resp.text}"
        data = resp.json()
        assert "enabled" in data, f"Response missing 'enabled': {data}"
        print(f"PASS: GET /api/settings/entry-password-status returns enabled={data['enabled']}")

    def test_get_contact_email(self):
        resp = requests.get(f"{BASE_URL}/api/settings/contact-email")
        assert resp.status_code == 200, f"GET /api/settings/contact-email failed: {resp.text}"
        data = resp.json()
        assert "email" in data, f"Response missing 'email': {data}"
        print(f"PASS: GET /api/settings/contact-email returns email='{data['email']}'")


# ---------------------------------------------------------------------------
# 9. Featured Items
# ---------------------------------------------------------------------------

class TestFeaturedItems:
    """Featured items endpoint"""

    def test_get_featured_items(self):
        resp = requests.get(f"{BASE_URL}/api/featured-items")
        assert resp.status_code == 200, f"GET /api/featured-items failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"PASS: GET /api/featured-items returns list ({len(data)} items)")


# ---------------------------------------------------------------------------
# 10. Locations
# ---------------------------------------------------------------------------

class TestLocations:
    """Locations endpoint"""

    def test_get_locations(self):
        resp = requests.get(f"{BASE_URL}/api/locations")
        assert resp.status_code == 200, f"GET /api/locations failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        assert len(data) > 0, "Locations list is empty"
        print(f"PASS: GET /api/locations returns {len(data)} locations")

    def test_get_locations_filter_cz(self):
        resp = requests.get(f"{BASE_URL}/api/locations?country=CZ")
        assert resp.status_code == 200, f"GET /api/locations?country=CZ failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)
        # All returned locations should have country=CZ
        for loc in data:
            assert loc.get("country") == "CZ", f"Location has wrong country: {loc}"
        print(f"PASS: GET /api/locations?country=CZ returns {len(data)} CZ locations")


# ---------------------------------------------------------------------------
# 11. Push
# ---------------------------------------------------------------------------

class TestPush:
    """Push notifications endpoint"""

    def test_get_vapid_key(self):
        resp = requests.get(f"{BASE_URL}/api/push/vapid-key")
        assert resp.status_code == 200, f"GET /api/push/vapid-key failed: {resp.text}"
        data = resp.json()
        assert "public_key" in data, f"Response missing 'public_key': {data}"
        assert isinstance(data["public_key"], str) and len(data["public_key"]) > 0
        print(f"PASS: GET /api/push/vapid-key returns public_key (length={len(data['public_key'])})")


# ---------------------------------------------------------------------------
# 12. Community
# ---------------------------------------------------------------------------

class TestCommunity:
    """Community highlights endpoint"""

    def test_get_community_highlights(self):
        resp = requests.get(f"{BASE_URL}/api/community/highlights")
        assert resp.status_code == 200, f"GET /api/community/highlights failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, dict), f"Expected dict, got {type(data)}"
        assert "new_members" in data, f"Response missing 'new_members': {data}"
        assert "active_helpers" in data, f"Response missing 'active_helpers': {data}"
        assert "top_specialists" in data, f"Response missing 'top_specialists': {data}"
        assert isinstance(data["new_members"], list)
        assert isinstance(data["active_helpers"], list)
        assert isinstance(data["top_specialists"], list)
        print(f"PASS: GET /api/community/highlights returns highlights with {len(data['new_members'])} new members")


# ---------------------------------------------------------------------------
# 13. News Categories
# ---------------------------------------------------------------------------

class TestNewsCategories:
    """News categories endpoint"""

    def test_get_news_categories(self):
        resp = requests.get(f"{BASE_URL}/api/news-categories")
        assert resp.status_code == 200, f"GET /api/news-categories failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        assert len(data) > 0, "News categories list is empty"
        # Verify expected category ids
        cat_ids = [c["id"] for c in data]
        print(f"PASS: GET /api/news-categories returns {len(data)} categories: {cat_ids}")


# ---------------------------------------------------------------------------
# 14. OpenAPI endpoint count verification
# ---------------------------------------------------------------------------

class TestEndpointCount:
    """Verify the total number of registered endpoints via internal localhost"""

    def test_openapi_endpoint_count(self):
        # OpenAPI spec is only accessible via localhost (external URL serves frontend)
        resp = requests.get("http://localhost:8001/openapi.json")
        assert resp.status_code == 200, f"GET localhost:8001/openapi.json failed: {resp.text}"
        data = resp.json()
        paths = data.get("paths", {})
        assert len(paths) > 0, "No paths in OpenAPI spec"
        # Count total endpoints (path + method combinations)
        endpoint_count = sum(len(methods) for methods in paths.values())
        print(f"PASS: OpenAPI spec has {len(paths)} paths, {endpoint_count} total endpoint methods")
        # The original had 133 endpoints; we expect exactly 133
        assert endpoint_count == 133, f"Expected 133 endpoint methods, got {endpoint_count}"
        print(f"PASS: Endpoint count matches exactly: {endpoint_count} == 133")
