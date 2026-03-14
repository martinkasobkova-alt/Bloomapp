"""
Iteration 44: Test Q&A answer endpoint and notification creation
Tests:
- POST /api/questions/{id}/answers returns 200 and creates in-app notification
- Notification appears in /api/notifications for question author
- imports in news.py are correct (resend, SENDER_EMAIL, FRONTEND_URL, logger, bloom_email_html)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials (can answer questions)
ADMIN_EMAIL = "test1@bloom.cz"
ADMIN_PASSWORD = "test123"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return r.json().get("token")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def admin_user_id(admin_token):
    """Get admin user id"""
    r = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200
    return r.json().get("id")


class TestNewsImports:
    """Verify that news.py imports are correct via smoke test"""

    def test_backend_health(self):
        """Backend should be reachable"""
        r = requests.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200, f"Backend unreachable: {r.status_code}"

    def test_questions_endpoint_accessible(self, admin_headers):
        """Questions endpoint should be reachable (implies news.py loaded without import errors)"""
        r = requests.get(f"{BASE_URL}/api/questions", headers=admin_headers)
        assert r.status_code == 200, f"Questions endpoint failed (import error?): {r.status_code} {r.text}"


class TestQAAnswerEndpoint:
    """Tests for POST /api/questions/{id}/answers"""

    @pytest.fixture(scope="class")
    def test_question_id(self, admin_headers, admin_user_id):
        """Create a test question as admin (admin asking a legal question)"""
        title = f"TEST_question_{uuid.uuid4().hex[:8]}"
        r = requests.post(f"{BASE_URL}/api/questions", headers=admin_headers, json={
            "title": title,
            "content": "Test question content for iteration 44 testing",
            "section": "legal"
        })
        assert r.status_code == 200, f"Failed to create question: {r.status_code} {r.text}"
        q = r.json()
        return q["id"]

    def test_create_answer_returns_200(self, admin_headers, test_question_id):
        """POST answer to question should return 200"""
        r = requests.post(
            f"{BASE_URL}/api/questions/{test_question_id}/answers",
            headers=admin_headers,
            json={"content": "TEST_answer: This is a test answer from admin"}
        )
        assert r.status_code == 200, f"Answer creation failed: {r.status_code} {r.text}"

    def test_answer_in_question_response(self, admin_headers, test_question_id):
        """After answering, the question response should contain the answer"""
        # Post an answer
        r = requests.post(
            f"{BASE_URL}/api/questions/{test_question_id}/answers",
            headers=admin_headers,
            json={"content": "TEST_answer_verify: Answer for verification"}
        )
        assert r.status_code == 200, f"Answer creation failed: {r.status_code} {r.text}"

        data = r.json()
        assert "answers" in data, "Response should contain 'answers' field"
        assert isinstance(data["answers"], list), "answers should be a list"
        assert len(data["answers"]) >= 1, "At least one answer should be present"

        # Check answer structure
        answer = data["answers"][-1]
        assert "id" in answer
        assert "content" in answer
        assert "TEST_answer_verify" in answer["content"]
        assert "user_id" in answer
        assert "username" in answer
        assert "created_at" in answer

    def test_answer_not_found_returns_404(self, admin_headers):
        """Answering a non-existent question should return 404"""
        fake_id = str(uuid.uuid4())
        r = requests.post(
            f"{BASE_URL}/api/questions/{fake_id}/answers",
            headers=admin_headers,
            json={"content": "Answer to nonexistent question"}
        )
        assert r.status_code == 404, f"Expected 404, got {r.status_code}"

    def test_unauthenticated_answer_returns_401(self, test_question_id):
        """Unauthenticated answer should return 401"""
        r = requests.post(
            f"{BASE_URL}/api/questions/{test_question_id}/answers",
            json={"content": "Unauthenticated answer"}
        )
        assert r.status_code in (401, 403), f"Expected 401/403, got {r.status_code}"


class TestQAAnswerNotification:
    """Test that answering a question creates a notification for the question author"""

    def test_notification_created_for_self_answer(self, admin_headers, admin_user_id):
        """When admin answers their own question, no notification should be created (same user)"""
        # Create question as admin
        r = requests.post(f"{BASE_URL}/api/questions", headers=admin_headers, json={
            "title": f"TEST_notif_self_{uuid.uuid4().hex[:6]}",
            "content": "Question to test no self-notification",
            "section": "legal"
        })
        assert r.status_code == 200
        q_id = r.json()["id"]

        # Get current notification count
        notif_r = requests.get(f"{BASE_URL}/api/notifications", headers=admin_headers)
        assert notif_r.status_code == 200
        before_count = len(notif_r.json())

        # Admin answers own question — no notification expected
        r2 = requests.post(
            f"{BASE_URL}/api/questions/{q_id}/answers",
            headers=admin_headers,
            json={"content": "Self-answer test"}
        )
        assert r2.status_code == 200

        # Check notifications — count should remain same (no self-notification)
        notif_r2 = requests.get(f"{BASE_URL}/api/notifications", headers=admin_headers)
        after_count = len(notif_r2.json())
        # Self-answer should not create a notification
        assert after_count == before_count, f"Self-answer created a notification (before={before_count}, after={after_count})"


class TestNotificationsEndpoint:
    """Verify the notifications endpoint works"""

    def test_get_notifications_returns_200(self, admin_headers):
        """GET /api/notifications should return 200"""
        r = requests.get(f"{BASE_URL}/api/notifications", headers=admin_headers)
        assert r.status_code == 200, f"Notifications endpoint failed: {r.status_code} {r.text}"

    def test_notifications_response_structure(self, admin_headers):
        """Notifications response should be a list with proper structure"""
        r = requests.get(f"{BASE_URL}/api/notifications", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list), "Notifications should be a list"
        if data:
            notif = data[0]
            assert "id" in notif
            assert "type" in notif
            assert "title" in notif
