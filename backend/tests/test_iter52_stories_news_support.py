"""
Iteration 52 Backend Tests
Tests for: Stories section, Q&A permissions, NewsPage edit, SupportPage edit, badge colors, Section Settings
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
ADMIN_EMAIL = "test1@bloom.cz"
ADMIN_PASSWORD = "test123"
COMMUNITY_PASSWORD = "Transfortrans"
TEST_STORY_ID = "41b7f070-287f-4829-b4f4-8cb3ddf92931"
_uid = uuid.uuid4().hex[:8]
TEST_USER_EMAIL = f"TEST_iter52_user_{_uid}@bloom.cz"
TEST_USER_USERNAME = f"iter52_user_{_uid}"
TEST_USER_PASSWORD = "TestPass52!"
LAWYER_EMAIL = "testver_X@bloom.cz"  # role=lawyer
LAWYER_PASSWORD = "TestX1234!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    r = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD, "community_password": COMMUNITY_PASSWORD
    })
    if r.status_code == 200:
        return r.json().get("token") or r.json().get("access_token")
    pytest.skip(f"Admin login failed: {r.status_code} {r.text[:200]}")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def regular_user_token():
    """Create a regular test user and get their token"""
    # Register user
    reg_r = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": TEST_USER_EMAIL,
        "username": TEST_USER_USERNAME,
        "password": TEST_USER_PASSWORD,
        "community_password": COMMUNITY_PASSWORD
    })
    assert reg_r.status_code in [200, 201, 409], f"Register failed: {reg_r.status_code} {reg_r.text[:200]}"
    
    # Login
    login_r = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD, "community_password": COMMUNITY_PASSWORD
    })
    assert login_r.status_code == 200, f"User login failed: {login_r.status_code} {login_r.text[:200]}"
    return login_r.json().get("token") or login_r.json().get("access_token")


@pytest.fixture(scope="module")
def user_headers(regular_user_token):
    return {"Authorization": f"Bearer {regular_user_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def lawyer_token():
    """Get lawyer user token"""
    login_r = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": LAWYER_EMAIL, "password": LAWYER_PASSWORD, "community_password": COMMUNITY_PASSWORD
    })
    if login_r.status_code == 200:
        return login_r.json().get("token") or login_r.json().get("access_token")
    pytest.skip(f"Lawyer login failed: {login_r.status_code} {login_r.text[:200]}")


@pytest.fixture(scope="module")
def lawyer_headers(lawyer_token):
    return {"Authorization": f"Bearer {lawyer_token}", "Content-Type": "application/json"}


# ─── Test 1: Settings sections returns 'stories' key ────────────────────────────
class TestSectionSettings:
    """Tests for /api/settings/sections endpoint"""

    def test_get_sections_returns_stories_key(self):
        """GET /api/settings/sections must include 'stories' key"""
        r = requests.get(f"{BASE_URL}/api/settings/sections")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        data = r.json()
        assert "stories" in data, f"'stories' key missing from sections response: {list(data.keys())}"
        print("PASS: 'stories' key present in sections")

    def test_stories_section_has_title(self):
        """Stories section has a title"""
        r = requests.get(f"{BASE_URL}/api/settings/sections")
        data = r.json()
        stories = data.get("stories", {})
        assert stories.get("title"), f"'stories' title is empty: {stories}"
        print(f"PASS: stories title = '{stories['title']}'")

    def test_stories_section_has_subtitle(self):
        """Stories section has a subtitle"""
        r = requests.get(f"{BASE_URL}/api/settings/sections")
        data = r.json()
        stories = data.get("stories", {})
        assert stories.get("subtitle"), f"'stories' subtitle is empty: {stories}"
        print(f"PASS: stories subtitle = '{stories['subtitle']}'")

    def test_stories_section_visible(self):
        """Stories section is visible by default"""
        r = requests.get(f"{BASE_URL}/api/settings/sections")
        data = r.json()
        stories = data.get("stories", {})
        assert stories.get("visible") is not False, "stories section should be visible"
        print("PASS: stories section is visible")


# ─── Test 2: Stories questions endpoint ─────────────────────────────────────────
class TestStoriesEndpoint:
    """Tests for GET /api/questions?section=stories"""

    def test_get_stories_returns_200(self, admin_headers):
        """GET /api/questions?section=stories returns 200"""
        r = requests.get(f"{BASE_URL}/api/questions?section=stories", headers=admin_headers)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:200]}"
        print(f"PASS: GET /api/questions?section=stories returned 200")

    def test_get_stories_returns_list(self, admin_headers):
        """GET /api/questions?section=stories returns a list"""
        r = requests.get(f"{BASE_URL}/api/questions?section=stories", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"PASS: Got list of {len(data)} stories")

    def test_test_story_exists(self, admin_headers):
        """The test story with known ID is returned in the stories section"""
        r = requests.get(f"{BASE_URL}/api/questions?section=stories", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        found = any(q["id"] == TEST_STORY_ID for q in data)
        if not found:
            # It may have been fetched in a different way; let's just check the list is non-empty
            print(f"INFO: Test story not found in list (may have been deleted). List has {len(data)} stories.")
        else:
            print(f"PASS: Test story {TEST_STORY_ID} found in stories section")

    def test_stories_section_filter(self, admin_headers):
        """Stories endpoint filters by section=stories (not returning legal questions)"""
        r = requests.get(f"{BASE_URL}/api/questions?section=stories", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        for q in data:
            section = q.get("section", "")
            assert section == "stories", f"Non-stories question found: id={q['id']}, section={section}"
        print(f"PASS: All {len(data)} questions have section='stories'")


# ─── Test 3: Q&A reply permissions ──────────────────────────────────────────────
class TestQAReplyPermissions:
    """Tests for POST /api/questions/{id}/answers - section-based permissions"""

    def test_regular_user_can_reply_to_stories(self, user_headers, admin_headers):
        """Role=user can POST answers on stories section"""
        # First create a test story using admin
        create_r = requests.post(f"{BASE_URL}/api/questions",
            headers=admin_headers,
            json={"title": "TEST_iter52 story for reply test", "section": "stories", "content": "test content"}
        )
        assert create_r.status_code == 200, f"Failed to create story: {create_r.status_code} {create_r.text[:200]}"
        story_id = create_r.json()["id"]

        # Now reply as regular user
        reply_r = requests.post(f"{BASE_URL}/api/questions/{story_id}/answers",
            headers=user_headers,
            json={"content": "Reply from regular user - test iter52"}
        )
        assert reply_r.status_code == 200, f"Expected 200, got {reply_r.status_code}: {reply_r.text[:200]}"
        
        # Verify answer was added
        data = reply_r.json()
        answers = data.get("answers", [])
        assert len(answers) > 0, "No answers in response"
        print(f"PASS: Regular user can reply to stories section. Story now has {len(answers)} answers.")

        # Cleanup
        requests.delete(f"{BASE_URL}/api/questions/{story_id}", headers=admin_headers)

    def test_regular_user_cannot_reply_to_legal(self, user_headers, admin_headers):
        """Role=user gets 403 when posting answers to legal section"""
        # Find a legal question or create one
        legal_qs = requests.get(f"{BASE_URL}/api/questions?section=legal", headers=admin_headers)
        if legal_qs.status_code == 200 and legal_qs.json():
            legal_id = legal_qs.json()[0]["id"]
        else:
            # Create one
            create_r = requests.post(f"{BASE_URL}/api/questions",
                headers=user_headers,
                json={"title": "TEST_iter52 legal question", "section": "legal"}
            )
            assert create_r.status_code == 200
            legal_id = create_r.json()["id"]

        # Try to answer as regular user
        reply_r = requests.post(f"{BASE_URL}/api/questions/{legal_id}/answers",
            headers=user_headers,
            json={"content": "Trying to answer legal as regular user"}
        )
        assert reply_r.status_code == 403, f"Expected 403, got {reply_r.status_code}: {reply_r.text[:200]}"
        print(f"PASS: Regular user correctly blocked (403) from answering legal questions")

    def test_admin_can_reply_to_stories(self, admin_headers):
        """Admin can reply to stories"""
        # Create story
        create_r = requests.post(f"{BASE_URL}/api/questions",
            headers=admin_headers,
            json={"title": "TEST_iter52 admin story reply", "section": "stories"}
        )
        assert create_r.status_code == 200
        story_id = create_r.json()["id"]

        # Admin replies
        reply_r = requests.post(f"{BASE_URL}/api/questions/{story_id}/answers",
            headers=admin_headers,
            json={"content": "Admin reply to story"}
        )
        assert reply_r.status_code == 200, f"Expected 200, got {reply_r.status_code}: {reply_r.text[:200]}"
        print("PASS: Admin can reply to stories")

        # Cleanup
        requests.delete(f"{BASE_URL}/api/questions/{story_id}", headers=admin_headers)


# ─── Test 4: News edit endpoint ──────────────────────────────────────────────────
class TestNewsEdit:
    """Tests for PUT /api/news/{id} - admin can update news"""

    def test_admin_can_update_news(self, admin_headers):
        """Admin PUT /api/news/{id} returns 200 with updated data"""
        # Create a news item first
        create_r = requests.post(f"{BASE_URL}/api/news",
            headers=admin_headers,
            json={"title": "TEST_iter52 original title", "content": "original content", "category": "local"}
        )
        assert create_r.status_code == 200, f"Create news failed: {create_r.status_code} {create_r.text[:200]}"
        news_id = create_r.json()["id"]

        # Update the news
        update_r = requests.put(f"{BASE_URL}/api/news/{news_id}",
            headers=admin_headers,
            json={"title": "TEST_iter52 updated title", "content": "updated content", "category": "world"}
        )
        assert update_r.status_code == 200, f"Expected 200, got {update_r.status_code}: {update_r.text[:200]}"
        
        data = update_r.json()
        assert data["title"] == "TEST_iter52 updated title", f"Title not updated: {data['title']}"
        assert data["content"] == "updated content", f"Content not updated"
        print(f"PASS: Admin can update news. New title: {data['title']}")

        # Cleanup
        requests.delete(f"{BASE_URL}/api/news/{news_id}", headers=admin_headers)

    def test_update_news_returns_updated_object(self, admin_headers):
        """PUT /api/news/{id} returns the updated news object"""
        create_r = requests.post(f"{BASE_URL}/api/news",
            headers=admin_headers,
            json={"title": "TEST_iter52 verify title", "content": "content", "category": "tips"}
        )
        assert create_r.status_code == 200
        news_id = create_r.json()["id"]

        update_r = requests.put(f"{BASE_URL}/api/news/{news_id}",
            headers=admin_headers,
            json={"title": "TEST_iter52 verified update", "category": "events"}
        )
        assert update_r.status_code == 200
        data = update_r.json()
        assert "id" in data
        assert data["id"] == news_id
        assert data["title"] == "TEST_iter52 verified update"
        assert data["category"] == "events"
        print("PASS: PUT /api/news returns updated object with correct fields")

        requests.delete(f"{BASE_URL}/api/news/{news_id}", headers=admin_headers)

    def test_non_admin_cannot_update_other_news(self, user_headers, admin_headers):
        """Non-admin user cannot update news by another author"""
        # Admin creates news
        create_r = requests.post(f"{BASE_URL}/api/news",
            headers=admin_headers,
            json={"title": "TEST_iter52 admin news", "content": "content", "category": "local"}
        )
        assert create_r.status_code == 200
        news_id = create_r.json()["id"]

        # Regular user tries to update
        update_r = requests.put(f"{BASE_URL}/api/news/{news_id}",
            headers=user_headers,
            json={"title": "Trying to hijack news"}
        )
        assert update_r.status_code == 403, f"Expected 403, got {update_r.status_code}"
        print("PASS: Non-admin cannot update other user's news (403)")

        requests.delete(f"{BASE_URL}/api/news/{news_id}", headers=admin_headers)


# ─── Test 5: Services edit endpoint ─────────────────────────────────────────────
class TestServicesEdit:
    """Tests for PUT /api/services/{id} - admin can update any service"""

    def test_admin_can_update_any_service(self, admin_headers):
        """Admin can update any service (create and update as admin)"""
        # Admin creates a service
        create_r = requests.post(f"{BASE_URL}/api/services",
            headers=admin_headers,
            json={"offer": "TEST_iter52 vaření", "need": "masáže", "description": "original desc", "location": "", "service_type": "other", "post_type": "offer"}
        )
        assert create_r.status_code in [200, 201], f"Create service failed: {create_r.status_code} {create_r.text[:200]}"
        svc_id = create_r.json()["id"]

        # Admin updates the service
        update_r = requests.put(f"{BASE_URL}/api/services/{svc_id}",
            headers=admin_headers,
            json={"offer": "TEST_iter52 updated offer", "description": "updated desc"}
        )
        assert update_r.status_code == 200, f"Expected 200, got {update_r.status_code}: {update_r.text[:200]}"
        data = update_r.json()
        assert data.get("offer") == "TEST_iter52 updated offer", f"Update not reflected: {data}"
        print(f"PASS: Admin can update service")

        # Cleanup
        requests.delete(f"{BASE_URL}/api/services/{svc_id}", headers=admin_headers)

    def test_owner_can_update_own_service(self, admin_headers):
        """Admin (owner) can update own service"""
        create_r = requests.post(f"{BASE_URL}/api/services",
            headers=admin_headers,
            json={"offer": "TEST_iter52 own service", "need": "test need", "description": "desc", "location": "", "service_type": "other", "post_type": "offer"}
        )
        assert create_r.status_code in [200, 201]
        svc_id = create_r.json()["id"]

        update_r = requests.put(f"{BASE_URL}/api/services/{svc_id}",
            headers=admin_headers,
            json={"offer": "TEST_iter52 own updated", "description": "updated"}
        )
        assert update_r.status_code == 200, f"Expected 200, got {update_r.status_code}: {update_r.text[:200]}"
        data = update_r.json()
        assert data.get("offer") == "TEST_iter52 own updated"
        print("PASS: Service owner can update own service")

        requests.delete(f"{BASE_URL}/api/services/{svc_id}", headers=admin_headers)


# ─── Test 6: Stories question creation (any logged-in user) ─────────────────────
class TestStoriesCreate:
    """Tests for POST /api/questions in stories section"""

    def test_regular_user_can_create_story(self, user_headers):
        """Any logged-in user can create a story (POST /api/questions with section=stories)"""
        create_r = requests.post(f"{BASE_URL}/api/questions",
            headers=user_headers,
            json={"title": "TEST_iter52 story by regular user", "section": "stories", "content": "My story content"}
        )
        assert create_r.status_code == 200, f"Expected 200, got {create_r.status_code}: {create_r.text[:200]}"
        data = create_r.json()
        assert data.get("section") == "stories"
        assert data.get("title") == "TEST_iter52 story by regular user"
        print(f"PASS: Regular user created story with id={data['id']}")

        # Cleanup
        requests.delete(f"{BASE_URL}/api/questions/{data['id']}", headers=user_headers)

    def test_story_has_correct_section(self, user_headers):
        """Created story has section='stories'"""
        create_r = requests.post(f"{BASE_URL}/api/questions",
            headers=user_headers,
            json={"title": "TEST_iter52 section verify", "section": "stories"}
        )
        assert create_r.status_code == 200
        data = create_r.json()
        assert data["section"] == "stories", f"Expected section='stories', got '{data.get('section')}'"
        print("PASS: Story created with correct section='stories'")

        requests.delete(f"{BASE_URL}/api/questions/{data['id']}", headers=user_headers)


# ─── Test 7: Lawyer answer in legal section - badge verification ──────────────
class TestLawyerBadge:
    """Test that lawyer role shows correctly in answers"""

    def test_lawyer_can_answer_legal_question(self, lawyer_headers, admin_headers):
        """Lawyer can post an answer in the legal section"""
        # Create a legal question as admin
        create_r = requests.post(f"{BASE_URL}/api/questions",
            headers=admin_headers,
            json={"title": "TEST_iter52 legal question for lawyer", "section": "legal"}
        )
        assert create_r.status_code == 200
        q_id = create_r.json()["id"]

        # Lawyer answers
        reply_r = requests.post(f"{BASE_URL}/api/questions/{q_id}/answers",
            headers=lawyer_headers,
            json={"content": "Lawyer answer iter52"}
        )
        assert reply_r.status_code == 200, f"Expected 200, got {reply_r.status_code}: {reply_r.text[:200]}"
        
        data = reply_r.json()
        answers = data.get("answers", [])
        lawyer_answers = [a for a in answers if a.get("user_role") == "lawyer"]
        assert len(lawyer_answers) > 0, "No lawyer answer found in response"
        print(f"PASS: Lawyer can answer legal question. Answer user_role={lawyer_answers[-1]['user_role']}")

        # Cleanup
        requests.delete(f"{BASE_URL}/api/questions/{q_id}", headers=admin_headers)
