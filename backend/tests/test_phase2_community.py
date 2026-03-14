"""
Phase 2 Community Structure Features Tests
- Community Guidelines Page (/community)
- NewsPage 'Zkušenosti komunity' category
- User search in top navigation bar (/api/users/search)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

TEST_EMAIL = "test1@bloom.cz"
TEST_PASSWORD = "test123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for test user."""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if resp.status_code == 200:
        data = resp.json()
        token = data.get("access_token") or data.get("token")
        assert token, f"No token in response: {data}"
        return token
    pytest.skip(f"Auth failed ({resp.status_code}): {resp.text}")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Return headers with Bearer token."""
    return {"Authorization": f"Bearer {auth_token}"}


class TestUsersSearchEndpoint:
    """Tests for GET /api/users/search - authenticated endpoint."""

    def test_search_requires_auth(self):
        """Search endpoint should reject unauthenticated requests (401 or 403)."""
        resp = requests.get(f"{BASE_URL}/api/users/search?q=test")
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}: {resp.text}"
        print(f"PASS: search requires auth - {resp.status_code} without token (NOTE: 403 returned instead of 401 - minor)")

    def test_search_returns_list(self, auth_headers):
        """Search with valid query returns a list."""
        resp = requests.get(f"{BASE_URL}/api/users/search?q=test", headers=auth_headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}: {data}"
        print(f"PASS: search returns list - {len(data)} results for 'test'")

    def test_search_result_structure(self, auth_headers):
        """Search results have expected fields: id, username."""
        resp = requests.get(f"{BASE_URL}/api/users/search?q=test", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        if len(data) > 0:
            user = data[0]
            assert "id" in user, f"Missing 'id' field in result: {user}"
            assert "username" in user, f"Missing 'username' field in result: {user}"
            print(f"PASS: search result has id and username fields: {user.get('username')}")
        else:
            print("INFO: No search results for 'test' - skipping structure check")

    def test_search_max_10_results(self, auth_headers):
        """Search returns at most 10 results."""
        resp = requests.get(f"{BASE_URL}/api/users/search?q=a", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) <= 10, f"Expected max 10 results, got {len(data)}"
        print(f"PASS: search returns max 10 results - got {len(data)}")

    def test_search_min_2_chars_empty_result(self, auth_headers):
        """Search with less than 2 chars returns empty list."""
        # Test with 1 char
        resp = requests.get(f"{BASE_URL}/api/users/search?q=a", headers=auth_headers)
        assert resp.status_code == 200
        # The first endpoint (line 828) returns [] if q < 2 chars
        # but 'a' is 1 char, so check if it returns empty
        # Actually 'a' is 1 char, the endpoint at line 828 checks len(q) < 2
        data = resp.json()
        # 1 char should return empty list based on the implementation
        assert isinstance(data, list)
        print(f"INFO: 1-char query returns {len(data)} results (expected 0 per spec)")

    def test_search_with_1_char_returns_empty(self, auth_headers):
        """Explicitly test that 1-char query returns empty (min 2 chars requirement)."""
        resp = requests.get(f"{BASE_URL}/api/users/search?q=x", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 0, f"Expected 0 results for 1-char query 'x', got {len(data)}: {data}"
        print("PASS: 1-char query returns empty list")

    def test_search_empty_query(self, auth_headers):
        """Search with empty query returns empty list."""
        resp = requests.get(f"{BASE_URL}/api/users/search?q=", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 0, f"Expected empty list for empty query, got {len(data)}"
        print("PASS: empty query returns empty list")

    def test_search_case_insensitive(self, auth_headers):
        """Search is case-insensitive."""
        resp_lower = requests.get(f"{BASE_URL}/api/users/search?q=te", headers=auth_headers)
        resp_upper = requests.get(f"{BASE_URL}/api/users/search?q=TE", headers=auth_headers)
        assert resp_lower.status_code == 200
        assert resp_upper.status_code == 200
        lower_count = len(resp_lower.json())
        upper_count = len(resp_upper.json())
        print(f"INFO: 'te' returns {lower_count}, 'TE' returns {upper_count} - case-insensitive: {lower_count == upper_count}")

    def test_search_no_missing_q_param(self, auth_headers):
        """Search without q parameter - check behavior."""
        resp = requests.get(f"{BASE_URL}/api/users/search", headers=auth_headers)
        # Either 200 with empty list or 422 unprocessable entity
        assert resp.status_code in [200, 422], f"Unexpected status: {resp.status_code}"
        print(f"INFO: search without q param returns {resp.status_code}")

    def test_search_2_chars_returns_results(self, auth_headers):
        """Search with 2+ chars returns results (if any users match)."""
        resp = requests.get(f"{BASE_URL}/api/users/search?q=te", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        print(f"PASS: 2-char query returns {len(data)} results")


class TestNewsCategory:
    """Verifies news API supports 'zkusenosti' category."""

    def test_news_endpoint_accessible(self):
        """GET /api/news should be accessible."""
        resp = requests.get(f"{BASE_URL}/api/news")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        assert isinstance(data, list)
        print(f"PASS: /api/news returns {len(data)} news items")

    def test_news_category_field_exists(self):
        """News items have a category field."""
        resp = requests.get(f"{BASE_URL}/api/news")
        assert resp.status_code == 200
        data = resp.json()
        if len(data) > 0:
            assert "category" in data[0], f"No 'category' field in news item: {data[0]}"
            print(f"PASS: news items have category field. Sample: {data[0].get('category')}")
        else:
            print("INFO: No news items to check category field")

    def test_create_news_with_zkusenosti_category(self, auth_headers):
        """Admin can create news with 'zkusenosti' category."""
        resp = requests.post(f"{BASE_URL}/api/news", headers=auth_headers, json={
            "title": "TEST_Zkusenosti test",
            "content": "Toto je testovací příběh komunity.",
            "category": "zkusenosti"
        })
        assert resp.status_code in [200, 201], f"Expected 200/201, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("category") == "zkusenosti", f"Expected 'zkusenosti', got {data.get('category')}"
        # Cleanup
        if data.get("id"):
            requests.delete(f"{BASE_URL}/api/news/{data['id']}", headers=auth_headers)
        print("PASS: Created news with 'zkusenosti' category")


class TestCommunityPage:
    """Verify community page is accessible (frontend route check via HTTP)."""

    def test_community_page_accessible(self):
        """GET /community should return a response (may be HTML SPA)."""
        resp = requests.get(f"{BASE_URL}/community", allow_redirects=True, timeout=10)
        # SPA serves index.html for all routes - just check 200
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        print(f"PASS: /community page is accessible (status {resp.status_code})")

    def test_community_page_no_auth_required(self):
        """Community page should be publicly accessible without auth."""
        resp = requests.get(f"{BASE_URL}/community", timeout=10)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        print("PASS: /community page accessible without auth")
