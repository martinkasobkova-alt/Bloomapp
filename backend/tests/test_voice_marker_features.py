"""
Backend tests for:
- Voice message upload (audio/webm MIME type support)
- Marker colors API with 'featured' key
- Upload media endpoint supports all audio types
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

EMAIL = "test1@bloom.cz"
PASSWORD = "test123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for test user."""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
    if resp.status_code == 200:
        return resp.json().get("token")
    pytest.skip(f"Login failed ({resp.status_code}): {resp.text}")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Return auth headers."""
    return {"Authorization": f"Bearer {auth_token}"}


class TestMarkerColorsWithFeatured:
    """GET /api/settings/marker-colors must return 'featured' key"""

    def test_get_marker_colors_returns_200(self):
        resp = requests.get(f"{BASE_URL}/api/settings/marker-colors")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

    def test_get_marker_colors_returns_dict(self):
        resp = requests.get(f"{BASE_URL}/api/settings/marker-colors")
        data = resp.json()
        assert isinstance(data, dict), f"Expected dict, got {type(data)}"

    def test_marker_colors_has_featured_key(self):
        """The 'featured' key must be present in marker colors defaults."""
        resp = requests.get(f"{BASE_URL}/api/settings/marker-colors")
        data = resp.json()
        assert "featured" in data, f"'featured' key not found. Keys present: {list(data.keys())}"

    def test_marker_colors_featured_is_valid_hex(self):
        """The 'featured' color value must be a valid hex string."""
        resp = requests.get(f"{BASE_URL}/api/settings/marker-colors")
        data = resp.json()
        featured_color = data.get("featured", "")
        assert featured_color.startswith("#"), f"'featured' color should start with '#', got: {featured_color}"
        assert len(featured_color) in [4, 7], f"'featured' color length should be 4 or 7, got: {len(featured_color)}"

    def test_marker_colors_has_all_10_keys(self):
        """Marker colors should have 10 keys including new 'featured' key."""
        expected_keys = {"legal", "news", "community", "support", "specialists", "nearby", "messages", "profile", "featured", "default"}
        resp = requests.get(f"{BASE_URL}/api/settings/marker-colors")
        data = resp.json()
        for k in expected_keys:
            assert k in data, f"Missing key '{k}' in marker colors. Present: {list(data.keys())}"

    def test_all_marker_colors_are_valid_hex(self):
        """All color values should be valid hex strings."""
        resp = requests.get(f"{BASE_URL}/api/settings/marker-colors")
        data = resp.json()
        for key, value in data.items():
            assert isinstance(value, str), f"Color '{key}' should be str, got {type(value)}"
            assert value.startswith("#"), f"Color '{key}' should start with '#', got: {value}"


class TestAudioMediaUpload:
    """POST /api/messages/upload-media should accept audio MIME types"""

    def test_upload_audio_webm_accepted(self, auth_headers):
        """audio/webm should be accepted by upload-media endpoint."""
        # Create a minimal fake audio/webm blob (just enough bytes)
        fake_audio = b'\x1a\x45\xdf\xa3' + b'\x00' * 100  # WebM magic bytes
        files = {'file': ('voice.webm', io.BytesIO(fake_audio), 'audio/webm')}
        resp = requests.post(f"{BASE_URL}/api/messages/upload-media", files=files, headers=auth_headers)
        # Should NOT return 400 (unsupported format)
        assert resp.status_code != 400 or "Nepodporovaný" not in resp.text, \
            f"audio/webm was rejected as unsupported format: {resp.text}"
        assert resp.status_code == 200, f"Expected 200 for audio/webm upload, got {resp.status_code}: {resp.text}"

    def test_upload_audio_webm_returns_audio_media_type(self, auth_headers):
        """Uploading audio/webm should return media_type='audio'."""
        fake_audio = b'\x1a\x45\xdf\xa3' + b'\x00' * 100
        files = {'file': ('voice.webm', io.BytesIO(fake_audio), 'audio/webm')}
        resp = requests.post(f"{BASE_URL}/api/messages/upload-media", files=files, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("media_type") == "audio", f"Expected media_type='audio', got: {data.get('media_type')}"

    def test_upload_audio_webm_returns_url(self, auth_headers):
        """Upload response should contain a valid URL."""
        fake_audio = b'\x1a\x45\xdf\xa3' + b'\x00' * 100
        files = {'file': ('voice.webm', io.BytesIO(fake_audio), 'audio/webm')}
        resp = requests.post(f"{BASE_URL}/api/messages/upload-media", files=files, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "url" in data, f"Response should contain 'url'. Got: {data}"
        assert data["url"].startswith("/api/media/messages/"), f"URL should start with /api/media/messages/, got: {data['url']}"

    def test_upload_audio_mp4_accepted(self, auth_headers):
        """audio/mp4 should also be accepted."""
        fake_audio = b'\x00\x00\x00\x20\x66\x74\x79\x70' + b'\x00' * 100  # mp4 magic
        files = {'file': ('voice.m4a', io.BytesIO(fake_audio), 'audio/mp4')}
        resp = requests.post(f"{BASE_URL}/api/messages/upload-media", files=files, headers=auth_headers)
        assert resp.status_code == 200, f"Expected 200 for audio/mp4, got {resp.status_code}: {resp.text}"

    def test_upload_audio_ogg_accepted(self, auth_headers):
        """audio/ogg should be accepted."""
        fake_audio = b'OggS' + b'\x00' * 100  # OGG magic
        files = {'file': ('voice.ogg', io.BytesIO(fake_audio), 'audio/ogg')}
        resp = requests.post(f"{BASE_URL}/api/messages/upload-media", files=files, headers=auth_headers)
        assert resp.status_code == 200, f"Expected 200 for audio/ogg, got {resp.status_code}: {resp.text}"

    def test_upload_unsupported_type_rejected(self, auth_headers):
        """Unsupported MIME type should return 400."""
        files = {'file': ('test.exe', io.BytesIO(b'\x00' * 50), 'application/octet-stream')}
        resp = requests.post(f"{BASE_URL}/api/messages/upload-media", files=files, headers=auth_headers)
        assert resp.status_code == 400, f"Expected 400 for unsupported type, got {resp.status_code}"

    def test_upload_requires_auth(self):
        """Upload endpoint should require authentication."""
        files = {'file': ('voice.webm', io.BytesIO(b'\x00' * 50), 'audio/webm')}
        resp = requests.post(f"{BASE_URL}/api/messages/upload-media", files=files)
        assert resp.status_code in [401, 403], f"Expected 401/403 without auth, got {resp.status_code}"


class TestMarkerColorsAdminUpdate:
    """Admin can update marker colors including 'featured' key"""

    def test_put_marker_colors_without_auth_rejected(self):
        """PUT marker colors should require admin auth."""
        resp = requests.put(f"{BASE_URL}/api/admin/settings/marker-colors", json={"featured": "#FF0000"})
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"

    def test_put_marker_colors_with_auth_succeeds(self, auth_headers):
        """Admin can update marker colors including 'featured'."""
        # First get current colors
        get_resp = requests.get(f"{BASE_URL}/api/settings/marker-colors")
        current_colors = get_resp.json()
        
        # Update with all 10 keys including featured
        new_colors = {**current_colors, "featured": "#F5A9B8"}
        put_resp = requests.put(f"{BASE_URL}/api/admin/settings/marker-colors", json=new_colors, headers=auth_headers)
        assert put_resp.status_code == 200, f"Expected 200, got {put_resp.status_code}: {put_resp.text}"

    def test_featured_color_persisted_after_update(self, auth_headers):
        """After updating featured color, GET should return the new value."""
        test_color = "#FF69B4"  # Hot pink
        get_resp = requests.get(f"{BASE_URL}/api/settings/marker-colors")
        current_colors = get_resp.json()
        
        updated_colors = {**current_colors, "featured": test_color}
        requests.put(f"{BASE_URL}/api/admin/settings/marker-colors", json=updated_colors, headers=auth_headers)
        
        verify_resp = requests.get(f"{BASE_URL}/api/settings/marker-colors")
        verify_data = verify_resp.json()
        assert verify_data.get("featured") == test_color, \
            f"Featured color not persisted. Expected {test_color}, got {verify_data.get('featured')}"
        
        # Restore to original
        requests.put(f"{BASE_URL}/api/admin/settings/marker-colors", json=current_colors, headers=auth_headers)
