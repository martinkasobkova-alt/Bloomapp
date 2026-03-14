"""
Phase 1 Bug Fixes Tests:
1. Admin user deletion frees email for re-registration
2. GET /api/settings/contact-email (no auth required)
3. PUT /api/admin/settings/contact-email (admin only)
4. POST /api/bug-reports (authenticated)
5. GET /api/admin/bug-reports (admin only)
6. PUT /api/admin/bug-reports/{id}/status
7. Admin send password reset - email template has NO button/link
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
ADMIN_EMAIL = "test1@bloom.cz"
ADMIN_PASSWORD = "test123"
COMMUNITY_PASSWORD = "Transfortrans"


@pytest.fixture(scope="module")
def admin_token():
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    return resp.json()["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ============ CONTACT EMAIL TESTS ============

class TestContactEmail:
    """Settings contact email endpoint tests"""

    def test_get_contact_email_no_auth_required(self):
        """GET /api/settings/contact-email should work without authentication"""
        resp = requests.get(f"{BASE_URL}/api/settings/contact-email")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "email" in data, "Response should have 'email' field"
        print(f"PASS: GET contact email works without auth, email='{data['email']}'")

    def test_get_contact_email_returns_string(self):
        """Contact email value should be a string (possibly empty)"""
        resp = requests.get(f"{BASE_URL}/api/settings/contact-email")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data["email"], str), f"email should be str, got {type(data['email'])}"
        print(f"PASS: Contact email is string type: '{data['email']}'")

    def test_update_contact_email_admin_only(self, admin_headers):
        """PUT /api/admin/settings/contact-email should require admin auth"""
        # Without auth should fail
        resp_no_auth = requests.put(f"{BASE_URL}/api/admin/settings/contact-email",
                                    json={"email": "test@example.com"})
        assert resp_no_auth.status_code in [401, 403], f"Expected 401/403 without auth, got {resp_no_auth.status_code}"
        print(f"PASS: PUT contact email requires auth (got {resp_no_auth.status_code} without auth)")

    def test_update_contact_email_success(self, admin_headers):
        """PUT /api/admin/settings/contact-email should update the email"""
        test_email = f"test-contact-{uuid.uuid4().hex[:6]}@bloom.cz"
        resp = requests.put(
            f"{BASE_URL}/api/admin/settings/contact-email",
            json={"email": test_email},
            headers=admin_headers
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "message" in data, "Response should have message field"
        print(f"PASS: Contact email updated to {test_email}")

        # Verify with GET
        get_resp = requests.get(f"{BASE_URL}/api/settings/contact-email")
        assert get_resp.status_code == 200
        assert get_resp.json()["email"] == test_email, f"Expected {test_email}, got {get_resp.json()['email']}"
        print(f"PASS: GET verifies contact email updated to {test_email}")

    def test_update_contact_email_invalid(self, admin_headers):
        """PUT /api/admin/settings/contact-email should reject invalid email"""
        resp = requests.put(
            f"{BASE_URL}/api/admin/settings/contact-email",
            json={"email": "not-an-email"},
            headers=admin_headers
        )
        assert resp.status_code in [400, 422], f"Expected 400/422 for invalid email, got {resp.status_code}"
        print(f"PASS: Invalid email rejected with {resp.status_code}")


# ============ BUG REPORTS TESTS ============

class TestBugReports:
    """Bug report API tests"""

    def test_create_bug_report_requires_auth(self):
        """POST /api/bug-reports should require authentication"""
        resp = requests.post(f"{BASE_URL}/api/bug-reports", json={
            "report_type": "app_error",
            "description": "Test bug",
            "page_url": "https://example.com",
            "browser_info": "Mozilla/5.0"
        })
        assert resp.status_code in [401, 403], f"Expected 401/403 without auth, got {resp.status_code}"
        print(f"PASS: POST /api/bug-reports requires auth (got {resp.status_code})")

    def test_create_bug_report_success(self, admin_headers):
        """POST /api/bug-reports should create bug report"""
        unique_desc = f"TEST_bug_{uuid.uuid4().hex[:8]}"
        resp = requests.post(
            f"{BASE_URL}/api/bug-reports",
            json={
                "report_type": "app_error",
                "description": unique_desc,
                "page_url": "https://bloom.example.com/home",
                "browser_info": "Mozilla/5.0 (test)"
            },
            headers=admin_headers
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "message" in data, "Response should have message"
        print(f"PASS: Bug report created successfully, message='{data['message']}'")
        return unique_desc

    def test_get_bug_reports_admin_only(self, admin_headers):
        """GET /api/admin/bug-reports should require admin auth"""
        # Without auth
        resp_no_auth = requests.get(f"{BASE_URL}/api/admin/bug-reports")
        assert resp_no_auth.status_code in [401, 403], f"Expected 401/403 without auth, got {resp_no_auth.status_code}"
        print(f"PASS: GET admin bug-reports requires auth (got {resp_no_auth.status_code})")

    def test_get_bug_reports_returns_list(self, admin_headers):
        """GET /api/admin/bug-reports should return list of reports"""
        resp = requests.get(f"{BASE_URL}/api/admin/bug-reports", headers=admin_headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"PASS: GET admin bug-reports returns list with {len(data)} items")

    def test_create_and_verify_bug_report(self, admin_headers):
        """Create bug report then verify it appears in admin list"""
        unique_desc = f"TEST_integration_{uuid.uuid4().hex[:8]}"
        # Create
        create_resp = requests.post(
            f"{BASE_URL}/api/bug-reports",
            json={
                "report_type": "suggestion",
                "description": unique_desc,
                "page_url": "https://bloom.example.com/test",
                "browser_info": "TestBrowser/1.0 | 1920x1080"
            },
            headers=admin_headers
        )
        assert create_resp.status_code == 200, f"Create failed: {create_resp.text}"

        # Verify in admin list
        list_resp = requests.get(f"{BASE_URL}/api/admin/bug-reports", headers=admin_headers)
        assert list_resp.status_code == 200
        reports = list_resp.json()
        found = [r for r in reports if r.get("description") == unique_desc]
        assert len(found) > 0, f"Created bug report not found in admin list. Looking for: {unique_desc}"
        report = found[0]
        assert report["report_type"] == "suggestion"
        assert report["status"] == "new"
        assert "user_id" in report
        assert "username" in report
        assert report["page_url"] == "https://bloom.example.com/test"
        print(f"PASS: Bug report found in admin list with correct fields. id={report['id']}")
        return report["id"]

    def test_update_bug_report_status(self, admin_headers):
        """PUT /api/admin/bug-reports/{id}/status should update status"""
        # First create a bug report
        unique_desc = f"TEST_status_{uuid.uuid4().hex[:8]}"
        create_resp = requests.post(
            f"{BASE_URL}/api/bug-reports",
            json={
                "report_type": "not_working",
                "description": unique_desc,
                "page_url": "https://bloom.example.com/page",
                "browser_info": "TestBrowser/1.0"
            },
            headers=admin_headers
        )
        assert create_resp.status_code == 200

        # Get the report id
        list_resp = requests.get(f"{BASE_URL}/api/admin/bug-reports", headers=admin_headers)
        reports = list_resp.json()
        found = [r for r in reports if r.get("description") == unique_desc]
        assert len(found) > 0, "Bug report not found in admin list"
        report_id = found[0]["id"]

        # Update status to investigating
        update_resp = requests.put(
            f"{BASE_URL}/api/admin/bug-reports/{report_id}/status",
            json={"status": "investigating"},
            headers=admin_headers
        )
        assert update_resp.status_code == 200, f"Expected 200, got {update_resp.status_code}: {update_resp.text}"
        print(f"PASS: Status updated to 'investigating' for report {report_id}")

        # Update to fixed
        fix_resp = requests.put(
            f"{BASE_URL}/api/admin/bug-reports/{report_id}/status",
            json={"status": "fixed"},
            headers=admin_headers
        )
        assert fix_resp.status_code == 200, f"Expected 200, got {fix_resp.status_code}: {fix_resp.text}"
        print(f"PASS: Status updated to 'fixed' for report {report_id}")

    def test_update_bug_report_status_invalid(self, admin_headers):
        """PUT /api/admin/bug-reports/{id}/status should reject invalid status"""
        # Get any existing report
        list_resp = requests.get(f"{BASE_URL}/api/admin/bug-reports", headers=admin_headers)
        reports = list_resp.json()
        if not reports:
            pytest.skip("No bug reports to test status update")
        report_id = reports[0]["id"]

        resp = requests.put(
            f"{BASE_URL}/api/admin/bug-reports/{report_id}/status",
            json={"status": "invalid_status"},
            headers=admin_headers
        )
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}: {resp.text}"
        print(f"PASS: Invalid status rejected with 400")

    def test_bug_report_all_types_accepted(self, admin_headers):
        """All valid bug report types should be accepted"""
        valid_types = ["app_error", "not_working", "suggestion", "security", "other"]
        for rtype in valid_types:
            resp = requests.post(
                f"{BASE_URL}/api/bug-reports",
                json={
                    "report_type": rtype,
                    "description": f"TEST_{rtype}_{uuid.uuid4().hex[:6]}",
                    "page_url": "",
                    "browser_info": ""
                },
                headers=admin_headers
            )
            assert resp.status_code == 200, f"Type {rtype} rejected: {resp.text}"
        print(f"PASS: All {len(valid_types)} bug report types accepted")


# ============ ADMIN USER DELETION + RE-REGISTRATION TESTS ============

class TestAdminUserDeletion:
    """Admin user deletion frees email for re-registration"""

    def test_register_delete_reregister_same_email(self, admin_headers):
        """
        Flow: Register new user -> admin deletes -> re-register same email must succeed
        """
        # Step 1: Register new test user
        test_email = f"TEST_delete_{uuid.uuid4().hex[:8]}@bloom.cz"
        test_username = f"testdel_{uuid.uuid4().hex[:6]}"

        register_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "testpass123",
            "username": test_username,
            "secret_code": COMMUNITY_PASSWORD
        })
        assert register_resp.status_code == 200, f"Registration failed: {register_resp.text}"
        new_user_id = register_resp.json()["user"]["id"]
        print(f"STEP 1 PASS: Registered user {test_email} with id={new_user_id}")

        # Step 2: Admin deletes the user
        delete_resp = requests.delete(
            f"{BASE_URL}/api/admin/users/{new_user_id}",
            headers=admin_headers
        )
        assert delete_resp.status_code == 200, f"Admin delete failed: {delete_resp.text}"
        print(f"STEP 2 PASS: Admin deleted user {new_user_id}")

        # Step 3: Re-register with same email (different username to avoid username collision)
        new_username = f"testdel2_{uuid.uuid4().hex[:6]}"
        reregister_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "newpass456",
            "username": new_username,
            "secret_code": COMMUNITY_PASSWORD
        })
        assert reregister_resp.status_code == 200, (
            f"Re-registration with deleted email failed: {reregister_resp.status_code} {reregister_resp.text}"
        )
        new_user_data = reregister_resp.json()
        assert "token" in new_user_data
        assert new_user_data["user"]["email"] == test_email
        print(f"STEP 3 PASS: Re-registration with same email succeeded!")

        # Cleanup: delete re-registered user too
        re_user_id = new_user_data["user"]["id"]
        requests.delete(f"{BASE_URL}/api/admin/users/{re_user_id}", headers=admin_headers)
        print(f"CLEANUP: Deleted re-registered user {re_user_id}")

    def test_delete_self_fails(self, admin_headers):
        """Admin cannot delete their own account"""
        # Get admin user id
        me_resp = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers)
        assert me_resp.status_code == 200
        admin_id = me_resp.json()["id"]

        resp = requests.delete(f"{BASE_URL}/api/admin/users/{admin_id}", headers=admin_headers)
        assert resp.status_code == 400, f"Expected 400 for self-delete, got {resp.status_code}"
        print(f"PASS: Self-delete rejected with 400")

    def test_delete_nonexistent_user_returns_404(self, admin_headers):
        """Deleting non-existent user should return 404"""
        fake_id = str(uuid.uuid4())
        resp = requests.delete(f"{BASE_URL}/api/admin/users/{fake_id}", headers=admin_headers)
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}: {resp.text}"
        print(f"PASS: Delete non-existent user returns 404")


# ============ PASSWORD RESET ADMIN SEND - EMAIL TEMPLATE TEST ============

class TestAdminPasswordReset:
    """Admin send password reset - verifies email template has no button/link"""

    def test_admin_send_reset_html_has_no_button(self):
        """
        Verify that admin_send_reset endpoint generates HTML with NO clickable <a> button.
        We test by checking the server.py code content directly.
        """
        server_file = "/app/backend/server.py"
        with open(server_file, "r") as f:
            content = f.read()

        # Find the admin_send_reset function
        start_idx = content.find("async def admin_send_reset")
        assert start_idx != -1, "admin_send_reset function not found"

        # Extract the function body (up to next @api_router)
        end_idx = content.find("\n@api_router", start_idx + 1)
        if end_idx == -1:
            end_idx = len(content)
        func_body = content[start_idx:end_idx]

        # Check no <a href= button in admin reset email
        assert '<a href=' not in func_body, (
            "admin_send_reset should NOT have clickable <a href=...> button in email! "
            "Only plain URL text should be shown."
        )
        print("PASS: admin_send_reset HTML has NO clickable <a> button")

        # Check it does contain the reset_url as plain text
        assert 'reset_url' in func_body, "admin_send_reset should include reset_url as plain text"
        print("PASS: admin_send_reset includes reset_url as plain text")

    def test_user_initiated_reset_email_has_button(self):
        """
        The user-initiated reset email (reset_password_request) should have a button.
        This checks the original requirement was about admin-send specifically.
        """
        server_file = "/app/backend/server.py"
        with open(server_file, "r") as f:
            content = f.read()

        # Find the reset_password_request function
        start_idx = content.find("async def reset_password_request")
        assert start_idx != -1, "reset_password_request function not found"
        end_idx = content.find("\n@api_router", start_idx + 1)
        if end_idx == -1:
            end_idx = len(content)
        func_body = content[start_idx:end_idx]

        # The user reset should have a button
        has_button = '<a href=' in func_body
        print(f"INFO: User-initiated reset has clickable button: {has_button}")
        # This is not failing - just informational

    def test_admin_send_reset_endpoint_returns_200(self, admin_headers):
        """Admin send reset endpoint should work (or fail gracefully if email not configured)"""
        # Get a non-admin user first
        users_resp = requests.get(f"{BASE_URL}/api/admin/users", headers=admin_headers)
        if users_resp.status_code != 200:
            pytest.skip("Cannot get users list")
        users = users_resp.json()
        non_admin = [u for u in users if u.get("role") != "admin"]
        if not non_admin:
            pytest.skip("No non-admin users found for reset test")
        target_id = non_admin[0]["id"]
        target_email = non_admin[0].get("email", "")

        resp = requests.post(
            f"{BASE_URL}/api/admin/users/{target_id}/send-reset",
            headers=admin_headers
        )
        # Should be 200 (email sent) or 503 (email not configured)
        assert resp.status_code in [200, 503], f"Unexpected status {resp.status_code}: {resp.text}"
        if resp.status_code == 200:
            print(f"PASS: Admin send reset returned 200 for {target_email}")
        else:
            print(f"INFO: Admin send reset returned 503 (email not configured) - acceptable")
