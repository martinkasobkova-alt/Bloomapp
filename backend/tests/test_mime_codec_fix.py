"""
Backend tests for MIME type codec suffix fix (iteration 49):
- /api/messages/upload-media accepts audio/webm;codecs=opus (codec suffix)
- /api/messages/upload-media accepts audio/webm (clean mime)
- /api/messages/upload-media accepts audio/mp4;codecs=mp4a variants (Safari)
- /api/messages/upload-media accepts audio/ogg
- /api/messages/upload-media rejects text/plain → 400
- Regression: image upload still works
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
    """Get auth token."""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": EMAIL, "password": PASSWORD})
    if resp.status_code == 200:
        return resp.json().get("token")
    pytest.skip(f"Login failed ({resp.status_code}): {resp.text}")


@pytest.fixture(scope="module")
def headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}


def _fake_audio_file(filename="voice.webm", mime="audio/webm"):
    """Create a minimal fake audio file for upload."""
    # Small fake bytes simulating a binary audio blob
    fake_bytes = b'\x1a\x45\xdf\xa3' + b'\x00' * 200  # WebM-like header
    return ("file", (filename, io.BytesIO(fake_bytes), mime))


class TestAudioMimeCodecSuffix:
    """Critical tests: MIME type with codec suffix must be accepted."""

    def test_audio_webm_with_codec_suffix_returns_200(self, headers):
        """THE MAIN BUG FIX: audio/webm;codecs=opus (Chrome MediaRecorder) must return 200."""
        files = {"file": ("voice.webm", io.BytesIO(b'\x1a\x45\xdf\xa3' + b'\x00' * 200), "audio/webm;codecs=opus")}
        resp = requests.post(f"{BASE_URL}/api/messages/upload-media", files=files, headers=headers)
        assert resp.status_code == 200, (
            f"FAIL: audio/webm;codecs=opus returned {resp.status_code} (expected 200). "
            f"Response: {resp.text}. This was the root cause bug - codec suffix rejection."
        )

    def test_audio_webm_codec_suffix_returns_audio_media_type(self, headers):
        """Response must have media_type='audio' for codec-suffixed MIME."""
        files = {"file": ("voice.webm", io.BytesIO(b'\x1a\x45\xdf\xa3' + b'\x00' * 200), "audio/webm;codecs=opus")}
        resp = requests.post(f"{BASE_URL}/api/messages/upload-media", files=files, headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("media_type") == "audio", f"Expected media_type='audio', got: {data}"

    def test_audio_webm_codec_suffix_returns_valid_url(self, headers):
        """Response must have a valid URL."""
        files = {"file": ("voice.webm", io.BytesIO(b'\x1a\x45\xdf\xa3' + b'\x00' * 200), "audio/webm;codecs=opus")}
        resp = requests.post(f"{BASE_URL}/api/messages/upload-media", files=files, headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "url" in data, f"Missing 'url' in response: {data}"
        assert data["url"].startswith("/api/media/"), f"URL should start with /api/media/, got: {data['url']}"

    def test_audio_webm_clean_mime_returns_200(self, headers):
        """audio/webm (no suffix) must also work."""
        files = {"file": ("voice.webm", io.BytesIO(b'\x1a\x45\xdf\xa3' + b'\x00' * 200), "audio/webm")}
        resp = requests.post(f"{BASE_URL}/api/messages/upload-media", files=files, headers=headers)
        assert resp.status_code == 200, f"audio/webm returned {resp.status_code}: {resp.text}"

    def test_audio_mp4_with_codec_suffix_returns_200(self, headers):
        """audio/mp4;codecs=mp4a.40.2 (Safari) must return 200 after stripping codec suffix."""
        files = {"file": ("voice.m4a", io.BytesIO(b'\x00\x00\x00\x20ftyp' + b'\x00' * 200), "audio/mp4;codecs=mp4a.40.2")}
        resp = requests.post(f"{BASE_URL}/api/messages/upload-media", files=files, headers=headers)
        assert resp.status_code == 200, (
            f"audio/mp4;codecs=mp4a.40.2 returned {resp.status_code}: {resp.text}"
        )

    def test_audio_mp4_simple_codec_suffix_returns_200(self, headers):
        """audio/mp4;codecs=mp4a (short suffix) must also return 200."""
        files = {"file": ("voice.m4a", io.BytesIO(b'\x00\x00\x00\x20ftyp' + b'\x00' * 200), "audio/mp4;codecs=mp4a")}
        resp = requests.post(f"{BASE_URL}/api/messages/upload-media", files=files, headers=headers)
        assert resp.status_code == 200, f"audio/mp4;codecs=mp4a returned {resp.status_code}: {resp.text}"

    def test_audio_ogg_returns_200(self, headers):
        """audio/ogg must still be accepted."""
        files = {"file": ("voice.ogg", io.BytesIO(b'OggS' + b'\x00' * 200), "audio/ogg")}
        resp = requests.post(f"{BASE_URL}/api/messages/upload-media", files=files, headers=headers)
        assert resp.status_code == 200, f"audio/ogg returned {resp.status_code}: {resp.text}"

    def test_audio_ogg_with_codec_suffix_returns_200(self, headers):
        """audio/ogg;codecs=opus must also be accepted after stripping."""
        files = {"file": ("voice.ogg", io.BytesIO(b'OggS' + b'\x00' * 200), "audio/ogg;codecs=opus")}
        resp = requests.post(f"{BASE_URL}/api/messages/upload-media", files=files, headers=headers)
        assert resp.status_code == 200, f"audio/ogg;codecs=opus returned {resp.status_code}: {resp.text}"

    def test_audio_mpeg_returns_200(self, headers):
        """audio/mpeg (MP3) must be accepted."""
        files = {"file": ("voice.mp3", io.BytesIO(b'\xff\xfb' + b'\x00' * 200), "audio/mpeg")}
        resp = requests.post(f"{BASE_URL}/api/messages/upload-media", files=files, headers=headers)
        assert resp.status_code == 200, f"audio/mpeg returned {resp.status_code}: {resp.text}"


class TestInvalidMimeRejection:
    """Invalid MIME types must still be rejected → 400."""

    def test_text_plain_returns_400(self, headers):
        """text/plain must be rejected with 400."""
        files = {"file": ("test.txt", io.BytesIO(b'hello world'), "text/plain")}
        resp = requests.post(f"{BASE_URL}/api/messages/upload-media", files=files, headers=headers)
        assert resp.status_code == 400, f"Expected 400 for text/plain, got {resp.status_code}: {resp.text}"

    def test_text_html_returns_400(self, headers):
        """text/html must be rejected with 400."""
        files = {"file": ("test.html", io.BytesIO(b'<html></html>'), "text/html")}
        resp = requests.post(f"{BASE_URL}/api/messages/upload-media", files=files, headers=headers)
        assert resp.status_code == 400, f"Expected 400 for text/html, got {resp.status_code}: {resp.text}"

    def test_application_json_returns_400(self, headers):
        """application/json must be rejected with 400."""
        files = {"file": ("test.json", io.BytesIO(b'{}'), "application/json")}
        resp = requests.post(f"{BASE_URL}/api/messages/upload-media", files=files, headers=headers)
        assert resp.status_code == 400, f"Expected 400 for application/json, got {resp.status_code}: {resp.text}"

    def test_unauthenticated_returns_401_or_403(self):
        """Request without auth token must return 401 or 403 (FastAPI HTTPBearer returns 403 by default)."""
        files = {"file": ("voice.webm", io.BytesIO(b'\x1a\x45\xdf\xa3' + b'\x00' * 200), "audio/webm")}
        resp = requests.post(f"{BASE_URL}/api/messages/upload-media", files=files)
        assert resp.status_code in (401, 403), f"Expected 401/403 without auth, got {resp.status_code}: {resp.text}"


class TestImageUploadRegression:
    """Regression: image upload must still work (no Content-Type override issue)."""

    def test_image_jpeg_returns_200(self, headers):
        """image/jpeg must still be accepted."""
        # Minimal JPEG header
        jpeg_bytes = b'\xff\xd8\xff\xe0' + b'\x00' * 200
        files = {"file": ("photo.jpg", io.BytesIO(jpeg_bytes), "image/jpeg")}
        resp = requests.post(f"{BASE_URL}/api/messages/upload-media", files=files, headers=headers)
        assert resp.status_code == 200, f"image/jpeg returned {resp.status_code}: {resp.text}"

    def test_image_jpeg_returns_image_media_type(self, headers):
        """image/jpeg response must have media_type='image'."""
        jpeg_bytes = b'\xff\xd8\xff\xe0' + b'\x00' * 200
        files = {"file": ("photo.jpg", io.BytesIO(jpeg_bytes), "image/jpeg")}
        resp = requests.post(f"{BASE_URL}/api/messages/upload-media", files=files, headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("media_type") == "image", f"Expected media_type='image', got: {data}"

    def test_image_png_returns_200(self, headers):
        """image/png must still be accepted."""
        png_bytes = b'\x89PNG\r\n\x1a\n' + b'\x00' * 200
        files = {"file": ("photo.png", io.BytesIO(png_bytes), "image/png")}
        resp = requests.post(f"{BASE_URL}/api/messages/upload-media", files=files, headers=headers)
        assert resp.status_code == 200, f"image/png returned {resp.status_code}: {resp.text}"


class TestErrorMessageContainsMimeType:
    """Error response must include the actual MIME type for debugging."""

    def test_error_message_includes_actual_ct(self, headers):
        """400 error detail must include the stripped MIME type value."""
        files = {"file": ("test.txt", io.BytesIO(b'hello'), "text/plain")}
        resp = requests.post(f"{BASE_URL}/api/messages/upload-media", files=files, headers=headers)
        assert resp.status_code == 400
        data = resp.json()
        detail = data.get("detail", "")
        assert "text/plain" in detail, (
            f"Error message should include actual MIME type 'text/plain' for debugging. Got: '{detail}'"
        )
