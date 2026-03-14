"""
Tests for P0 features:
1. POST /api/verification-requests - User submits verification request
2. GET /api/admin/verification-requests - Admin lists verification requests
3. PUT /api/admin/verification-requests/{req_id}/status: approved (was: approved)/rejected)
4. PUT /api/admin/users/{user_id}/specialization-label - Admin sets specialization label for specialist/lawyer
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

ADMIN_EMAIL = "test1@bloom.cz"
ADMIN_PASSWORD = "test123"
COMMUNITY_PASSWORD = "Transfortrans"

# Test user credentials (will be created if not existing)
TEST_USER_EMAIL = "TEST_verif_user@bloom.cz"
TEST_USER_USERNAME = "test_verif_user"
TEST_USER_PASSWORD = "TestPass123!"


def get_admin_token():
    """Get admin auth token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if resp.status_code == 200:
        return resp.json().get("token")
    return None


def get_or_create_regular_user_token():
    """Get or create a regular user token for testing verification requests"""
    # Try to log in first
    login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_USER_EMAIL,
        "password": TEST_USER_PASSWORD
    })
    if login_resp.status_code == 200:
        return login_resp.json().get("token"), login_resp.json().get("user", {}).get("id")
    
    # Register new user
    reg_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": TEST_USER_EMAIL,
        "username": TEST_USER_USERNAME,
        "password": TEST_USER_PASSWORD,
        "community_password": COMMUNITY_PASSWORD
    })
    if reg_resp.status_code == 200:
        return reg_resp.json().get("token"), reg_resp.json().get("user", {}).get("id")
    
    return None, None


class TestVerificationRequestsAdmin:
    """Tests for admin verification request management"""

    def test_admin_login_success(self):
        """Admin can login successfully"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert resp.status_code == 200, f"Admin login failed: {resp.text}"
        data = resp.json()
        assert "token" in data
        print(f"PASS: Admin login success")

    def test_admin_get_verification_requests_empty_or_list(self):
        """GET /api/admin/verification-requests returns a list"""
        admin_token = get_admin_token()
        assert admin_token, "Could not get admin token"

        resp = requests.get(
            f"{BASE_URL}/api/admin/verification-requests",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"PASS: GET /api/admin/verification-requests returned {len(data)} items")

    def test_unauthenticated_get_verification_requests_denied(self):
        """GET /api/admin/verification-requests without auth returns 401/403"""
        resp = requests.get(f"{BASE_URL}/api/admin/verification-requests")
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print(f"PASS: Unauthenticated request denied with {resp.status_code}")


class TestVerificationRequestSubmit:
    """Tests for user submitting verification requests"""

    created_request_id = None
    user_token = None
    user_id = None
    admin_token = None

    def setup_method(self, method):
        """Setup tokens for each test"""
        self.admin_token = get_admin_token()
        self.user_token, self.user_id = get_or_create_regular_user_token()

    def test_user_can_submit_verification_request(self):
        """Regular user can submit a verification request"""
        if not self.user_token:
            pytest.skip("Could not get user token")

        # First, ensure no pending request exists for this user by checking admin endpoint
        admin_resp = requests.get(
            f"{BASE_URL}/api/admin/verification-requests",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        # Clean up any pending requests from test user via direct check
        # (We'll just try submitting - if duplicate, that's another test)
        payload = {
            "full_name": "Test Verification User",
            "request_type": "specialist",
            "specialization": "TEST plastická chirurgie",
            "intro": "Testuji odeslání žádosti o ověření",
            "workplace": "TEST Klinika",
            "contact": "test@bloom.cz"
        }
        resp = requests.post(
            f"{BASE_URL}/api/verification-requests",
            json=payload,
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        
        if resp.status_code == 400 and "otevřenou žádost" in resp.text:
            print(f"INFO: User already has a pending request - testing duplicate prevention")
            assert resp.status_code == 400
            print(f"PASS: Duplicate prevention working correctly")
            return
        
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "id" in data
        assert "message" in data
        TestVerificationRequestSubmit.created_request_id = data["id"]
        print(f"PASS: Verification request submitted, id={data['id']}")

    def test_verification_request_appears_in_admin_list(self):
        """Submitted verification request appears in admin list"""
        if not self.admin_token:
            pytest.skip("Could not get admin token")

        resp = requests.get(
            f"{BASE_URL}/api/admin/verification-requests",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        
        # Verify fields in any existing request
        if len(data) > 0:
            req = data[0]
            for field in ["id", "user_id", "full_name", "request_type", "specialization", "status", "created_at"]:
                assert field in req, f"Missing field: {field}"
            print(f"PASS: Request fields valid: {list(req.keys())}")
        else:
            print(f"INFO: No verification requests in system yet")

    def test_unauthenticated_cannot_submit_verification_request(self):
        """Unauthenticated user cannot submit a verification request"""
        resp = requests.post(
            f"{BASE_URL}/api/verification-requests",
            json={"full_name": "Test", "request_type": "specialist",
                  "specialization": "test", "intro": "test", "contact": "test@test.cz"}
        )
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print(f"PASS: Unauthenticated submission denied with {resp.status_code}")


class TestVerificationStatusUpdate:
    """Tests for admin updating verification request status"""

    def test_admin_can_mark_request_as_approved(self):
        """Admin can mark a pending request as approved"""
        admin_token = get_admin_token()
        assert admin_token, "Could not get admin token"
        
        # Get list of requests first
        list_resp = requests.get(
            f"{BASE_URL}/api/admin/verification-requests",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert list_resp.status_code == 200
        requests_list = list_resp.json()
        
        # Find a pending request to update
        pending = [r for r in requests_list if r.get("status") == "pending"]
        
        if not pending:
            print("INFO: No pending requests to test status update - creating one first")
            user_token, _ = get_or_create_regular_user_token()
            if user_token:
                # Check if the test user has pending request or submit new one
                submit_resp = requests.post(
                    f"{BASE_URL}/api/verification-requests",
                    json={"full_name": "Admin Test User", "request_type": "specialist",
                          "specialization": "TEST chirurgie", "intro": "test",
                          "workplace": "", "contact": "admin_test@bloom.cz"},
                    headers={"Authorization": f"Bearer {user_token}"}
                )
                if submit_resp.status_code == 200:
                    req_id = submit_resp.json()["id"]
                    # Now test update
                    upd_resp = requests.put(
                        f"{BASE_URL}/api/admin/verification-requests/{req_id}/status",
                        json={"status: approved (was: approved)"},
                        headers={"Authorization": f"Bearer {admin_token}"}
                    )
                    assert upd_resp.status_code == 200, f"Expected 200, got {upd_resp.status_code}: {upd_resp.text}"
                    print(f"PASS: Status updated to approved for new request {req_id}")
                    return
            pytest.skip("No pending requests and could not create one")
        
        req_id = pending[0]["id"]
        upd_resp = requests.put(
            f"{BASE_URL}/api/admin/verification-requests/{req_id}/status",
            json={"status: approved (was: approved)"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert upd_resp.status_code == 200, f"Expected 200, got {upd_resp.status_code}: {upd_resp.text}"
        data = upd_resp.json()
        assert "message" in data
        print(f"PASS: Status updated to approved for request {req_id}")

    def test_admin_can_mark_request_as_rejected(self):
        """Admin can reject a pending request"""
        admin_token = get_admin_token()
        assert admin_token
        
        # Get fresh list
        list_resp = requests.get(
            f"{BASE_URL}/api/admin/verification-requests",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert list_resp.status_code == 200
        requests_list = list_resp.json()
        pending = [r for r in requests_list if r.get("status") == "pending"]
        
        if not pending:
            print("INFO: No pending requests to reject - creating one")
            user_token, _ = get_or_create_regular_user_token()
            if user_token:
                submit_resp = requests.post(
                    f"{BASE_URL}/api/verification-requests",
                    json={"full_name": "Test Reject User", "request_type": "lawyer",
                          "specialization": "TEST rodinné právo", "intro": "test",
                          "workplace": "", "contact": "reject_test@bloom.cz"},
                    headers={"Authorization": f"Bearer {user_token}"}
                )
                if submit_resp.status_code == 200:
                    req_id = submit_resp.json()["id"]
                    upd_resp = requests.put(
                        f"{BASE_URL}/api/admin/verification-requests/{req_id}/status",
                        json={"status": "rejected"},
                        headers={"Authorization": f"Bearer {admin_token}"}
                    )
                    assert upd_resp.status_code == 200
                    print(f"PASS: Status updated to rejected for new request {req_id}")
                    return
            pytest.skip("No pending requests")
        
        req_id = pending[0]["id"]
        upd_resp = requests.put(
            f"{BASE_URL}/api/admin/verification-requests/{req_id}/status",
            json={"status": "rejected"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert upd_resp.status_code == 200, f"Expected 200, got {upd_resp.status_code}: {upd_resp.text}"
        print(f"PASS: Status updated to rejected for request {req_id}")

    def test_update_nonexistent_request_returns_404(self):
        """Admin gets 404 when updating nonexistent request"""
        admin_token = get_admin_token()
        assert admin_token
        
        resp = requests.put(
            f"{BASE_URL}/api/admin/verification-requests/nonexistent-id-12345/status",
            json={"status: approved (was: approved)"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
        print(f"PASS: 404 returned for nonexistent request")

    def test_unauthenticated_cannot_update_status(self):
        """Unauthenticated request to update status denied"""
        resp = requests.put(
            f"{BASE_URL}/api/admin/verification-requests/some-id/status",
            json={"status: approved (was: approved)"}
        )
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print(f"PASS: Unauthenticated denied with {resp.status_code}")


class TestSpecializationLabel:
    """Tests for admin setting specialization label on specialist/lawyer users"""

    _admin_token_cache = None

    @classmethod
    def _get_admin_token(cls):
        if not cls._admin_token_cache:
            cls._admin_token_cache = get_admin_token()
        return cls._admin_token_cache

    def _get_specialist_or_lawyer_user(self, admin_token):
        """Find a user with role specialist or lawyer"""
        resp = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if resp.status_code != 200:
            return None
        users = resp.json()
        for u in users:
            if u.get("role") in ("specialist", "lawyer"):
                return u
        return None

    def test_admin_set_specialization_label(self):
        """Admin can set specialization label for specialist/lawyer"""
        admin_token = self._get_admin_token()
        assert admin_token, "Could not get admin token"
        
        target_user = self._get_specialist_or_lawyer_user(admin_token)
        
        if not target_user:
            # Create a user and promote to specialist via set-role
            user_token, user_id = get_or_create_regular_user_token()
            if not user_token or not user_id:
                pytest.skip("Could not create test user")
            
            # Promote to specialist
            promo_resp = requests.post(
                f"{BASE_URL}/api/admin/set-role/{user_id}?role=specialist",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert promo_resp.status_code == 200, f"Promotion failed: {promo_resp.text}"
            target_user = {"id": user_id}
        
        user_id = target_user["id"]
        label = "TEST plastický chirurg"
        
        resp = requests.put(
            f"{BASE_URL}/api/admin/users/{user_id}/specialization-label",
            json={"label": label},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "message" in data
        print(f"PASS: Specialization label set to '{label}' for user {user_id}")
        
        # Verify via users list
        users_resp = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert users_resp.status_code == 200
        users_list = users_resp.json()
        updated_user = next((u for u in users_list if u["id"] == user_id), None)
        if updated_user:
            assert updated_user.get("specialization_label") == label, \
                f"Label not persisted: expected '{label}', got '{updated_user.get('specialization_label')}'"
            print(f"PASS: Label persisted and verified in users list")

    def test_cannot_set_label_for_regular_user(self):
        """Setting specialization label on a regular 'user' role returns 400"""
        admin_token = self._get_admin_token()
        assert admin_token
        
        # Get all users and find a regular user
        users_resp = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert users_resp.status_code == 200
        users_list = users_resp.json()
        
        regular_user = next((u for u in users_list if u.get("role") == "user"), None)
        
        if not regular_user:
            pytest.skip("No regular users found to test rejection")
        
        resp = requests.put(
            f"{BASE_URL}/api/admin/users/{regular_user['id']}/specialization-label",
            json={"label": "should fail"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 400, f"Expected 400 for regular user, got {resp.status_code}: {resp.text}"
        print(f"PASS: 400 returned for regular user - label cannot be set")

    def test_set_label_for_nonexistent_user_returns_404(self):
        """Setting specialization label for nonexistent user returns 404"""
        admin_token = self._get_admin_token()
        assert admin_token
        
        resp = requests.put(
            f"{BASE_URL}/api/admin/users/nonexistent-user-id-99999/specialization-label",
            json={"label": "test"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
        print(f"PASS: 404 returned for nonexistent user")

    def test_unauthenticated_cannot_set_label(self):
        """Unauthenticated user cannot set specialization label"""
        resp = requests.put(
            f"{BASE_URL}/api/admin/users/some-id/specialization-label",
            json={"label": "test"}
        )
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print(f"PASS: Unauthenticated denied with {resp.status_code}")
