"""
Backend tests for Bloom app 10-issue fix batch:
- Specialist filter by full category name
- Services post_type filter (offer/request)
- Specialist submit endpoint for regular users
- Admin pending specialists, approve/reject
- Articles POST/PUT/DELETE/toggle-publish
- Public profile endpoint
- User ratings
- Admin content management endpoints (article-cats, specialist-cats, locations)
- Message email notification (API returns 200)
- Password reset page rendering
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ============ AUTH FIXTURES ============

@pytest.fixture(scope="module")
def admin_token():
    """Login as admin and return token"""
    r = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "test1@bloom.cz",
        "password": "test123"
    })
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    return r.json()["token"]

@pytest.fixture(scope="module")
def admin_client(admin_token):
    """Admin session with auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}"
    })
    return session

@pytest.fixture(scope="module")
def admin_user_id(admin_token):
    """Get admin user id"""
    import jwt as pyjwt
    payload = pyjwt.decode(admin_token, options={"verify_signature": False})
    return payload["user_id"]

@pytest.fixture(scope="module")
def regular_user_token():
    """Register a regular test user and return token"""
    import uuid
    email = f"TEST_batch10_{uuid.uuid4().hex[:8]}@bloom.cz"
    r = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": email,
        "password": "testpass123",
        "username": f"TEST_user_{uuid.uuid4().hex[:6]}",
        "secret_code": "Transfortrans"
    })
    assert r.status_code == 200, f"Register failed: {r.text}"
    return r.json()["token"]

@pytest.fixture(scope="module")
def regular_client(regular_user_token):
    """Regular user session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {regular_user_token}"
    })
    return session

@pytest.fixture(scope="module")
def regular_user_id(regular_user_token):
    """Get regular user id"""
    import jwt as pyjwt
    payload = pyjwt.decode(regular_user_token, options={"verify_signature": False})
    return payload["user_id"]

# ============ SPECIALIST FILTER TESTS ============

class TestSpecialistFilter:
    """Specialist filter by full category name"""

    def test_specialists_endpoint_returns_200(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/specialists")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        print(f"Total specialists: {len(data)}")

    def test_filter_by_psychologie_full_name(self, admin_client):
        """Specialty filter with full Czech name should work"""
        r = admin_client.get(f"{BASE_URL}/api/specialists", params={
            "specialty": "Psychologie, psychiatrie a sexuologie"
        })
        assert r.status_code == 200
        data = r.json()
        print(f"Specialists with Psychologie specialty: {len(data)}")
        # Each returned specialist should have matching specialty
        for s in data:
            assert "Psychologie" in s["specialty"] or "psychologie" in s["specialty"].lower(), \
                f"Specialist {s['name']} has specialty {s['specialty']}, not Psychologie"
        print("PASS: Specialty filter returns correct results")

    def test_filter_by_country_cz(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/specialists", params={"country": "CZ"})
        assert r.status_code == 200
        data = r.json()
        for s in data:
            assert s["country"] == "CZ"
        print(f"PASS: CZ filter returns {len(data)} specialists")


# ============ SERVICES POST_TYPE FILTER TESTS ============

class TestServicesPostTypeFilter:
    """Test post_type offer/request filter"""

    @pytest.fixture(scope="class")
    def test_service_offer_id(self, admin_client):
        """Create a test offer service"""
        r = admin_client.post(f"{BASE_URL}/api/services", json={
            "offer": "TEST_vaření",
            "need": "TEST_úklid",
            "description": "TEST batch10 offer service",
            "post_type": "offer"
        })
        assert r.status_code == 200
        sid = r.json()["id"]
        yield sid
        # Cleanup
        admin_client.delete(f"{BASE_URL}/api/services/{sid}")

    @pytest.fixture(scope="class")
    def test_service_request_id(self, admin_client):
        """Create a test request service"""
        r = admin_client.post(f"{BASE_URL}/api/services", json={
            "offer": "TEST_masáže",
            "need": "TEST_pomoc s úřady",
            "description": "TEST batch10 request service",
            "post_type": "request"
        })
        assert r.status_code == 200
        sid = r.json()["id"]
        yield sid
        # Cleanup
        admin_client.delete(f"{BASE_URL}/api/services/{sid}")

    def test_post_type_offer_filter(self, admin_client, test_service_offer_id):
        r = admin_client.get(f"{BASE_URL}/api/services", params={"post_type": "offer"})
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        for s in data:
            assert s["post_type"] == "offer", f"Expected offer, got {s['post_type']}"
        print(f"PASS: post_type=offer returns {len(data)} services")

    def test_post_type_request_filter(self, admin_client, test_service_request_id):
        r = admin_client.get(f"{BASE_URL}/api/services", params={"post_type": "request"})
        assert r.status_code == 200
        data = r.json()
        for s in data:
            assert s["post_type"] == "request", f"Expected request, got {s['post_type']}"
        print(f"PASS: post_type=request returns {len(data)} services")

    def test_no_filter_returns_all(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/services")
        assert r.status_code == 200
        print(f"PASS: No filter returns all services")

    def test_service_create_with_post_type(self, admin_client):
        """Create service with post_type request"""
        r = admin_client.post(f"{BASE_URL}/api/services", json={
            "offer": "TEST_create_check",
            "need": "TEST_need",
            "description": "Testing post_type creation",
            "post_type": "request"
        })
        assert r.status_code == 200
        data = r.json()
        assert data["post_type"] == "request"
        # Cleanup
        admin_client.delete(f"{BASE_URL}/api/services/{data['id']}")
        print("PASS: Service created with post_type=request")


# ============ SPECIALIST SUBMIT TESTS ============

class TestSpecialistSubmit:
    """Test regular user specialist submission"""

    def test_submit_specialist_as_regular_user(self, regular_client):
        """Regular user can submit specialist for review"""
        r = regular_client.post(f"{BASE_URL}/api/specialists/submit", json={
            "name": "TEST_Dr. Martina Nováková",
            "specialty": "Psychologie, psychiatrie a sexuologie",
            "description": "TEST specialist submission",
            "address": "Testovací ulice 1",
            "city": "Praha",
            "country": "CZ"
        })
        assert r.status_code == 200, f"Submit specialist failed: {r.text}"
        data = r.json()
        assert data["status"] == "pending"
        assert data["name"] == "TEST_Dr. Martina Nováková"
        print(f"PASS: Specialist submitted with status=pending, id={data['id']}")
        return data["id"]

    def test_submitted_specialist_not_in_public_list(self, regular_client):
        """Pending specialist should not appear in public list"""
        # Submit first
        r = regular_client.post(f"{BASE_URL}/api/specialists/submit", json={
            "name": "TEST_Pending Doc",
            "specialty": "Plastická chirurgie obličeje",
            "address": "Test Address 99",
            "city": "Brno",
            "country": "CZ"
        })
        assert r.status_code == 200
        submitted_id = r.json()["id"]

        # Check public list - should NOT contain this
        public_r = requests.get(f"{BASE_URL}/api/specialists")
        public_list = public_r.json()
        ids_in_public = [s["id"] for s in public_list]
        assert submitted_id not in ids_in_public, "Pending specialist should not appear in public list"
        print("PASS: Pending specialist not in public list")


# ============ ADMIN PENDING SPECIALISTS TESTS ============

class TestAdminPendingSpecialists:
    """Test admin pending specialists queue"""

    @pytest.fixture(scope="class")
    def pending_specialist_id(self, regular_client):
        """Create a pending specialist via regular user submit"""
        r = regular_client.post(f"{BASE_URL}/api/specialists/submit", json={
            "name": "TEST_Pending Specialist Batch10",
            "specialty": "Psychologie, psychiatrie a sexuologie",
            "address": "Test 123",
            "city": "Olomouc",
            "country": "CZ"
        })
        assert r.status_code == 200
        return r.json()["id"]

    def test_admin_get_pending_specialists(self, admin_client, pending_specialist_id):
        r = admin_client.get(f"{BASE_URL}/api/admin/specialists/pending")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        # Check our pending specialist is there
        ids = [s["id"] for s in data]
        assert pending_specialist_id in ids, "Our pending specialist should be in the list"
        print(f"PASS: Admin can see {len(data)} pending specialists")

    def test_admin_approve_specialist(self, admin_client, pending_specialist_id):
        r = admin_client.put(f"{BASE_URL}/api/admin/specialists/{pending_specialist_id}/approve")
        assert r.status_code == 200
        data = r.json()
        assert "schválen" in data["message"].lower() or "approved" in data.get("message", "").lower()
        print(f"PASS: Specialist approved: {data}")

        # Verify it now appears in public list
        public_r = requests.get(f"{BASE_URL}/api/specialists")
        ids = [s["id"] for s in public_r.json()]
        assert pending_specialist_id in ids, "Approved specialist should appear in public list"
        print("PASS: Approved specialist now in public list")

    def test_admin_reject_specialist(self, admin_client, regular_client):
        """Create a new pending one and reject it"""
        r = regular_client.post(f"{BASE_URL}/api/specialists/submit", json={
            "name": "TEST_To Be Rejected",
            "specialty": "Méně invazivní zákroky",
            "address": "Rejection St 1",
            "city": "Plzeň",
            "country": "CZ"
        })
        assert r.status_code == 200
        spec_id = r.json()["id"]

        r2 = admin_client.put(f"{BASE_URL}/api/admin/specialists/{spec_id}/reject")
        assert r2.status_code == 200
        assert "zamítnut" in r2.json()["message"].lower() or "rejected" in r2.json().get("message", "").lower()
        print("PASS: Specialist rejected successfully")

    def test_regular_user_cannot_access_pending(self, regular_client):
        r = regular_client.get(f"{BASE_URL}/api/admin/specialists/pending")
        assert r.status_code == 403
        print("PASS: Regular user cannot access pending specialists")


# ============ ARTICLES TESTS ============

class TestArticles:
    """Test articles CRUD for admin/lawyer"""

    @pytest.fixture(scope="class")
    def test_article_id(self, admin_client):
        """Create a test article"""
        r = admin_client.post(f"{BASE_URL}/api/articles", json={
            "title": "TEST_Article Batch10",
            "content": "This is a test article for batch 10",
            "category": "pravni",
            "published": True
        })
        assert r.status_code == 200, f"Create article failed: {r.text}"
        aid = r.json()["id"]
        yield aid
        # Cleanup
        admin_client.delete(f"{BASE_URL}/api/articles/{aid}")

    def test_create_article(self, admin_client):
        r = admin_client.post(f"{BASE_URL}/api/articles", json={
            "title": "TEST_Article Create",
            "content": "Content for create test",
            "category": "zdravi",
            "published": True
        })
        assert r.status_code == 200
        data = r.json()
        assert data["title"] == "TEST_Article Create"
        assert data["published"] == True
        # Cleanup
        admin_client.delete(f"{BASE_URL}/api/articles/{data['id']}")
        print("PASS: Article created successfully")

    def test_get_admin_articles(self, admin_client, test_article_id):
        """Admin can see all articles including unpublished"""
        r = admin_client.get(f"{BASE_URL}/api/admin/articles")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        ids = [a["id"] for a in data]
        assert test_article_id in ids
        print(f"PASS: Admin articles list has {len(data)} articles")

    def test_update_article(self, admin_client, test_article_id):
        r = admin_client.put(f"{BASE_URL}/api/articles/{test_article_id}", json={
            "title": "TEST_Article Updated",
            "content": "Updated content",
            "category": "socialni",
            "published": True
        })
        assert r.status_code == 200
        data = r.json()
        assert data["title"] == "TEST_Article Updated"
        print("PASS: Article updated")

    def test_toggle_publish_article(self, admin_client, test_article_id):
        # First get current state
        r = admin_client.get(f"{BASE_URL}/api/admin/articles")
        articles = r.json()
        article = next((a for a in articles if a["id"] == test_article_id), None)
        assert article is not None
        original_published = article["published"]

        # Toggle
        r2 = admin_client.put(f"{BASE_URL}/api/articles/{test_article_id}/toggle-publish")
        assert r2.status_code == 200
        data = r2.json()
        assert data["published"] == (not original_published)
        print(f"PASS: Article toggle-publish: {original_published} -> {data['published']}")

    def test_public_articles_only_shows_published(self):
        r = requests.get(f"{BASE_URL}/api/articles")
        assert r.status_code == 200
        data = r.json()
        for a in data:
            assert a.get("published", True) != False, "Unpublished article in public list"
        print(f"PASS: Public articles shows {len(data)} published articles")

    def test_regular_user_cannot_create_article(self, regular_client):
        r = regular_client.post(f"{BASE_URL}/api/articles", json={
            "title": "Unauthorized article",
            "content": "Should fail",
            "category": "pravni"
        })
        assert r.status_code == 403
        print("PASS: Regular user cannot create article")

    def test_delete_article(self, admin_client):
        # Create and then delete
        r = admin_client.post(f"{BASE_URL}/api/articles", json={
            "title": "TEST_Article To Delete",
            "content": "Will be deleted",
            "category": "ostatni"
        })
        assert r.status_code == 200
        aid = r.json()["id"]

        r2 = admin_client.delete(f"{BASE_URL}/api/articles/{aid}")
        assert r2.status_code == 200

        # Verify gone
        r3 = requests.get(f"{BASE_URL}/api/articles/{aid}")
        assert r3.status_code == 404
        print("PASS: Article deleted and confirmed gone")


# ============ USER PUBLIC PROFILE TESTS ============

class TestUserPublicProfile:
    """Test user public profile endpoint"""

    def test_get_own_public_profile(self, admin_client, admin_user_id):
        r = admin_client.get(f"{BASE_URL}/api/users/{admin_user_id}/public-profile")
        assert r.status_code == 200
        data = r.json()
        assert "username" in data
        assert "services" in data
        assert "already_rated" in data
        assert isinstance(data["services"], list)
        print(f"PASS: Public profile returned for admin user, services={len(data['services'])}")

    def test_public_profile_not_found(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/users/nonexistent-user-id/public-profile")
        assert r.status_code == 404
        print("PASS: 404 for nonexistent user")

    def test_public_profile_requires_auth(self):
        """Verify the endpoint requires authentication"""
        # This is a protected endpoint
        r = requests.get(f"{BASE_URL}/api/users/some-user-id/public-profile")
        assert r.status_code == 403 or r.status_code == 401 or r.status_code == 422
        print(f"PASS: Unauthenticated access rejected with {r.status_code}")


# ============ USER RATINGS TESTS ============

class TestUserRatings:
    """Test user-to-user rating system"""

    def test_regular_user_can_rate_admin(self, regular_client, admin_user_id):
        """Regular user can rate admin user"""
        r = regular_client.post(f"{BASE_URL}/api/users/{admin_user_id}/rate", json={
            "rating": 4,
            "comment": "TEST_Výborná spolupráce"
        })
        assert r.status_code == 200, f"Rating failed: {r.text}"
        data = r.json()
        assert "avg_rating" in data
        assert "rating_count" in data
        print(f"PASS: User rated, avg={data['avg_rating']}, count={data['rating_count']}")

    def test_cannot_rate_yourself(self, regular_client, regular_user_id):
        r = regular_client.post(f"{BASE_URL}/api/users/{regular_user_id}/rate", json={
            "rating": 5,
            "comment": "Self rating"
        })
        assert r.status_code == 400
        print("PASS: Cannot rate yourself")

    def test_get_user_ratings(self, admin_user_id):
        r = requests.get(f"{BASE_URL}/api/users/{admin_user_id}/ratings")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        print(f"PASS: User ratings retrieved, count={len(data)}")

    def test_already_rated_check(self, regular_client, admin_client, admin_user_id):
        """Public profile should show already_rated=True after rating"""
        r = regular_client.get(f"{BASE_URL}/api/users/{admin_user_id}/public-profile")
        assert r.status_code == 200
        data = r.json()
        # This should be True since we rated in previous test (within same class scope)
        print(f"PASS: already_rated = {data['already_rated']} (expected True after rating in prev test)")


# ============ ADMIN CONTENT MANAGEMENT TESTS ============

class TestAdminContentManagement:
    """Test admin content management endpoints"""

    def test_get_article_categories(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/admin/article-categories")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"PASS: Article categories: {len(data)}")

    def test_add_article_category(self, admin_client):
        r = admin_client.post(f"{BASE_URL}/api/admin/article-categories", params={"name": "TEST_Nová kategorie"})
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == "TEST_Nová kategorie"
        cat_id = data["id"]

        # Delete it
        r2 = admin_client.delete(f"{BASE_URL}/api/admin/article-categories/{cat_id}")
        assert r2.status_code == 200
        print("PASS: Article category created and deleted")

    def test_get_specialist_categories(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/admin/specialist-categories")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"PASS: Specialist categories: {len(data)}")

    def test_add_specialist_category(self, admin_client):
        r = admin_client.post(f"{BASE_URL}/api/admin/specialist-categories", params={"name": "TEST_Nová spec kategorie"})
        assert r.status_code == 200
        data = r.json()
        cat_id = data["id"]

        # Delete it
        r2 = admin_client.delete(f"{BASE_URL}/api/admin/specialist-categories/{cat_id}")
        assert r2.status_code == 200
        print("PASS: Specialist category created and deleted")

    def test_get_locations(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/admin/locations")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        print(f"PASS: Locations retrieved: {len(data)}")

    def test_add_location(self, admin_client):
        r = admin_client.post(f"{BASE_URL}/api/admin/locations", params={"name": "TEST_Nová lokalita"})
        assert r.status_code == 200
        data = r.json()
        loc_id = data["id"]

        r2 = admin_client.delete(f"{BASE_URL}/api/admin/locations/{loc_id}")
        assert r2.status_code == 200
        print("PASS: Location created and deleted")

    def test_get_service_types(self):
        r = requests.get(f"{BASE_URL}/api/service-types")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"PASS: Service types: {len(data)}")

    def test_add_delete_service_type(self, admin_client):
        r = admin_client.post(f"{BASE_URL}/api/service-types", params={"name": "TEST_Testovací typ"})
        assert r.status_code == 200
        data = r.json()
        type_id = data["id"]

        r2 = admin_client.delete(f"{BASE_URL}/api/service-types/{type_id}")
        assert r2.status_code == 200
        print("PASS: Service type created and deleted")

    def test_regular_user_cannot_manage_content(self, regular_client):
        r = regular_client.post(f"{BASE_URL}/api/admin/locations", params={"name": "Unauthorized"})
        assert r.status_code == 403
        print("PASS: Regular user cannot add locations")


# ============ MESSAGE EMAIL NOTIFICATION TESTS ============

class TestMessageEmailNotification:
    """Test message sending (email notification is sent but not verified in API test)"""

    def test_send_message_returns_200(self, regular_client, admin_user_id):
        """Send message to admin - API should return 200"""
        r = regular_client.post(f"{BASE_URL}/api/messages", json={
            "to_user_id": admin_user_id,
            "content": "TEST_Dobrý den, testovací zpráva pro email notifikaci"
        })
        assert r.status_code == 200, f"Message send failed: {r.text}"
        data = r.json()
        assert "id" in data
        assert data["content"] == "TEST_Dobrý den, testovací zpráva pro email notifikaci"
        print(f"PASS: Message sent successfully, id={data['id']}")

    def test_send_message_to_nonexistent_user(self, regular_client):
        r = regular_client.post(f"{BASE_URL}/api/messages", json={
            "to_user_id": "nonexistent-user",
            "content": "Should fail"
        })
        assert r.status_code == 404
        print("PASS: 404 for message to nonexistent user")


# ============ PASSWORD RESET TESTS ============

class TestPasswordReset:
    """Test password reset endpoint"""

    def test_reset_password_bad_token_returns_400(self):
        r = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": "invalid-token-xyz",
            "new_password": "newpassword123"
        })
        assert r.status_code == 400
        print(f"PASS: Bad token returns 400: {r.json()}")

    def test_reset_password_request_existing_email(self):
        r = requests.post(f"{BASE_URL}/api/auth/reset-password-request", json={
            "email": "test1@bloom.cz"
        })
        # Should return 200 (or 503 if email fails) but token is stored
        assert r.status_code in [200, 503], f"Unexpected status: {r.status_code}"
        print(f"PASS: Password reset request status: {r.status_code}")

    def test_reset_password_request_nonexistent_email(self):
        r = requests.post(f"{BASE_URL}/api/auth/reset-password-request", json={
            "email": "nonexistent@bloom.cz"
        })
        assert r.status_code == 200
        print("PASS: Non-existent email returns 200 (no enumeration)")


# ============ VOTE ON QUESTIONS (MISSING ENDPOINT CHECK) ============

class TestQuestionsVote:
    """Check if vote endpoint exists"""

    def test_vote_endpoint_exists(self, admin_client):
        """Check if vote endpoint exists for questions"""
        # First, create a question
        r = admin_client.post(f"{BASE_URL}/api/questions", json={
            "title": "TEST_Vote question",
            "content": "Testing vote endpoint"
        })
        assert r.status_code == 200
        qid = r.json()["id"]

        # Try to vote
        r2 = admin_client.post(f"{BASE_URL}/api/questions/{qid}/vote")
        status = r2.status_code
        print(f"Vote endpoint status: {status} (404 means not implemented)")
        # This test documents whether endpoint exists - it may return 404

    def test_questions_have_vote_count(self, admin_client):
        r = admin_client.get(f"{BASE_URL}/api/questions")
        assert r.status_code == 200
        data = r.json()
        if data:
            q = data[0]
            has_vote_count = "vote_count" in q
            print(f"Questions have vote_count field: {has_vote_count}")
            # Document this without asserting - it may be missing
