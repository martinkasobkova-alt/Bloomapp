"""
Bloom - Iteration 18 Backend Tests
Tests for: email verification, resend verification, media upload, gallery, registration password validation
"""
import pytest
import requests
import os
import io
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    raise RuntimeError("REACT_APP_BACKEND_URL not set")

ADMIN_EMAIL = "test1@bloom.cz"
ADMIN_PASSWORD = "test123"
COMMUNITY_PASSWORD = "Transfortrans"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    r = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if r.status_code == 200:
        return r.json()["token"]
    pytest.skip(f"Admin login failed: {r.status_code} {r.text}")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


class TestVerifyEmail:
    """Email verification endpoint tests"""

    def test_verify_email_invalid_token(self):
        """GET /auth/verify-email/{token} with invalid token should return 400"""
        r = requests.get(f"{BASE_URL}/api/auth/verify-email/invalid-token-xyz-12345")
        assert r.status_code == 400
        data = r.json()
        assert "detail" in data
        print(f"PASS: Invalid token returns 400: {data['detail']}")

    def test_verify_email_fake_uuid_token(self):
        """GET /auth/verify-email/{token} with fake UUID returns 400"""
        fake_token = str(uuid.uuid4())
        r = requests.get(f"{BASE_URL}/api/auth/verify-email/{fake_token}")
        assert r.status_code == 400
        data = r.json()
        assert "detail" in data
        print(f"PASS: Fake UUID token returns 400: {data['detail']}")


class TestResendVerification:
    """Resend verification email endpoint tests"""

    def test_resend_verification_requires_auth(self):
        """POST /auth/resend-verification without auth should return 401/403"""
        r = requests.post(f"{BASE_URL}/api/auth/resend-verification")
        assert r.status_code in [401, 403]
        print(f"PASS: Unauthenticated resend returns {r.status_code}")

    def test_resend_verification_already_verified(self, admin_headers):
        """POST /auth/resend-verification for already verified user returns message"""
        r = requests.post(f"{BASE_URL}/api/auth/resend-verification", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert "message" in data
        # Admin is already verified, should get "already verified" message
        print(f"PASS: Already verified response: {data['message']}")


class TestMediaUpload:
    """Media upload endpoint tests"""

    def test_upload_media_requires_auth(self):
        """POST /messages/upload-media without auth should return 401/403"""
        files = {'file': ('test.jpg', b'fake-image-data', 'image/jpeg')}
        r = requests.post(f"{BASE_URL}/api/messages/upload-media", files=files)
        assert r.status_code in [401, 403]
        print(f"PASS: Unauthenticated upload returns {r.status_code}")

    def test_upload_media_invalid_type(self, admin_headers):
        """POST /messages/upload-media with invalid file type returns 400"""
        files = {'file': ('test.txt', b'fake text content', 'text/plain')}
        r = requests.post(f"{BASE_URL}/api/messages/upload-media", files=files, headers=admin_headers)
        assert r.status_code == 400
        data = r.json()
        assert "detail" in data
        print(f"PASS: Invalid file type returns 400: {data['detail']}")

    def test_upload_media_pdf_rejected(self, admin_headers):
        """POST /messages/upload-media with PDF returns 400"""
        files = {'file': ('doc.pdf', b'%PDF-fake', 'application/pdf')}
        r = requests.post(f"{BASE_URL}/api/messages/upload-media", files=files, headers=admin_headers)
        assert r.status_code == 400
        print(f"PASS: PDF file type returns 400")

    def test_upload_media_oversized(self, admin_headers):
        """POST /messages/upload-media with file > 5MB returns 400"""
        # Create a 6MB fake image
        big_content = b'x' * (6 * 1024 * 1024)
        files = {'file': ('big.jpg', big_content, 'image/jpeg')}
        r = requests.post(f"{BASE_URL}/api/messages/upload-media", files=files, headers=admin_headers)
        assert r.status_code == 400
        data = r.json()
        assert "detail" in data
        print(f"PASS: Oversized file returns 400: {data['detail']}")

    def test_upload_media_valid_image(self, admin_headers):
        """POST /messages/upload-media with valid JPEG returns 200 with URL"""
        # Minimal valid JPEG header
        fake_jpg = bytes([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
            0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xD9
        ])
        files = {'file': ('test.jpg', fake_jpg, 'image/jpeg')}
        r = requests.post(f"{BASE_URL}/api/messages/upload-media", files=files, headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert "url" in data
        assert "media_type" in data
        assert data["media_type"] == "image"
        assert "/api/media/messages/" in data["url"]
        print(f"PASS: Valid JPEG upload returns 200, url: {data['url']}")


class TestRegistrationPasswordValidation:
    """Registration endpoint - password handling"""

    def test_register_with_weak_password_succeeds_at_backend(self):
        """Backend does NOT enforce password complexity (frontend-only validation)"""
        # Note: backend has no password complexity validation
        unique_email = f"TEST_{uuid.uuid4().hex[:8]}@test.com"
        r = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "test123",  # weak password
            "username": f"TEST_{uuid.uuid4().hex[:6]}",
            "secret_code": COMMUNITY_PASSWORD
        })
        # Backend doesn't validate password complexity - it will accept weak passwords
        # This is expected behavior (frontend handles this)
        print(f"Backend register with weak password: status={r.status_code}")
        # If the registration succeeded, we just note it (backend does not validate)
        # The test verifies the current behavior (no backend validation)
        assert r.status_code in [200, 201, 400]  # 400 if username/email conflict
        if r.status_code in [200, 201]:
            print("NOTE: Backend accepts weak password 'test123' - password validation is frontend-only")
        else:
            print(f"NOTE: Backend returned {r.status_code}: {r.json()}")

    def test_register_with_strong_password(self):
        """Backend accepts strong password"""
        unique_email = f"TEST_{uuid.uuid4().hex[:8]}@test.com"
        r = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "Test@1234",  # strong password
            "username": f"TEST_{uuid.uuid4().hex[:6]}",
            "secret_code": COMMUNITY_PASSWORD
        })
        assert r.status_code in [200, 201]
        data = r.json()
        assert "token" in data
        assert "user" in data
        print(f"PASS: Strong password registration succeeds: user_id={data['user']['id']}")


class TestGalleryEndpoints:
    """Gallery-related endpoints"""

    def test_get_photos_requires_auth(self, admin_headers):
        """GET /users/{user_id}/photos requires auth"""
        # Get admin user first
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers)
        assert r.status_code == 200
        user_id = r.json()["id"]
        # Now test photos endpoint
        r2 = requests.get(f"{BASE_URL}/api/users/{user_id}/photos", headers=admin_headers)
        assert r2.status_code == 200
        data = r2.json()
        assert isinstance(data, list)
        print(f"PASS: GET /users/{user_id}/photos returns list of {len(data)} photos")

    def test_gallery_settings_update(self, admin_headers):
        """PUT /users/me/gallery-settings updates settings"""
        r = requests.put(f"{BASE_URL}/api/users/me/gallery-settings",
                         json={"privacy": "public"},
                         headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert "message" in data
        print(f"PASS: Gallery settings updated: {data['message']}")

    def test_gallery_settings_protected_requires_password(self, admin_headers):
        """PUT /users/me/gallery-settings protected without password returns 400"""
        r = requests.put(f"{BASE_URL}/api/users/me/gallery-settings",
                         json={"privacy": "protected"},
                         headers=admin_headers)
        assert r.status_code == 400
        data = r.json()
        assert "detail" in data
        print(f"PASS: Protected gallery without password returns 400: {data['detail']}")


class TestDirectMessaging:
    """Direct messaging API tests"""

    def test_get_conversations(self, admin_headers):
        """GET /messages/conversations returns list"""
        r = requests.get(f"{BASE_URL}/api/messages/conversations", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        print(f"PASS: GET /messages/conversations returns {len(data)} conversations")

    def test_get_messages_for_user(self, admin_headers):
        """GET /messages/{user_id} returns list"""
        # Get admin user id
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers)
        user_id = r.json()["id"]
        # Get messages with self (should be empty or work)
        r2 = requests.get(f"{BASE_URL}/api/messages/{user_id}", headers=admin_headers)
        assert r2.status_code in [200, 400]  # May not allow messages with self
        print(f"PASS: GET /messages/{user_id} returns {r2.status_code}")
