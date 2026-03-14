"""
Iteration 40 - Tests for new features and bug fixes:
1. Services without location appear in GET /api/services?country=CZ
2. GET /api/questions?section=legal returns only legal questions
3. GET /api/questions?section=specialists returns only specialists questions
4. POST /api/questions creates question with correct section field
5. POST /api/questions/{id}/answers - admin/lawyer can answer, regular user gets 403
6. DELETE /api/questions/{id} - admin/lawyer can delete, regular user gets 403
"""

import pytest
import requests
import os
import uuid

def _get_base_url():
    # Try env first, then read from frontend .env file
    url = os.environ.get('REACT_APP_BACKEND_URL', '').strip()
    if not url:
        try:
            with open('/app/frontend/.env') as f:
                for line in f:
                    if line.startswith('REACT_APP_BACKEND_URL='):
                        url = line.strip().split('=', 1)[1]
                        break
        except Exception:
            pass
    return url.rstrip('/')

BASE_URL = _get_base_url()

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
    return login_resp.json()["token"]


@pytest.fixture(scope="module")
def normal_user_headers(normal_user_token):
    return {"Authorization": f"Bearer {normal_user_token}"}


class TestServicesEmptyLocation:
    """BUG FIX: Services with empty location should appear in country filter"""

    def test_create_service_without_location(self, admin_headers):
        """Create a service with empty location string"""
        resp = requests.post(f"{BASE_URL}/api/services", headers=admin_headers, json={
            "offer": "TEST_NoLocation Service",
            "need": "",
            "description": "Service with no location for testing",
            "location": "",
            "service_type": "other",
            "post_type": "offer"
        })
        assert resp.status_code == 200, f"Create service failed: {resp.status_code} {resp.text}"
        data = resp.json()
        assert data["location"] == ""
        assert data["offer"] == "TEST_NoLocation Service"
        # Store id for cleanup
        TestServicesEmptyLocation.service_id = data["id"]
        print(f"PASS: Created service with empty location, id={data['id']}")

    def test_service_without_location_appears_in_country_filter(self):
        """Service with empty location should appear in GET /api/services?country=CZ"""
        resp = requests.get(f"{BASE_URL}/api/services", params={"country": "CZ"})
        assert resp.status_code == 200
        services = resp.json()
        ids = [s["id"] for s in services]
        service_id = getattr(TestServicesEmptyLocation, 'service_id', None)
        if service_id:
            assert service_id in ids, f"Service with empty location NOT found in country=CZ filter. IDs: {ids}"
            print(f"PASS: Service with empty location appears in country=CZ results (total {len(services)} services)")
        else:
            pytest.skip("service_id not set (create test may have failed)")

    def test_service_without_location_appears_with_specific_location_filter(self):
        """Service with empty location should appear with specific location filter"""
        # First get a CZ location to test with
        locs_resp = requests.get(f"{BASE_URL}/api/locations", params={"country": "CZ"})
        if locs_resp.status_code != 200 or not locs_resp.json():
            pytest.skip("No CZ locations available for test")
        first_loc = locs_resp.json()[0]["name"]
        resp = requests.get(f"{BASE_URL}/api/services", params={"country": "CZ", "location": first_loc})
        assert resp.status_code == 200
        services = resp.json()
        service_id = getattr(TestServicesEmptyLocation, 'service_id', None)
        if service_id:
            ids = [s["id"] for s in services]
            assert service_id in ids, f"Service with empty location NOT found when filtering by location='{first_loc}'"
            print(f"PASS: Service with empty location shown even when filtering by specific location '{first_loc}'")

    def test_cleanup_service(self, admin_headers):
        """Cleanup: delete the test service"""
        service_id = getattr(TestServicesEmptyLocation, 'service_id', None)
        if service_id:
            resp = requests.delete(f"{BASE_URL}/api/services/{service_id}", headers=admin_headers)
            assert resp.status_code == 200
            print(f"PASS: Cleaned up test service {service_id}")


class TestQuestionsSection:
    """Questions section filtering: legal vs specialists"""

    @pytest.fixture(autouse=True)
    def setup_questions(self, admin_headers):
        """Create test questions for both sections"""
        # Create a legal question
        legal_resp = requests.post(f"{BASE_URL}/api/questions", headers=admin_headers, json={
            "title": "TEST_Legal Question",
            "section": "legal"
        })
        assert legal_resp.status_code == 200
        TestQuestionsSection.legal_q_id = legal_resp.json()["id"]

        # Create a specialists question
        spec_resp = requests.post(f"{BASE_URL}/api/questions", headers=admin_headers, json={
            "title": "TEST_Specialist Question",
            "section": "specialists"
        })
        assert spec_resp.status_code == 200
        TestQuestionsSection.spec_q_id = spec_resp.json()["id"]
        print(f"Setup: Created legal Q {TestQuestionsSection.legal_q_id}, spec Q {TestQuestionsSection.spec_q_id}")

        yield

        # Cleanup
        for qid in [TestQuestionsSection.legal_q_id, TestQuestionsSection.spec_q_id]:
            try:
                requests.delete(f"{BASE_URL}/api/questions/{qid}", headers=admin_headers)
            except Exception:
                pass

    def test_get_legal_questions_only(self):
        """GET /api/questions?section=legal returns only legal questions"""
        resp = requests.get(f"{BASE_URL}/api/questions", params={"section": "legal"})
        assert resp.status_code == 200
        questions = resp.json()
        # Legal question should be present
        ids = [q["id"] for q in questions]
        legal_q_id = getattr(TestQuestionsSection, 'legal_q_id', None)
        spec_q_id = getattr(TestQuestionsSection, 'spec_q_id', None)
        assert legal_q_id in ids, f"Legal question not in results: {ids}"
        assert spec_q_id not in ids, f"Specialist question should NOT be in legal results"
        # All returned questions should be legal section or have no section
        for q in questions:
            assert q.get("section") in ("legal", None, ""), f"Non-legal question in legal results: {q}"
        print(f"PASS: GET /api/questions?section=legal returns {len(questions)} legal questions only")

    def test_get_specialists_questions_only(self):
        """GET /api/questions?section=specialists returns only specialists questions"""
        resp = requests.get(f"{BASE_URL}/api/questions", params={"section": "specialists"})
        assert resp.status_code == 200
        questions = resp.json()
        ids = [q["id"] for q in questions]
        legal_q_id = getattr(TestQuestionsSection, 'legal_q_id', None)
        spec_q_id = getattr(TestQuestionsSection, 'spec_q_id', None)
        assert spec_q_id in ids, f"Specialist question not in results: {ids}"
        assert legal_q_id not in ids, f"Legal question should NOT be in specialists results"
        # All returned questions should be specialists section
        for q in questions:
            assert q.get("section") == "specialists", f"Non-specialist question in specialists results: {q}"
        print(f"PASS: GET /api/questions?section=specialists returns {len(questions)} specialist questions only")

    def test_question_section_field_stored_correctly(self):
        """Verify section field is stored correctly in question document"""
        legal_q_id = getattr(TestQuestionsSection, 'legal_q_id', None)
        spec_q_id = getattr(TestQuestionsSection, 'spec_q_id', None)

        # Verify by fetching from section=legal
        legal_resp = requests.get(f"{BASE_URL}/api/questions", params={"section": "legal"})
        legal_qs = {q["id"]: q for q in legal_resp.json()}
        if legal_q_id and legal_q_id in legal_qs:
            assert legal_qs[legal_q_id]["section"] == "legal"
            print(f"PASS: Legal question has section='legal'")

        # Verify by fetching from section=specialists
        spec_resp = requests.get(f"{BASE_URL}/api/questions", params={"section": "specialists"})
        spec_qs = {q["id"]: q for q in spec_resp.json()}
        if spec_q_id and spec_q_id in spec_qs:
            assert spec_qs[spec_q_id]["section"] == "specialists"
            print(f"PASS: Specialist question has section='specialists'")


class TestQuestionsPermissions:
    """Questions: admin/lawyer can answer/delete, regular user gets 403"""

    @pytest.fixture(scope="class", autouse=True)
    def create_legal_question(self, admin_headers):
        """Create a legal question for permission tests"""
        resp = requests.post(f"{BASE_URL}/api/questions", headers=admin_headers, json={
            "title": "TEST_Permission Legal Question",
            "section": "legal"
        })
        assert resp.status_code == 200
        TestQuestionsPermissions.q_id = resp.json()["id"]
        print(f"Setup: Created legal question {TestQuestionsPermissions.q_id}")
        yield
        # Cleanup
        requests.delete(f"{BASE_URL}/api/questions/{TestQuestionsPermissions.q_id}", headers=admin_headers)

    def test_admin_can_answer_legal_question(self, admin_headers):
        """Admin can answer a legal question"""
        q_id = getattr(TestQuestionsPermissions, 'q_id', None)
        if not q_id:
            pytest.skip("No question id set")
        resp = requests.post(f"{BASE_URL}/api/questions/{q_id}/answers", headers=admin_headers, json={
            "content": "Admin answer for testing"
        })
        assert resp.status_code == 200, f"Admin answer failed: {resp.status_code} {resp.text}"
        data = resp.json()
        assert len(data["answers"]) >= 1
        print(f"PASS: Admin can answer legal question. Answer count: {len(data['answers'])}")

    def test_regular_user_cannot_answer_legal_question(self, normal_user_headers):
        """Regular user gets 403 when trying to answer legal question"""
        q_id = getattr(TestQuestionsPermissions, 'q_id', None)
        if not q_id:
            pytest.skip("No question id set")
        resp = requests.post(f"{BASE_URL}/api/questions/{q_id}/answers", headers=normal_user_headers, json={
            "content": "Regular user answer attempt"
        })
        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}: {resp.text}"
        print(f"PASS: Regular user gets 403 when trying to answer legal question")

    def test_admin_can_delete_legal_question(self, admin_headers):
        """Admin can delete a legal question"""
        # Create a new question to delete
        create_resp = requests.post(f"{BASE_URL}/api/questions", headers=admin_headers, json={
            "title": "TEST_ToDelete Legal Question",
            "section": "legal"
        })
        assert create_resp.status_code == 200
        del_id = create_resp.json()["id"]

        resp = requests.delete(f"{BASE_URL}/api/questions/{del_id}", headers=admin_headers)
        assert resp.status_code == 200, f"Admin delete failed: {resp.status_code} {resp.text}"
        print(f"PASS: Admin can delete legal question")

    def test_regular_user_cannot_delete_legal_question(self, admin_headers, normal_user_headers):
        """Regular user gets 403 when trying to delete a legal question"""
        create_resp = requests.post(f"{BASE_URL}/api/questions", headers=admin_headers, json={
            "title": "TEST_DeleteForbidden Legal Question",
            "section": "legal"
        })
        assert create_resp.status_code == 200
        del_id = create_resp.json()["id"]

        try:
            resp = requests.delete(f"{BASE_URL}/api/questions/{del_id}", headers=normal_user_headers)
            assert resp.status_code == 403, f"Expected 403, got {resp.status_code}: {resp.text}"
            print(f"PASS: Regular user gets 403 when trying to delete legal question")
        finally:
            # Cleanup
            requests.delete(f"{BASE_URL}/api/questions/{del_id}", headers=admin_headers)

    def test_regular_user_can_post_specialists_question(self, normal_user_headers):
        """Regular user CAN post a specialist question"""
        resp = requests.post(f"{BASE_URL}/api/questions", headers=normal_user_headers, json={
            "title": "TEST_RegularUser Specialist Question",
            "section": "specialists"
        })
        assert resp.status_code == 200, f"Regular user post specialist question failed: {resp.status_code} {resp.text}"
        data = resp.json()
        assert data["section"] == "specialists"
        print(f"PASS: Regular user can post a specialist question, id={data['id']}")
        # Cleanup with admin
        # (we don't have admin headers here, cleanup is best-effort)

    def test_regular_user_cannot_answer_specialists_question(self, admin_headers, normal_user_headers):
        """Regular user gets 403 when trying to answer a specialists question"""
        # Create specialists question
        create_resp = requests.post(f"{BASE_URL}/api/questions", headers=normal_user_headers, json={
            "title": "TEST_SpecialistPermission",
            "section": "specialists"
        })
        assert create_resp.status_code == 200
        q_id = create_resp.json()["id"]

        try:
            resp = requests.post(f"{BASE_URL}/api/questions/{q_id}/answers", headers=normal_user_headers, json={
                "content": "Regular user trying to answer specialist question"
            })
            assert resp.status_code == 403, f"Expected 403, got {resp.status_code}: {resp.text}"
            print(f"PASS: Regular user gets 403 when trying to answer specialists question")
        finally:
            requests.delete(f"{BASE_URL}/api/questions/{q_id}", headers=admin_headers)


class TestNewsUpdate:
    """Test PUT /api/news/{id} endpoint for admin edit"""

    def test_admin_can_update_news(self, admin_headers):
        """Admin can create and then update a news item"""
        # First create a news item
        create_resp = requests.post(f"{BASE_URL}/api/news", headers=admin_headers, json={
            "title": "TEST_NewsItem",
            "content": "Original content",
            "category": "local",
            "image_url": ""
        })
        assert create_resp.status_code == 200, f"Create news failed: {resp.status_code} {create_resp.text}"
        news_id = create_resp.json()["id"]

        try:
            # Update it
            update_resp = requests.put(f"{BASE_URL}/api/news/{news_id}", headers=admin_headers, json={
                "title": "TEST_NewsItem Updated",
                "content": "Updated content",
                "category": "local"
            })
            assert update_resp.status_code == 200, f"Update news failed: {update_resp.status_code} {update_resp.text}"
            updated = update_resp.json()
            assert updated["title"] == "TEST_NewsItem Updated"
            assert updated["content"] == "Updated content"
            print(f"PASS: Admin can update news item")
        finally:
            requests.delete(f"{BASE_URL}/api/news/{news_id}", headers=admin_headers)
