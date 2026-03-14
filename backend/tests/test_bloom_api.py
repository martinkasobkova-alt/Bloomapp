"""
Bloom API Tests - Testing authentication, registration with secret code, and core features
"""
import pytest
import requests
import os
import random
import string

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://profile-hub-228.preview.emergentagent.com').rstrip('/')

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture
def random_suffix():
    """Generate random suffix for unique test data"""
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))


# ==================== HEALTH CHECK ====================
class TestHealthCheck:
    """Health check endpoint tests"""
    
    def test_api_health(self, api_client):
        """Test API health endpoint"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("SUCCESS: API health check passed")

    def test_api_root(self, api_client):
        """Test API root endpoint"""
        response = api_client.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Bloom" in data["message"] or "status" in data
        print("SUCCESS: API root endpoint working")


# ==================== AUTHENTICATION ====================
class TestAuthentication:
    """Authentication endpoint tests"""

    def test_register_with_wrong_secret_code(self, api_client, random_suffix):
        """Test registration with wrong secret code fails"""
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"wrong_code_{random_suffix}@test.cz",
            "password": "test123456",
            "username": f"WrongCodeUser{random_suffix}",
            "pronouns": "ona/její",
            "avatar": "woman-blonde-long",
            "location": "",
            "secret_code": "WrongCode123"  # Wrong code
        })
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "kód" in data["detail"].lower() or "code" in data["detail"].lower()
        print(f"SUCCESS: Registration with wrong secret code rejected: {data['detail']}")

    def test_register_with_correct_secret_code(self, api_client, random_suffix):
        """Test registration with correct secret code 'Transfortrans' succeeds"""
        test_email = f"correct_code_{random_suffix}@test.cz"
        test_username = f"CorrectCodeUser{random_suffix}"
        
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "test123456",
            "username": test_username,
            "pronouns": "ona/její",
            "avatar": "woman-blonde-long",
            "location": "Praha",
            "secret_code": "Transfortrans"  # Correct code
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == test_email
        assert data["user"]["username"] == test_username
        print(f"SUCCESS: Registration with correct secret code succeeded for {test_username}")
        
        return data["token"], data["user"]

    def test_login_with_existing_user(self, api_client):
        """Test login with existing test user"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test1@bloom.cz",
            "password": "test123"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert isinstance(data["token"], str)
        assert len(data["token"]) > 0
        print(f"SUCCESS: Login successful for user {data['user']['username']}")
        
        return data["token"], data["user"]

    def test_login_with_invalid_credentials(self, api_client):
        """Test login with wrong credentials fails"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@test.cz",
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401
        print("SUCCESS: Login with invalid credentials rejected")

    def test_get_user_profile(self, api_client):
        """Test getting user profile with valid token"""
        # First login
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test1@bloom.cz",
            "password": "test123"
        })
        
        if login_response.status_code != 200:
            pytest.skip("Login failed - cannot test profile")
        
        token = login_response.json()["token"]
        
        # Get profile
        headers = {"Authorization": f"Bearer {token}"}
        response = api_client.get(f"{BASE_URL}/api/auth/me", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "email" in data
        assert "username" in data
        print(f"SUCCESS: Retrieved profile for user {data['username']}")


# ==================== SERVICES ====================
class TestServices:
    """Services endpoint tests"""

    def test_get_services(self, api_client):
        """Test getting services list"""
        response = api_client.get(f"{BASE_URL}/api/services")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Retrieved {len(data)} services")

    def test_get_service_types(self, api_client):
        """Test getting service types"""
        response = api_client.get(f"{BASE_URL}/api/service-types")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"SUCCESS: Retrieved {len(data)} service types")

    def test_create_service_authenticated(self, api_client):
        """Test creating a service as authenticated user"""
        # Login first
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test1@bloom.cz",
            "password": "test123"
        })
        
        if login_response.status_code != 200:
            pytest.skip("Login failed - cannot test service creation")
        
        token = login_response.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create service
        response = api_client.post(f"{BASE_URL}/api/services", json={
            "offer": "TEST_Testing Service",
            "need": "TEST_Need Something",
            "description": "This is a test service for automated testing",
            "location": "Praha",
            "service_type": "other"
        }, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["offer"] == "TEST_Testing Service"
        print(f"SUCCESS: Created service with ID {data['id']}")


# ==================== SPECIALISTS ====================
class TestSpecialists:
    """Specialists endpoint tests"""

    def test_get_specialists(self, api_client):
        """Test getting specialists list"""
        response = api_client.get(f"{BASE_URL}/api/specialists")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Retrieved {len(data)} specialists")

    def test_get_specialists_filtered_by_country(self, api_client):
        """Test getting specialists filtered by country"""
        response = api_client.get(f"{BASE_URL}/api/specialists?country=CZ")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Retrieved {len(data)} specialists in CZ")

    def test_get_specialists_filtered_by_specialty(self, api_client):
        """Test getting specialists filtered by specialty"""
        response = api_client.get(f"{BASE_URL}/api/specialists?specialty=psychologie")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Retrieved {len(data)} psychologie specialists")


# ==================== NEWS ====================
class TestNews:
    """News endpoint tests"""

    def test_get_news(self, api_client):
        """Test getting news list"""
        response = api_client.get(f"{BASE_URL}/api/news")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Retrieved {len(data)} news items")

    def test_get_news_filtered_by_category(self, api_client):
        """Test getting news filtered by category"""
        response = api_client.get(f"{BASE_URL}/api/news?category=local")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Retrieved {len(data)} local news items")


# ==================== QUESTIONS ====================
class TestQuestions:
    """Questions/Q&A endpoint tests"""

    def test_get_questions(self, api_client):
        """Test getting questions list"""
        response = api_client.get(f"{BASE_URL}/api/questions")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Retrieved {len(data)} questions")


# ==================== ARTICLES ====================
class TestArticles:
    """Articles endpoint tests"""

    def test_get_articles(self, api_client):
        """Test getting articles list"""
        response = api_client.get(f"{BASE_URL}/api/articles")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Retrieved {len(data)} articles")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
