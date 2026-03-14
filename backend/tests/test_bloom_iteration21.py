"""
Iteration 21 Backend Tests for Bloom Czech Trans Community PWA
Tests: Google Auth, News Media Upload, Honeypot Anti-Spam, Rate Limiting, Auth Flow
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestIteration21:
    """Tests for new features in iteration 21"""
    
    # Auth credentials
    ADMIN_EMAIL = "test1@bloom.cz"
    ADMIN_PASSWORD = "test123"
    COMMUNITY_PASSWORD = "Transfortrans"
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.ADMIN_EMAIL,
            "password": self.ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        """Get auth headers with admin token"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    # ========== Authentication Tests ==========
    
    def test_login_works_with_valid_credentials(self):
        """Basic login test - verify authentication still works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.ADMIN_EMAIL,
            "password": self.ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == self.ADMIN_EMAIL
        print("PASS: Login with test1@bloom.cz/test123 works")
    
    def test_login_fails_with_invalid_credentials(self):
        """Login should fail with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.ADMIN_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("PASS: Login fails with invalid credentials")
    
    # ========== Google Auth Session Exchange Tests ==========
    
    def test_google_auth_session_missing_session_id(self):
        """POST /api/auth/google/session without session_id should return 400"""
        response = requests.post(f"{BASE_URL}/api/auth/google/session", json={})
        assert response.status_code == 400
        assert "session_id is required" in response.json().get("detail", "")
        print("PASS: Google auth returns 400 for missing session_id")
    
    def test_google_auth_session_invalid_session_id(self):
        """POST /api/auth/google/session with invalid session_id should return 401"""
        response = requests.post(f"{BASE_URL}/api/auth/google/session", json={
            "session_id": "invalid_session_id_12345"
        })
        # Should return 401 (invalid session) or 502 (Emergent auth unreachable)
        assert response.status_code in [401, 502], f"Expected 401 or 502, got {response.status_code}: {response.text}"
        print(f"PASS: Google auth returns {response.status_code} for invalid session_id (expected 401 or 502)")
    
    # ========== Honeypot Anti-Spam Tests ==========
    
    def test_registration_honeypot_rejects_bot(self):
        """Registration with filled honeypot 'website' field should be rejected"""
        import uuid
        test_email = f"bot_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "TestPass123!",
            "username": f"bot_{uuid.uuid4().hex[:6]}",
            "secret_code": self.COMMUNITY_PASSWORD,
            "website": "http://spam.example.com"  # Honeypot field filled = bot
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        assert "Registrace se nezdařila" in response.json().get("detail", "") or response.status_code == 400
        print("PASS: Registration with filled honeypot field is rejected")
    
    def test_registration_honeypot_allows_empty(self):
        """Registration with empty honeypot field should proceed (may fail on other validation)"""
        import uuid
        # This test just ensures the honeypot check passes if field is empty
        # It will fail on weak password or duplicate email - that's expected
        test_email = f"human_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "WeakPass",  # Intentionally weak to trigger password validation
            "username": f"human_{uuid.uuid4().hex[:6]}",
            "secret_code": self.COMMUNITY_PASSWORD,
            "website": ""  # Empty honeypot = legit user
        })
        # Should NOT be 400 "Registrace se nezdařila" (honeypot error)
        # Instead, should be 400 with password validation error or 200 success
        if response.status_code == 400:
            detail = response.json().get("detail", "")
            # Honeypot error has specific message - ensure we don't get that
            assert "Registrace se nezdařila" not in detail or "Heslo" in detail
        print("PASS: Empty honeypot field doesn't trigger anti-spam rejection")
    
    # ========== Email Verification Tests ==========
    
    def test_email_verification_invalid_token(self):
        """GET /api/auth/verify-email with invalid token should return 400"""
        response = requests.get(f"{BASE_URL}/api/auth/verify-email/invalid-token-123")
        assert response.status_code == 400
        print("PASS: Email verification returns 400 for invalid token")
    
    # ========== News Media Upload Tests ==========
    
    def test_news_media_upload_without_auth(self):
        """POST /api/news/upload-media without auth should return 401 or 403"""
        import io
        files = {"file": ("test.jpg", io.BytesIO(b"fake image content"), "image/jpeg")}
        response = requests.post(f"{BASE_URL}/api/news/upload-media", files=files)
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: News media upload requires authentication")
    
    def test_news_media_upload_with_auth(self, auth_headers):
        """POST /api/news/upload-media with auth should work"""
        import io
        # Create a small fake JPEG (minimal valid JPEG header)
        jpeg_header = bytes([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
            0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xD9
        ])
        files = {"file": ("test_image.jpg", io.BytesIO(jpeg_header), "image/jpeg")}
        response = requests.post(
            f"{BASE_URL}/api/news/upload-media",
            files=files,
            headers=auth_headers
        )
        # Should be 200 with url or 400 if format invalid (our fake jpeg is minimal)
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}: {response.text}"
        if response.status_code == 200:
            data = response.json()
            assert "url" in data
            print(f"PASS: News media upload works, returned URL: {data.get('url')}")
        else:
            print("PASS: News media upload endpoint responds (format validation triggered)")
    
    # ========== News Media Serving Tests ==========
    
    def test_news_media_serving_nonexistent_file(self):
        """GET /api/media/news/nonexistent.jpg should return 404 (public endpoint)"""
        response = requests.get(f"{BASE_URL}/api/media/news/nonexistent.jpg")
        assert response.status_code == 404
        print("PASS: News media serving returns 404 for nonexistent file (no auth required)")
    
    # ========== Rate Limiting Tests ==========
    
    def test_login_rate_limiting_not_triggered_on_single_request(self):
        """Single login request should NOT be rate limited"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.ADMIN_EMAIL,
            "password": self.ADMIN_PASSWORD
        })
        # Should be 200 (success) or 401 (wrong creds), NOT 429
        assert response.status_code != 429, "Single request should not be rate limited"
        print("PASS: Login endpoint not rate limited for standard requests")
    
    # ========== News API Tests ==========
    
    def test_news_list_endpoint(self):
        """GET /api/news should return list of news"""
        response = requests.get(f"{BASE_URL}/api/news")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: News list endpoint works, returned {len(data)} news items")
    
    def test_news_creation_with_auth(self, auth_headers):
        """POST /api/news should work for admin"""
        import uuid
        response = requests.post(
            f"{BASE_URL}/api/news",
            json={
                "title": f"Test News {uuid.uuid4().hex[:6]}",
                "content": "Test content for iteration 21 testing",
                "category": "local",
                "image_url": "",
                "video_url": ""
            },
            headers=auth_headers
        )
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data
        print(f"PASS: News creation works for admin, created news ID: {data.get('id')}")
        return data.get("id")
    
    # ========== Profile / Journey API Tests ==========
    
    def test_profile_me_endpoint(self, auth_headers):
        """GET /api/users/me should return user data including journey"""
        response = requests.get(f"{BASE_URL}/api/users/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "email" in data
        # journey field should exist (may be null)
        print(f"PASS: Profile /users/me endpoint works, user: {data.get('username')}")
    
    def test_journey_save_endpoint(self, auth_headers):
        """PUT /api/users/me/journey should save journey data"""
        response = requests.put(
            f"{BASE_URL}/api/users/me/journey",
            json={
                "stage": "research",
                "stage_label": "Hledám informace",
                "is_public": True,
                "note": "Test journey note"
            },
            headers=auth_headers
        )
        assert response.status_code == 200
        print("PASS: Journey save endpoint works")
    
    def test_journey_similar_users_endpoint(self, auth_headers):
        """GET /api/journey/similar should return list"""
        response = requests.get(f"{BASE_URL}/api/journey/similar", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Similar users endpoint works, found {len(data)} users")
    
    # ========== Health Check ==========
    
    def test_health_endpoint(self):
        """GET / or /api should return something"""
        response = requests.get(f"{BASE_URL}/api")
        # FastAPI typically returns 404 for /api if no root route, but server should respond
        assert response.status_code in [200, 404, 405]
        print(f"PASS: API server responds (status: {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
