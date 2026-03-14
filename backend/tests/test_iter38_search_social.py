"""
Iteration 38 - Search (7 types) + Social Media Links Tests
Tests for:
  - GET /api/search returns all 7 result keys (posts, users, specialists, services, articles, questions, reviews)
  - PUT /api/auth/profile accepts and persists instagram, facebook, linkedin
  - GET /api/users/{id}/public-profile returns instagram, facebook, linkedin
"""
import pytest
import requests
import os

# Load from frontend/.env if not in environment
def _get_base_url():
    url = os.environ.get('REACT_APP_BACKEND_URL', '')
    if not url:
        env_path = os.path.join(os.path.dirname(__file__), '../../frontend/.env')
        try:
            with open(env_path) as f:
                for line in f:
                    if line.startswith('REACT_APP_BACKEND_URL='):
                        url = line.split('=', 1)[1].strip()
                        break
        except Exception:
            pass
    return url.rstrip('/')

BASE_URL = _get_base_url()

ADMIN_EMAIL = "test1@bloom.cz"
ADMIN_PASSWORD = "test123"


@pytest.fixture(scope="module")
def auth_token():
    """Get admin auth token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if resp.status_code == 200:
        return resp.json().get("token")
    pytest.skip(f"Auth failed: {resp.status_code} {resp.text}")


@pytest.fixture(scope="module")
def authed(auth_token):
    """Authenticated requests session"""
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"})
    return s


# ──────────────────────────────────────────────────────────────
# 1. Search API — 7 keys in response
# ──────────────────────────────────────────────────────────────
class TestSearch7Keys:
    """Search response must contain all 7 result keys"""

    def test_search_returns_200(self, authed):
        resp = authed.get(f"{BASE_URL}/api/search", params={"q": "test"})
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

    def test_search_has_results_key(self, authed):
        resp = authed.get(f"{BASE_URL}/api/search", params={"q": "test"})
        data = resp.json()
        assert "results" in data, "Response missing 'results' key"

    def test_search_results_has_posts(self, authed):
        resp = authed.get(f"{BASE_URL}/api/search", params={"q": "test"})
        assert "posts" in resp.json()["results"], "results missing 'posts' key"

    def test_search_results_has_users(self, authed):
        resp = authed.get(f"{BASE_URL}/api/search", params={"q": "test"})
        assert "users" in resp.json()["results"], "results missing 'users' key"

    def test_search_results_has_specialists(self, authed):
        resp = authed.get(f"{BASE_URL}/api/search", params={"q": "test"})
        assert "specialists" in resp.json()["results"], "results missing 'specialists' key"

    def test_search_results_has_services(self, authed):
        resp = authed.get(f"{BASE_URL}/api/search", params={"q": "test"})
        assert "services" in resp.json()["results"], "results missing 'services' key"

    def test_search_results_has_articles(self, authed):
        resp = authed.get(f"{BASE_URL}/api/search", params={"q": "test"})
        assert "articles" in resp.json()["results"], "results missing 'articles' key"

    def test_search_results_has_questions(self, authed):
        resp = authed.get(f"{BASE_URL}/api/search", params={"q": "test"})
        assert "questions" in resp.json()["results"], "results missing 'questions' key"

    def test_search_results_has_reviews(self, authed):
        resp = authed.get(f"{BASE_URL}/api/search", params={"q": "test"})
        assert "reviews" in resp.json()["results"], "results missing 'reviews' key"

    def test_search_totals_has_7_keys(self, authed):
        resp = authed.get(f"{BASE_URL}/api/search", params={"q": "test"})
        data = resp.json()
        expected_keys = {"posts", "users", "specialists", "services", "articles", "questions", "reviews"}
        totals_keys = set(data.get("totals", {}).keys())
        assert expected_keys == totals_keys, f"totals has keys {totals_keys}, expected {expected_keys}"

    def test_search_results_lists_not_none(self, authed):
        """All 7 result lists must be lists (not None/missing)"""
        resp = authed.get(f"{BASE_URL}/api/search", params={"q": "test"})
        results = resp.json()["results"]
        for key in ["posts", "users", "specialists", "services", "articles", "questions", "reviews"]:
            assert isinstance(results.get(key), list), f"results['{key}'] is not a list"

    def test_search_questions_list_type(self, authed):
        """questions key must be a list"""
        resp = authed.get(f"{BASE_URL}/api/search", params={"q": "trans"})
        results = resp.json()["results"]
        assert isinstance(results["questions"], list)

    def test_search_reviews_list_type(self, authed):
        """reviews key must be a list"""
        resp = authed.get(f"{BASE_URL}/api/search", params={"q": "trans"})
        results = resp.json()["results"]
        assert isinstance(results["reviews"], list)

    def test_search_specialists_only_approved(self, authed):
        """Specialists must not have banned/pending status"""
        resp = authed.get(f"{BASE_URL}/api/search", params={"q": "test", "limit": 20})
        specialists = resp.json()["results"].get("specialists", [])
        for s in specialists:
            status = s.get("status")
            if status:
                assert status in ["approved", ""], f"Specialist with non-approved status found: {status}"

    def test_search_no_mongo_id_in_questions(self, authed):
        """No MongoDB _id in questions results"""
        resp = authed.get(f"{BASE_URL}/api/search", params={"q": "test"})
        for q in resp.json()["results"]["questions"]:
            assert "_id" not in q

    def test_search_no_mongo_id_in_reviews(self, authed):
        """No MongoDB _id in reviews results"""
        resp = authed.get(f"{BASE_URL}/api/search", params={"q": "test"})
        for r in resp.json()["results"]["reviews"]:
            assert "_id" not in r


# ──────────────────────────────────────────────────────────────
# 2. Social Media Links
# ──────────────────────────────────────────────────────────────
class TestSocialLinks:
    """PUT /auth/profile - instagram, facebook, linkedin persist correctly"""

    INSTAGRAM_URL = "https://instagram.com/testbloom"
    FACEBOOK_URL = "https://facebook.com/testbloom"
    LINKEDIN_URL = "https://linkedin.com/in/testbloom"

    def test_update_profile_with_social_links(self, authed):
        """PUT /auth/profile with social links returns 200"""
        resp = authed.put(f"{BASE_URL}/api/auth/profile", params={
            "instagram": self.INSTAGRAM_URL,
            "facebook": self.FACEBOOK_URL,
            "linkedin": self.LINKEDIN_URL,
        })
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

    def test_instagram_persisted_in_response(self, authed):
        """Instagram URL returned in profile update response"""
        resp = authed.put(f"{BASE_URL}/api/auth/profile", params={
            "instagram": self.INSTAGRAM_URL,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("instagram") == self.INSTAGRAM_URL, f"Expected instagram={self.INSTAGRAM_URL}, got {data.get('instagram')}"

    def test_facebook_persisted_in_response(self, authed):
        """Facebook URL returned in profile update response"""
        resp = authed.put(f"{BASE_URL}/api/auth/profile", params={
            "facebook": self.FACEBOOK_URL,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("facebook") == self.FACEBOOK_URL, f"Expected facebook={self.FACEBOOK_URL}, got {data.get('facebook')}"

    def test_linkedin_persisted_in_response(self, authed):
        """LinkedIn URL returned in profile update response"""
        resp = authed.put(f"{BASE_URL}/api/auth/profile", params={
            "linkedin": self.LINKEDIN_URL,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("linkedin") == self.LINKEDIN_URL, f"Expected linkedin={self.LINKEDIN_URL}, got {data.get('linkedin')}"

    def test_get_me_returns_social_links(self, authed):
        """GET /auth/me returns instagram, facebook, linkedin after update"""
        # First set
        authed.put(f"{BASE_URL}/api/auth/profile", params={
            "instagram": self.INSTAGRAM_URL,
            "facebook": self.FACEBOOK_URL,
            "linkedin": self.LINKEDIN_URL,
        })
        # Then verify with GET /auth/me
        resp = authed.get(f"{BASE_URL}/api/auth/me")
        assert resp.status_code == 200, f"GET /auth/me failed: {resp.status_code}"
        data = resp.json()
        assert data.get("instagram") == self.INSTAGRAM_URL
        assert data.get("facebook") == self.FACEBOOK_URL
        assert data.get("linkedin") == self.LINKEDIN_URL

    def test_public_profile_returns_social_links(self, authed, auth_token):
        """GET /users/{id}/public-profile returns social links"""
        # Get own user id
        me_resp = authed.get(f"{BASE_URL}/api/auth/me")
        assert me_resp.status_code == 200
        user_id = me_resp.json()["id"]

        # Set social links
        authed.put(f"{BASE_URL}/api/auth/profile", params={
            "instagram": self.INSTAGRAM_URL,
            "facebook": self.FACEBOOK_URL,
            "linkedin": self.LINKEDIN_URL,
        })

        # Fetch public profile
        pub_resp = authed.get(f"{BASE_URL}/api/users/{user_id}/public-profile")
        assert pub_resp.status_code == 200, f"Public profile failed: {pub_resp.status_code}"
        pub_data = pub_resp.json()
        assert pub_data.get("instagram") == self.INSTAGRAM_URL, f"Public profile missing instagram: {pub_data}"
        assert pub_data.get("facebook") == self.FACEBOOK_URL
        assert pub_data.get("linkedin") == self.LINKEDIN_URL

    def test_clear_social_links_with_empty_string(self, authed):
        """Social links can be cleared by passing empty string"""
        # First set them
        authed.put(f"{BASE_URL}/api/auth/profile", params={
            "instagram": self.INSTAGRAM_URL,
        })
        # Then clear
        resp = authed.put(f"{BASE_URL}/api/auth/profile", params={
            "instagram": "",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("instagram") == "", f"Expected empty instagram after clear, got {data.get('instagram')}"

    def test_cleanup_restore_empty_social_links(self, authed):
        """Restore empty social links after tests"""
        resp = authed.put(f"{BASE_URL}/api/auth/profile", params={
            "instagram": "",
            "facebook": "",
            "linkedin": "",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("instagram") == ""
        assert data.get("facebook") == ""
        assert data.get("linkedin") == ""
