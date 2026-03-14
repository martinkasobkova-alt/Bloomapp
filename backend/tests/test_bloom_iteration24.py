"""
Bloom Iteration 24 Tests
Tests for push notifications, Google auth mode handling, and service worker

Test areas:
1. Push notification endpoints (VAPID key, subscribe, unsubscribe)
2. Google auth mode=login with non-existent account (should 404/no_account)
3. Service worker sw-push.js accessibility
4. PWA icons and favicon
5. Auth login flow still works
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "test1@bloom.cz"
ADMIN_PASSWORD = "test123"
COMMUNITY_PASSWORD = "Transfortrans"


class TestAuth:
    """Authentication tests - verify login still works"""
    
    def test_login_success(self):
        """Login with admin credentials should work"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        print(f"PASS: Login successful for {ADMIN_EMAIL}")
        return data["token"]


class TestGoogleAuthModeHandling:
    """Test Google auth mode=login vs mode=register behavior"""
    
    def test_google_session_login_mode_missing_session(self):
        """POST /api/auth/google/session without session_id should return 400"""
        response = requests.post(f"{BASE_URL}/api/auth/google/session", json={
            "mode": "login"
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASS: Google session without session_id returns 400")
    
    def test_google_session_invalid_session(self):
        """POST /api/auth/google/session with invalid session_id should return 401"""
        response = requests.post(f"{BASE_URL}/api/auth/google/session", json={
            "session_id": "invalid-session-12345",
            "mode": "login"
        })
        # Should return 401 for invalid session (not found on Emergent auth)
        assert response.status_code in [401, 502], f"Expected 401/502, got {response.status_code}: {response.text}"
        print(f"PASS: Google session with invalid session_id returns {response.status_code}")


class TestPushNotifications:
    """Test push notification endpoints"""
    
    def test_vapid_key_endpoint(self):
        """GET /api/push/vapid-key should return the VAPID public key"""
        response = requests.get(f"{BASE_URL}/api/push/vapid-key")
        assert response.status_code == 200, f"VAPID key endpoint failed: {response.text}"
        data = response.json()
        assert "public_key" in data, "Response missing public_key field"
        assert len(data["public_key"]) > 50, "VAPID public key seems too short"
        print(f"PASS: VAPID key endpoint returns valid key (length: {len(data['public_key'])})")
    
    def test_push_subscribe_requires_auth(self):
        """POST /api/push/subscribe should require authentication"""
        response = requests.post(f"{BASE_URL}/api/push/subscribe", json={
            "subscription": {"endpoint": "https://test.example.com", "keys": {}}
        })
        assert response.status_code in [401, 403], f"Expected auth error, got {response.status_code}"
        print("PASS: Push subscribe requires authentication")
    
    def test_push_unsubscribe_requires_auth(self):
        """DELETE /api/push/subscribe should require authentication"""
        response = requests.delete(f"{BASE_URL}/api/push/subscribe", json={
            "endpoint": "https://test.example.com"
        })
        assert response.status_code in [401, 403], f"Expected auth error, got {response.status_code}"
        print("PASS: Push unsubscribe requires authentication")
    
    def test_push_subscribe_authenticated(self):
        """POST /api/push/subscribe with auth should succeed"""
        # First login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Subscribe with valid subscription object
        subscription_data = {
            "subscription": {
                "endpoint": "https://test.pushservice.example.com/send/test-endpoint-123",
                "keys": {
                    "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
                    "auth": "tBHItJI5svbpez7KI4CCXg"
                }
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/push/subscribe",
            json=subscription_data,
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Push subscribe failed: {response.text}"
        data = response.json()
        assert "message" in data or "status" in str(data).lower() or data == {"message": "Subscribed"}
        print("PASS: Push subscribe with auth succeeds")
    
    def test_push_unsubscribe_authenticated(self):
        """DELETE /api/push/subscribe with auth should succeed"""
        # First login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Unsubscribe
        response = requests.delete(
            f"{BASE_URL}/api/push/subscribe",
            json={"endpoint": "https://test.pushservice.example.com/send/test-endpoint-123"},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Push unsubscribe failed: {response.text}"
        print("PASS: Push unsubscribe with auth succeeds")


class TestServiceWorker:
    """Test service worker accessibility"""
    
    def test_sw_push_js_accessible(self):
        """GET /sw-push.js should return 200 with JavaScript content"""
        response = requests.get(f"{BASE_URL}/sw-push.js")
        assert response.status_code == 200, f"Service worker not accessible: {response.status_code}"
        content = response.text
        assert "self.addEventListener" in content, "Service worker missing expected code"
        assert "push" in content.lower(), "Service worker missing push event listener"
        print("PASS: sw-push.js accessible and contains push handling code")


class TestPWAIcons:
    """Test PWA icon and favicon accessibility"""
    
    def test_favicon_ico(self):
        """GET /favicon.ico should return 200"""
        response = requests.get(f"{BASE_URL}/favicon.ico")
        assert response.status_code == 200, f"favicon.ico not found: {response.status_code}"
        print("PASS: /favicon.ico returns 200")
    
    def test_bloom_lotus_svg(self):
        """GET /assets/bloom-lotus.svg should return 200"""
        response = requests.get(f"{BASE_URL}/assets/bloom-lotus.svg")
        assert response.status_code == 200, f"bloom-lotus.svg not found: {response.status_code}"
        print("PASS: /assets/bloom-lotus.svg returns 200")
    
    def test_android_chrome_192(self):
        """GET /icons/android-chrome-192x192.png should return 200"""
        response = requests.get(f"{BASE_URL}/icons/android-chrome-192x192.png")
        assert response.status_code == 200, f"android-chrome-192x192.png not found: {response.status_code}"
        print("PASS: /icons/android-chrome-192x192.png returns 200")
    
    def test_apple_touch_icon(self):
        """GET /icons/apple-touch-icon.png should return 200"""
        response = requests.get(f"{BASE_URL}/icons/apple-touch-icon.png")
        assert response.status_code == 200, f"apple-touch-icon.png not found: {response.status_code}"
        print("PASS: /icons/apple-touch-icon.png returns 200")


class TestSpecialistsAPI:
    """Test specialists API endpoints"""
    
    def test_specialists_list(self):
        """GET /api/specialists should return list"""
        response = requests.get(f"{BASE_URL}/api/specialists")
        assert response.status_code == 200, f"Specialists list failed: {response.status_code}"
        print("PASS: Specialists list endpoint works")
    
    def test_specialists_create_requires_admin(self):
        """POST /api/specialists should require admin auth"""
        response = requests.post(f"{BASE_URL}/api/specialists", json={
            "name": "Test Doctor",
            "specialty": "Psychologie",
            "address": "Test Address",
            "city": "Praha",
            "country": "CZ"
        })
        assert response.status_code in [401, 403], f"Expected auth error, got {response.status_code}"
        print("PASS: Specialists create requires admin auth")


class TestArticlesAPI:
    """Test articles/legal API endpoints"""
    
    def test_articles_list(self):
        """GET /api/articles should return published articles"""
        response = requests.get(f"{BASE_URL}/api/articles")
        assert response.status_code == 200, f"Articles list failed: {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list of articles"
        print(f"PASS: Articles list returns {len(data)} articles")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
