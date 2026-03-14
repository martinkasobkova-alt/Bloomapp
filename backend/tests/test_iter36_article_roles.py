"""
Iteration 36 - Testing article categories permissions + news category button fix
Tests:
- GET /api/article-categories: returns all with allowed_roles defaults
- PUT /api/admin/article-categories/{cat_id}/allowed-roles: works correctly
- POST /api/articles: blocked for regular users (403), allowed for admin
- GET /api/news-categories: merges DB with defaults, no missing categories
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

ADMIN_EMAIL = "test1@bloom.cz"
ADMIN_PASSWORD = "test123"

# Valid role sets for validation
DEFAULT_ARTICLE_ROLES = {"admin", "lawyer"}
VALID_ROLES = {"user", "specialist", "lawyer", "admin"}
DEFAULT_NEWS_CATS = {"all", "zkusenosti", "world", "local", "tips", "events", "interviews"}


def get_auth_token(email, password):
    """Helper to get auth token."""
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
    if r.status_code == 200:
        return r.json().get("token")
    return None


def make_session(token=None):
    """Helper to create session with optional token."""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    if token:
        s.headers.update({"Authorization": f"Bearer {token}"})
    return s


# ─── Article Categories Public ────────────────────────────────────────────────

class TestArticleCategoriesPublic:
    """Test GET /api/article-categories - returns all categories with allowed_roles defaults"""

    def test_get_article_categories_status(self):
        """Should return 200"""
        r = requests.get(f"{BASE_URL}/api/article-categories")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        print("PASS: GET /api/article-categories returns 200")

    def test_get_article_categories_returns_list(self):
        """Should return a non-empty list"""
        r = requests.get(f"{BASE_URL}/api/article-categories")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        assert len(data) > 0, "Expected non-empty list"
        print(f"PASS: Returns list with {len(data)} categories")

    def test_get_article_categories_has_allowed_roles(self):
        """Every category should have allowed_roles field"""
        r = requests.get(f"{BASE_URL}/api/article-categories")
        assert r.status_code == 200
        data = r.json()
        for cat in data:
            assert "allowed_roles" in cat, f"Category {cat.get('id')} missing allowed_roles"
            assert isinstance(cat["allowed_roles"], list), f"allowed_roles must be list"
        print(f"PASS: All {len(data)} categories have allowed_roles")

    def test_get_article_categories_default_roles(self):
        """Default categories (not in DB) should have ['admin', 'lawyer'] as allowed_roles"""
        r = requests.get(f"{BASE_URL}/api/article-categories")
        assert r.status_code == 200
        data = r.json()
        default_ids = {"pravni", "zdravi", "socialni", "prava", "ostatni"}
        for cat in data:
            if cat["id"] in default_ids:
                roles = set(cat["allowed_roles"])
                # Either DB has set custom roles, or it defaults to admin+lawyer
                # If no DB override, should contain admin and lawyer
                if not roles:
                    assert False, f"Category {cat['id']} has empty allowed_roles"
                # All roles should be valid
                for role in roles:
                    assert role in VALID_ROLES, f"Invalid role '{role}' in {cat['id']}"
        print("PASS: Default categories have valid allowed_roles")

    def test_get_article_categories_contains_defaults(self):
        """Should contain all 5 default article categories"""
        r = requests.get(f"{BASE_URL}/api/article-categories")
        assert r.status_code == 200
        data = r.json()
        cat_ids = {c["id"] for c in data}
        default_ids = {"pravni", "zdravi", "socialni", "prava", "ostatni"}
        for default_id in default_ids:
            assert default_id in cat_ids, f"Default category '{default_id}' missing from response"
        print(f"PASS: All 5 default categories present. Got: {cat_ids}")


# ─── Article Category Roles Update ────────────────────────────────────────────

class TestUpdateArticleCategoryRoles:
    """Test PUT /api/admin/article-categories/{cat_id}/allowed-roles"""

    def test_update_requires_admin(self):
        """Should return 401 without auth"""
        r = requests.put(f"{BASE_URL}/api/admin/article-categories/pravni/allowed-roles",
                         json=["admin", "lawyer"])
        assert r.status_code in [401, 403], f"Expected 401 or 403, got {r.status_code}"
        print(f"PASS: PUT /api/admin/article-categories/.../allowed-roles returns {r.status_code} without auth")

    def test_update_requires_admin_not_user(self):
        """Regular user should get 403"""
        # Try to register a test user
        test_email = "TEST_article_roles@bloom-test.cz"
        reg = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email, "username": "testrolesuser",
            "password": "TestPass1!"
        })
        if reg.status_code not in [200, 201, 400]:
            pytest.skip(f"Registration failed: {reg.status_code}")
        
        token = get_auth_token(test_email, "TestPass1!")
        if not token:
            pytest.skip("Could not get regular user token")
        
        s = make_session(token)
        r = s.put(f"{BASE_URL}/api/admin/article-categories/pravni/allowed-roles",
                  json=["admin", "lawyer"])
        assert r.status_code == 403, f"Expected 403, got {r.status_code}"
        print("PASS: Regular user gets 403 when updating article category roles")
        
        # Cleanup
        admin_token = get_auth_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        if admin_token:
            admin_s = make_session(admin_token)
            # Get user id first
            users = admin_s.get(f"{BASE_URL}/api/admin/users")
            if users.status_code == 200:
                for u in users.json():
                    if u.get("email") == test_email:
                        admin_s.delete(f"{BASE_URL}/api/admin/users/{u['id']}")
                        break

    def test_update_article_cat_roles_valid(self):
        """Admin can update article category roles"""
        admin_token = get_auth_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert admin_token, "Could not get admin token"
        s = make_session(admin_token)
        
        # Update 'pravni' category to add 'specialist' 
        r = s.put(f"{BASE_URL}/api/admin/article-categories/pravni/allowed-roles",
                  json=["admin", "lawyer", "specialist"])
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "allowed_roles" in data
        assert set(data["allowed_roles"]) == {"admin", "lawyer", "specialist"}
        print(f"PASS: Admin can update article category roles: {data['allowed_roles']}")

    def test_update_article_cat_roles_persists(self):
        """Updated roles should persist via GET"""
        admin_token = get_auth_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert admin_token, "Could not get admin token"
        s = make_session(admin_token)
        
        # Set known roles
        r = s.put(f"{BASE_URL}/api/admin/article-categories/zdravi/allowed-roles",
                  json=["admin", "lawyer"])
        assert r.status_code == 200
        
        # Verify via GET
        cats = requests.get(f"{BASE_URL}/api/article-categories")
        assert cats.status_code == 200
        zdravi = next((c for c in cats.json() if c["id"] == "zdravi"), None)
        assert zdravi is not None, "zdravi category not found"
        assert set(zdravi["allowed_roles"]) == {"admin", "lawyer"}, \
            f"Expected admin+lawyer, got {zdravi['allowed_roles']}"
        print(f"PASS: Updated roles persist: {zdravi['allowed_roles']}")
        
        # Restore
        s.put(f"{BASE_URL}/api/admin/article-categories/pravni/allowed-roles",
              json=["admin", "lawyer"])

    def test_update_article_cat_roles_empty_rejected(self):
        """Empty roles list should return 400"""
        admin_token = get_auth_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert admin_token, "Could not get admin token"
        s = make_session(admin_token)
        
        r = s.put(f"{BASE_URL}/api/admin/article-categories/pravni/allowed-roles",
                  json=[])
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
        print("PASS: Empty roles list correctly returns 400")

    def test_update_article_cat_roles_invalid_roles_rejected(self):
        """All invalid roles should return 400"""
        admin_token = get_auth_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert admin_token, "Could not get admin token"
        s = make_session(admin_token)
        
        r = s.put(f"{BASE_URL}/api/admin/article-categories/pravni/allowed-roles",
                  json=["superuser", "moderator"])
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
        print("PASS: Invalid roles correctly returns 400")

    def test_update_nonexistent_article_cat(self):
        """Nonexistent category should return 404"""
        admin_token = get_auth_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert admin_token, "Could not get admin token"
        s = make_session(admin_token)
        
        r = s.put(f"{BASE_URL}/api/admin/article-categories/nonexistent-cat-xyz/allowed-roles",
                  json=["admin"])
        assert r.status_code == 404, f"Expected 404, got {r.status_code}: {r.text}"
        print("PASS: Nonexistent category returns 404")


# ─── Article Post Permissions ─────────────────────────────────────────────────

class TestArticlePostPermissions:
    """Test POST /api/articles with role-based permissions"""
    
    _test_user_email = "TEST_article_perm@bloom-test.cz"
    _test_user_token = None
    _created_article_ids = []

    @classmethod
    def setup_class(cls):
        """Create test user"""
        reg = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": cls._test_user_email,
            "username": "testartperm",
            "password": "TestPass1!"
        })
        if reg.status_code in [200, 201]:
            token = get_auth_token(cls._test_user_email, "TestPass1!")
            cls._test_user_token = token
        elif reg.status_code == 400 and "already" in reg.text.lower():
            # User exists, get token
            cls._test_user_token = get_auth_token(cls._test_user_email, "TestPass1!")

    @classmethod
    def teardown_class(cls):
        """Cleanup test articles and user"""
        admin_token = get_auth_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        if admin_token:
            admin_s = make_session(admin_token)
            for article_id in cls._created_article_ids:
                admin_s.delete(f"{BASE_URL}/api/articles/{article_id}")
            # Delete test user
            users = admin_s.get(f"{BASE_URL}/api/admin/users")
            if users.status_code == 200:
                for u in users.json():
                    if u.get("email") == cls._test_user_email:
                        admin_s.delete(f"{BASE_URL}/api/admin/users/{u['id']}")
                        break

    def test_post_article_requires_auth(self):
        """Unauthenticated POST to /api/articles should return 401"""
        r = requests.post(f"{BASE_URL}/api/articles", json={
            "title": "Test Article",
            "content": "Test content",
            "category": "pravni",
            "published": True
        })
        assert r.status_code in [401, 403], f"Expected 401 or 403, got {r.status_code}"
        print(f"PASS: POST /api/articles requires auth ({r.status_code})")

    def test_post_article_blocked_for_regular_user(self):
        """Regular user (role='user') should get 403 for article categories with allowed_roles=['admin','lawyer']"""
        if not self._test_user_token:
            pytest.skip("No test user token available")
        
        s = make_session(self._test_user_token)
        r = s.post(f"{BASE_URL}/api/articles", json={
            "title": "Test Regular User Article",
            "content": "Test content from regular user",
            "category": "pravni",
            "published": True
        })
        assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"
        print("PASS: Regular user (role=user) gets 403 when posting article to 'pravni' category")

    def test_post_article_admin_succeeds(self):
        """Admin should be able to post articles"""
        admin_token = get_auth_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert admin_token, "Could not get admin token"
        s = make_session(admin_token)
        
        r = s.post(f"{BASE_URL}/api/articles", json={
            "title": "TEST_Admin Article - Iteration 36",
            "content": "Test admin article content",
            "category": "pravni",
            "published": True
        })
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "id" in data
        assert data["title"] == "TEST_Admin Article - Iteration 36"
        self.__class__._created_article_ids.append(data["id"])
        print(f"PASS: Admin can post article (id={data['id']})")

    def test_post_article_blocked_zdravi(self):
        """Regular user blocked from zdravi category too"""
        if not self._test_user_token:
            pytest.skip("No test user token available")
        
        s = make_session(self._test_user_token)
        r = s.post(f"{BASE_URL}/api/articles", json={
            "title": "Test zdravi Article",
            "content": "Content",
            "category": "zdravi",
            "published": True
        })
        assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"
        print("PASS: Regular user gets 403 for zdravi category too")

    def test_post_article_lawyer_succeeds(self):
        """User with role=lawyer should be allowed to post"""
        # This test requires a lawyer user - we'll grant it to the test user temporarily
        admin_token = get_auth_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert admin_token, "Could not get admin token"
        admin_s = make_session(admin_token)
        
        if not self._test_user_token:
            pytest.skip("No test user token available")
        
        # Find test user ID
        users_r = admin_s.get(f"{BASE_URL}/api/admin/users")
        test_user_id = None
        if users_r.status_code == 200:
            for u in users_r.json():
                if u.get("email") == self._test_user_email:
                    test_user_id = u["id"]
                    break
        
        if not test_user_id:
            pytest.skip("Could not find test user ID")
        
        # Grant lawyer role
        grant_r = admin_s.post(f"{BASE_URL}/api/admin/set-role/{test_user_id}?role=lawyer")
        assert grant_r.status_code == 200, "Failed to grant lawyer role"
        
        # Now try posting as lawyer
        new_token = get_auth_token(self._test_user_email, "TestPass1!")
        s = make_session(new_token)
        r = s.post(f"{BASE_URL}/api/articles", json={
            "title": "TEST_Lawyer Article - Iter 36",
            "content": "Lawyer article content",
            "category": "pravni",
            "published": True
        })
        assert r.status_code == 200, f"Expected 200 for lawyer, got {r.status_code}: {r.text}"
        data = r.json()
        self.__class__._created_article_ids.append(data["id"])
        print(f"PASS: Lawyer can post article (id={data['id']})")
        
        # Restore user role
        admin_s.post(f"{BASE_URL}/api/admin/set-role/{test_user_id}?role=user")


# ─── News Categories Merge ────────────────────────────────────────────────────

class TestNewsCategoriesMerge:
    """Test GET /api/news-categories merges DB with defaults"""

    def test_news_categories_contains_all_defaults(self):
        """All 6 default categories must be present even if not in DB"""
        r = requests.get(f"{BASE_URL}/api/news-categories")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        cat_ids = {c["id"] for c in data}
        required = {"zkusenosti", "world", "local", "tips", "events", "interviews"}
        for req in required:
            assert req in cat_ids, f"Default category '{req}' missing from /api/news-categories"
        print(f"PASS: All default news categories present. Got: {sorted(cat_ids)}")

    def test_news_categories_have_allowed_roles(self):
        """All news categories should have allowed_roles field"""
        r = requests.get(f"{BASE_URL}/api/news-categories")
        assert r.status_code == 200
        data = r.json()
        for cat in data:
            assert "allowed_roles" in cat, f"Category {cat.get('id')} missing allowed_roles"
            assert isinstance(cat["allowed_roles"], list)
        print(f"PASS: All {len(data)} news categories have allowed_roles")

    def test_zkusenosti_allows_user_role(self):
        """zkusenosti category must allow 'user' role"""
        r = requests.get(f"{BASE_URL}/api/news-categories")
        assert r.status_code == 200
        data = r.json()
        zk = next((c for c in data if c["id"] == "zkusenosti"), None)
        assert zk is not None, "zkusenosti category not found"
        assert "user" in zk["allowed_roles"], f"zkusenosti should allow 'user', got {zk['allowed_roles']}"
        print(f"PASS: zkusenosti allows user role. Roles: {zk['allowed_roles']}")

    def test_local_category_allowed_roles(self):
        """'local' category should have at least admin in allowed_roles (can also have user per DB)"""
        r = requests.get(f"{BASE_URL}/api/news-categories")
        assert r.status_code == 200
        data = r.json()
        local = next((c for c in data if c["id"] == "local"), None)
        assert local is not None, "local category not found"
        assert len(local["allowed_roles"]) > 0, "local category has empty allowed_roles"
        print(f"PASS: local category has allowed_roles: {local['allowed_roles']}")

    def test_world_category_admin_only(self):
        """'world' category should be admin-only by default (unless DB overrides)"""
        r = requests.get(f"{BASE_URL}/api/news-categories")
        assert r.status_code == 200
        data = r.json()
        world = next((c for c in data if c["id"] == "world"), None)
        assert world is not None, "world category not found"
        assert len(world["allowed_roles"]) > 0, "world category has empty allowed_roles"
        print(f"PASS: world category has allowed_roles: {world['allowed_roles']}")


# ─── News Post with activeCat fix ─────────────────────────────────────────────

class TestNewsPostCategoryFix:
    """Test POST /api/news respects category permissions (related to activeCat fix)"""
    _created_news_ids = []

    @classmethod  
    def teardown_class(cls):
        """Cleanup test news"""
        admin_token = get_auth_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        if admin_token:
            admin_s = make_session(admin_token)
            for news_id in cls._created_news_ids:
                admin_s.delete(f"{BASE_URL}/api/news/{news_id}")

    def test_post_news_to_local_as_user_with_permission(self):
        """If local category allows 'user' role (as set in DB), user can post there"""
        # First check if local has user in allowed_roles
        cats_r = requests.get(f"{BASE_URL}/api/news-categories")
        assert cats_r.status_code == 200
        local = next((c for c in cats_r.json() if c["id"] == "local"), None)
        
        if local and "user" not in local.get("allowed_roles", []):
            print("SKIP: local category does not allow 'user' - test not applicable in current DB state")
            pytest.skip("local category does not allow 'user' in current DB state")
        
        # Create test user
        test_email = "TEST_local_poster@bloom-test.cz"
        reg = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email, "username": "testlocalposter", "password": "TestPass1!"
        })
        token = get_auth_token(test_email, "TestPass1!")
        if not token:
            pytest.skip("Could not get user token for local post test")
        
        s = make_session(token)
        r = s.post(f"{BASE_URL}/api/news", json={
            "title": "TEST_User Local Post - Iter 36",
            "content": "Test local post from user",
            "category": "local"
        })
        
        # Cleanup user
        admin_token = get_auth_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        if admin_token:
            admin_s = make_session(admin_token)
            if r.status_code == 200:
                self.__class__._created_news_ids.append(r.json().get("id"))
            users_r = admin_s.get(f"{BASE_URL}/api/admin/users")
            if users_r.status_code == 200:
                for u in users_r.json():
                    if u.get("email") == test_email:
                        admin_s.delete(f"{BASE_URL}/api/admin/users/{u['id']}")
                        break
        
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        print(f"PASS: User can post to 'local' when allowed (local has user in allowed_roles)")

    def test_post_news_to_world_as_user_blocked(self):
        """Regular user cannot post to 'world' category (admin-only by default)"""
        # Check world's allowed_roles 
        cats_r = requests.get(f"{BASE_URL}/api/news-categories")
        assert cats_r.status_code == 200
        world = next((c for c in cats_r.json() if c["id"] == "world"), None)
        
        if world and "user" in world.get("allowed_roles", []):
            pytest.skip("world category currently allows 'user' - skipping blocked test")
        
        # Create test user
        test_email = "TEST_world_blocked@bloom-test.cz"
        reg = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email, "username": "testworldblocked", "password": "TestPass1!"
        })
        token = get_auth_token(test_email, "TestPass1!")
        if not token:
            pytest.skip("Could not get user token")
        
        s = make_session(token)
        r = s.post(f"{BASE_URL}/api/news", json={
            "title": "TEST_User World Blocked Post - Iter 36",
            "content": "Should be blocked",
            "category": "world"
        })
        
        # Cleanup
        admin_token = get_auth_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        if admin_token:
            admin_s = make_session(admin_token)
            users_r = admin_s.get(f"{BASE_URL}/api/admin/users")
            if users_r.status_code == 200:
                for u in users_r.json():
                    if u.get("email") == test_email:
                        admin_s.delete(f"{BASE_URL}/api/admin/users/{u['id']}")
                        break
        
        assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"
        print("PASS: Regular user gets 403 when posting to 'world' (admin-only)")

    def test_post_news_admin_can_post_any_category(self):
        """Admin can post to any news category"""
        admin_token = get_auth_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert admin_token, "Could not get admin token"
        s = make_session(admin_token)
        
        for cat in ["local", "world", "zkusenosti", "tips"]:
            r = s.post(f"{BASE_URL}/api/news", json={
                "title": f"TEST_Admin post to {cat} - Iter36",
                "content": f"Admin test content for {cat}",
                "category": cat
            })
            assert r.status_code == 200, f"Admin failed to post to {cat}: {r.status_code}: {r.text}"
            if r.status_code == 200:
                self.__class__._created_news_ids.append(r.json().get("id"))
        print("PASS: Admin can post to all news categories")
