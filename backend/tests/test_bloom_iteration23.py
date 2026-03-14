"""
Iteration 23 Tests - High-Priority Bug Fixes:
1. Specialist modal typing focus fix - SpecForm now has own useState
2. Country field shows only 'Česko' and 'Svět'
3. Legal articles open as full detail pages (not accordion)
4. Google auth login mode rejects non-existing emails
5. PWA icons and favicon
6. Auth login flow
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestStaticAssets:
    """Test favicon and PWA icons"""
    
    def test_favicon_ico(self):
        """Favicon should return 200"""
        response = requests.get(f"{BASE_URL}/favicon.ico")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: /favicon.ico returns 200")
    
    def test_bloom_lotus_svg(self):
        """Lotus SVG asset should return 200"""
        response = requests.get(f"{BASE_URL}/assets/bloom-lotus.svg")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: /assets/bloom-lotus.svg returns 200")
    
    def test_android_chrome_192(self):
        """Android Chrome 192x192 icon should return 200"""
        response = requests.get(f"{BASE_URL}/icons/android-chrome-192x192.png")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: /icons/android-chrome-192x192.png returns 200")
    
    def test_apple_touch_icon(self):
        """Apple touch icon should return 200"""
        response = requests.get(f"{BASE_URL}/icons/apple-touch-icon.png")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: /icons/apple-touch-icon.png returns 200")


class TestAuthentication:
    """Test auth flows"""
    
    def test_login_success(self):
        """Login with test credentials should work"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test1@bloom.cz",
            "password": "test123"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["email"] == "test1@bloom.cz"
        print(f"PASS: Login successful for test1@bloom.cz, role={data['user'].get('role')}")
        return data["token"]
    
    def test_login_invalid_credentials(self):
        """Login with invalid credentials should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Invalid credentials rejected with 401")


class TestGoogleAuth:
    """Test Google auth session endpoint with mode parameter"""
    
    def test_google_session_invalid_session(self):
        """Invalid Google session should return 401"""
        response = requests.post(f"{BASE_URL}/api/auth/google/session", json={
            "session_id": "invalid_test_session",
            "mode": "login"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        data = response.json()
        assert "detail" in data, "Should return error detail"
        print(f"PASS: Invalid Google session rejected - {data.get('detail')}")
    
    def test_google_session_no_session_id(self):
        """Missing session_id should return 400"""
        response = requests.post(f"{BASE_URL}/api/auth/google/session", json={
            "mode": "login"
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASS: Missing session_id rejected with 400")


class TestSpecialistsAPI:
    """Test specialists API"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test1@bloom.cz",
            "password": "test123"
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Could not get auth token")
    
    def test_get_specialists(self):
        """Get specialists list should work"""
        response = requests.get(f"{BASE_URL}/api/specialists")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: Got {len(data)} specialists")
    
    def test_create_specialist_admin(self, auth_token):
        """Admin can create specialist with country field"""
        response = requests.post(
            f"{BASE_URL}/api/specialists",
            json={
                "name": "TEST_Iteration23_Specialist",
                "specialty": "Psychologie, psychiatrie a sexuologie",
                "description": "Test specialist for iteration 23",
                "address": "Test Address 123",
                "city": "Praha",
                "region": "Praha",
                "country": "CZ"  # Should be one of CZ or WORLD
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["country"] == "CZ", "Country should be CZ"
        assert data["name"] == "TEST_Iteration23_Specialist"
        print(f"PASS: Created specialist with country=CZ, id={data['id']}")
        
        # Clean up - delete test specialist
        requests.delete(f"{BASE_URL}/api/specialists/{data['id']}", 
                       headers={"Authorization": f"Bearer {auth_token}"})


class TestArticlesAPI:
    """Test articles/legal API"""
    
    def test_get_articles(self):
        """Get articles list should work"""
        response = requests.get(f"{BASE_URL}/api/articles")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: Got {len(data)} articles")
        
        # Verify article structure for detail view
        if len(data) > 0:
            article = data[0]
            assert "id" in article, "Article should have id"
            assert "title" in article, "Article should have title"
            assert "content" in article, "Article should have content"
            assert "category" in article, "Article should have category"
            print(f"PASS: Article structure valid - {article['title'][:30]}...")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
