"""
Phase 3 Community Features Backend Tests:
- Photo gallery privacy (public/protected) and gallery settings
- Gallery password verification
- Photo tagging
- Nearby users (GET /api/users/nearby)
- Community stories / News by regular user (zkusenosti category)
- Regular user blocked from non-zkusenosti categories
- Admin can create news for any category
"""

import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ============ AUTH HELPERS ============

def get_token(email, password):
    """Get auth token for a user"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
    if resp.status_code == 200:
        return resp.json().get("token")
    return None


@pytest.fixture(scope="module")
def admin_token():
    token = get_token("test1@bloom.cz", "test123")
    if not token:
        pytest.skip("Admin auth failed")
    return token


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def user_token():
    """Regular user token (storywriter)"""
    token = get_token("storywriter@bloom.cz", "test123")
    if not token:
        pytest.skip("Regular user auth failed - storywriter@bloom.cz / test123")
    return token


@pytest.fixture(scope="module")
def user_headers(user_token):
    return {"Authorization": f"Bearer {user_token}"}


# ============ GALLERY SETTINGS TESTS ============

class TestGallerySettings:
    """Tests for gallery privacy settings: PUT /api/users/me/gallery-settings"""

    def test_gallery_info_unauthenticated_fails(self, admin_headers):
        """GET gallery-info requires auth"""
        # First get admin's user id
        me = requests.get(f"{BASE_URL}/api/users/me", headers=admin_headers)
        user_id = me.json()["id"]

        resp = requests.get(f"{BASE_URL}/api/users/{user_id}/gallery-info")
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print(f"PASS: gallery-info unauthenticated returns {resp.status_code}")

    def test_gallery_info_default_public(self, admin_headers):
        """GET /api/users/{id}/gallery-info returns privacy (default: public)"""
        me = requests.get(f"{BASE_URL}/api/users/me", headers=admin_headers)
        user_id = me.json()["id"]

        resp = requests.get(f"{BASE_URL}/api/users/{user_id}/gallery-info", headers=admin_headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code} - {resp.text}"
        data = resp.json()
        assert "privacy" in data, f"Missing 'privacy' key: {data}"
        assert data["privacy"] in ("public", "protected"), f"Invalid privacy value: {data['privacy']}"
        print(f"PASS: gallery-info returned privacy='{data['privacy']}'")

    def test_set_gallery_to_protected_requires_password(self, admin_headers):
        """PUT /api/users/me/gallery-settings with protected but no password should return 400"""
        resp = requests.put(
            f"{BASE_URL}/api/users/me/gallery-settings",
            json={"privacy": "protected", "password": ""},
            headers=admin_headers
        )
        assert resp.status_code == 400, f"Expected 400 for protected without password, got {resp.status_code}"
        print(f"PASS: Setting protected without password returns 400")

    def test_set_gallery_to_protected_with_password(self, admin_headers):
        """PUT /api/users/me/gallery-settings with protected + password should succeed"""
        resp = requests.put(
            f"{BASE_URL}/api/users/me/gallery-settings",
            json={"privacy": "protected", "password": "Transfortrans"},
            headers=admin_headers
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code} - {resp.text}"
        data = resp.json()
        assert "message" in data, f"Missing message: {data}"
        print(f"PASS: Gallery set to protected with password - {data['message']}")

    def test_gallery_info_shows_protected(self, admin_headers):
        """After setting protected, gallery-info should return 'protected'"""
        me = requests.get(f"{BASE_URL}/api/users/me", headers=admin_headers)
        user_id = me.json()["id"]

        resp = requests.get(f"{BASE_URL}/api/users/{user_id}/gallery-info", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["privacy"] == "protected", f"Expected 'protected', got '{data['privacy']}'"
        print(f"PASS: gallery-info shows 'protected' after settings update")

    def test_set_gallery_invalid_privacy_returns_400(self, admin_headers):
        """PUT with invalid privacy value should return 400"""
        resp = requests.put(
            f"{BASE_URL}/api/users/me/gallery-settings",
            json={"privacy": "secret", "password": ""},
            headers=admin_headers
        )
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
        print(f"PASS: Invalid privacy 'secret' returns 400")

    def test_set_gallery_back_to_public(self, admin_headers):
        """PUT /api/users/me/gallery-settings back to public"""
        resp = requests.put(
            f"{BASE_URL}/api/users/me/gallery-settings",
            json={"privacy": "public", "password": ""},
            headers=admin_headers
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        print(f"PASS: Gallery set back to public")


# ============ GALLERY VERIFY TESTS ============

class TestGalleryVerify:
    """Tests for POST /api/users/{id}/gallery-verify and GET photos with password"""

    regular_user_id = None

    @pytest.fixture(autouse=True)
    def setup_protected_gallery(self, user_headers, admin_headers):
        """Set regular user's gallery to protected before tests"""
        # Set gallery to protected
        r = requests.put(
            f"{BASE_URL}/api/users/me/gallery-settings",
            json={"privacy": "protected", "password": "Transfortrans"},
            headers=user_headers
        )
        if r.status_code != 200:
            pytest.skip(f"Could not set gallery to protected: {r.status_code} - {r.text}")

        # Get user id
        me = requests.get(f"{BASE_URL}/api/users/me", headers=user_headers)
        TestGalleryVerify.regular_user_id = me.json()["id"]
        yield
        # Teardown: set back to public
        requests.put(
            f"{BASE_URL}/api/users/me/gallery-settings",
            json={"privacy": "public"},
            headers=user_headers
        )

    def test_gallery_info_shows_protected_for_regular_user(self, user_headers):
        """gallery-info should show 'protected' for regular user's gallery"""
        user_id = TestGalleryVerify.regular_user_id
        resp = requests.get(f"{BASE_URL}/api/users/{user_id}/gallery-info", headers=user_headers)
        assert resp.status_code == 200
        assert resp.json()["privacy"] == "protected"
        print(f"PASS: Regular user gallery is protected")

    def test_verify_wrong_password_returns_403(self, admin_headers):
        """POST /api/users/{id}/gallery-verify with wrong password should return 403"""
        user_id = TestGalleryVerify.regular_user_id
        resp = requests.post(
            f"{BASE_URL}/api/users/{user_id}/gallery-verify",
            json={"password": "wrongpassword"},
            headers=admin_headers
        )
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code} - {resp.text}"
        print(f"PASS: Wrong password returns 403")

    def test_verify_correct_password_returns_verified(self, admin_headers):
        """POST /api/users/{id}/gallery-verify with correct password should return verified=True"""
        user_id = TestGalleryVerify.regular_user_id
        resp = requests.post(
            f"{BASE_URL}/api/users/{user_id}/gallery-verify",
            json={"password": "Transfortrans"},
            headers=admin_headers
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code} - {resp.text}"
        data = resp.json()
        assert data.get("verified") == True, f"Expected verified=True, got {data}"
        print(f"PASS: Correct password returns verified=True")

    def test_get_protected_photos_without_password_returns_403(self, admin_headers):
        """GET /api/users/{id}/photos for protected gallery without password should return 403"""
        user_id = TestGalleryVerify.regular_user_id
        resp = requests.get(
            f"{BASE_URL}/api/users/{user_id}/photos",
            headers=admin_headers
        )
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code} - {resp.text}"
        print(f"PASS: Protected gallery without password returns 403")

    def test_get_protected_photos_with_correct_password(self, admin_headers):
        """GET /api/users/{id}/photos with correct gallery_password should succeed"""
        user_id = TestGalleryVerify.regular_user_id
        resp = requests.get(
            f"{BASE_URL}/api/users/{user_id}/photos",
            params={"gallery_password": "Transfortrans"},
            headers=admin_headers
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code} - {resp.text}"
        assert isinstance(resp.json(), list), "Expected list of photos"
        print(f"PASS: Protected gallery unlocked with password, got {len(resp.json())} photos")

    def test_owner_can_access_own_protected_gallery(self, user_headers):
        """Owner should access their own protected gallery without password"""
        user_id = TestGalleryVerify.regular_user_id
        resp = requests.get(
            f"{BASE_URL}/api/users/{user_id}/photos",
            headers=user_headers
        )
        assert resp.status_code == 200, f"Owner cannot access own gallery: {resp.status_code}"
        print(f"PASS: Owner can access own protected gallery")


# ============ NEARBY USERS TESTS ============

class TestNearbyUsers:
    """Tests for GET /api/users/nearby"""

    def test_nearby_users_requires_auth(self):
        """GET /api/users/nearby without auth should fail"""
        resp = requests.get(f"{BASE_URL}/api/users/nearby", params={"location": "Praha"})
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print(f"PASS: nearby users unauthenticated returns {resp.status_code}")

    def test_nearby_users_no_location_returns_empty(self, admin_headers):
        """GET /api/users/nearby without location returns empty list"""
        resp = requests.get(f"{BASE_URL}/api/users/nearby", headers=admin_headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        assert resp.json() == [], f"Expected empty list, got {resp.json()}"
        print(f"PASS: nearby users with no location returns empty list")

    def test_nearby_users_praha_returns_users(self, admin_headers):
        """GET /api/users/nearby?location=Praha should return list of users"""
        resp = requests.get(
            f"{BASE_URL}/api/users/nearby",
            params={"location": "Praha"},
            headers=admin_headers
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code} - {resp.text}"
        data = resp.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"PASS: /api/users/nearby?location=Praha returned {len(data)} users")

    def test_nearby_users_response_structure(self, admin_headers):
        """Nearby users should have id, username, avatar fields"""
        resp = requests.get(
            f"{BASE_URL}/api/users/nearby",
            params={"location": "Praha"},
            headers=admin_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        if len(data) > 0:
            user = data[0]
            assert "id" in user, f"Missing 'id' field: {user}"
            assert "username" in user, f"Missing 'username' field: {user}"
            print(f"PASS: Nearby user has id='{user['id']}', username='{user['username']}'")
        else:
            print("INFO: No nearby users found for Praha (may need seeded data)")

    def test_nearby_users_excludes_self(self, admin_headers):
        """Nearby users should not include the current user"""
        me = requests.get(f"{BASE_URL}/api/users/me", headers=admin_headers)
        my_id = me.json()["id"]

        resp = requests.get(
            f"{BASE_URL}/api/users/nearby",
            params={"location": "Praha"},
            headers=admin_headers
        )
        assert resp.status_code == 200
        user_ids = [u["id"] for u in resp.json()]
        assert my_id not in user_ids, "Current user should not appear in nearby results"
        print(f"PASS: Current user not in nearby results")

    def test_nearby_users_different_location(self, admin_headers):
        """Nearby users for a different location"""
        resp = requests.get(
            f"{BASE_URL}/api/users/nearby",
            params={"location": "Jihočeský kraj"},
            headers=admin_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        print(f"PASS: /api/users/nearby?location=Jihočeský kraj returned {len(data)} users")


# ============ COMMUNITY STORY / NEWS TESTS ============

class TestCommunityStories:
    """Tests for community stories creation by regular users"""
    created_story_id = None
    admin_story_id = None

    def test_regular_user_can_create_zkusenosti(self, user_headers):
        """Regular user can POST /api/news with category=zkusenosti"""
        payload = {
            "title": "TEST_ Můj příběh tranzice",
            "content": "Sdílím svůj příběh s komunitou...",
            "category": "zkusenosti",
            "image_url": "",
            "video_url": "",
            "thumbnail_url": ""
        }
        resp = requests.post(f"{BASE_URL}/api/news", json=payload, headers=user_headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code} - {resp.text}"
        data = resp.json()
        assert "id" in data, f"Missing 'id' in response: {data}"
        TestCommunityStories.created_story_id = data["id"]
        print(f"PASS: Regular user created community story id={data['id']}")

    def test_community_story_has_is_community_story_true(self, user_headers):
        """Community story created by regular user should have is_community_story=True"""
        if not TestCommunityStories.created_story_id:
            pytest.skip("No story created")
        resp = requests.get(f"{BASE_URL}/api/news/{TestCommunityStories.created_story_id}", headers=user_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("is_community_story") == True, f"Expected is_community_story=True, got {data.get('is_community_story')}"
        print(f"PASS: Story has is_community_story=True")

    def test_community_story_author_name_set(self, user_headers):
        """Community story should have author_name set"""
        if not TestCommunityStories.created_story_id:
            pytest.skip("No story created")
        resp = requests.get(f"{BASE_URL}/api/news/{TestCommunityStories.created_story_id}", headers=user_headers)
        data = resp.json()
        assert data.get("author_name"), f"author_name should be set: {data}"
        print(f"PASS: author_name='{data.get('author_name')}'")

    def test_community_story_with_video_url(self, user_headers):
        """Regular user can create zkusenosti story with video_url"""
        payload = {
            "title": "TEST_ Příběh s videem",
            "content": "Příběh s video odkazem",
            "category": "zkusenosti",
            "video_url": "https://example.com/video.mp4",
            "image_url": ""
        }
        resp = requests.post(f"{BASE_URL}/api/news", json=payload, headers=user_headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code} - {resp.text}"
        data = resp.json()
        assert data.get("video_url") == "https://example.com/video.mp4", f"video_url mismatch: {data}"
        print(f"PASS: Story with video_url created, id={data['id']}")
        # Cleanup
        requests.delete(f"{BASE_URL}/api/news/{data['id']}", headers=user_headers)

    def test_regular_user_blocked_from_world_category(self, user_headers):
        """Regular user cannot POST news with category=world (non-zkusenosti)"""
        payload = {
            "title": "TEST_ World News Article",
            "content": "This should be blocked",
            "category": "world"
        }
        resp = requests.post(f"{BASE_URL}/api/news", json=payload, headers=user_headers)
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code} - {resp.text}"
        print(f"PASS: Regular user blocked from 'world' category (returned {resp.status_code})")

    def test_regular_user_blocked_from_local_category(self, user_headers):
        """Regular user cannot POST news with category=local"""
        payload = {
            "title": "TEST_ Local News Article",
            "content": "This should be blocked",
            "category": "local"
        }
        resp = requests.post(f"{BASE_URL}/api/news", json=payload, headers=user_headers)
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code} - {resp.text}"
        print(f"PASS: Regular user blocked from 'local' category (returned {resp.status_code})")

    def test_admin_can_create_world_news(self, admin_headers):
        """Admin can POST news with category=world"""
        payload = {
            "title": "TEST_ Admin World News",
            "content": "Admin can post this",
            "category": "world"
        }
        resp = requests.post(f"{BASE_URL}/api/news", json=payload, headers=admin_headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code} - {resp.text}"
        data = resp.json()
        TestCommunityStories.admin_story_id = data["id"]
        # Admin news is NOT a community story
        assert data.get("is_community_story") == False, f"Admin news should not be community story: {data}"
        print(f"PASS: Admin created world news id={data['id']}, is_community_story=False")

    def test_admin_can_create_zkusenosti(self, admin_headers):
        """Admin can also POST news with category=zkusenosti but it's NOT marked as community story"""
        payload = {
            "title": "TEST_ Admin Zkusenosti",
            "content": "Admin posting in zkusenosti",
            "category": "zkusenosti"
        }
        resp = requests.post(f"{BASE_URL}/api/news", json=payload, headers=admin_headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        # Admin posting zkusenosti should NOT have is_community_story=True (they are admin)
        assert data.get("is_community_story") == False, f"Admin post should not be community story: {data.get('is_community_story')}"
        print(f"PASS: Admin zkusenosti post has is_community_story=False")
        # Cleanup
        requests.delete(f"{BASE_URL}/api/news/{data['id']}", headers=admin_headers)

    def test_news_list_contains_community_story(self, user_headers):
        """GET /api/news should include the community story"""
        if not TestCommunityStories.created_story_id:
            pytest.skip("No story created")
        resp = requests.get(f"{BASE_URL}/api/news", headers=user_headers)
        assert resp.status_code == 200
        ids = [n["id"] for n in resp.json()]
        assert TestCommunityStories.created_story_id in ids, "Community story not in news list"
        print(f"PASS: Community story appears in news list")

    def test_cleanup_test_stories(self, admin_headers, user_headers):
        """Cleanup TEST_ prefixed stories"""
        # Delete community story
        if TestCommunityStories.created_story_id:
            resp = requests.delete(f"{BASE_URL}/api/news/{TestCommunityStories.created_story_id}", headers=admin_headers)
            print(f"Cleanup community story: {resp.status_code}")
        # Delete admin story
        if TestCommunityStories.admin_story_id:
            resp = requests.delete(f"{BASE_URL}/api/news/{TestCommunityStories.admin_story_id}", headers=admin_headers)
            print(f"Cleanup admin story: {resp.status_code}")
        print("PASS: Cleanup complete")
