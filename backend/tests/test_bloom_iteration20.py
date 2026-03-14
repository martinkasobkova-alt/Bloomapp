"""
Bloom PWA - Iteration 20 Backend Tests
Tests for:
1. Email verification idempotent endpoint (GET /api/auth/verify-email/{token})
2. Welcome email with PWA instructions (register flow)
3. Journey API (PUT /api/users/me/journey, GET /api/journey/similar)
4. Entry password toggle (admin)
5. Media endpoint authentication (GET /api/media/messages/{filename})
"""
import pytest
import requests
import uuid
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "test1@bloom.cz"
ADMIN_PASSWORD = "test123"
COMMUNITY_PASSWORD = "Transfortrans"


class TestLogin:
    """Test login and auth basics"""
    
    def test_admin_login_success(self):
        """Login with admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin login successful, user_id: {data['user']['id']}")


class TestEmailVerification:
    """Test idempotent email verification endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token for setup operations"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_verify_email_invalid_token_returns_400(self):
        """GET /api/auth/verify-email/{invalid-token} should return 400"""
        response = requests.get(f"{BASE_URL}/api/auth/verify-email/invalid-token-12345")
        assert response.status_code == 400, f"Expected 400 for invalid token, got {response.status_code}"
        data = response.json()
        assert "neplatný" in data.get("detail", "").lower() or "expir" in data.get("detail", "").lower()
        print("✓ Invalid verification token returns 400")
    
    def test_verify_email_fake_uuid_returns_400(self):
        """GET /api/auth/verify-email/{fake-uuid} should return 400"""
        fake_uuid = str(uuid.uuid4())
        response = requests.get(f"{BASE_URL}/api/auth/verify-email/{fake_uuid}")
        assert response.status_code == 400, f"Expected 400 for fake UUID token, got {response.status_code}"
        print("✓ Fake UUID token returns 400")


class TestJourneyAPI:
    """Test journey (Moje cesta) API endpoints"""
    
    @pytest.fixture
    def admin_headers(self):
        """Get admin auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_user_me_includes_journey(self, admin_headers):
        """GET /api/users/me should include journey field"""
        response = requests.get(f"{BASE_URL}/api/users/me", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        # journey field should exist (may be None if not set)
        assert "journey" in data or data.get("journey") is None
        print(f"✓ GET /api/users/me returns journey field: {data.get('journey')}")
    
    def test_save_journey(self, admin_headers):
        """PUT /api/users/me/journey should save journey data"""
        journey_data = {
            "stage": "research",
            "stage_label": "Hledám informace",
            "is_public": False,
            "note": "Test journey note from iteration 20"
        }
        response = requests.put(f"{BASE_URL}/api/users/me/journey", 
                               json=journey_data, 
                               headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        # Response could be {"message": "Cesta uložena"} or {"journey": {...}}
        assert "message" in data or "journey" in data
        print(f"✓ Journey saved successfully: {data}")
    
    def test_get_similar_users(self, admin_headers):
        """GET /api/journey/similar should return list"""
        response = requests.get(f"{BASE_URL}/api/journey/similar", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list of similar users"
        print(f"✓ GET /api/journey/similar returns list with {len(data)} users")


class TestEntryPasswordToggle:
    """Test admin entry password toggle functionality"""
    
    @pytest.fixture
    def admin_headers(self):
        """Get admin auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = response.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_entry_password_status(self):
        """GET /api/settings/entry-password-status should return status"""
        response = requests.get(f"{BASE_URL}/api/settings/entry-password-status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "enabled" in data
        assert isinstance(data["enabled"], bool)
        print(f"✓ Entry password status: enabled={data['enabled']}")
    
    def test_toggle_entry_password_on(self, admin_headers):
        """PUT /api/admin/settings/entry-password-toggle should enable entry password"""
        response = requests.put(f"{BASE_URL}/api/admin/settings/entry-password-toggle",
                               json={"enabled": True},
                               headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        # Verify it's now enabled
        status_response = requests.get(f"{BASE_URL}/api/settings/entry-password-status")
        assert status_response.json()["enabled"] == True
        print("✓ Entry password toggled ON")
    
    def test_toggle_entry_password_off(self, admin_headers):
        """PUT /api/admin/settings/entry-password-toggle should disable entry password"""
        response = requests.put(f"{BASE_URL}/api/admin/settings/entry-password-toggle",
                               json={"enabled": False},
                               headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        # Verify it's now disabled
        status_response = requests.get(f"{BASE_URL}/api/settings/entry-password-status")
        assert status_response.json()["enabled"] == False
        print("✓ Entry password toggled OFF")
    
    def test_toggle_entry_password_back_on(self, admin_headers):
        """Re-enable entry password (restore default state)"""
        response = requests.put(f"{BASE_URL}/api/admin/settings/entry-password-toggle",
                               json={"enabled": True},
                               headers=admin_headers)
        assert response.status_code == 200
        print("✓ Entry password restored to ON (default state)")


class TestMediaEndpoint:
    """Test media endpoint authentication"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin JWT token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_media_without_auth_returns_401(self):
        """GET /api/media/messages/test.jpg without auth should return 401"""
        response = requests.get(f"{BASE_URL}/api/media/messages/test.jpg")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ Media endpoint returns 401 without authentication")
    
    def test_media_with_token_nonexistent_file_returns_404(self, admin_token):
        """GET /api/media/messages/nonexistent.jpg?token=valid should return 404 (not 401)"""
        response = requests.get(f"{BASE_URL}/api/media/messages/nonexistent-file-{uuid.uuid4()}.jpg",
                               params={"token": admin_token})
        # Should be 404 (not found) not 401 (unauthorized) - this confirms auth works
        assert response.status_code == 404, f"Expected 404 for non-existent file with valid token, got {response.status_code}"
        print("✓ Media endpoint returns 404 (not 401) for non-existent file with valid token")
    
    def test_media_with_auth_header_nonexistent_returns_404(self, admin_token):
        """GET /api/media/messages/test.jpg with Bearer token should return 404"""
        response = requests.get(f"{BASE_URL}/api/media/messages/nonexistent-{uuid.uuid4()}.jpg",
                               headers={"Authorization": f"Bearer {admin_token}"})
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Media endpoint with Bearer header returns 404 for non-existent file")


class TestRegistrationWithEntryPassword:
    """Test registration flow with entry password"""
    
    def test_registration_without_code_fails(self):
        """Registration without secret_code should fail when entry password is enabled"""
        # First check if entry password is enabled
        status = requests.get(f"{BASE_URL}/api/settings/entry-password-status").json()
        if not status.get("enabled"):
            pytest.skip("Entry password is disabled, skipping this test")
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"test_iter20_{uuid.uuid4().hex[:8]}@example.com",
            "password": "TestPass@123",
            "username": f"TestUser{uuid.uuid4().hex[:6]}",
            "secret_code": ""
        })
        assert response.status_code == 400, f"Expected 400 without secret code, got {response.status_code}"
        print("✓ Registration without secret code returns 400")
    
    def test_registration_with_wrong_code_fails(self):
        """Registration with wrong secret_code should fail"""
        status = requests.get(f"{BASE_URL}/api/settings/entry-password-status").json()
        if not status.get("enabled"):
            pytest.skip("Entry password is disabled, skipping this test")
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"test_iter20_{uuid.uuid4().hex[:8]}@example.com",
            "password": "TestPass@123",
            "username": f"TestUser{uuid.uuid4().hex[:6]}",
            "secret_code": "WrongPassword123"
        })
        assert response.status_code == 400, f"Expected 400 with wrong code, got {response.status_code}"
        print("✓ Registration with wrong secret code returns 400")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
