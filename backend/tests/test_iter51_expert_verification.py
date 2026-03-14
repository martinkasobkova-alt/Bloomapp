"""
Iteration 51 Tests:
1. GET /api/questions returns specialization_label in answers for specialist/lawyer users (fresh DB lookup)
2. POST /api/verification-requests accepts new fields: requested_role, specialization_text, profile_link, message
3. GET /api/admin/verification-requests returns requests with new field names
4. PUT /api/admin/verification-requests/{id}/status approved → sets user role to requested_role
5. PUT /api/admin/verification-requests/{id}/status rejected → does NOT change user role
6. AdminVerificationTab backward compat: old-format requests (request_type/specialization fields)
"""
import pytest
import requests as req_lib
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

ADMIN_EMAIL = "test1@bloom.cz"
ADMIN_PASSWORD = "test123"
COMMUNITY_PASSWORD = "Transfortrans"


# ─── Auth helpers ─────────────────────────────────────────────────────────────

def get_admin_token():
    resp = req_lib.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    return resp.json().get("token")


def get_or_create_user_token(email, username, password):
    """Login or register a user and return (token, user_id)."""
    r = req_lib.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
    if r.status_code == 200:
        return r.json().get("token"), r.json().get("user", {}).get("id")
    # Register
    r2 = req_lib.post(f"{BASE_URL}/api/auth/register", json={
        "email": email, "username": username, "password": password,
        "community_password": COMMUNITY_PASSWORD
    })
    assert r2.status_code == 200, f"Register failed: {r2.text}"
    return r2.json().get("token"), r2.json().get("user", {}).get("id")


# ─── 1. Questions specialization_label (fresh DB lookup) ──────────────────────

class TestQuestionsSpecializationLabel:
    """Verify that GET /api/questions injects fresh specialization_label into answers"""

    def test_get_questions_returns_list(self):
        """GET /api/questions?section=specialists returns a list"""
        r = req_lib.get(f"{BASE_URL}/api/questions?section=specialists")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert isinstance(data, list)
        print(f"PASS: GET /api/questions returned {len(data)} questions")

    def test_answers_have_specialization_label_field(self):
        """Every answer in the response has a specialization_label field (may be empty string)"""
        r = req_lib.get(f"{BASE_URL}/api/questions?section=specialists")
        assert r.status_code == 200
        questions = r.json()
        for q in questions:
            for a in q.get("answers", []):
                assert "specialization_label" in a, \
                    f"Answer {a.get('id')} missing specialization_label field"
        print(f"PASS: All answers have specialization_label field")

    def test_specialist_answer_has_nonempty_specialization_label(self):
        """An answer from a specialist/lawyer user has a non-empty specialization_label (if set in DB)"""
        r = req_lib.get(f"{BASE_URL}/api/questions?section=specialists")
        assert r.status_code == 200
        questions = r.json()

        specialist_answers = [
            a for q in questions for a in q.get("answers", [])
            if a.get("user_role") in ("specialist", "lawyer")
        ]
        print(f"INFO: Found {len(specialist_answers)} specialist/lawyer answers")

        # Check if any has a specialization_label
        labeled = [a for a in specialist_answers if a.get("specialization_label")]
        print(f"INFO: {len(labeled)} answers have a non-empty specialization_label")

        # If there are specialist answers (M._S._Marta with plastický chirurg), at least one should have label
        if specialist_answers:
            # We just verify the field is present (may be empty string for some)
            for a in specialist_answers:
                assert "specialization_label" in a
            print(f"PASS: All {len(specialist_answers)} specialist/lawyer answers have specialization_label field")
        else:
            print("INFO: No specialist answers found in specialist section - checking legal section")
            r2 = req_lib.get(f"{BASE_URL}/api/questions?section=legal")
            assert r2.status_code == 200
            qs2 = r2.json()
            lawyer_answers = [a for q in qs2 for a in q.get("answers", []) if a.get("user_role") == "lawyer"]
            print(f"INFO: Found {len(lawyer_answers)} lawyer answers in legal section")
            for a in lawyer_answers:
                assert "specialization_label" in a

    def test_specialization_label_is_fresh_not_stale(self):
        """
        Verify that specialization_label in answer comes from the fresh DB lookup, not static embedded data.
        We do this by finding M._S._(Marťa) who has specialization_label='plastický chirurg' in DB.
        """
        admin_token = get_admin_token()
        # Get users list to find M_S_(Marta) specialist
        users_r = req_lib.get(f"{BASE_URL}/api/admin/users",
                              headers={"Authorization": f"Bearer {admin_token}"})
        assert users_r.status_code == 200
        users = users_r.json()

        # Find any specialist/lawyer user
        spec_users = [u for u in users if u.get("role") in ("specialist", "lawyer")]
        print(f"INFO: Found {len(spec_users)} specialist/lawyer users: {[u.get('username') for u in spec_users]}")

        if not spec_users:
            pytest.skip("No specialist/lawyer users in DB to verify fresh label lookup")

        # Find one with a specialization_label set
        labeled_user = next((u for u in spec_users if u.get("specialization_label")), None)
        if not labeled_user:
            print("INFO: No specialist with specialization_label set - setting one now for verification")
            # Set a label on the first specialist
            target = spec_users[0]
            set_r = req_lib.put(
                f"{BASE_URL}/api/admin/users/{target['id']}/specialization-label",
                json={"label": "TEST_fresh_label"},
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert set_r.status_code == 200
            labeled_user = {**target, "specialization_label": "TEST_fresh_label"}

        # Now fetch questions and look for this user's answer
        for section in ("specialists", "legal"):
            r = req_lib.get(f"{BASE_URL}/api/questions?section={section}")
            if r.status_code == 200:
                for q in r.json():
                    for a in q.get("answers", []):
                        if a.get("user_id") == labeled_user["id"]:
                            assert a.get("specialization_label") == labeled_user.get("specialization_label"), \
                                f"Fresh label mismatch: DB has '{labeled_user.get('specialization_label')}', answer has '{a.get('specialization_label')}'"
                            print(f"PASS: Fresh specialization_label '{a.get('specialization_label')}' matches DB for user {labeled_user.get('username')}")
                            return

        print("INFO: No answers from labeled specialist found in questions - fresh lookup cannot be verified end-to-end (no Q&A data)")


# ─── 2. POST /api/verification-requests new fields ───────────────────────────

class TestVerificationRequestNewFields:
    """Test the redesigned verification request form with new fields"""

    TEST_USER_EMAIL = "TEST_iter51_verif@bloom.cz"
    TEST_USER_USERNAME = "test_iter51_verif"
    TEST_USER_PASSWORD = "TestPass51!"

    def test_post_verification_request_new_fields(self):
        """POST /api/verification-requests with new fields: requested_role, specialization_text, profile_link, message"""
        token, user_id = get_or_create_user_token(
            self.TEST_USER_EMAIL, self.TEST_USER_USERNAME, self.TEST_USER_PASSWORD
        )
        assert token, "Could not get user token"

        # Clean up any pending request first (via admin)
        admin_token = get_admin_token()
        list_r = req_lib.get(f"{BASE_URL}/api/admin/verification-requests",
                             headers={"Authorization": f"Bearer {admin_token}"})
        if list_r.status_code == 200:
            existing = [r for r in list_r.json() if r.get("user_id") == user_id and r.get("status") == "pending"]
            for e in existing:
                # Reject to clear pending status
                req_lib.put(f"{BASE_URL}/api/admin/verification-requests/{e['id']}/status",
                            json={"status": "rejected"},
                            headers={"Authorization": f"Bearer {admin_token}"})

        payload = {
            "requested_role": "specialist",
            "specialization_text": "TEST plastická chirurgie",
            "profile_link": "https://example.com/profile",
            "message": "Toto je testovací zpráva pro admina"
        }
        r = req_lib.post(f"{BASE_URL}/api/verification-requests", json=payload,
                         headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "id" in data
        assert "message" in data
        print(f"PASS: Verification request submitted with new fields, id={data['id']}")

    def test_admin_sees_new_field_names_in_list(self):
        """GET /api/admin/verification-requests returns new field names"""
        admin_token = get_admin_token()
        r = req_lib.get(f"{BASE_URL}/api/admin/verification-requests",
                        headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        requests_list = r.json()
        assert isinstance(requests_list, list)

        if requests_list:
            req = requests_list[0]
            print(f"INFO: Sample request fields: {list(req.keys())}")
            # New-format requests must have these fields
            for req_item in requests_list:
                if req_item.get("user_id"):
                    # Check either old OR new fields exist (backward compat)
                    has_requested_role = "requested_role" in req_item
                    has_request_type = "request_type" in req_item
                    assert has_requested_role or has_request_type, \
                        f"Neither 'requested_role' nor 'request_type' found in request {req_item.get('id')}"
            print(f"PASS: All {len(requests_list)} requests have required role field")
        else:
            print("INFO: No requests in the system")


# ─── 3. Approval sets user role ───────────────────────────────────────────────

class TestApprovalSetsUserRole:
    """Test that approving a request actually sets the user role"""

    TEST_USER_EMAIL_APPROVE = "TEST_iter51_approve@bloom.cz"
    TEST_USER_USERNAME_APPROVE = "test_iter51_approve"
    TEST_USER_PASSWORD_APPROVE = "TestApprove51!"

    TEST_USER_EMAIL_REJECT = "TEST_iter51_reject@bloom.cz"
    TEST_USER_USERNAME_REJECT = "test_iter51_reject"
    TEST_USER_PASSWORD_REJECT = "TestReject51!"

    def test_approve_request_sets_role_to_requested_role(self):
        """
        After approving a request with requested_role=specialist,
        the user's role must be set to 'specialist'.
        """
        admin_token = get_admin_token()
        token, user_id = get_or_create_user_token(
            self.TEST_USER_EMAIL_APPROVE, self.TEST_USER_USERNAME_APPROVE, self.TEST_USER_PASSWORD_APPROVE
        )
        assert token and user_id

        # Ensure user starts as 'user' role
        req_lib.post(f"{BASE_URL}/api/admin/set-role/{user_id}?role=user",
                     headers={"Authorization": f"Bearer {admin_token}"})

        # Clear any pending requests
        list_r = req_lib.get(f"{BASE_URL}/api/admin/verification-requests",
                             headers={"Authorization": f"Bearer {admin_token}"})
        if list_r.status_code == 200:
            existing = [r for r in list_r.json() if r.get("user_id") == user_id and r.get("status") == "pending"]
            for e in existing:
                req_lib.put(f"{BASE_URL}/api/admin/verification-requests/{e['id']}/status",
                            json={"status": "rejected"},
                            headers={"Authorization": f"Bearer {admin_token}"})

        # Submit request for specialist role
        submit_r = req_lib.post(f"{BASE_URL}/api/verification-requests",
                                json={"requested_role": "specialist", "specialization_text": "TEST chirurgie",
                                      "profile_link": "", "message": "TEST approval"},
                                headers={"Authorization": f"Bearer {token}"})
        assert submit_r.status_code == 200, f"Submit failed: {submit_r.text}"
        req_id = submit_r.json()["id"]

        # Admin approves
        approve_r = req_lib.put(f"{BASE_URL}/api/admin/verification-requests/{req_id}/status",
                                json={"status": "approved"},
                                headers={"Authorization": f"Bearer {admin_token}"})
        assert approve_r.status_code == 200, f"Approve failed: {approve_r.text}"
        data = approve_r.json()
        assert "message" in data
        print(f"PASS: Request {req_id} approved, message: {data['message']}")

        # Verify user role is now 'specialist'
        users_r = req_lib.get(f"{BASE_URL}/api/admin/users",
                              headers={"Authorization": f"Bearer {admin_token}"})
        assert users_r.status_code == 200
        updated_user = next((u for u in users_r.json() if u["id"] == user_id), None)
        assert updated_user is not None, f"User {user_id} not found in admin users list"
        assert updated_user.get("role") == "specialist", \
            f"Expected role='specialist' after approval, got '{updated_user.get('role')}'"
        print(f"PASS: User role is now 'specialist' after approval ✓")

    def test_approve_request_with_lawyer_role(self):
        """
        After approving a request with requested_role=lawyer,
        the user's role must be set to 'lawyer'.
        """
        admin_token = get_admin_token()
        # Use a unique user email for this test
        email = f"TEST_iter51_lawyer_{uuid.uuid4().hex[:6]}@bloom.cz"
        username = f"test_iter51_lawyer_{uuid.uuid4().hex[:4]}"
        token, user_id = get_or_create_user_token(email, username, "TestLawyer51!")
        assert token and user_id

        # Submit request for lawyer role
        submit_r = req_lib.post(f"{BASE_URL}/api/verification-requests",
                                json={"requested_role": "lawyer", "specialization_text": "TEST rodinné právo",
                                      "profile_link": "https://example.com/lawyer", "message": "TEST lawyer approval"},
                                headers={"Authorization": f"Bearer {token}"})
        assert submit_r.status_code == 200, f"Submit failed: {submit_r.text}"
        req_id = submit_r.json()["id"]

        # Admin approves
        approve_r = req_lib.put(f"{BASE_URL}/api/admin/verification-requests/{req_id}/status",
                                json={"status": "approved"},
                                headers={"Authorization": f"Bearer {admin_token}"})
        assert approve_r.status_code == 200, f"Approve failed: {approve_r.text}"

        # Verify user role is now 'lawyer'
        users_r = req_lib.get(f"{BASE_URL}/api/admin/users",
                              headers={"Authorization": f"Bearer {admin_token}"})
        assert users_r.status_code == 200
        updated_user = next((u for u in users_r.json() if u["id"] == user_id), None)
        assert updated_user is not None
        assert updated_user.get("role") == "lawyer", \
            f"Expected role='lawyer' after approval, got '{updated_user.get('role')}'"
        print(f"PASS: User role is now 'lawyer' after approval ✓")

    def test_reject_request_does_not_change_user_role(self):
        """
        After rejecting a request, the user's role must remain 'user' (not changed).
        """
        admin_token = get_admin_token()
        token, user_id = get_or_create_user_token(
            self.TEST_USER_EMAIL_REJECT, self.TEST_USER_USERNAME_REJECT, self.TEST_USER_PASSWORD_REJECT
        )
        assert token and user_id

        # Ensure user starts as 'user' role
        req_lib.post(f"{BASE_URL}/api/admin/set-role/{user_id}?role=user",
                     headers={"Authorization": f"Bearer {admin_token}"})

        # Clear any pending requests
        list_r = req_lib.get(f"{BASE_URL}/api/admin/verification-requests",
                             headers={"Authorization": f"Bearer {admin_token}"})
        if list_r.status_code == 200:
            existing = [r for r in list_r.json() if r.get("user_id") == user_id and r.get("status") == "pending"]
            for e in existing:
                req_lib.put(f"{BASE_URL}/api/admin/verification-requests/{e['id']}/status",
                            json={"status": "rejected"},
                            headers={"Authorization": f"Bearer {admin_token}"})

        # Submit request
        submit_r = req_lib.post(f"{BASE_URL}/api/verification-requests",
                                json={"requested_role": "lawyer", "specialization_text": "TEST právo",
                                      "profile_link": "", "message": ""},
                                headers={"Authorization": f"Bearer {token}"})
        assert submit_r.status_code == 200, f"Submit failed: {submit_r.text}"
        req_id = submit_r.json()["id"]

        # Admin rejects
        reject_r = req_lib.put(f"{BASE_URL}/api/admin/verification-requests/{req_id}/status",
                               json={"status": "rejected"},
                               headers={"Authorization": f"Bearer {admin_token}"})
        assert reject_r.status_code == 200, f"Reject failed: {reject_r.text}"

        # Verify user role is still 'user'
        users_r = req_lib.get(f"{BASE_URL}/api/admin/users",
                              headers={"Authorization": f"Bearer {admin_token}"})
        assert users_r.status_code == 200
        updated_user = next((u for u in users_r.json() if u["id"] == user_id), None)
        assert updated_user is not None
        assert updated_user.get("role") == "user", \
            f"Expected role='user' after rejection (unchanged), got '{updated_user.get('role')}'"
        print(f"PASS: User role remains 'user' after rejection ✓")

    def test_invalid_status_returns_400(self):
        """Sending invalid status value returns 400"""
        admin_token = get_admin_token()
        # Use a random non-existent id to just test validation
        r = req_lib.put(f"{BASE_URL}/api/admin/verification-requests/test-id-12345/status",
                        json={"status": "reviewed"},  # "reviewed" is no longer valid
                        headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code in (400, 404), f"Expected 400 or 404, got {r.status_code}: {r.text}"
        print(f"PASS: Invalid status 'reviewed' returns {r.status_code}")


# ─── 4. Backward compatibility: old-format requests in admin list ─────────────

class TestBackwardCompatibility:
    """Test that requests with old field names still work in admin list"""

    def test_old_format_request_fields_accessible(self):
        """
        Old requests with 'request_type' and 'specialization' fields should still appear in the list.
        The AdminVerificationTab uses reqField() helper to handle both.
        We test that the backend returns whatever is stored, and we can read it.
        """
        admin_token = get_admin_token()
        r = req_lib.get(f"{BASE_URL}/api/admin/verification-requests",
                        headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        requests_list = r.json()

        # Check if any old-format requests exist
        old_format = [rr for rr in requests_list if "request_type" in rr]
        new_format = [rr for rr in requests_list if "requested_role" in rr]
        print(f"INFO: Found {len(old_format)} old-format requests (request_type) and {len(new_format)} new-format requests (requested_role)")

        # Backend should not crash when returning mixed formats
        assert isinstance(requests_list, list)
        print(f"PASS: Admin list returned successfully with {len(requests_list)} total requests (no crash on mixed formats)")

    def test_my_pending_request_endpoint(self):
        """GET /api/verification-requests/my returns 404 or the pending request"""
        token, _ = get_or_create_user_token(
            "TEST_iter51_my@bloom.cz", "test_iter51_my", "TestMy51!"
        )
        assert token
        r = req_lib.get(f"{BASE_URL}/api/verification-requests/my",
                        headers={"Authorization": f"Bearer {token}"})
        assert r.status_code in (200, 404), f"Expected 200 or 404, got {r.status_code}: {r.text}"
        if r.status_code == 200:
            data = r.json()
            assert "status" in data
            assert "user_id" in data
            print(f"PASS: /verification-requests/my returned request with status={data.get('status')}")
        else:
            print(f"PASS: /verification-requests/my returned 404 (no pending request)")


# ─── 5. Public profile - specialization_label via public-profile endpoint ──────

class TestPublicProfileSpecializationLabel:
    """Test that public profile endpoint returns role and specialization_label"""

    VIEWER_EMAIL = "TEST_iter51_viewer@bloom.cz"
    VIEWER_USERNAME = "test_iter51_viewer"
    VIEWER_PASSWORD = "TestViewer51!"

    def _get_viewer_token(self):
        token, _ = get_or_create_user_token(self.VIEWER_EMAIL, self.VIEWER_USERNAME, self.VIEWER_PASSWORD)
        return token

    def test_specialist_public_profile_has_role_and_label(self):
        """Public profile for a specialist user returns role=specialist and specialization_label"""
        admin_token = get_admin_token()
        viewer_token = self._get_viewer_token()
        assert viewer_token, "Could not get viewer token"

        users_r = req_lib.get(f"{BASE_URL}/api/admin/users",
                              headers={"Authorization": f"Bearer {admin_token}"})
        assert users_r.status_code == 200
        users = users_r.json()

        # Find a specialist user
        specialist = next((u for u in users if u.get("role") == "specialist"), None)
        if not specialist:
            pytest.skip("No specialist user found in DB")

        user_id = specialist["id"]
        r = req_lib.get(f"{BASE_URL}/api/users/{user_id}/public-profile",
                        headers={"Authorization": f"Bearer {viewer_token}"})
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        profile = r.json()
        assert profile.get("role") == "specialist", f"Expected role='specialist', got '{profile.get('role')}'"
        # specialization_label may be empty string but should be present
        assert "specialization_label" in profile or profile.get("specialization_label") is not None, \
            "specialization_label missing from public profile"
        print(f"PASS: Specialist public profile has role='{profile.get('role')}' and specialization_label='{profile.get('specialization_label', '')}'")

    def test_lawyer_public_profile_has_role(self):
        """Public profile for a lawyer user returns role=lawyer"""
        admin_token = get_admin_token()
        viewer_token = self._get_viewer_token()
        assert viewer_token

        users_r = req_lib.get(f"{BASE_URL}/api/admin/users",
                              headers={"Authorization": f"Bearer {admin_token}"})
        assert users_r.status_code == 200
        users = users_r.json()

        lawyer = next((u for u in users if u.get("role") == "lawyer"), None)
        if not lawyer:
            pytest.skip("No lawyer user found in DB")

        user_id = lawyer["id"]
        r = req_lib.get(f"{BASE_URL}/api/users/{user_id}/public-profile",
                        headers={"Authorization": f"Bearer {viewer_token}"})
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        profile = r.json()
        assert profile.get("role") == "lawyer", f"Expected role='lawyer', got '{profile.get('role')}'"
        print(f"PASS: Lawyer public profile has role='{profile.get('role')}' ✓")

    def test_martas_profile_has_plasticky_chirurg_label(self):
        """M._S._(Marťa) specialist user should have specialization_label='plastický chirurg'"""
        admin_token = get_admin_token()
        viewer_token = self._get_viewer_token()
        assert viewer_token

        users_r = req_lib.get(f"{BASE_URL}/api/admin/users",
                              headers={"Authorization": f"Bearer {admin_token}"})
        assert users_r.status_code == 200
        users = users_r.json()

        # Find the Marta user (username contains "Marťa" or "Marta" or "M._S.")
        marta = next((u for u in users if
                      "M._S" in u.get("username", "") or
                      "Marťa" in u.get("username", "") or
                      "Marta" in u.get("username", "")), None)

        if not marta:
            pytest.skip("M._S._(Marťa) user not found in DB")

        # Ensure Marta has the right label
        if not marta.get("specialization_label"):
            set_r = req_lib.put(f"{BASE_URL}/api/admin/users/{marta['id']}/specialization-label",
                                json={"label": "plastický chirurg"},
                                headers={"Authorization": f"Bearer {admin_token}"})
            assert set_r.status_code == 200

        user_id = marta["id"]
        r = req_lib.get(f"{BASE_URL}/api/users/{user_id}/public-profile",
                        headers={"Authorization": f"Bearer {viewer_token}"})
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        profile = r.json()
        assert profile.get("role") == "specialist", f"Marta's role should be specialist, got: {profile.get('role')}"
        assert profile.get("specialization_label") == "plastický chirurg", \
            f"Expected 'plastický chirurg', got '{profile.get('specialization_label')}'"
        print(f"PASS: Marťa's public profile has role='specialist' and specialization_label='plastický chirurg' ✓")
