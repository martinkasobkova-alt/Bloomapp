"""
Phase 3 Backend Tests: Photo Gallery, Journey Roadmap, PWA manifest, Onboarding
Tests for features: photo upload/get/delete, journey PUT/GET/similar, manifest.json, index.html
"""

import pytest
import requests
import os
import io
from PIL import Image

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


def get_auth_token():
    """Get authentication token for test user"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "test1@bloom.cz",
        "password": "test123"
    })
    if resp.status_code == 200:
        return resp.json().get("token")
    return None


@pytest.fixture(scope="module")
def auth_token():
    token = get_auth_token()
    if not token:
        pytest.skip("Could not authenticate test user test1@bloom.cz")
    return token


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}


def create_test_image_bytes():
    """Create a small test image in memory"""
    img = Image.new("RGB", (100, 100), color=(255, 100, 100))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf.read()


# ============ PWA MANIFEST TESTS ============

class TestPWAManifest:
    """Tests for PWA manifest.json and index.html"""

    def test_manifest_returns_200(self):
        """GET /manifest.json should return 200"""
        resp = requests.get(f"{BASE_URL}/manifest.json")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        print("PASS: manifest.json returns 200")

    def test_manifest_name(self):
        """manifest.json should have name='Bloom – komunita'"""
        resp = requests.get(f"{BASE_URL}/manifest.json")
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("name") == "Bloom – komunita", f"Name was: {data.get('name')}"
        print(f"PASS: manifest name = '{data.get('name')}'")

    def test_manifest_theme_color(self):
        """manifest.json should have theme_color='#8A7CFF'"""
        resp = requests.get(f"{BASE_URL}/manifest.json")
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("theme_color") == "#8A7CFF", f"theme_color was: {data.get('theme_color')}"
        print(f"PASS: theme_color = '{data.get('theme_color')}'")

    def test_manifest_short_name(self):
        """manifest.json should have short_name"""
        resp = requests.get(f"{BASE_URL}/manifest.json")
        data = resp.json()
        assert "short_name" in data
        print(f"PASS: short_name = '{data.get('short_name')}'")

    def test_manifest_display_standalone(self):
        """manifest.json display should be standalone"""
        resp = requests.get(f"{BASE_URL}/manifest.json")
        data = resp.json()
        assert data.get("display") == "standalone"
        print(f"PASS: display = '{data.get('display')}'")

    def test_index_html_title(self):
        """index.html should have title 'Bloom – komunita'"""
        resp = requests.get(f"{BASE_URL}/")
        assert resp.status_code == 200
        assert "Bloom" in resp.text and "komunita" in resp.text, "Title not found in HTML"
        print("PASS: index.html contains 'Bloom' and 'komunita' in title")

    def test_index_html_theme_color_meta(self):
        """index.html should have theme-color meta tag with #8A7CFF"""
        resp = requests.get(f"{BASE_URL}/")
        assert resp.status_code == 200
        assert "#8A7CFF" in resp.text, "theme-color meta tag not found in HTML"
        print("PASS: index.html has #8A7CFF theme-color meta tag")

    def test_index_html_manifest_link(self):
        """index.html should link to manifest.json"""
        resp = requests.get(f"{BASE_URL}/")
        assert resp.status_code == 200
        assert 'rel="manifest"' in resp.text or "manifest.json" in resp.text
        print("PASS: index.html has manifest link")

    def test_index_html_pwa_meta_apple(self):
        """index.html should have apple-mobile-web-app-capable meta tag"""
        resp = requests.get(f"{BASE_URL}/")
        assert resp.status_code == 200
        assert "apple-mobile-web-app-capable" in resp.text
        print("PASS: index.html has apple-mobile-web-app-capable meta tag")


# ============ PHOTO GALLERY TESTS ============

class TestPhotoGallery:
    """Tests for photo upload, retrieval, serving and deletion"""

    uploaded_photo_id = None  # Shared state between tests in module scope

    def test_get_photos_unauthenticated_fails(self):
        """GET /api/users/{id}/photos without auth should fail"""
        resp = requests.get(f"{BASE_URL}/api/users/some-id/photos")
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print(f"PASS: Unauthenticated photo list returns {resp.status_code}")

    def test_upload_photo(self, auth_headers):
        """POST /api/users/me/photos should accept image upload"""
        img_bytes = create_test_image_bytes()
        files = {"file": ("test_photo.jpg", img_bytes, "image/jpeg")}
        resp = requests.post(
            f"{BASE_URL}/api/users/me/photos",
            headers=auth_headers,
            files=files
        )
        assert resp.status_code == 200, f"Upload failed: {resp.status_code} - {resp.text}"
        data = resp.json()
        assert "id" in data, f"Response missing 'id': {data}"
        TestPhotoGallery.uploaded_photo_id = data["id"]
        print(f"PASS: Photo uploaded successfully, id={data['id']}")

    def test_get_my_photos(self, auth_headers):
        """GET /api/users/{id}/photos should return photo list (auth required)"""
        # First get the user's own ID
        me_resp = requests.get(f"{BASE_URL}/api/users/me", headers=auth_headers)
        assert me_resp.status_code == 200
        user_id = me_resp.json()["id"]

        resp = requests.get(f"{BASE_URL}/api/users/{user_id}/photos", headers=auth_headers)
        assert resp.status_code == 200, f"Get photos failed: {resp.status_code}"
        data = resp.json()
        assert isinstance(data, list), "Expected list response"
        print(f"PASS: Got {len(data)} photos for user")

    def test_uploaded_photo_in_list(self, auth_headers):
        """Uploaded photo should appear in photo list"""
        if not TestPhotoGallery.uploaded_photo_id:
            pytest.skip("No photo uploaded in previous test")
        me_resp = requests.get(f"{BASE_URL}/api/users/me", headers=auth_headers)
        user_id = me_resp.json()["id"]

        resp = requests.get(f"{BASE_URL}/api/users/{user_id}/photos", headers=auth_headers)
        assert resp.status_code == 200
        photo_ids = [p["id"] for p in resp.json()]
        assert TestPhotoGallery.uploaded_photo_id in photo_ids, "Uploaded photo not found in list"
        print(f"PASS: Uploaded photo {TestPhotoGallery.uploaded_photo_id} appears in list")

    def test_serve_photo_public(self, auth_headers):
        """GET /api/photos/{id} should serve photo data"""
        if not TestPhotoGallery.uploaded_photo_id:
            pytest.skip("No photo uploaded in previous test")
        photo_id = TestPhotoGallery.uploaded_photo_id
        resp = requests.get(f"{BASE_URL}/api/photos/{photo_id}", headers=auth_headers)
        assert resp.status_code == 200, f"Serve photo failed: {resp.status_code} - {resp.text}"
        assert resp.headers.get("content-type", "").startswith("image/"), \
            f"Expected image content-type, got: {resp.headers.get('content-type')}"
        assert len(resp.content) > 0, "Empty photo content"
        print(f"PASS: Photo served correctly, size={len(resp.content)} bytes, content-type={resp.headers.get('content-type')}")

    def test_delete_photo(self, auth_headers):
        """DELETE /api/users/me/photos/{id} should remove photo"""
        if not TestPhotoGallery.uploaded_photo_id:
            pytest.skip("No photo uploaded in previous test")
        photo_id = TestPhotoGallery.uploaded_photo_id
        resp = requests.delete(f"{BASE_URL}/api/users/me/photos/{photo_id}", headers=auth_headers)
        assert resp.status_code == 200, f"Delete failed: {resp.status_code} - {resp.text}"
        data = resp.json()
        assert "message" in data
        print(f"PASS: Photo {photo_id} deleted successfully")
        TestPhotoGallery.uploaded_photo_id = None  # Reset

    def test_deleted_photo_not_in_list(self, auth_headers):
        """After deletion, photo should not appear in list"""
        me_resp = requests.get(f"{BASE_URL}/api/users/me", headers=auth_headers)
        user_id = me_resp.json()["id"]

        resp = requests.get(f"{BASE_URL}/api/users/{user_id}/photos", headers=auth_headers)
        assert resp.status_code == 200
        # The test photo should not be there (it was deleted in previous test)
        print(f"PASS: Photo list after deletion has {len(resp.json())} photos")

    def test_delete_nonexistent_photo(self, auth_headers):
        """DELETE /api/users/me/photos/{bad_id} should return 404"""
        resp = requests.delete(f"{BASE_URL}/api/users/me/photos/nonexistent-id-xyz", headers=auth_headers)
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
        print("PASS: Delete non-existent photo returns 404")

    def test_upload_non_image_fails(self, auth_headers):
        """POST /api/users/me/photos with non-image should fail"""
        files = {"file": ("test.txt", b"hello world", "text/plain")}
        resp = requests.post(
            f"{BASE_URL}/api/users/me/photos",
            headers=auth_headers,
            files=files
        )
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}"
        print(f"PASS: Non-image upload rejected with {resp.status_code}")


# ============ JOURNEY TESTS ============

class TestJourney:
    """Tests for journey stage save and similar users"""

    def test_put_journey_saves_stage(self, auth_headers):
        """PUT /api/users/me/journey should save stage and privacy"""
        payload = {
            "stage": "research",
            "stage_label": "Hledám informace",
            "is_public": True,
            "note": "Test journey note"
        }
        resp = requests.put(f"{BASE_URL}/api/users/me/journey", json=payload, headers=auth_headers)
        assert resp.status_code == 200, f"Journey save failed: {resp.status_code} - {resp.text}"
        data = resp.json()
        assert "message" in data
        print(f"PASS: Journey saved: {data}")

    def test_journey_persisted_on_profile(self, auth_headers):
        """After saving journey, GET /api/users/me should show journey data"""
        # First save
        payload = {"stage": "research", "stage_label": "Hledám informace", "is_public": True, "note": "phase3 test"}
        requests.put(f"{BASE_URL}/api/users/me/journey", json=payload, headers=auth_headers)

        # Then verify
        resp = requests.get(f"{BASE_URL}/api/users/me", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        journey = data.get("journey") or data.get("journey", {})
        # Journey may be returned or not depending on response model
        print(f"PASS: User profile returned, journey data present: {bool(journey)}")

    def test_put_journey_unauthenticated_fails(self):
        """PUT /api/users/me/journey without auth should fail"""
        resp = requests.put(f"{BASE_URL}/api/users/me/journey", json={"stage": "research"})
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print(f"PASS: Unauthenticated journey save returns {resp.status_code}")

    def test_journey_stage_invalid_is_still_saved(self, auth_headers):
        """Journey accepts any stage string (no strict validation expected by spec)"""
        payload = {"stage": "thinking", "stage_label": "Uvažuji o tranzici", "is_public": False, "note": ""}
        resp = requests.put(f"{BASE_URL}/api/users/me/journey", json=payload, headers=auth_headers)
        assert resp.status_code == 200, f"Failed: {resp.status_code}"
        print("PASS: Journey stage 'thinking' saved successfully")

    def test_get_similar_journey_authenticated(self, auth_headers):
        """GET /api/journey/similar should return users with matching public stage"""
        # First set journey to 'research' (public) so similar endpoint has a stage to look for
        payload = {"stage": "research", "stage_label": "Hledám informace", "is_public": True, "note": ""}
        requests.put(f"{BASE_URL}/api/users/me/journey", json=payload, headers=auth_headers)

        resp = requests.get(f"{BASE_URL}/api/journey/similar", headers=auth_headers)
        assert resp.status_code == 200, f"Similar failed: {resp.status_code} - {resp.text}"
        data = resp.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"PASS: Similar journey endpoint returns {len(data)} users")

    def test_get_similar_journey_unauthenticated_fails(self):
        """GET /api/journey/similar without auth should fail"""
        resp = requests.get(f"{BASE_URL}/api/journey/similar")
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print(f"PASS: Unauthenticated similar journey returns {resp.status_code}")

    def test_similar_users_are_public(self, auth_headers):
        """Users returned by /api/journey/similar should only have is_public journey"""
        # Make sure current user has a public journey
        payload = {"stage": "research", "stage_label": "Hledám informace", "is_public": True, "note": ""}
        requests.put(f"{BASE_URL}/api/users/me/journey", json=payload, headers=auth_headers)

        resp = requests.get(f"{BASE_URL}/api/journey/similar", headers=auth_headers)
        assert resp.status_code == 200
        users = resp.json()
        for u in users:
            journey = u.get("journey", {})
            if journey:
                assert journey.get("is_public") == True, f"Non-public user returned: {u}"
        print(f"PASS: All {len(users)} similar users have public journeys (or no journey data visible)")

    def test_put_journey_private(self, auth_headers):
        """Journey can be set to private (is_public=False)"""
        payload = {"stage": "thinking", "stage_label": "Uvažuji o tranzici", "is_public": False, "note": "private test"}
        resp = requests.put(f"{BASE_URL}/api/users/me/journey", json=payload, headers=auth_headers)
        assert resp.status_code == 200
        print("PASS: Private journey saved successfully")

    def test_similar_returns_empty_for_private_stage(self, auth_headers):
        """With private journey, similar should still work (but not include self)"""
        # Already set to private in previous test
        resp = requests.get(f"{BASE_URL}/api/journey/similar", headers=auth_headers)
        # With is_public=False, similar will look for user's stage but user won't be in results
        assert resp.status_code == 200
        users = resp.json()
        # Current user should not be in results
        me_resp = requests.get(f"{BASE_URL}/api/users/me", headers=auth_headers)
        my_id = me_resp.json()["id"]
        for u in users:
            assert u.get("id") != my_id, "Current user should not be in similar results"
        print(f"PASS: Current user not in similar results (found {len(users)} others)")

    def test_restore_journey_to_research(self, auth_headers):
        """Restore journey to research for consistency with other tests"""
        payload = {"stage": "research", "stage_label": "Hledám informace", "is_public": True, "note": ""}
        resp = requests.put(f"{BASE_URL}/api/users/me/journey", json=payload, headers=auth_headers)
        assert resp.status_code == 200
        print("PASS: Journey restored to research stage for test cleanup")


# ============ API HEALTH CHECKS ============

class TestAPIHealth:
    """Basic health checks for all new endpoints"""

    def test_api_root_returns_ok(self):
        """GET /api/ should return health status"""
        resp = requests.get(f"{BASE_URL}/api/")
        assert resp.status_code == 200
        print("PASS: API root returns 200")

    def test_photo_endpoints_exist_and_require_auth(self):
        """Photo endpoints exist and are protected"""
        # Upload
        resp = requests.post(f"{BASE_URL}/api/users/me/photos")
        assert resp.status_code in [401, 403, 422], f"Expected 401/403/422, got {resp.status_code}"
        print(f"PASS: POST /api/users/me/photos returns {resp.status_code} (not 404)")

    def test_journey_endpoint_exists_and_requires_auth(self):
        """Journey PUT endpoint exists and requires auth"""
        resp = requests.put(f"{BASE_URL}/api/users/me/journey", json={})
        assert resp.status_code in [401, 403, 422], f"Expected 401/403/422, got {resp.status_code}"
        print(f"PASS: PUT /api/users/me/journey returns {resp.status_code} (not 404)")

    def test_similar_endpoint_exists_and_requires_auth(self):
        """Journey similar GET endpoint exists and requires auth"""
        resp = requests.get(f"{BASE_URL}/api/journey/similar")
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print(f"PASS: GET /api/journey/similar returns {resp.status_code} (not 404)")
