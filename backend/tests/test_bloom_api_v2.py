"""
Bloom API Tests v2 - Testing new features: user ratings, community highlights, 
messages unread count, password reset, admin role management
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

@pytest.fixture
def auth_token(api_client):
    """Get authentication token using test user credentials"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "newtest@bloom.cz",
        "password": "test123"
    })
    if response.status_code == 200:
        return response.json().get("token")
    # Try test1@bloom.cz as fallback
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "test1@bloom.cz",
        "password": "test123"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed - no test user available")

@pytest.fixture
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


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
        """Test API root endpoint - Czech text"""
        response = api_client.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Bloom" in data["message"]
        assert "běží" in data["message"]  # Czech diacritics check
        print(f"SUCCESS: API root with Czech: {data['message']}")


# ==================== AUTHENTICATION ====================
class TestAuthentication:
    """Authentication endpoint tests including new fields"""

    def test_register_with_wrong_secret_code(self, api_client, random_suffix):
        """Test registration with wrong secret code fails"""
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"wrong_code_{random_suffix}@test.cz",
            "password": "test123456",
            "username": f"WrongCodeUser{random_suffix}",
            "pronouns": "ona/její",
            "avatar": "fem-pink",
            "location": "",
            "district": "",
            "phone": "",
            "bio": "",
            "secret_code": "WrongCode123"
        })
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"SUCCESS: Registration with wrong secret code rejected: {data['detail']}")

    def test_register_with_correct_secret_code_and_new_fields(self, api_client, random_suffix):
        """Test registration with correct secret code 'Transfortrans' and new fields (phone, bio, district)"""
        test_email = f"correct_code_{random_suffix}@test.cz"
        test_username = f"CorrectCodeUser{random_suffix}"
        
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "test123456",
            "username": test_username,
            "pronouns": "ona/její",
            "avatar": "fem-pink",
            "location": "Praha",
            "district": "Praha 1",
            "phone": "+420123456789",
            "bio": "Test bio for automated testing",
            "secret_code": "Transfortrans"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == test_email
        assert data["user"]["username"] == test_username
        assert data["user"]["district"] == "Praha 1"
        assert data["user"]["phone"] == "+420123456789"
        assert data["user"]["bio"] == "Test bio for automated testing"
        print(f"SUCCESS: Registration with all new fields succeeded for {test_username}")
        
        return data["token"], data["user"]

    def test_login_with_existing_user(self, api_client):
        """Test login with existing test user"""
        # Try newtest@bloom.cz first
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "newtest@bloom.cz",
            "password": "test123"
        })
        
        if response.status_code != 200:
            # Fallback to test1@bloom.cz
            response = api_client.post(f"{BASE_URL}/api/auth/login", json={
                "email": "test1@bloom.cz",
                "password": "test123"
            })
        
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
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


# ==================== PASSWORD RESET ====================
class TestPasswordReset:
    """Password reset endpoint tests (MOCKED - no actual email sent)"""

    def test_password_reset_request(self, api_client):
        """Test password reset request endpoint"""
        response = api_client.post(f"{BASE_URL}/api/auth/reset-password-request", json={
            "email": "test@example.com"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        # Czech message expected
        assert "e-mail" in data["message"].lower() or "email" in data["message"].lower()
        print(f"SUCCESS: Password reset request works (MOCKED): {data['message']}")


# ==================== USER RATINGS ====================
class TestUserRatings:
    """User trust/rating system tests"""

    def test_rate_user(self, authenticated_client, random_suffix):
        """Test POST /api/users/{id}/rate endpoint"""
        # First, we need to find another user to rate
        # Create a new user first
        response = authenticated_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"rate_target_{random_suffix}@test.cz",
            "password": "test123456",
            "username": f"RateTarget{random_suffix}",
            "pronouns": "oni/jejich",
            "avatar": "nb-mint",
            "location": "",
            "secret_code": "Transfortrans"
        })
        
        if response.status_code != 200:
            pytest.skip("Could not create target user for rating test")
        
        target_user_id = response.json()["user"]["id"]
        
        # Now rate this user
        rate_response = authenticated_client.post(f"{BASE_URL}/api/users/{target_user_id}/rate", json={
            "rating": 5,
            "comment": "Very helpful member!"
        })
        
        assert rate_response.status_code == 200
        data = rate_response.json()
        assert "message" in data
        assert "avg_rating" in data
        assert "rating_count" in data
        print(f"SUCCESS: User rating works - avg: {data['avg_rating']}, count: {data['rating_count']}")

    def test_cannot_rate_self(self, api_client):
        """Test that users cannot rate themselves"""
        # Login first
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test1@bloom.cz",
            "password": "test123"
        })
        
        if login_response.status_code != 200:
            pytest.skip("Login failed - cannot test self-rating")
        
        token = login_response.json()["token"]
        user_id = login_response.json()["user"]["id"]
        
        headers = {"Authorization": f"Bearer {token}"}
        response = api_client.post(f"{BASE_URL}/api/users/{user_id}/rate", json={
            "rating": 5,
            "comment": "Rating myself"
        }, headers=headers)
        
        assert response.status_code == 400
        print("SUCCESS: Self-rating correctly prevented")

    def test_get_user_ratings(self, api_client, random_suffix):
        """Test GET /api/users/{id}/ratings endpoint"""
        # First register and rate a user
        reg_response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"rated_user_{random_suffix}@test.cz",
            "password": "test123456",
            "username": f"RatedUser{random_suffix}",
            "pronouns": "ona/její",
            "avatar": "fem-pink",
            "secret_code": "Transfortrans"
        })
        
        if reg_response.status_code != 200:
            pytest.skip("Could not create user for ratings test")
        
        user_id = reg_response.json()["user"]["id"]
        
        # Get ratings (should be empty initially)
        response = api_client.get(f"{BASE_URL}/api/users/{user_id}/ratings")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Got user ratings - count: {len(data)}")

    def test_get_user_profile(self, api_client):
        """Test GET /api/users/{id}/profile endpoint"""
        # Login first to get a user ID
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test1@bloom.cz",
            "password": "test123"
        })
        
        if login_response.status_code != 200:
            pytest.skip("Login failed - cannot test profile retrieval")
        
        user_id = login_response.json()["user"]["id"]
        
        response = api_client.get(f"{BASE_URL}/api/users/{user_id}/profile")
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "username" in data
        assert "badges" in data
        print(f"SUCCESS: Got user profile with badges: {data.get('badges', [])}")


# ==================== UNREAD MESSAGES ====================
class TestUnreadMessages:
    """Unread message count tests"""

    def test_get_unread_count(self, authenticated_client):
        """Test GET /api/messages/unread-count endpoint"""
        response = authenticated_client.get(f"{BASE_URL}/api/messages/unread-count")
        
        assert response.status_code == 200
        data = response.json()
        assert "count" in data
        assert isinstance(data["count"], int)
        print(f"SUCCESS: Unread message count: {data['count']}")


# ==================== NOTIFICATIONS ====================
class TestNotifications:
    """Notification system tests"""

    def test_get_notifications(self, authenticated_client):
        """Test GET /api/notifications endpoint"""
        response = authenticated_client.get(f"{BASE_URL}/api/notifications")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Got {len(data)} notifications")


# ==================== COMMUNITY HIGHLIGHTS ====================
class TestCommunityHighlights:
    """Community highlights tests"""

    def test_get_community_highlights(self, api_client):
        """Test GET /api/community/highlights endpoint"""
        response = api_client.get(f"{BASE_URL}/api/community/highlights")
        
        assert response.status_code == 200
        data = response.json()
        assert "new_members" in data
        assert "active_helpers" in data
        assert "top_specialists" in data
        assert isinstance(data["new_members"], list)
        assert isinstance(data["active_helpers"], list)
        assert isinstance(data["top_specialists"], list)
        print(f"SUCCESS: Community highlights - new members: {len(data['new_members'])}, active helpers: {len(data['active_helpers'])}, top specialists: {len(data['top_specialists'])}")


# ==================== ADMIN ROLE MANAGEMENT ====================
class TestAdminRoleManagement:
    """Admin role management tests"""

    def test_admin_setup_first_admin_wrong_secret(self, api_client):
        """Test admin setup with wrong secret fails"""
        response = api_client.post(f"{BASE_URL}/api/admin/setup-first-admin", json={"email": "test@test.cz", "secret": "wrongsecret"})
        
        assert response.status_code == 403
        print("SUCCESS: Admin setup with wrong secret rejected")

    def test_get_admin_users_unauthorized(self, api_client):
        """Test that non-admin cannot access admin users list"""
        # Login as regular user
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test1@bloom.cz",
            "password": "test123"
        })
        
        if login_response.status_code != 200:
            pytest.skip("Login failed")
        
        token = login_response.json()["token"]
        user = login_response.json()["user"]
        
        if user.get("role") == "admin":
            pytest.skip("User is already admin - cannot test unauthorized access")
        
        headers = {"Authorization": f"Bearer {token}"}
        response = api_client.get(f"{BASE_URL}/api/admin/users", headers=headers)
        
        assert response.status_code == 403
        print("SUCCESS: Non-admin cannot access admin users")


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

    def test_get_specialists_with_region_filter(self, api_client):
        """Test specialists region filter"""
        response = api_client.get(f"{BASE_URL}/api/specialists?region=Praha")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Retrieved {len(data)} specialists in Praha region")


# ==================== NEWS ====================
class TestNews:
    """News endpoint tests with category filters"""

    def test_get_news(self, api_client):
        """Test getting news list"""
        response = api_client.get(f"{BASE_URL}/api/news")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Retrieved {len(data)} news items")

    def test_get_news_by_category_world(self, api_client):
        """Test news filter - Ze světa (world)"""
        response = api_client.get(f"{BASE_URL}/api/news?category=world")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Retrieved {len(data)} world news items")

    def test_get_news_by_category_local(self, api_client):
        """Test news filter - Domácí (local)"""
        response = api_client.get(f"{BASE_URL}/api/news?category=local")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Retrieved {len(data)} local news items")

    def test_get_news_by_category_tips(self, api_client):
        """Test news filter - Tipy a triky (tips)"""
        response = api_client.get(f"{BASE_URL}/api/news?category=tips")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Retrieved {len(data)} tips news items")

    def test_get_news_by_category_events(self, api_client):
        """Test news filter - Eventy (events)"""
        response = api_client.get(f"{BASE_URL}/api/news?category=events")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Retrieved {len(data)} events news items")

    def test_get_news_by_category_interviews(self, api_client):
        """Test news filter - Rozhovory (interviews)"""
        response = api_client.get(f"{BASE_URL}/api/news?category=interviews")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Retrieved {len(data)} interviews news items")


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


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
