"""
Test suite for Bloom P0 Bug Fixes - Iteration 19
Tests: Entry password toggle, community password, media endpoint with token, email verification

Admin credentials: test1@bloom.cz / test123
Community password: Transfortrans
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://profile-hub-228.preview.emergentagent.com"


class TestAdminAuth:
    """Admin authentication and token retrieval"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test1@bloom.cz",
            "password": "test123"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        return data["token"]

    def test_admin_login(self, admin_token):
        """Verify admin can login"""
        assert admin_token is not None
        assert len(admin_token) > 0


class TestEntryPasswordToggle:
    """Test entry password enable/disable feature"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test1@bloom.cz",
            "password": "test123"
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}

    def test_get_entry_password_status_public(self):
        """GET /api/settings/entry-password-status - public endpoint returns enabled status"""
        response = requests.get(f"{BASE_URL}/api/settings/entry-password-status")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "enabled" in data
        assert isinstance(data["enabled"], bool)
        print(f"Entry password status: enabled={data['enabled']}")

    def test_disable_entry_password(self, admin_headers):
        """PUT /api/admin/settings/entry-password-toggle - disable entry password"""
        response = requests.put(
            f"{BASE_URL}/api/admin/settings/entry-password-toggle",
            json={"enabled": False},
            headers=admin_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "enabled" in data
        assert data["enabled"] == False
        print("Entry password disabled successfully")

    def test_verify_disabled_status(self):
        """Verify public endpoint reflects disabled status"""
        response = requests.get(f"{BASE_URL}/api/settings/entry-password-status")
        assert response.status_code == 200
        data = response.json()
        assert data["enabled"] == False
        print("Public endpoint confirms disabled status")

    def test_enable_entry_password(self, admin_headers):
        """PUT /api/admin/settings/entry-password-toggle - enable entry password"""
        response = requests.put(
            f"{BASE_URL}/api/admin/settings/entry-password-toggle",
            json={"enabled": True},
            headers=admin_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "enabled" in data
        assert data["enabled"] == True
        print("Entry password enabled successfully")

    def test_verify_enabled_status(self):
        """Verify public endpoint reflects enabled status"""
        response = requests.get(f"{BASE_URL}/api/settings/entry-password-status")
        assert response.status_code == 200
        data = response.json()
        assert data["enabled"] == True
        print("Public endpoint confirms enabled status")

    def test_toggle_requires_admin(self):
        """Entry password toggle requires admin auth"""
        response = requests.put(
            f"{BASE_URL}/api/admin/settings/entry-password-toggle",
            json={"enabled": False}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("Correctly requires admin auth")


class TestCommunityPassword:
    """Test community password admin endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test1@bloom.cz",
            "password": "test123"
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}

    def test_get_community_password_with_enabled_field(self, admin_headers):
        """GET /api/admin/settings/community-password - returns both password and enabled field"""
        response = requests.get(
            f"{BASE_URL}/api/admin/settings/community-password",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "password" in data, "Missing 'password' field"
        assert "enabled" in data, "Missing 'enabled' field - NEW FEATURE"
        print(f"Community password: {data['password']}, enabled: {data['enabled']}")

    def test_update_community_password(self, admin_headers):
        """PUT /api/admin/settings/community-password - change password"""
        new_password = f"TestPw{uuid.uuid4().hex[:6]}"
        response = requests.put(
            f"{BASE_URL}/api/admin/settings/community-password",
            json={"password": new_password},
            headers=admin_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        # Verify change
        verify = requests.get(f"{BASE_URL}/api/admin/settings/community-password", headers=admin_headers)
        assert verify.json()["password"] == new_password
        print(f"Password changed to: {new_password}")
        
        # Restore original
        restore = requests.put(
            f"{BASE_URL}/api/admin/settings/community-password",
            json={"password": "Transfortrans"},
            headers=admin_headers
        )
        assert restore.status_code == 200
        print("Restored original password: Transfortrans")

    def test_community_password_requires_admin(self):
        """Community password endpoints require admin auth"""
        # GET
        r1 = requests.get(f"{BASE_URL}/api/admin/settings/community-password")
        assert r1.status_code in [401, 403], f"GET expected 401/403, got {r1.status_code}"
        
        # PUT
        r2 = requests.put(f"{BASE_URL}/api/admin/settings/community-password", json={"password": "test"})
        assert r2.status_code in [401, 403], f"PUT expected 401/403, got {r2.status_code}"
        print("Both endpoints require admin auth")


class TestRegistrationWithEntryPassword:
    """Test registration behavior with entry password enabled/disabled"""
    
    @pytest.fixture(scope="class")
    def admin_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test1@bloom.cz",
            "password": "test123"
        })
        assert response.status_code == 200
        return {"Authorization": f"Bearer {response.json()['token']}", "Content-Type": "application/json"}

    def test_registration_without_code_when_disabled(self, admin_headers):
        """When entry password is disabled, registration should work without secret_code"""
        # Disable entry password
        requests.put(
            f"{BASE_URL}/api/admin/settings/entry-password-toggle",
            json={"enabled": False},
            headers=admin_headers
        )
        
        # Attempt registration without secret_code
        test_email = f"test_no_pw_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "TestPass@123",
            "username": f"testuser_{uuid.uuid4().hex[:6]}",
            "secret_code": ""  # No secret code
        })
        
        # Re-enable entry password for other tests
        requests.put(
            f"{BASE_URL}/api/admin/settings/entry-password-toggle",
            json={"enabled": True},
            headers=admin_headers
        )
        
        assert response.status_code == 200, f"Registration should succeed without secret_code when disabled: {response.text}"
        print("Registration succeeded without secret_code when entry password disabled")

    def test_registration_requires_code_when_enabled(self, admin_headers):
        """When entry password is enabled, registration requires valid secret_code"""
        # Ensure entry password is enabled
        requests.put(
            f"{BASE_URL}/api/admin/settings/entry-password-toggle",
            json={"enabled": True},
            headers=admin_headers
        )
        
        # Attempt registration without secret_code
        test_email = f"test_with_pw_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "TestPass@123",
            "username": f"testuser_{uuid.uuid4().hex[:6]}",
            "secret_code": ""  # No secret code
        })
        
        assert response.status_code == 400, f"Expected 400 when entry password enabled but no code: {response.text}"
        print("Registration correctly rejected without secret_code when entry password enabled")


class TestMediaEndpointWithToken:
    """Test media endpoint accepts both auth header and query param token"""
    
    @pytest.fixture(scope="class")
    def user_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test1@bloom.cz",
            "password": "test123"
        })
        assert response.status_code == 200
        return response.json()["token"]

    def test_media_with_token_query_param_nonexistent_file(self, user_token):
        """GET /api/media/messages/{filename}?token={jwt} - returns 404 for non-existent file (not 401)"""
        response = requests.get(
            f"{BASE_URL}/api/media/messages/nonexistent_test_file.jpg",
            params={"token": user_token}
        )
        # Should return 404 for non-existent file, not 401
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("Media endpoint with token returns 404 for non-existent file (not 401)")

    def test_media_with_auth_header_nonexistent_file(self, user_token):
        """GET /api/media/messages/{filename} with auth header - returns 404 for non-existent"""
        response = requests.get(
            f"{BASE_URL}/api/media/messages/nonexistent_test_file.jpg",
            headers={"Authorization": f"Bearer {user_token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Media endpoint with auth header returns 404 for non-existent file")

    def test_media_without_auth_returns_401(self):
        """GET /api/media/messages/{filename} without auth - returns 401"""
        response = requests.get(f"{BASE_URL}/api/media/messages/test.jpg")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Media endpoint without auth correctly returns 401")

    def test_media_with_invalid_token(self):
        """GET /api/media/messages/{filename}?token=invalid - returns 401"""
        response = requests.get(
            f"{BASE_URL}/api/media/messages/test.jpg",
            params={"token": "invalid_token_123"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Media endpoint with invalid token returns 401")


class TestEmailVerification:
    """Test email verification backend endpoint"""
    
    def test_verify_email_invalid_token(self):
        """GET /api/auth/verify-email/{invalid-token} - returns 400 for invalid token"""
        response = requests.get(f"{BASE_URL}/api/auth/verify-email/invalid-token-12345")
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("Invalid verification token returns 400")

    def test_verify_email_random_uuid(self):
        """GET /api/auth/verify-email/{random-uuid} - returns 400 for non-existent token"""
        random_token = str(uuid.uuid4())
        response = requests.get(f"{BASE_URL}/api/auth/verify-email/{random_token}")
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("Random UUID token returns 400")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
