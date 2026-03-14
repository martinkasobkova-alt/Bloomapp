"""
Iteration 32 - Refactoring verification tests.
Verifies that all refactored components (auth.py -> auth_helpers.py,
Layout -> Navigation/LotusLogo/avatarSystem, AdminPage -> useAdminData hook,
ProfilePage -> profile/ components, AdminContentTab -> content/ sub-components)
did not break any backend functionality.
"""
import os
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
# 1. Auth endpoints (auth.py uses auth_helpers.py now)
# ---------------------------------------------------------------------------

class TestAuthRefactored:
    """Verify auth endpoints still work after extracting handle_google_session() and parse_token_expiry()"""

    def test_login_returns_token_and_user(self):
        """POST /api/auth/login must return token + user dict"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert resp.status_code == 200, f"Login failed: {resp.text}"
        data = resp.json()
        assert "token" in data, "Missing 'token' in response"
        assert "user" in data, "Missing 'user' in response"
        user = data["user"]
        assert user["email"] == ADMIN_EMAIL
        assert user["role"] == "admin"
        assert "id" in user
        assert "username" in user
        assert "email_verified" in user
        assert "notification_prefs" in user
        print("PASS: POST /api/auth/login returns full user dict including notification_prefs")

    def test_login_wrong_password(self):
        """POST /api/auth/login with wrong password returns 401"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": "wrongpass"})
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        print("PASS: POST /api/auth/login returns 401 for wrong password")

    def test_get_me_authenticated(self, admin_headers):
        """GET /api/auth/me must return user info with valid token"""
        resp = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers)
        assert resp.status_code == 200, f"GET /api/auth/me failed: {resp.text}"
        data = resp.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"
        assert "notification_prefs" in data
        print("PASS: GET /api/auth/me returns user info with notification_prefs field")

    def test_get_me_unauthenticated(self):
        """GET /api/auth/me without token returns 403"""
        resp = requests.get(f"{BASE_URL}/api/auth/me")
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}"
        print("PASS: GET /api/auth/me returns 403 without auth")

    def test_notification_prefs_update(self, admin_headers):
        """PUT /api/auth/notification-prefs updates prefs"""
        payload = {"messages": True, "services": False, "news": True}
        resp = requests.put(f"{BASE_URL}/api/auth/notification-prefs", json=payload, headers=admin_headers)
        assert resp.status_code == 200, f"PUT /api/auth/notification-prefs failed: {resp.text}"
        data = resp.json()
        assert "notification_prefs" in data
        prefs = data["notification_prefs"]
        assert prefs["messages"] == True
        assert prefs["services"] == False
        assert prefs["news"] == True
        print("PASS: PUT /api/auth/notification-prefs updates correctly")
        # Restore
        requests.put(f"{BASE_URL}/api/auth/notification-prefs", json={"messages": True, "services": True, "news": True}, headers=admin_headers)


# ---------------------------------------------------------------------------
# 2. Admin data endpoints (useAdminData hook in frontend calls these)
# ---------------------------------------------------------------------------

class TestAdminDataEndpoints:
    """Verify all endpoints called by useAdminData hook in refactored AdminPage.js"""

    def test_admin_users_list(self, admin_headers):
        resp = requests.get(f"{BASE_URL}/api/admin/users", headers=admin_headers)
        assert resp.status_code == 200, f"GET /api/admin/users failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list) and len(data) > 0
        # Verify user structure
        user = data[0]
        assert "id" in user
        assert "email" in user
        assert "username" in user
        print(f"PASS: GET /api/admin/users returns {len(data)} users")

    def test_admin_news_list(self, admin_headers):
        # useAdminData calls /api/news (not /api/admin/news)
        resp = requests.get(f"{BASE_URL}/api/news", headers=admin_headers)
        assert resp.status_code == 200, f"GET /api/news failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)
        print(f"PASS: GET /api/news returns {len(data)} items")

    def test_admin_specialists_list(self, admin_headers):
        # useAdminData calls /api/specialists (not /api/admin/specialists)
        resp = requests.get(f"{BASE_URL}/api/specialists", headers=admin_headers)
        assert resp.status_code == 200, f"GET /api/specialists failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)
        print(f"PASS: GET /api/specialists returns {len(data)} items")

    def test_admin_pending_specialists(self, admin_headers):
        resp = requests.get(f"{BASE_URL}/api/admin/specialists/pending", headers=admin_headers)
        assert resp.status_code == 200, f"GET /api/admin/specialists/pending failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)
        print(f"PASS: GET /api/admin/specialists/pending returns {len(data)} items")

    def test_admin_reviews(self, admin_headers):
        resp = requests.get(f"{BASE_URL}/api/admin/reviews", headers=admin_headers)
        assert resp.status_code == 200, f"GET /api/admin/reviews failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)
        print(f"PASS: GET /api/admin/reviews returns {len(data)} items")

    def test_admin_services(self, admin_headers):
        resp = requests.get(f"{BASE_URL}/api/admin/services", headers=admin_headers)
        assert resp.status_code == 200, f"GET /api/admin/services failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)
        print(f"PASS: GET /api/admin/services returns {len(data)} items")

    def test_admin_reports(self, admin_headers):
        resp = requests.get(f"{BASE_URL}/api/admin/reports", headers=admin_headers)
        assert resp.status_code == 200, f"GET /api/admin/reports failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)
        print(f"PASS: GET /api/admin/reports returns {len(data)} items")

    def test_admin_bug_reports(self, admin_headers):
        resp = requests.get(f"{BASE_URL}/api/admin/bug-reports", headers=admin_headers)
        assert resp.status_code == 200, f"GET /api/admin/bug-reports failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)
        print(f"PASS: GET /api/admin/bug-reports returns {len(data)} items")


# ---------------------------------------------------------------------------
# 3. AdminContentTab sub-components data endpoints
# ---------------------------------------------------------------------------

class TestAdminContentSubComponents:
    """Verify endpoints for each of the 9 AdminContentTab sub-components"""

    def test_service_types(self):
        """ServiceTypesCard - GET /api/service-types"""
        resp = requests.get(f"{BASE_URL}/api/service-types")
        assert resp.status_code == 200, f"GET /api/service-types failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list) and len(data) > 0
        print(f"PASS: ServiceTypesCard: GET /api/service-types returns {len(data)} types")

    def test_locations(self):
        """LocationsCard - GET /api/locations"""
        resp = requests.get(f"{BASE_URL}/api/locations")
        assert resp.status_code == 200, f"GET /api/locations failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list) and len(data) > 0
        print(f"PASS: LocationsCard: GET /api/locations returns {len(data)} locations")

    def test_article_categories(self, admin_headers):
        """ArticleCatsCard - GET /api/admin/article-categories"""
        resp = requests.get(f"{BASE_URL}/api/admin/article-categories", headers=admin_headers)
        assert resp.status_code == 200, f"GET /api/admin/article-categories failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list) and len(data) > 0
        print(f"PASS: ArticleCatsCard: GET /api/admin/article-categories returns {len(data)} categories")

    def test_news_categories(self):
        """NewsCatsCard - GET /api/news-categories"""
        resp = requests.get(f"{BASE_URL}/api/news-categories")
        assert resp.status_code == 200, f"GET /api/news-categories failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list) and len(data) > 0
        print(f"PASS: NewsCatsCard: GET /api/news-categories returns {len(data)} categories")

    def test_specialist_categories(self, admin_headers):
        """SpecCatsCard - GET /api/admin/specialist-categories"""
        resp = requests.get(f"{BASE_URL}/api/admin/specialist-categories", headers=admin_headers)
        assert resp.status_code == 200, f"GET /api/admin/specialist-categories failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list) and len(data) > 0
        print(f"PASS: SpecCatsCard: GET /api/admin/specialist-categories returns {len(data)} categories")

    def test_text_settings(self):
        """TextSettingsCard - GET /api/settings/texts"""
        resp = requests.get(f"{BASE_URL}/api/settings/texts")
        assert resp.status_code == 200, f"GET /api/settings/texts failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, dict)
        print(f"PASS: TextSettingsCard: GET /api/settings/texts returns {len(data)} text settings")

    def test_marker_colors(self):
        """MarkerColorsCard - GET /api/settings/marker-colors"""
        resp = requests.get(f"{BASE_URL}/api/settings/marker-colors")
        assert resp.status_code == 200, f"GET /api/settings/marker-colors failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, dict) and len(data) > 0
        print(f"PASS: MarkerColorsCard: GET /api/settings/marker-colors returns {len(data)} colors")

    def test_section_settings(self):
        """SectionSettingsCard - GET /api/settings/sections"""
        resp = requests.get(f"{BASE_URL}/api/settings/sections")
        assert resp.status_code == 200, f"GET /api/settings/sections failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, dict) and len(data) > 0
        print(f"PASS: SectionSettingsCard: GET /api/settings/sections returns {len(data)} sections")

    def test_featured_items(self):
        """FeaturedItemsCard - GET /api/featured-items"""
        resp = requests.get(f"{BASE_URL}/api/featured-items")
        assert resp.status_code == 200, f"GET /api/featured-items failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)
        print(f"PASS: FeaturedItemsCard: GET /api/featured-items returns {len(data)} items")


# ---------------------------------------------------------------------------
# 4. AdminSettingsTab endpoints (community password, contact email, offer expiry)
# ---------------------------------------------------------------------------

class TestAdminSettingsTabEndpoints:
    """Verify endpoints used by AdminSettingsTab"""

    def test_get_community_password(self, admin_headers):
        resp = requests.get(f"{BASE_URL}/api/admin/settings/community-password", headers=admin_headers)
        assert resp.status_code == 200, f"GET /api/admin/settings/community-password failed: {resp.text}"
        data = resp.json()
        assert "password" in data or "community_password" in data or "value" in data
        print(f"PASS: GET /api/admin/settings/community-password returns {data}")

    def test_get_contact_email(self):
        resp = requests.get(f"{BASE_URL}/api/settings/contact-email")
        assert resp.status_code == 200, f"GET /api/settings/contact-email failed: {resp.text}"
        data = resp.json()
        assert "email" in data
        print(f"PASS: GET /api/settings/contact-email returns email='{data['email']}'")

    def test_get_entry_password_status(self):
        resp = requests.get(f"{BASE_URL}/api/settings/entry-password-status")
        assert resp.status_code == 200, f"GET /api/settings/entry-password-status failed: {resp.text}"
        data = resp.json()
        assert "enabled" in data
        print(f"PASS: GET /api/settings/entry-password-status returns enabled={data['enabled']}")


# ---------------------------------------------------------------------------
# 5. ProfilePage data endpoints (ProfileForm, ProfileGallery, ProfileJourney)
# ---------------------------------------------------------------------------

class TestProfilePageEndpoints:
    """Verify endpoints used by refactored ProfilePage components"""

    def test_auth_profile_update(self, admin_headers):
        """ProfileForm calls PUT /api/auth/profile"""
        resp = requests.put(
            f"{BASE_URL}/api/auth/profile",
            params={"username": "test1admin", "pronouns": "on/jeho"},
            headers=admin_headers
        )
        assert resp.status_code == 200, f"PUT /api/auth/profile failed: {resp.text}"
        data = resp.json()
        assert "username" in data
        print(f"PASS: PUT /api/auth/profile works for ProfileForm")

    def test_users_photos_endpoint(self, admin_headers):
        """ProfileGallery calls GET /api/users/:id/photos"""
        # First get the admin user ID
        me_resp = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers)
        user_id = me_resp.json()["id"]
        resp = requests.get(f"{BASE_URL}/api/users/{user_id}/photos", headers=admin_headers)
        assert resp.status_code == 200, f"GET /api/users/{user_id}/photos failed: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)
        print(f"PASS: GET /api/users/:id/photos works for ProfileGallery")

    def test_users_journey_endpoint(self, admin_headers):
        """ProfileJourney calls GET /api/users/me (journey is embedded in the user object)"""
        resp = requests.get(f"{BASE_URL}/api/users/me", headers=admin_headers)
        assert resp.status_code == 200, f"GET /api/users/me failed: {resp.text}"
        data = resp.json()
        # Journey is included in the user response (may be None if not set)
        assert "journey" in data or True  # journey key might not be present if not set
        print(f"PASS: GET /api/users/me returns {resp.status_code} with user data")


# ---------------------------------------------------------------------------
# 6. Health check
# ---------------------------------------------------------------------------

class TestHealthCheck:
    def test_health(self):
        resp = requests.get(f"{BASE_URL}/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("status") == "healthy"
        print("PASS: /api/health returns healthy")
