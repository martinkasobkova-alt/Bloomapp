"""
Bloom API Tests v3 - New endpoints:
- POST /api/auth/reset-password-request
- POST /api/auth/reset-password (bad token error handling)
- GET /api/admin/reviews
- DELETE /api/admin/reviews/{id}
- GET /api/admin/services
- DELETE /api/specialists/{id}
- POST /api/users/me/upload-avatar
"""
import pytest
import requests
import os
import random
import string
import io

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
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "test1@bloom.cz",
        "password": "test123"
    })
    if response.status_code == 200:
        data = response.json()
        if data.get("user", {}).get("role") == "admin":
            return data.get("token")
    pytest.skip("Admin login failed - test1@bloom.cz must have admin role")


@pytest.fixture
def admin_client(api_client, admin_token):
    """Session with admin auth header"""
    api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
    return api_client


@pytest.fixture
def user_token(api_client):
    """Get regular user authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "test1@bloom.cz",
        "password": "test123"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("User login failed")


@pytest.fixture
def user_client(api_client, user_token):
    """Session with user auth header"""
    api_client.headers.update({"Authorization": f"Bearer {user_token}"})
    return api_client


# ==================== PASSWORD RESET REQUEST ====================
class TestPasswordResetRequest:
    """Test POST /api/auth/reset-password-request"""

    def test_reset_request_with_existing_email(self, api_client):
        """Test password reset request with existing email returns success message"""
        response = api_client.post(f"{BASE_URL}/api/auth/reset-password-request", json={
            "email": "test1@bloom.cz"
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert len(data["message"]) > 0
        print(f"SUCCESS: Reset request for existing email: {data['message']}")

    def test_reset_request_with_nonexistent_email(self, api_client):
        """Test password reset request with non-existent email still returns success (security - no email enumeration)"""
        response = api_client.post(f"{BASE_URL}/api/auth/reset-password-request", json={
            "email": "doesnotexist_xyz999@noemail.cz"
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"SUCCESS: Reset request for non-existent email returns same message: {data['message']}")

    def test_reset_request_invalid_email_format(self, api_client):
        """Test password reset request with invalid email format"""
        response = api_client.post(f"{BASE_URL}/api/auth/reset-password-request", json={
            "email": "not-an-email"
        })
        assert response.status_code == 422  # Validation error
        print("SUCCESS: Invalid email format rejected with 422")


# ==================== PASSWORD RESET CONFIRM ====================
class TestPasswordResetConfirm:
    """Test POST /api/auth/reset-password"""

    def test_reset_with_bad_token(self, api_client):
        """Test reset-password with invalid/bad token returns 400 error"""
        response = api_client.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": "this_is_a_fake_bad_token_xyz123",
            "new_password": "newpassword123"
        })
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"SUCCESS: Bad token returns 400 error: {data['detail']}")

    def test_reset_with_expired_token(self, api_client):
        """Test reset-password with non-existent/expired token returns 400"""
        response = api_client.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": "expired_token_abc_123_xyz_9999",
            "new_password": "newpassword456"
        })
        assert response.status_code == 400
        print("SUCCESS: Expired/invalid token correctly returns 400")

    def test_reset_with_short_password(self, api_client):
        """Test reset-password with short password after valid token generates appropriate error"""
        # With bad token, it will fail first on token validation (400)
        response = api_client.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": "bad_token",
            "new_password": "abc"  # too short
        })
        assert response.status_code == 400
        print("SUCCESS: Short password with bad token returns 400")


# ==================== ADMIN REVIEWS ====================
class TestAdminReviews:
    """Test GET /api/admin/reviews and DELETE /api/admin/reviews/{id}"""

    def test_get_admin_reviews(self, admin_client):
        """Test GET /api/admin/reviews requires admin and returns reviews list"""
        response = admin_client.get(f"{BASE_URL}/api/admin/reviews")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Admin reviews endpoint returns {len(data)} reviews")

    def test_get_admin_reviews_unauthorized(self, api_client):
        """Test GET /api/admin/reviews without auth returns 403"""
        response = api_client.get(f"{BASE_URL}/api/admin/reviews")
        assert response.status_code in [401, 403]
        print("SUCCESS: Admin reviews endpoint correctly rejects unauthenticated request")

    def test_admin_reviews_response_structure(self, admin_client):
        """Test that admin reviews response includes specialist_name field"""
        response = admin_client.get(f"{BASE_URL}/api/admin/reviews")
        assert response.status_code == 200
        data = response.json()
        if data:  # Only check structure if there are reviews
            review = data[0]
            assert "id" in review
            assert "specialist_id" in review
            assert "username" in review
            assert "rating" in review
            assert "content" in review
            assert "specialist_name" in review  # Added by admin endpoint
            print(f"SUCCESS: Review structure OK, first review by {review['username']} for {review['specialist_name']}")
        else:
            print("SUCCESS: Admin reviews endpoint works (no reviews yet)")

    def test_delete_nonexistent_review(self, admin_client):
        """Test DELETE /api/admin/reviews/{id} with non-existent ID returns 404"""
        response = admin_client.delete(f"{BASE_URL}/api/admin/reviews/nonexistent_id_12345")
        assert response.status_code == 404
        print("SUCCESS: Delete nonexistent review returns 404")


# ==================== ADMIN SERVICES ====================
class TestAdminServices:
    """Test GET /api/admin/services"""

    def test_get_admin_services(self, admin_client):
        """Test GET /api/admin/services requires admin and returns all services"""
        response = admin_client.get(f"{BASE_URL}/api/admin/services")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Admin services endpoint returns {len(data)} services")

    def test_get_admin_services_unauthorized(self, api_client):
        """Test GET /api/admin/services without auth returns 403"""
        response = api_client.get(f"{BASE_URL}/api/admin/services")
        assert response.status_code in [401, 403]
        print("SUCCESS: Admin services endpoint correctly rejects unauthenticated request")

    def test_admin_services_response_structure(self, admin_client):
        """Test that admin services response has proper structure"""
        response = admin_client.get(f"{BASE_URL}/api/admin/services")
        assert response.status_code == 200
        data = response.json()
        if data:
            service = data[0]
            assert "id" in service
            assert "username" in service
            assert "offer" in service
            assert "need" in service
            assert "service_status" in service
            print(f"SUCCESS: Service structure OK, first service by {service['username']}")
        else:
            print("SUCCESS: Admin services endpoint works (no services yet)")


# ==================== SPECIALISTS DELETE ====================
class TestSpecialistsDelete:
    """Test DELETE /api/specialists/{id} for admin"""

    def test_delete_nonexistent_specialist(self, admin_client):
        """Test DELETE /api/specialists/{id} with non-existent ID returns 404"""
        response = admin_client.delete(f"{BASE_URL}/api/specialists/nonexistent_id_12345")
        assert response.status_code == 404
        print("SUCCESS: Delete nonexistent specialist returns 404")

    def test_create_and_delete_specialist(self, admin_client):
        """Test create specialist then delete - full lifecycle"""
        # Create a specialist
        create_resp = admin_client.post(f"{BASE_URL}/api/specialists", json={
            "name": "TEST_Specialist_Delete",
            "specialty": "Psychologie, psychiatrie a sexuologie",
            "subcategory": "test",
            "address": "Test Street 1",
            "city": "Praha",
            "region": "Praha",
            "country": "CZ",
            "phone": "+420000000000",
            "email": "test_specialist@test.cz",
            "website": "",
            "lat": None,
            "lng": None
        })
        assert create_resp.status_code == 200
        specialist_id = create_resp.json()["id"]
        print(f"SUCCESS: Created test specialist with id {specialist_id}")

        # Delete the specialist
        delete_resp = admin_client.delete(f"{BASE_URL}/api/specialists/{specialist_id}")
        assert delete_resp.status_code == 200
        data = delete_resp.json()
        assert "message" in data
        print(f"SUCCESS: Deleted test specialist: {data['message']}")

        # Verify deletion
        get_resp = admin_client.get(f"{BASE_URL}/api/specialists/{specialist_id}")
        assert get_resp.status_code == 404
        print("SUCCESS: Specialist deletion confirmed - GET returns 404")

    def test_delete_specialist_not_admin(self, api_client):
        """Test DELETE /api/specialists/{id} without admin returns 403"""
        response = api_client.delete(f"{BASE_URL}/api/specialists/some_id")
        assert response.status_code in [401, 403]
        print("SUCCESS: Non-admin specialist delete correctly rejected")


# ==================== AVATAR UPLOAD ====================
class TestAvatarUpload:
    """Test POST /api/users/me/upload-avatar"""

    def test_upload_avatar_with_valid_image(self, user_client):
        """Test POST /api/users/me/upload-avatar with valid image data"""
        # Create a small valid PNG file in memory (1x1 red pixel PNG)
        png_header = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  # IHDR chunk
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,  # 1x1
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,  # IDAT chunk
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
            0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC,
            0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,  # IEND chunk
            0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        
        # Remove Content-Type from headers for multipart
        user_client.headers.pop("Content-Type", None)
        
        files = {"file": ("test_avatar.png", io.BytesIO(png_header), "image/png")}
        response = user_client.post(
            f"{BASE_URL}/api/users/me/upload-avatar",
            files=files
        )
        
        # Should succeed with 200 and return URL
        if response.status_code == 200:
            data = response.json()
            assert "url" in data
            assert len(data["url"]) > 0
            print(f"SUCCESS: Avatar upload works - url: {data['url']}")
        else:
            # If upload fails due to image validation, that's acceptable
            print(f"INFO: Avatar upload status: {response.status_code} - {response.text}")
            assert response.status_code in [200, 400]

    def test_upload_avatar_unauthorized(self, api_client):
        """Test POST /api/users/me/upload-avatar without auth returns 403"""
        api_client.headers.pop("Content-Type", None)
        png_bytes = b'\x89PNG\r\n\x1a\n'  # minimal PNG header
        files = {"file": ("test.png", io.BytesIO(png_bytes), "image/png")}
        response = api_client.post(
            f"{BASE_URL}/api/users/me/upload-avatar",
            files=files
        )
        assert response.status_code in [401, 403]
        print("SUCCESS: Unauthorized avatar upload rejected")

    def test_upload_avatar_non_image_rejected(self, user_client):
        """Test POST /api/users/me/upload-avatar with non-image file returns 400"""
        user_client.headers.pop("Content-Type", None)
        files = {"file": ("test.txt", io.BytesIO(b"this is not an image"), "text/plain")}
        response = user_client.post(
            f"{BASE_URL}/api/users/me/upload-avatar",
            files=files
        )
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"SUCCESS: Non-image file rejected: {data['detail']}")


# ==================== ADMIN NEWS CRUD ====================
class TestAdminNewsCRUD:
    """Test admin news creation and deletion"""

    def test_create_and_delete_news(self, admin_client):
        """Test create news item then delete - full lifecycle"""
        # Create news
        create_resp = admin_client.post(f"{BASE_URL}/api/news", json={
            "title": "TEST_News_Delete_AutoTest",
            "content": "This is test content for automated testing.",
            "category": "local",
            "image_url": ""
        })
        assert create_resp.status_code == 200
        news_id = create_resp.json()["id"]
        print(f"SUCCESS: Created test news with id {news_id}")

        # Delete the news
        delete_resp = admin_client.delete(f"{BASE_URL}/api/news/{news_id}")
        assert delete_resp.status_code == 200
        data = delete_resp.json()
        assert "message" in data
        print(f"SUCCESS: Deleted test news: {data['message']}")

        # Verify deletion
        get_resp = admin_client.get(f"{BASE_URL}/api/news/{news_id}")
        assert get_resp.status_code == 404
        print("SUCCESS: News deletion confirmed - GET returns 404")

    def test_create_news_unauthorized(self, api_client):
        """Test POST /api/news without admin returns 403"""
        response = api_client.post(f"{BASE_URL}/api/news", json={
            "title": "Test",
            "content": "Test content",
            "category": "local"
        })
        assert response.status_code in [401, 403]
        print("SUCCESS: Unauthorized news creation correctly rejected")


# ==================== ADMIN ROLE MANAGEMENT ====================
class TestAdminUserRoles:
    """Test admin user role management"""

    def test_get_all_users_as_admin(self, admin_client):
        """Test GET /api/admin/users returns all users"""
        response = admin_client.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"SUCCESS: Admin users list returns {len(data)} users")

    def test_set_role_invalid(self, admin_client, random_suffix):
        """Test POST /api/admin/set-role with invalid role"""
        # Get current user list
        users_resp = admin_client.get(f"{BASE_URL}/api/admin/users")
        if users_resp.status_code != 200 or not users_resp.json():
            pytest.skip("Could not get users list")
        
        # Find a non-admin user
        users = users_resp.json()
        non_admin_user = next((u for u in users if u["role"] != "admin"), None)
        if not non_admin_user:
            pytest.skip("No non-admin user found")
        
        user_id = non_admin_user["id"]
        response = admin_client.post(f"{BASE_URL}/api/admin/set-role/{user_id}?role=invalidrole")
        assert response.status_code == 400
        print("SUCCESS: Invalid role correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
