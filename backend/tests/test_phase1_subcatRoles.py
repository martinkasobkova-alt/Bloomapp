"""
Phase 1 Backend Tests: Role-based posting permissions + UserProfilePage sub-components
Tests: news-categories with allowed_roles, POST /news permission enforcement, admin role updates
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
ADMIN_EMAIL = "test1@bloom.cz"
ADMIN_PASSWORD = "test123"
COMMUNITY_PASSWORD = "Transfortrans"


# ===================== Fixtures =====================

@pytest.fixture(scope="module")
def admin_token():
    """Get admin token"""
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def regular_user_data(admin_headers):
    """Register a regular user for testing posting permissions"""
    unique = uuid.uuid4().hex[:8]
    email = f"TEST_user_{unique}@bloom.cz"
    password = "Testpass123!"
    username = f"testuser_{unique}"
    r = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": email,
        "password": password,
        "username": username,
        "community_password": COMMUNITY_PASSWORD
    })
    assert r.status_code in [200, 201], f"User registration failed: {r.text}"
    # login to get token
    login_r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
    assert login_r.status_code == 200, f"User login failed: {login_r.text}"
    token = login_r.json()["token"]
    user_id = login_r.json()["user"]["id"]
    return {"token": token, "user_id": user_id, "email": email, "username": username}


@pytest.fixture(scope="module")
def user_headers(regular_user_data):
    return {"Authorization": f"Bearer {regular_user_data['token']}", "Content-Type": "application/json"}


# ===================== Test: GET /api/news-categories =====================

class TestNewsCategoriesPublic:
    """Public news-categories endpoint returns allowed_roles"""

    def test_get_news_categories_status(self):
        r = requests.get(f"{BASE_URL}/api/news-categories")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    def test_get_news_categories_returns_list(self):
        r = requests.get(f"{BASE_URL}/api/news-categories")
        data = r.json()
        assert isinstance(data, list), "Expected list of categories"
        assert len(data) > 0, "Expected at least one category"

    def test_news_categories_have_allowed_roles(self):
        r = requests.get(f"{BASE_URL}/api/news-categories")
        data = r.json()
        for cat in data:
            assert "allowed_roles" in cat, f"Category {cat.get('id')} missing allowed_roles"
            assert isinstance(cat["allowed_roles"], list), f"allowed_roles should be a list for {cat.get('id')}"

    def test_zkusenosti_default_roles(self):
        """zkusenosti category should allow user, specialist, admin, lawyer"""
        r = requests.get(f"{BASE_URL}/api/news-categories")
        data = r.json()
        zkusenosti = next((c for c in data if c["id"] == "zkusenosti"), None)
        assert zkusenosti is not None, "zkusenosti category not found"
        expected_roles = {"user", "specialist", "admin", "lawyer"}
        actual_roles = set(zkusenosti["allowed_roles"])
        assert expected_roles == actual_roles, f"Expected roles {expected_roles}, got {actual_roles}"

    def test_other_categories_admin_only_by_default(self):
        """Other categories (world, local, tips, events, interviews) should default to [admin]"""
        r = requests.get(f"{BASE_URL}/api/news-categories")
        data = r.json()
        admin_only_cats = ["world", "local", "tips", "events", "interviews"]
        for cat_id in admin_only_cats:
            cat = next((c for c in data if c["id"] == cat_id), None)
            if cat:
                assert cat["allowed_roles"] == ["admin"] or "admin" in cat["allowed_roles"], \
                    f"Category {cat_id} should have admin in allowed_roles, got {cat.get('allowed_roles')}"


# ===================== Test: GET /api/admin/news-categories =====================

class TestNewsCategoriesAdmin:
    """Admin news-categories endpoint"""

    def test_admin_get_news_categories_status(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/admin/news-categories", headers=admin_headers)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    def test_admin_news_categories_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/admin/news-categories")
        assert r.status_code in [401, 403], f"Expected 401/403 without auth, got {r.status_code}"

    def test_admin_news_categories_have_allowed_roles(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/admin/news-categories", headers=admin_headers)
        data = r.json()
        for cat in data:
            assert "allowed_roles" in cat, f"Category {cat.get('id')} missing allowed_roles"
            assert len(cat["allowed_roles"]) > 0, f"allowed_roles should not be empty for {cat.get('id')}"

    def test_admin_news_categories_match_public(self, admin_headers):
        """Admin and public endpoints should return same categories"""
        public_r = requests.get(f"{BASE_URL}/api/news-categories")
        admin_r = requests.get(f"{BASE_URL}/api/admin/news-categories", headers=admin_headers)
        public_ids = {c["id"] for c in public_r.json()}
        admin_ids = {c["id"] for c in admin_r.json()}
        assert public_ids == admin_ids, f"Public and admin category IDs differ: {public_ids} vs {admin_ids}"


# ===================== Test: PUT /api/admin/news-categories/{id}/allowed-roles =====================

class TestUpdateNewsCategoryRoles:
    """Update allowed_roles for a news category"""

    def test_update_roles_requires_admin(self, user_headers):
        """Non-admin cannot update roles"""
        r = requests.put(f"{BASE_URL}/api/admin/news-categories/world/allowed-roles",
                         json=["user", "admin"], headers=user_headers)
        assert r.status_code in [401, 403], f"Expected 401/403, got {r.status_code}"

    def test_update_roles_requires_auth(self):
        """Unauthenticated cannot update roles"""
        r = requests.put(f"{BASE_URL}/api/admin/news-categories/world/allowed-roles",
                         json=["user", "admin"])
        assert r.status_code in [401, 403], f"Expected 401/403, got {r.status_code}"

    def test_update_world_category_add_user_role(self, admin_headers):
        """Admin can add user role to world category"""
        r = requests.put(f"{BASE_URL}/api/admin/news-categories/world/allowed-roles",
                         json=["admin", "user"], headers=admin_headers)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "id" in data, "Response should have id"
        assert "allowed_roles" in data, "Response should have allowed_roles"
        assert "user" in data["allowed_roles"], "user should be in allowed_roles"
        assert "admin" in data["allowed_roles"], "admin should be in allowed_roles"

    def test_update_roles_persisted(self, admin_headers):
        """After updating, the change persists in GET endpoint"""
        # Update to specific roles
        test_roles = ["admin", "specialist"]
        requests.put(f"{BASE_URL}/api/admin/news-categories/local/allowed-roles",
                     json=test_roles, headers=admin_headers)
        # Verify persistence
        r = requests.get(f"{BASE_URL}/api/news-categories")
        data = r.json()
        local = next((c for c in data if c["id"] == "local"), None)
        assert local is not None, "local category not found"
        assert set(local["allowed_roles"]) == set(test_roles), \
            f"Expected {test_roles}, got {local['allowed_roles']}"
        # Restore to admin only
        requests.put(f"{BASE_URL}/api/admin/news-categories/local/allowed-roles",
                     json=["admin"], headers=admin_headers)

    def test_update_roles_empty_list_rejected(self, admin_headers):
        """Empty roles list should be rejected"""
        r = requests.put(f"{BASE_URL}/api/admin/news-categories/world/allowed-roles",
                         json=[], headers=admin_headers)
        assert r.status_code == 400, f"Expected 400 for empty roles, got {r.status_code}"

    def test_update_roles_invalid_role_filtered(self, admin_headers):
        """Invalid roles should be filtered out; if all invalid, should fail"""
        r = requests.put(f"{BASE_URL}/api/admin/news-categories/world/allowed-roles",
                         json=["superadmin", "moderator"], headers=admin_headers)
        # Should fail (400) since no valid roles after filtering
        assert r.status_code == 400, f"Expected 400 for all invalid roles, got {r.status_code}"

    def test_update_nonexistent_category(self, admin_headers):
        """Non-existent category ID should return 404"""
        r = requests.put(f"{BASE_URL}/api/admin/news-categories/nonexistent-id-xyz/allowed-roles",
                         json=["admin"], headers=admin_headers)
        assert r.status_code == 404, f"Expected 404, got {r.status_code}"

    def test_restore_world_to_admin_only(self, admin_headers):
        """Restore world category to admin-only"""
        r = requests.put(f"{BASE_URL}/api/admin/news-categories/world/allowed-roles",
                         json=["admin"], headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["allowed_roles"] == ["admin"]


# ===================== Test: POST /api/news permission enforcement =====================

class TestNewsPostPermissions:
    """Posting permissions based on allowed_roles"""

    def test_admin_can_post_to_any_category(self, admin_headers):
        """Admin can post to 'local' category (admin-only)"""
        r = requests.post(f"{BASE_URL}/api/news", json={
            "title": "TEST_Admin post to local",
            "content": "Test content",
            "category": "local",
            "image_url": "",
            "video_url": "",
            "thumbnail_url": ""
        }, headers=admin_headers)
        assert r.status_code == 200, f"Admin should be able to post to local, got {r.status_code}: {r.text}"
        # Store news_id for cleanup
        TestNewsPostPermissions.admin_news_id = r.json().get("id")

    def test_regular_user_can_post_to_zkusenosti(self, user_headers):
        """Regular user can post to zkusenosti (has [user, specialist, admin, lawyer])"""
        r = requests.post(f"{BASE_URL}/api/news", json={
            "title": "TEST_User story",
            "content": "My story",
            "category": "zkusenosti",
            "image_url": "",
            "video_url": "",
            "thumbnail_url": ""
        }, headers=user_headers)
        assert r.status_code == 200, f"User should be able to post to zkusenosti, got {r.status_code}: {r.text}"
        TestNewsPostPermissions.user_news_id = r.json().get("id")

    def test_regular_user_cannot_post_to_local(self, user_headers):
        """Regular user cannot post to local (admin-only)"""
        r = requests.post(f"{BASE_URL}/api/news", json={
            "title": "TEST_Unauthorized post",
            "content": "This should fail",
            "category": "local",
            "image_url": "",
            "video_url": "",
            "thumbnail_url": ""
        }, headers=user_headers)
        assert r.status_code == 403, f"User should NOT be able to post to local, got {r.status_code}: {r.text}"

    def test_post_requires_authentication(self):
        """POST /api/news requires authentication"""
        r = requests.post(f"{BASE_URL}/api/news", json={
            "title": "Unauthenticated post",
            "content": "Should fail",
            "category": "zkusenosti"
        })
        assert r.status_code in [401, 403], f"Expected 401/403 without auth, got {r.status_code}"

    def test_community_story_flag(self, user_headers):
        """Posts by regular users to zkusenosti should have is_community_story=True"""
        r = requests.post(f"{BASE_URL}/api/news", json={
            "title": "TEST_Community story flag",
            "content": "Check is_community_story",
            "category": "zkusenosti",
            "image_url": "",
            "video_url": "",
            "thumbnail_url": ""
        }, headers=user_headers)
        assert r.status_code == 200
        data = r.json()
        assert data.get("is_community_story") == True, f"Expected is_community_story=True, got {data.get('is_community_story')}"
        TestNewsPostPermissions.community_story_id = data.get("id")

    def test_dynamic_role_grant_allows_user_to_post(self, admin_headers, user_headers):
        """After granting user role to 'tips' category, user can post there"""
        # Grant user role to tips category
        grant_r = requests.put(f"{BASE_URL}/api/admin/news-categories/tips/allowed-roles",
                               json=["admin", "user"], headers=admin_headers)
        assert grant_r.status_code == 200, "Failed to grant user role to tips"

        # Now user should be able to post to tips
        r = requests.post(f"{BASE_URL}/api/news", json={
            "title": "TEST_User post after role grant",
            "content": "Now I can post!",
            "category": "tips",
            "image_url": "",
            "video_url": "",
            "thumbnail_url": ""
        }, headers=user_headers)
        assert r.status_code == 200, f"User should now be able to post to tips, got {r.status_code}: {r.text}"
        TestNewsPostPermissions.granted_news_id = r.json().get("id")

        # Restore tips to admin-only
        requests.put(f"{BASE_URL}/api/admin/news-categories/tips/allowed-roles",
                     json=["admin"], headers=admin_headers)

    def test_cleanup_test_news(self, admin_headers):
        """Clean up test news items"""
        ids_to_delete = [
            getattr(TestNewsPostPermissions, 'admin_news_id', None),
            getattr(TestNewsPostPermissions, 'user_news_id', None),
            getattr(TestNewsPostPermissions, 'community_story_id', None),
            getattr(TestNewsPostPermissions, 'granted_news_id', None),
        ]
        for news_id in ids_to_delete:
            if news_id:
                requests.delete(f"{BASE_URL}/api/news/{news_id}", headers=admin_headers)


# ===================== Test: User Profile Public API =====================

class TestUserPublicProfile:
    """Test public user profile API"""

    def test_public_profile_exists(self, admin_headers):
        """GET /api/users/{id}/public-profile returns data (requires auth)"""
        admin_id = "664b4ff1-1f1f-413b-ac27-8aa9abecb8b4"
        r = requests.get(f"{BASE_URL}/api/users/{admin_id}/public-profile", headers=admin_headers)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    def test_public_profile_fields(self, admin_headers):
        """Public profile has required fields"""
        admin_id = "664b4ff1-1f1f-413b-ac27-8aa9abecb8b4"
        r = requests.get(f"{BASE_URL}/api/users/{admin_id}/public-profile", headers=admin_headers)
        data = r.json()
        required_fields = ["username", "avg_rating", "rating_count"]
        for f in required_fields:
            assert f in data, f"Missing field: {f}"

    def test_public_profile_nonexistent_user(self, admin_headers):
        """Non-existent user ID returns 404"""
        r = requests.get(f"{BASE_URL}/api/users/nonexistent-user-id-xyz/public-profile", headers=admin_headers)
        assert r.status_code == 404, f"Expected 404, got {r.status_code}"

    def test_public_profile_requires_auth(self):
        """Public profile requires authentication"""
        admin_id = "664b4ff1-1f1f-413b-ac27-8aa9abecb8b4"
        r = requests.get(f"{BASE_URL}/api/users/{admin_id}/public-profile")
        assert r.status_code in [401, 403], f"Expected 401/403 without auth, got {r.status_code}"


# ===================== Test: Cleanup =====================

class TestCleanup:
    """Clean up test data"""

    def test_delete_test_user(self, admin_headers, regular_user_data):
        """Delete the test user created during testing"""
        user_id = regular_user_data["user_id"]
        r = requests.delete(f"{BASE_URL}/api/admin/users/{user_id}", headers=admin_headers)
        assert r.status_code in [200, 204], f"Failed to delete test user: {r.status_code}"
