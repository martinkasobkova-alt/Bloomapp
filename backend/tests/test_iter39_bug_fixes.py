"""
Iteration 39 - Tests for 3 bug fixes:
1. Search panel stay-open (frontend only, no backend test needed)
2. DELETE /admin/reports/{id} - admin can delete user reports
3. DELETE /admin/bug-reports/{id} - admin can delete bug reports
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

ADMIN_EMAIL = "test1@bloom.cz"
ADMIN_PASSWORD = "test123"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert resp.status_code == 200, f"Admin login failed: {resp.status_code} {resp.text}"
    return resp.json()["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def normal_user_token():
    """Create a test user and get their token"""
    # Register a temp test user
    email = f"TEST_{uuid.uuid4().hex[:8]}@test.com"
    password = "Test1234!"
    reg_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": email,
        "password": password,
        "username": f"TEST_{uuid.uuid4().hex[:6]}",
        "community_password": "Transfortrans"
    })
    if reg_resp.status_code not in (200, 201):
        pytest.skip(f"Could not create test user: {reg_resp.text}")
    login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
    assert login_resp.status_code == 200
    return login_resp.json()["token"], login_resp.json()["user"]["id"], email


class TestDeleteReport:
    """Tests for DELETE /admin/reports/{report_id}"""

    def test_get_reports_list(self, admin_headers):
        """Admin can fetch reports list"""
        resp = requests.get(f"{BASE_URL}/api/admin/reports", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        print(f"PASS: GET /api/admin/reports => {len(data)} reports")

    def test_delete_report_endpoint_exists(self, admin_headers):
        """DELETE /admin/reports/{id} returns 404 for non-existent id (not 405)"""
        fake_id = str(uuid.uuid4())
        resp = requests.delete(f"{BASE_URL}/api/admin/reports/{fake_id}", headers=admin_headers)
        # Should be 404 (not found), NOT 405 (method not allowed)
        assert resp.status_code == 404, f"Expected 404 for non-existent report, got {resp.status_code}"
        print(f"PASS: DELETE /api/admin/reports/{fake_id} => 404 (endpoint exists)")

    def test_create_and_delete_report(self, admin_headers, normal_user_token):
        """Create a report as normal user then delete it as admin"""
        token, user_id, email = normal_user_token

        # Get admin user id to report
        admin_resp = requests.get(f"{BASE_URL}/api/admin/users", headers=admin_headers)
        assert admin_resp.status_code == 200
        users = admin_resp.json()
        admin_user = next((u for u in users if u.get("email") == ADMIN_EMAIL), None)
        if not admin_user:
            pytest.skip("Could not find admin user to report")

        admin_id = admin_user["id"]

        # Report admin user from test user
        user_headers = {"Authorization": f"Bearer {token}"}
        report_resp = requests.post(f"{BASE_URL}/api/users/{admin_id}/report", headers=user_headers, json={
            "reason": "spam",
            "description": "TEST report for deletion test"
        })
        if report_resp.status_code == 400 and "již" in report_resp.text:
            # Already reported - get existing reports and use one
            print("Already reported - finding existing report to delete")
            reports_resp = requests.get(f"{BASE_URL}/api/admin/reports", headers=admin_headers)
            reports = reports_resp.json()
            if not reports:
                pytest.skip("No reports available to test deletion")
            report_id = reports[0]["id"]
        else:
            assert report_resp.status_code in (200, 201), f"Report creation failed: {report_resp.status_code} {report_resp.text}"
            print(f"PASS: Created test report")

            # Get the newly created report
            reports_resp = requests.get(f"{BASE_URL}/api/admin/reports", headers=admin_headers)
            assert reports_resp.status_code == 200
            reports = reports_resp.json()
            # Find test report
            test_report = next((r for r in reports if r.get("description") == "TEST report for deletion test"), None)
            if not test_report:
                pytest.skip("Could not find created test report")
            report_id = test_report["id"]

        # Delete the report
        del_resp = requests.delete(f"{BASE_URL}/api/admin/reports/{report_id}", headers=admin_headers)
        assert del_resp.status_code == 200, f"Delete failed: {del_resp.status_code} {del_resp.text}"
        data = del_resp.json()
        assert "message" in data
        print(f"PASS: DELETE /api/admin/reports/{report_id} => 200 '{data['message']}'")

        # Verify it's gone
        reports_after = requests.get(f"{BASE_URL}/api/admin/reports", headers=admin_headers)
        remaining = [r for r in reports_after.json() if r["id"] == report_id]
        assert len(remaining) == 0, "Report still exists after deletion"
        print(f"PASS: Report no longer found after deletion")

    def test_delete_report_requires_admin(self, normal_user_token):
        """Non-admin cannot delete reports"""
        token, _, _ = normal_user_token
        user_headers = {"Authorization": f"Bearer {token}"}
        fake_id = str(uuid.uuid4())
        resp = requests.delete(f"{BASE_URL}/api/admin/reports/{fake_id}", headers=user_headers)
        assert resp.status_code in (403, 401), f"Expected 403/401 for non-admin, got {resp.status_code}"
        print(f"PASS: Non-admin gets {resp.status_code} when trying to delete report")


class TestDeleteBugReport:
    """Tests for DELETE /admin/bug-reports/{report_id}"""

    def test_get_bug_reports_list(self, admin_headers):
        """Admin can fetch bug reports list"""
        resp = requests.get(f"{BASE_URL}/api/admin/bug-reports", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        print(f"PASS: GET /api/admin/bug-reports => {len(data)} bug reports")

    def test_delete_bug_report_endpoint_exists(self, admin_headers):
        """DELETE /admin/bug-reports/{id} returns 404 for non-existent id"""
        fake_id = str(uuid.uuid4())
        resp = requests.delete(f"{BASE_URL}/api/admin/bug-reports/{fake_id}", headers=admin_headers)
        assert resp.status_code == 404, f"Expected 404 for non-existent bug report, got {resp.status_code}"
        print(f"PASS: DELETE /api/admin/bug-reports/{fake_id} => 404 (endpoint exists)")

    def test_create_and_delete_bug_report(self, admin_headers, normal_user_token):
        """Create a bug report then delete it as admin"""
        token, _, _ = normal_user_token
        user_headers = {"Authorization": f"Bearer {token}"}

        # Create a bug report
        br_resp = requests.post(f"{BASE_URL}/api/bug-reports", headers=user_headers, json={
            "report_type": "other",
            "description": "TEST bug report for deletion test",
            "page_url": "/test-page",
            "browser_info": "pytest test browser"
        })
        assert br_resp.status_code in (200, 201), f"Bug report creation failed: {br_resp.status_code} {br_resp.text}"
        print(f"PASS: Created test bug report")

        # Get the bug reports and find it
        br_list_resp = requests.get(f"{BASE_URL}/api/admin/bug-reports", headers=admin_headers)
        assert br_list_resp.status_code == 200
        bug_reports = br_list_resp.json()
        test_br = next((r for r in bug_reports if r.get("description") == "TEST bug report for deletion test"), None)
        if not test_br:
            pytest.skip("Could not find created test bug report")

        bug_report_id = test_br["id"]

        # Delete the bug report
        del_resp = requests.delete(f"{BASE_URL}/api/admin/bug-reports/{bug_report_id}", headers=admin_headers)
        assert del_resp.status_code == 200, f"Delete failed: {del_resp.status_code} {del_resp.text}"
        data = del_resp.json()
        assert "message" in data
        print(f"PASS: DELETE /api/admin/bug-reports/{bug_report_id} => 200 '{data['message']}'")

        # Verify it's gone
        br_after = requests.get(f"{BASE_URL}/api/admin/bug-reports", headers=admin_headers)
        remaining = [r for r in br_after.json() if r["id"] == bug_report_id]
        assert len(remaining) == 0, "Bug report still exists after deletion"
        print(f"PASS: Bug report no longer found after deletion")

    def test_delete_bug_report_requires_admin(self, normal_user_token):
        """Non-admin cannot delete bug reports"""
        token, _, _ = normal_user_token
        user_headers = {"Authorization": f"Bearer {token}"}
        fake_id = str(uuid.uuid4())
        resp = requests.delete(f"{BASE_URL}/api/admin/bug-reports/{fake_id}", headers=user_headers)
        assert resp.status_code in (403, 401), f"Expected 403/401 for non-admin, got {resp.status_code}"
        print(f"PASS: Non-admin gets {resp.status_code} when trying to delete bug report")
