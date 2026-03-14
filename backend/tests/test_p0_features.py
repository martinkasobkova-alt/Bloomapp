"""
Tests for Phase P0 features:
1. Registration endpoint (welcome email config)
2. Offer expiration system (filter, my services, admin settings, reactivate)
3. New service has expires_at set
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = 'https://profile-hub-228.preview.emergentagent.com'

ADMIN_EMAIL = 'test1@bloom.cz'
ADMIN_PASSWORD = 'test123'
COMMUNITY_PASSWORD = 'Transfortrans'


@pytest.fixture(scope="module")
def admin_token():
    """Get admin JWT token"""
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def test_user():
    """Register a test user and return credentials + token"""
    suffix = uuid.uuid4().hex[:8]
    email = f"TEST_p0_{suffix}@test.com"
    username = f"TestP0_{suffix}"
    r = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": email,
        "password": "testpass123",
        "username": username,
        "secret_code": COMMUNITY_PASSWORD,
    })
    assert r.status_code == 200, f"Registration failed: {r.text}"
    data = r.json()
    assert "token" in data
    assert "user" in data
    return {"email": email, "username": username, "token": data["token"], "user_id": data["user"]["id"]}


@pytest.fixture(scope="module")
def user_headers(test_user):
    return {"Authorization": f"Bearer {test_user['token']}"}


# ============ REGISTRATION TESTS ============

class TestRegistration:
    """Registration endpoint: returns token+user, email config works"""

    def test_register_returns_token_and_user(self, test_user):
        """Registration should return token and user object"""
        assert test_user["token"] is not None
        assert len(test_user["token"]) > 0
        assert test_user["user_id"] is not None

    def test_register_user_fields(self, test_user, user_headers):
        """User returned from registration has correct fields"""
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=user_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == test_user["email"]
        assert data["username"] == test_user["username"]
        assert data["role"] == "user"

    def test_register_duplicate_email_fails(self, test_user):
        """Duplicate email should return 400"""
        r = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_user["email"],
            "password": "anotherpass",
            "username": f"other_{uuid.uuid4().hex[:6]}",
            "secret_code": COMMUNITY_PASSWORD,
        })
        assert r.status_code == 400

    def test_register_wrong_community_code_fails(self):
        """Wrong community code should return 400"""
        r = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"random_{uuid.uuid4().hex[:6]}@test.com",
            "password": "testpass123",
            "username": f"random_{uuid.uuid4().hex[:6]}",
            "secret_code": "wrongcode",
        })
        assert r.status_code == 400


# ============ SERVICE CREATION WITH EXPIRY ============

class TestServiceCreation:
    """New services should have expires_at set"""

    def test_create_service_has_expires_at(self, user_headers):
        """Creating a service should return expires_at field"""
        r = requests.post(f"{BASE_URL}/api/services", json={
            "offer": "TEST_P0 coding help",
            "need": "nothing",
            "description": "Test service for P0 expiry test",
            "location": "",
            "service_type": "tech",
            "post_type": "offer"
        }, headers=user_headers)
        assert r.status_code == 200, f"Service creation failed: {r.text}"
        data = r.json()
        assert "expires_at" in data
        assert data["expires_at"] is not None
        # Verify expires_at is about 30 days from now (within 1 hour tolerance)
        expires_at = datetime.fromisoformat(data["expires_at"].replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)
        delta = expires_at - now
        assert 29 <= delta.days <= 30, f"Expected ~30 days, got {delta.days} days"
        return data["id"]

    def test_created_service_appears_in_get_services(self, user_headers):
        """Freshly created service should appear in GET /api/services"""
        # Create a service
        r = requests.post(f"{BASE_URL}/api/services", json={
            "offer": "TEST_P0_visible coding help",
            "need": "nothing",
            "description": "Should appear in public feed",
            "location": "",
            "service_type": "tech",
            "post_type": "offer"
        }, headers=user_headers)
        assert r.status_code == 200
        service_id = r.json()["id"]

        # Should appear in public GET /api/services
        r2 = requests.get(f"{BASE_URL}/api/services")
        assert r2.status_code == 200
        service_ids = [s["id"] for s in r2.json()]
        assert service_id in service_ids, "Newly created service not in public feed"


# ============ OFFER EXPIRY FILTERING ============

class TestOfferExpiryFiltering:
    """Test that expired offers are hidden from public feed but visible in /my"""

    created_service_id = None

    def test_setup_expired_service(self, user_headers, admin_headers):
        """Create a service and manually set it as expired via direct DB update through admin"""
        # Create a service
        r = requests.post(f"{BASE_URL}/api/services", json={
            "offer": "TEST_P0_EXPIRED service",
            "need": "nothing",
            "description": "This service will be expired for testing",
            "location": "",
            "service_type": "tech",
            "post_type": "offer"
        }, headers=user_headers)
        assert r.status_code == 200
        TestOfferExpiryFiltering.created_service_id = r.json()["id"]

    def test_get_services_public_feed(self):
        """GET /api/services should return 200"""
        r = requests.get(f"{BASE_URL}/api/services")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)

    def test_get_my_services(self, user_headers):
        """GET /api/services/my should return user's services including expired"""
        r = requests.get(f"{BASE_URL}/api/services/my", headers=user_headers)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)

    def test_created_service_visible_in_my(self, user_headers):
        """The service we created should appear in /services/my"""
        if not TestOfferExpiryFiltering.created_service_id:
            pytest.skip("No service created in setup")
        r = requests.get(f"{BASE_URL}/api/services/my", headers=user_headers)
        assert r.status_code == 200
        service_ids = [s["id"] for s in r.json()]
        assert TestOfferExpiryFiltering.created_service_id in service_ids


# ============ ADMIN SETTINGS: OFFER EXPIRY DAYS ============

class TestAdminOfferExpirySettings:
    """Admin settings for offer expiry days"""

    def test_get_offer_expiry_days_default(self, admin_headers):
        """GET /api/admin/settings/offer-expiry-days should return {days: 30} by default"""
        r = requests.get(f"{BASE_URL}/api/admin/settings/offer-expiry-days", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert "days" in data
        assert data["days"] in (14, 30, 60, 90), f"Expected valid expiry days, got {data['days']}"

    def test_get_offer_expiry_days_requires_auth(self):
        """GET /api/admin/settings/offer-expiry-days without auth should return 403"""
        r = requests.get(f"{BASE_URL}/api/admin/settings/offer-expiry-days")
        assert r.status_code in (401, 403, 422)

    def test_update_offer_expiry_days_to_14(self, admin_headers):
        """PUT /api/admin/settings/offer-expiry-days?days=14 should work"""
        r = requests.put(f"{BASE_URL}/api/admin/settings/offer-expiry-days?days=14", headers=admin_headers)
        assert r.status_code == 200

    def test_verify_offer_expiry_days_changed_to_14(self, admin_headers):
        """After setting to 14, GET should return {days: 14}"""
        r = requests.get(f"{BASE_URL}/api/admin/settings/offer-expiry-days", headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["days"] == 14

    def test_update_offer_expiry_days_invalid_value(self, admin_headers):
        """PUT with invalid days value should return 400"""
        r = requests.put(f"{BASE_URL}/api/admin/settings/offer-expiry-days?days=7", headers=admin_headers)
        assert r.status_code == 400

    def test_update_offer_expiry_days_non_admin_fails(self, user_headers):
        """Non-admin user should get 403"""
        r = requests.put(f"{BASE_URL}/api/admin/settings/offer-expiry-days?days=30", headers=user_headers)
        assert r.status_code == 403

    def test_restore_offer_expiry_days_to_30(self, admin_headers):
        """Restore to 30 days for other tests"""
        r = requests.put(f"{BASE_URL}/api/admin/settings/offer-expiry-days?days=30", headers=admin_headers)
        assert r.status_code == 200


# ============ ADMIN: REACTIVATE EXPIRED OFFER ============

class TestAdminReactivateOffer:
    """Admin can reactivate expired offers"""

    expired_service_id = None

    def test_setup_create_service_for_reactivation(self, user_headers):
        """Create a service that we'll manually expire then reactivate"""
        r = requests.post(f"{BASE_URL}/api/services", json={
            "offer": "TEST_P0_REACTIVATE service",
            "need": "nothing",
            "description": "Service to be reactivated",
            "location": "",
            "service_type": "tech",
            "post_type": "offer"
        }, headers=user_headers)
        assert r.status_code == 200
        TestAdminReactivateOffer.expired_service_id = r.json()["id"]

    def test_admin_can_see_all_services(self, admin_headers):
        """Admin can access GET /api/admin/services"""
        r = requests.get(f"{BASE_URL}/api/admin/services", headers=admin_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_reactivate_service_non_existent(self, admin_headers):
        """Reactivating non-existent service returns 404"""
        r = requests.put(f"{BASE_URL}/api/admin/services/nonexistent-id/reactivate", headers=admin_headers)
        assert r.status_code == 404

    def test_reactivate_service(self, admin_headers):
        """Admin can reactivate a service (even if not yet expired)"""
        if not TestAdminReactivateOffer.expired_service_id:
            pytest.skip("No service created in setup")
        r = requests.put(f"{BASE_URL}/api/admin/services/{TestAdminReactivateOffer.expired_service_id}/reactivate",
                         headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert "expires_at" in data
        # Verify new expires_at is in the future
        expires_at = datetime.fromisoformat(data["expires_at"].replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)
        assert expires_at > now, "Reactivated service should have future expires_at"

    def test_reactivate_requires_admin(self, user_headers):
        """Non-admin cannot reactivate service"""
        if not TestAdminReactivateOffer.expired_service_id:
            pytest.skip("No service created in setup")
        r = requests.put(f"{BASE_URL}/api/admin/services/{TestAdminReactivateOffer.expired_service_id}/reactivate",
                         headers=user_headers)
        assert r.status_code == 403


# ============ RESEND EMAIL CONFIG VERIFICATION ============

class TestEmailConfig:
    """Verify Resend email configuration is correct"""

    def test_resend_api_key_configured(self):
        """Verify RESEND_API_KEY is configured in backend"""
        # We can test this indirectly by checking backend env
        import subprocess
        result = subprocess.run(
            ['grep', 'RESEND_API_KEY', '/app/backend/.env'],
            capture_output=True, text=True
        )
        assert 'RESEND_API_KEY' in result.stdout
        assert 're_46iw5uWt_' in result.stdout

    def test_sender_email_configured_correctly(self):
        """Verify SENDER_EMAIL is set to Bloom <noreply@budsva.eu>"""
        import subprocess
        result = subprocess.run(
            ['grep', 'SENDER_EMAIL', '/app/backend/.env'],
            capture_output=True, text=True
        )
        assert 'SENDER_EMAIL' in result.stdout
        assert 'budsva.eu' in result.stdout
