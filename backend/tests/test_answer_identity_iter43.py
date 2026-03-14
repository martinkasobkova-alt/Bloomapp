"""
Iteration 43 - Expert identity improvement for Q&A answers.
Tests:
- GET /api/questions?section=legal returns answers with user_role field
- GET /api/questions?section=specialists returns answers with user_role field
- POST /api/questions/{id}/answers returns answer with user_role matching poster's role
- Existing old answers without user_role still display gracefully (no crash)
- AnswerResponse model has user_role: str = 'user' as default
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

ADMIN_EMAIL = "test1@bloom.cz"
ADMIN_PASSWORD = "test123"


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def admin_token():
    """Obtain admin token once for the entire module."""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    data = resp.json()
    assert "token" in data
    return data["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def admin_user_id(admin_token):
    """Get admin user id."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    resp = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
    assert resp.status_code == 200
    return resp.json()["id"]


# ---------------------------------------------------------------------------
# Test: GET questions returns answers with user_role field
# ---------------------------------------------------------------------------

class TestGetQuestionsUserRoleField:
    """Verify GET /api/questions returns answers with user_role"""

    def test_get_legal_questions_returns_200(self):
        """GET /api/questions?section=legal returns 200"""
        resp = requests.get(f"{BASE_URL}/api/questions", params={"section": "legal"})
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), "Expected list response"
        print(f"PASS: GET /api/questions?section=legal returns {len(data)} questions")

    def test_get_specialists_questions_returns_200(self):
        """GET /api/questions?section=specialists returns 200"""
        resp = requests.get(f"{BASE_URL}/api/questions", params={"section": "specialists"})
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), "Expected list response"
        print(f"PASS: GET /api/questions?section=specialists returns {len(data)} questions")

    def test_legal_questions_have_answers_with_user_role_field(self):
        """Each answer in legal questions should have a user_role field (could be empty for old answers)"""
        resp = requests.get(f"{BASE_URL}/api/questions", params={"section": "legal"})
        assert resp.status_code == 200
        questions = resp.json()
        for q in questions:
            assert "answers" in q, f"Question {q.get('id')} missing 'answers' field"
            for a in q.get("answers", []):
                # user_role should exist (defaulting to 'user' for old answers)
                assert "user_role" in a, f"Answer {a.get('id')} missing 'user_role' field in question {q.get('id')}"
                print(f"  Answer {a.get('id')}: user_role={a.get('user_role')}")
        print(f"PASS: All answers in legal questions have user_role field ({len(questions)} questions checked)")

    def test_specialists_questions_have_answers_with_user_role_field(self):
        """Each answer in specialists questions should have a user_role field"""
        resp = requests.get(f"{BASE_URL}/api/questions", params={"section": "specialists"})
        assert resp.status_code == 200
        questions = resp.json()
        for q in questions:
            assert "answers" in q, f"Question {q.get('id')} missing 'answers' field"
            for a in q.get("answers", []):
                assert "user_role" in a, f"Answer {a.get('id')} missing 'user_role' field"
        print(f"PASS: All answers in specialists questions have user_role field ({len(questions)} questions checked)")


# ---------------------------------------------------------------------------
# Test: POST answer sets correct user_role
# ---------------------------------------------------------------------------

class TestPostAnswerUserRole:
    """POST /api/questions/{id}/answers must include user_role = poster's role"""

    created_legal_question_id = None
    created_spec_question_id = None

    def test_create_legal_question_for_answer_test(self, admin_headers):
        """Create a legal question to answer"""
        resp = requests.post(
            f"{BASE_URL}/api/questions",
            json={"title": f"TEST_legal_q_{uuid.uuid4().hex[:6]}", "section": "legal"},
            headers=admin_headers
        )
        assert resp.status_code == 200, f"Failed to create legal question: {resp.text}"
        data = resp.json()
        TestPostAnswerUserRole.created_legal_question_id = data["id"]
        print(f"PASS: Created legal question {data['id']}")

    def test_admin_posts_answer_to_legal_question_has_correct_role(self, admin_headers):
        """Admin posts answer → user_role should be 'admin'"""
        assert TestPostAnswerUserRole.created_legal_question_id, "No legal question created"
        qid = TestPostAnswerUserRole.created_legal_question_id
        resp = requests.post(
            f"{BASE_URL}/api/questions/{qid}/answers",
            json={"content": "TEST_answer_admin_role"},
            headers=admin_headers
        )
        assert resp.status_code == 200, f"Failed to post answer: {resp.text}"
        data = resp.json()
        # Find the answer we just posted
        answers = data.get("answers", [])
        assert len(answers) > 0, "Expected at least one answer"
        latest_answer = answers[-1]
        assert "user_role" in latest_answer, "Answer missing user_role field"
        assert latest_answer["user_role"] == "admin", f"Expected 'admin', got '{latest_answer['user_role']}'"
        assert latest_answer["content"] == "TEST_answer_admin_role"
        print(f"PASS: Admin answer has user_role='admin' (actual={latest_answer['user_role']})")

    def test_answer_response_has_username_field(self, admin_headers):
        """Answer response must have username field"""
        assert TestPostAnswerUserRole.created_legal_question_id, "No legal question created"
        qid = TestPostAnswerUserRole.created_legal_question_id
        resp = requests.get(
            f"{BASE_URL}/api/questions",
            params={"section": "legal"}
        )
        assert resp.status_code == 200
        questions = resp.json()
        q = next((q for q in questions if q["id"] == qid), None)
        assert q is not None, "Could not find created question in list"
        answers = q.get("answers", [])
        assert len(answers) > 0, "Expected answers"
        for a in answers:
            assert "username" in a, "Answer missing username field"
            assert "user_id" in a, "Answer missing user_id field"
            assert "user_role" in a, "Answer missing user_role field"
            assert a["user_role"] == "admin"
        print(f"PASS: Answer has username, user_id, user_role='admin'")

    def test_create_specialist_question_for_answer_test(self, admin_headers):
        """Create a specialist question to answer"""
        resp = requests.post(
            f"{BASE_URL}/api/questions",
            json={"title": f"TEST_spec_q_{uuid.uuid4().hex[:6]}", "section": "specialists"},
            headers=admin_headers
        )
        assert resp.status_code == 200, f"Failed to create specialist question: {resp.text}"
        data = resp.json()
        TestPostAnswerUserRole.created_spec_question_id = data["id"]
        print(f"PASS: Created specialist question {data['id']}")

    def test_admin_posts_answer_to_spec_question_has_correct_role(self, admin_headers):
        """Admin posts answer to specialist question → user_role should be 'admin'"""
        assert TestPostAnswerUserRole.created_spec_question_id, "No specialist question created"
        qid = TestPostAnswerUserRole.created_spec_question_id
        resp = requests.post(
            f"{BASE_URL}/api/questions/{qid}/answers",
            json={"content": "TEST_answer_spec_admin_role"},
            headers=admin_headers
        )
        assert resp.status_code == 200, f"Failed to post answer: {resp.text}"
        data = resp.json()
        answers = data.get("answers", [])
        assert len(answers) > 0
        latest_answer = answers[-1]
        assert latest_answer["user_role"] == "admin", f"Expected 'admin', got '{latest_answer['user_role']}'"
        print(f"PASS: Specialist Q admin answer has user_role='admin'")

    def test_cleanup_created_questions(self, admin_headers):
        """Clean up test questions"""
        for qid in [
            TestPostAnswerUserRole.created_legal_question_id,
            TestPostAnswerUserRole.created_spec_question_id
        ]:
            if qid:
                resp = requests.delete(f"{BASE_URL}/api/questions/{qid}", headers=admin_headers)
                print(f"Cleanup question {qid}: {resp.status_code}")


# ---------------------------------------------------------------------------
# Test: Old answers without user_role still display gracefully (no crash)
# ---------------------------------------------------------------------------

class TestOldAnswersGracefulFallback:
    """Old answers without user_role in DB should still parse (AnswerResponse has default='user')"""

    def test_questions_endpoint_does_not_crash_with_missing_user_role(self):
        """GET /api/questions?section=legal should not return 500 even if old answers lack user_role"""
        resp = requests.get(f"{BASE_URL}/api/questions", params={"section": "legal"})
        assert resp.status_code == 200, f"Endpoint crashed: {resp.status_code}: {resp.text}"
        # Verify all questions and answers parse without error
        questions = resp.json()
        for q in questions:
            assert "id" in q
            assert "title" in q
            assert "answers" in q
            for a in q["answers"]:
                # If user_role is missing in DB, AnswerResponse defaults to 'user'
                assert "user_role" in a, f"Missing user_role in answer {a.get('id')}"
                # user_role should be a string
                assert isinstance(a["user_role"], str), f"user_role is not a string: {a['user_role']}"
        print(f"PASS: No crash, all {len(questions)} questions parsed correctly with user_role field")

    def test_user_role_default_is_string(self):
        """All user_role values should be strings (not None/null)"""
        resp = requests.get(f"{BASE_URL}/api/questions", params={"section": "legal"})
        assert resp.status_code == 200
        for q in resp.json():
            for a in q.get("answers", []):
                assert a.get("user_role") is not None, f"user_role is None for answer {a.get('id')}"
                assert isinstance(a["user_role"], str)
        print("PASS: All user_role values are non-null strings")

    def test_answer_response_has_all_required_fields(self):
        """Each answer must have id, user_id, username, user_role, content, created_at"""
        resp = requests.get(f"{BASE_URL}/api/questions", params={"section": "legal"})
        assert resp.status_code == 200
        for q in resp.json():
            for a in q.get("answers", []):
                for field in ["id", "user_id", "username", "user_role", "content", "created_at"]:
                    assert field in a, f"Answer {a.get('id')} missing field '{field}'"
        print("PASS: All answers have required fields including user_role")
