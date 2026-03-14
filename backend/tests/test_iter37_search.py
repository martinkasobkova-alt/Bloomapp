"""
Iteration 37 - Global Search Feature Tests
Tests for GET /api/search endpoint and related functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "test1@bloom.cz"
ADMIN_PASSWORD = "test123"


@pytest.fixture(scope="module")
def auth_token():
    """Obtain a valid auth token for search tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Authentication failed ({response.status_code}): {response.text}")


@pytest.fixture(scope="module")
def authed_session(auth_token):
    """Requests session with Bearer token"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestSearchAuthentication:
    """Authentication requirements for /api/search"""

    def test_search_requires_auth_no_token(self):
        """GET /api/search without token must return 401 or 403"""
        response = requests.get(f"{BASE_URL}/api/search", params={"q": "test"})
        assert response.status_code in [401, 403], (
            f"Expected 401/403 without auth, got {response.status_code}"
        )

    def test_search_requires_auth_invalid_token(self):
        """GET /api/search with invalid token must return 401 or 403"""
        response = requests.get(
            f"{BASE_URL}/api/search",
            params={"q": "test"},
            headers={"Authorization": "Bearer invalid_token_xyz"}
        )
        assert response.status_code in [401, 403], (
            f"Expected 401/403 with invalid token, got {response.status_code}"
        )


class TestSearchValidation:
    """Input validation for /api/search"""

    def test_search_short_query_1_char_returns_422(self, authed_session):
        """q with 1 character must return 422 (FastAPI min_length=2 validation)"""
        response = authed_session.get(f"{BASE_URL}/api/search", params={"q": "a"})
        assert response.status_code == 422, (
            f"Expected 422 for q='a' (length 1), got {response.status_code}: {response.text}"
        )

    def test_search_empty_query_returns_422(self, authed_session):
        """Empty q must return 422"""
        response = authed_session.get(f"{BASE_URL}/api/search", params={"q": ""})
        assert response.status_code == 422, (
            f"Expected 422 for empty q, got {response.status_code}"
        )

    def test_search_no_query_param_returns_422(self, authed_session):
        """Missing q parameter must return 422"""
        response = authed_session.get(f"{BASE_URL}/api/search")
        assert response.status_code == 422, (
            f"Expected 422 for missing q, got {response.status_code}"
        )


class TestSearchResults:
    """Core search functionality"""

    def test_search_returns_grouped_structure(self, authed_session):
        """GET /api/search?q=test returns correct structure with all types"""
        response = authed_session.get(f"{BASE_URL}/api/search", params={"q": "test", "limit": 3})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

        data = response.json()
        # Must have query, results, totals keys
        assert "query" in data, "Response must have 'query' key"
        assert "results" in data, "Response must have 'results' key"
        assert "totals" in data, "Response must have 'totals' key"

        # results must have all 5 content type keys
        results = data["results"]
        for key in ["posts", "users", "specialists", "services", "articles"]:
            assert key in results, f"results must have '{key}' key"
            assert isinstance(results[key], list), f"results['{key}'] must be a list"

    def test_search_query_echoed_back(self, authed_session):
        """Response 'query' field must echo back the search term"""
        response = authed_session.get(f"{BASE_URL}/api/search", params={"q": "test", "limit": 3})
        assert response.status_code == 200
        data = response.json()
        assert data["query"] == "test", f"Expected query='test', got '{data['query']}'"

    def test_search_totals_are_integers(self, authed_session):
        """Totals must be integer counts for each content type"""
        response = authed_session.get(f"{BASE_URL}/api/search", params={"q": "test", "limit": 3})
        assert response.status_code == 200
        data = response.json()
        totals = data["totals"]
        for key in ["posts", "users", "specialists", "services", "articles"]:
            assert key in totals, f"totals must have '{key}' key"
            assert isinstance(totals[key], int), f"totals['{key}'] must be int, got {type(totals[key])}"
            assert totals[key] >= 0, f"totals['{key}'] must be >= 0"

    def test_search_limit_respected(self, authed_session):
        """Results per type must not exceed requested limit"""
        limit = 3
        response = authed_session.get(f"{BASE_URL}/api/search", params={"q": "an", "limit": limit})
        assert response.status_code == 200
        data = response.json()
        for key, items in data["results"].items():
            assert len(items) <= limit, (
                f"results['{key}'] has {len(items)} items, expected <= {limit}"
            )

    def test_search_no_mongodb_id_in_results(self, authed_session):
        """MongoDB _id must not appear in search results"""
        response = authed_session.get(f"{BASE_URL}/api/search", params={"q": "an", "limit": 5})
        assert response.status_code == 200
        data = response.json()
        for key, items in data["results"].items():
            for item in items:
                assert "_id" not in item, (
                    f"MongoDB _id leaked in results['{key}'] item: {item}"
                )

    def test_search_nonexistent_term_empty_results(self, authed_session):
        """Searching for a non-existent term returns empty lists, not errors"""
        nonexistent = "xyz_nonexistent_bloom_test_term_12345"
        response = authed_session.get(
            f"{BASE_URL}/api/search",
            params={"q": nonexistent, "limit": 3}
        )
        assert response.status_code == 200, (
            f"Expected 200 for non-existent term, got {response.status_code}"
        )
        data = response.json()
        results = data["results"]
        for key in ["posts", "users", "specialists", "services", "articles"]:
            assert results[key] == [], (
                f"Expected empty list for '{key}', got {results[key]}"
            )
        totals = data["totals"]
        for key in ["posts", "users", "specialists", "services", "articles"]:
            assert totals[key] == 0, (
                f"Expected total 0 for '{key}', got {totals[key]}"
            )

    def test_search_case_insensitive(self, authed_session):
        """Search must be case-insensitive (search for uppercase and lowercase of same term)"""
        # First search with lowercase
        r1 = authed_session.get(f"{BASE_URL}/api/search", params={"q": "test", "limit": 10})
        # Then search with uppercase
        r2 = authed_session.get(f"{BASE_URL}/api/search", params={"q": "TEST", "limit": 10})

        assert r1.status_code == 200
        assert r2.status_code == 200

        d1 = r1.json()
        d2 = r2.json()

        # Totals should be the same for case-insensitive search
        for key in ["posts", "users", "specialists", "services", "articles"]:
            assert d1["totals"][key] == d2["totals"][key], (
                f"Case-insensitive search mismatch for '{key}': "
                f"lowercase={d1['totals'][key]}, uppercase={d2['totals'][key]}"
            )

    def test_search_posts_result_fields(self, authed_session):
        """Post results must have expected fields"""
        # Try a broad search to get some results
        response = authed_session.get(f"{BASE_URL}/api/search", params={"q": "an", "limit": 5})
        assert response.status_code == 200
        data = response.json()
        posts = data["results"]["posts"]
        if posts:
            post = posts[0]
            # Must have id
            assert "id" in post, f"Post result must have 'id' field: {post}"

    def test_search_users_result_fields(self, authed_session):
        """User results must have expected fields"""
        response = authed_session.get(f"{BASE_URL}/api/search", params={"q": "an", "limit": 5})
        assert response.status_code == 200
        data = response.json()
        users = data["results"]["users"]
        if users:
            user = users[0]
            assert "id" in user, f"User result must have 'id' field: {user}"
            assert "username" in user or "bio" in user, (
                f"User result must have 'username' or 'bio' field: {user}"
            )

    def test_search_with_2_char_minimum(self, authed_session):
        """q with exactly 2 characters must return 200"""
        response = authed_session.get(f"{BASE_URL}/api/search", params={"q": "te", "limit": 3})
        assert response.status_code == 200, (
            f"Expected 200 for q='te' (length 2), got {response.status_code}: {response.text}"
        )
        data = response.json()
        assert "results" in data

    def test_search_default_limit(self, authed_session):
        """Search without explicit limit uses default (5) without error"""
        response = authed_session.get(f"{BASE_URL}/api/search", params={"q": "test"})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"

    def test_search_large_limit(self, authed_session):
        """Search with limit=20 (max allowed) returns 200"""
        response = authed_session.get(f"{BASE_URL}/api/search", params={"q": "an", "limit": 20})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
