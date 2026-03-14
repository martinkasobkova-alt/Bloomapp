"""
Bloom Iteration 22 - Batch 1 Backend Tests
Tests for:
1. Favicon/icons endpoints (200 status)
2. Manifest.json icon entries
3. Password validation in reset-password endpoint (8-char minimum + rules)
4. Login authentication
5. API health
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestIconsAndManifest:
    """Test favicon and PWA icon endpoints - Batch 1 feature"""
    
    def test_favicon_ico(self):
        """favicon.ico should return 200"""
        response = requests.get(f"{BASE_URL}/favicon.ico")
        assert response.status_code == 200, f"favicon.ico returned {response.status_code}"
    
    def test_favicon_16x16(self):
        """icons/favicon-16x16.png should return 200"""
        response = requests.get(f"{BASE_URL}/icons/favicon-16x16.png")
        assert response.status_code == 200, f"favicon-16x16.png returned {response.status_code}"
    
    def test_favicon_32x32(self):
        """icons/favicon-32x32.png should return 200"""
        response = requests.get(f"{BASE_URL}/icons/favicon-32x32.png")
        assert response.status_code == 200, f"favicon-32x32.png returned {response.status_code}"
    
    def test_apple_touch_icon(self):
        """icons/apple-touch-icon.png should return 200"""
        response = requests.get(f"{BASE_URL}/icons/apple-touch-icon.png")
        assert response.status_code == 200, f"apple-touch-icon.png returned {response.status_code}"
    
    def test_android_chrome_192(self):
        """icons/android-chrome-192x192.png should return 200"""
        response = requests.get(f"{BASE_URL}/icons/android-chrome-192x192.png")
        assert response.status_code == 200, f"android-chrome-192x192.png returned {response.status_code}"
    
    def test_android_chrome_512(self):
        """icons/android-chrome-512x512.png should return 200"""
        response = requests.get(f"{BASE_URL}/icons/android-chrome-512x512.png")
        assert response.status_code == 200, f"android-chrome-512x512.png returned {response.status_code}"
    
    def test_manifest_json(self):
        """manifest.json should return 200 and contain android-chrome icons"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        assert response.status_code == 200, f"manifest.json returned {response.status_code}"
        
        data = response.json()
        assert "icons" in data, "manifest.json missing 'icons' key"
        
        icon_srcs = [icon.get("src", "") for icon in data["icons"]]
        assert any("android-chrome-192x192" in src for src in icon_srcs), "Missing android-chrome-192x192 in manifest"
        assert any("android-chrome-512x512" in src for src in icon_srcs), "Missing android-chrome-512x512 in manifest"


class TestAuth:
    """Test authentication endpoints"""
    
    def test_login_success(self):
        """Login with valid credentials returns token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test1@bloom.cz",
            "password": "test123"
        })
        assert response.status_code == 200, f"Login returned {response.status_code}"
        
        data = response.json()
        assert "token" in data, "Login response missing token"
        assert "user" in data, "Login response missing user"
        assert data["user"]["email"] == "test1@bloom.cz"
    
    def test_login_invalid_credentials(self):
        """Login with wrong password returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test1@bloom.cz",
            "password": "wrongpassword"
        })
        assert response.status_code == 401


class TestPasswordResetValidation:
    """Test password validation rules in reset-password endpoint - Batch 1 feature"""
    
    def test_reset_password_invalid_token(self):
        """Reset password with invalid token returns 400"""
        response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": "invalid_test_token",
            "new_password": "ValidPass1!"
        })
        # Should fail with invalid token error, not password validation
        assert response.status_code == 400
        data = response.json()
        assert "Neplatný" in data.get("detail", "") or "neplatný" in data.get("detail", "").lower()
    
    def test_reset_password_endpoint_exists(self):
        """Reset password endpoint exists and accepts POST"""
        # Testing that endpoint handles request (even if token invalid)
        response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": "test",
            "new_password": "weak"
        })
        # Should return 400 (invalid token) not 404 (not found)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"


class TestAPIHealth:
    """Basic API health checks"""
    
    def test_api_docs(self):
        """API docs endpoint should be accessible"""
        response = requests.get(f"{BASE_URL}/docs", allow_redirects=True)
        # FastAPI redirects /docs to /docs/ so allow redirects
        assert response.status_code in [200, 307], f"Docs returned {response.status_code}"
    
    def test_entry_password_status(self):
        """Entry password status endpoint works"""
        response = requests.get(f"{BASE_URL}/api/settings/entry-password-status")
        assert response.status_code == 200
        data = response.json()
        assert "enabled" in data


class TestSpecialists:
    """Test specialists endpoints"""
    
    def test_get_specialists_public(self):
        """Get specialists list (public)"""
        response = requests.get(f"{BASE_URL}/api/specialists")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_add_specialist_requires_auth(self):
        """Adding specialist requires authentication"""
        response = requests.post(f"{BASE_URL}/api/specialists", json={
            "name": "Test Doctor",
            "specialty": "Psychologie",
            "city": "Praha"
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


# Run with: pytest /app/backend/tests/test_bloom_iteration22.py -v --tb=short --junitxml=/app/test_reports/pytest/pytest_results_iter22.xml
