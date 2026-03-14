"""
Iteration 41 - Tests for Q&A signature feature and bug fixes:
1. POST /api/questions/{id}/answers with signature saves signature to DB
2. GET /api/questions?section=legal returns answers with signature field
3. GET /api/questions?section=specialists returns answers with signature field
4. Signature displayed in response (AnswerResponse has signature field)
5. Answer without signature still works (optional field)
"""

import pytest
import requests
import os
import uuid


def _get_base_url():
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
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert resp.status_code == 200, f"Admin login failed: {resp.status_code} {resp.text}"
    return resp.json()["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


class TestAnswerSignatureLegal:
    """Test signature field in Legal Q&A answers"""

    @pytest.fixture(scope="class")
    def legal_question_id(self, admin_headers):
        """Create a test legal question and return its id"""
        resp = requests.post(f"{BASE_URL}/api/questions", headers=admin_headers, json={
            "title": f"TEST_Legal_Sig_Question_{uuid.uuid4().hex[:6]}",
            "section": "legal"
        })
        assert resp.status_code == 200, f"Failed to create question: {resp.text}"
        qid = resp.json()["id"]
        yield qid
        # Cleanup
        requests.delete(f"{BASE_URL}/api/questions/{qid}", headers=admin_headers)

    def test_answer_with_signature_is_saved(self, admin_headers, legal_question_id):
        """POST answer with signature - signature must be in response"""
        test_signature = "JUDr. Jana Nováková, advokátka"
        resp = requests.post(
            f"{BASE_URL}/api/questions/{legal_question_id}/answers",
            headers=admin_headers,
            json={"content": "Test answer with signature", "signature": test_signature}
        )
        assert resp.status_code == 200, f"Failed to post answer: {resp.text}"
        data = resp.json()

        # Verify the response contains answers list
        assert "answers" in data, "Response must have 'answers'"
        assert len(data["answers"]) >= 1, "At least one answer must be present"

        # Find the latest answer (last in list)
        last_answer = data["answers"][-1]
        assert last_answer["content"] == "Test answer with signature"
        assert last_answer["signature"] == test_signature, f"Expected signature '{test_signature}', got '{last_answer.get('signature')}'"
        print(f"PASS: Answer signature saved correctly: '{test_signature}'")

    def test_answer_without_signature_defaults_empty(self, admin_headers, legal_question_id):
        """POST answer without signature - signature should default to empty string"""
        resp = requests.post(
            f"{BASE_URL}/api/questions/{legal_question_id}/answers",
            headers=admin_headers,
            json={"content": "Answer without signature"}
        )
        assert resp.status_code == 200, f"Failed to post answer: {resp.text}"
        data = resp.json()
        assert "answers" in data
        # Find the answer we just posted (last one)
        last_answer = data["answers"][-1]
        assert last_answer["content"] == "Answer without signature"
        # Signature should be empty string or absent
        sig = last_answer.get("signature", "")
        assert sig == "" or sig is None, f"Expected empty signature, got '{sig}'"
        print(f"PASS: Answer without signature has empty signature field: '{sig}'")

    def test_get_legal_questions_with_signature_in_answers(self, admin_headers, legal_question_id):
        """GET /api/questions?section=legal - answers must have signature field"""
        resp = requests.get(f"{BASE_URL}/api/questions", params={"section": "legal"})
        assert resp.status_code == 200, f"Failed to get questions: {resp.text}"
        questions = resp.json()

        # Find our test question
        test_q = next((q for q in questions if q["id"] == legal_question_id), None)
        assert test_q is not None, "Test question not found in GET response"

        # Check answers have signature field
        assert len(test_q["answers"]) >= 1, "Test question should have answers"
        for ans in test_q["answers"]:
            assert "signature" in ans, f"Answer missing 'signature' field: {ans}"
        print(f"PASS: GET /api/questions?section=legal returns answers with 'signature' field")

    def test_signature_persisted_in_get_response(self, admin_headers, legal_question_id):
        """Verify that the signature value is preserved and returned on GET"""
        # First, check current state
        resp = requests.get(f"{BASE_URL}/api/questions", params={"section": "legal"})
        assert resp.status_code == 200
        questions = resp.json()
        test_q = next((q for q in questions if q["id"] == legal_question_id), None)
        assert test_q is not None

        # Find the answer that had our specific signature
        signed_answers = [a for a in test_q["answers"] if a.get("signature")]
        assert len(signed_answers) >= 1, "Should have at least one answer with non-empty signature"
        assert signed_answers[0]["signature"] == "JUDr. Jana Nováková, advokátka"
        print(f"PASS: Signature persisted correctly in DB and returned in GET response")


class TestAnswerSignatureSpecialists:
    """Test signature field in Specialist Q&A answers"""

    @pytest.fixture(scope="class")
    def spec_question_id(self, admin_headers):
        """Create a test specialist question"""
        resp = requests.post(f"{BASE_URL}/api/questions", headers=admin_headers, json={
            "title": f"TEST_Spec_Sig_Question_{uuid.uuid4().hex[:6]}",
            "section": "specialists"
        })
        assert resp.status_code == 200, f"Failed to create specialist question: {resp.text}"
        qid = resp.json()["id"]
        yield qid
        # Cleanup
        requests.delete(f"{BASE_URL}/api/questions/{qid}", headers=admin_headers)

    def test_specialist_answer_with_signature_saved(self, admin_headers, spec_question_id):
        """Admin can answer specialist question with signature"""
        test_sig = "MUDr. Petra Svobodová, endokrinolog"
        resp = requests.post(
            f"{BASE_URL}/api/questions/{spec_question_id}/answers",
            headers=admin_headers,
            json={"content": "Specialist answer with signature", "signature": test_sig}
        )
        assert resp.status_code == 200, f"Failed to post specialist answer: {resp.text}"
        data = resp.json()
        assert "answers" in data
        last_answer = data["answers"][-1]
        assert last_answer["content"] == "Specialist answer with signature"
        assert last_answer["signature"] == test_sig, f"Expected '{test_sig}', got '{last_answer.get('signature')}'"
        print(f"PASS: Specialist answer signature saved correctly: '{test_sig}'")

    def test_get_specialist_questions_with_signature(self, admin_headers, spec_question_id):
        """GET /api/questions?section=specialists - answers must have signature field"""
        resp = requests.get(f"{BASE_URL}/api/questions", params={"section": "specialists"})
        assert resp.status_code == 200
        questions = resp.json()

        test_q = next((q for q in questions if q["id"] == spec_question_id), None)
        assert test_q is not None, "Test specialist question not found"
        assert len(test_q["answers"]) >= 1, "Should have at least one answer"

        for ans in test_q["answers"]:
            assert "signature" in ans, f"Answer missing 'signature' field: {ans}"

        # Check the signature value
        sig_answer = test_q["answers"][-1]
        assert sig_answer["signature"] == "MUDr. Petra Svobodová, endokrinolog"
        print(f"PASS: GET /api/questions?section=specialists returns answers with correct signature")


class TestAnswerSignatureModel:
    """Test that AnswerCreate model correctly validates signature"""

    def test_answer_create_no_signature_field(self, admin_headers):
        """Create a legal question and post answer without signature key at all"""
        # Create temp question
        q_resp = requests.post(f"{BASE_URL}/api/questions", headers=admin_headers, json={
            "title": f"TEST_NoSig_{uuid.uuid4().hex[:6]}",
            "section": "legal"
        })
        assert q_resp.status_code == 200
        qid = q_resp.json()["id"]

        try:
            # Post answer without signature key
            a_resp = requests.post(
                f"{BASE_URL}/api/questions/{qid}/answers",
                headers=admin_headers,
                json={"content": "Test answer no sig key"}
            )
            assert a_resp.status_code == 200, f"Should succeed without signature: {a_resp.text}"
            data = a_resp.json()
            last_answer = data["answers"][-1]
            # signature should default to "" 
            assert last_answer.get("signature", "") == ""
            print(f"PASS: Answer without 'signature' key defaults to empty string")
        finally:
            requests.delete(f"{BASE_URL}/api/questions/{qid}", headers=admin_headers)

    def test_answer_create_with_empty_signature(self, admin_headers):
        """Post answer with explicitly empty signature"""
        q_resp = requests.post(f"{BASE_URL}/api/questions", headers=admin_headers, json={
            "title": f"TEST_EmptySig_{uuid.uuid4().hex[:6]}",
            "section": "legal"
        })
        assert q_resp.status_code == 200
        qid = q_resp.json()["id"]

        try:
            a_resp = requests.post(
                f"{BASE_URL}/api/questions/{qid}/answers",
                headers=admin_headers,
                json={"content": "Test empty sig", "signature": ""}
            )
            assert a_resp.status_code == 200
            data = a_resp.json()
            last_answer = data["answers"][-1]
            assert last_answer.get("signature", "") == ""
            print(f"PASS: Answer with empty signature returns empty signature field")
        finally:
            requests.delete(f"{BASE_URL}/api/questions/{qid}", headers=admin_headers)
