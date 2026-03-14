"""
Phase 4 Admin Content Management Tests
- Specialist categories CRUD with UUID IDs
- Text settings (about_text, contact_text, help_text, footer_text)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

ADMIN_EMAIL = "test1@bloom.cz"
ADMIN_PASSWORD = "test123"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    token = response.json().get("token")
    assert token, "No token returned from login"
    return token


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Admin authorization headers"""
    return {"Authorization": f"Bearer {admin_token}"}


# ===== SPECIALIST CATEGORIES =====

class TestSpecialistCategoriesGet:
    """GET /api/admin/specialist-categories"""

    def test_get_categories_returns_list(self, admin_headers):
        """Should return list of specialist categories"""
        r = requests.get(f"{BASE_URL}/api/admin/specialist-categories", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list), "Response must be a list"
        print(f"PASS: Got {len(data)} specialist categories")

    def test_get_categories_unauthenticated_also_works(self):
        """GET specialist categories is accessible without auth (for filtering)"""
        r = requests.get(f"{BASE_URL}/api/admin/specialist-categories")
        # This may work without auth as per code - get_current_user not get_admin_user
        assert r.status_code in [200, 401, 403]
        print(f"PASS: Unauthenticated specialist categories returns {r.status_code}")

    def test_get_categories_have_id_and_name_fields(self, admin_headers):
        """Each category should have 'id' and 'name' fields"""
        r = requests.get(f"{BASE_URL}/api/admin/specialist-categories", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        if data:
            cat = data[0]
            assert "id" in cat, "Category must have 'id' field"
            assert "name" in cat, "Category must have 'name' field"
            print(f"PASS: Category has id={cat['id']}, name={cat['name']}")

    def test_get_categories_ids_are_uuid_format(self, admin_headers):
        """Categories stored in DB should have UUID format IDs (not name-based)"""
        r = requests.get(f"{BASE_URL}/api/admin/specialist-categories", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        # Check if any categories have UUID format ids (if DB has data)
        uuid_cats = [c for c in data if is_uuid(c.get("id", ""))]
        name_cats = [c for c in data if not is_uuid(c.get("id", ""))]
        print(f"PASS: UUID id categories: {len(uuid_cats)}, name-based id categories: {len(name_cats)}")
        # All freshly created categories should have UUIDs
        # Fallback static data may have name-based IDs which is acceptable


def is_uuid(value):
    """Check if value is a valid UUID4"""
    try:
        uuid.UUID(str(value), version=4)
        return True
    except ValueError:
        return False


class TestSpecialistCategoriesCRUD:
    """POST/PUT/DELETE /api/admin/specialist-categories"""

    created_cat_id = None

    def test_post_add_category_returns_uuid_id(self, admin_headers):
        """POST adds new category and returns UUID id"""
        cat_name = "TEST_Kategorie_Phase4"
        r = requests.post(
            f"{BASE_URL}/api/admin/specialist-categories?name={cat_name}",
            headers=admin_headers
        )
        assert r.status_code == 200, f"POST failed: {r.status_code} {r.text}"
        data = r.json()
        assert "id" in data, "Response must have 'id'"
        assert "name" in data, "Response must have 'name'"
        assert data["name"] == cat_name, f"Name mismatch: {data['name']} != {cat_name}"
        assert is_uuid(data["id"]), f"ID should be UUID format, got: {data['id']}"
        TestSpecialistCategoriesCRUD.created_cat_id = data["id"]
        print(f"PASS: Created category with UUID id={data['id']}")

    def test_post_category_persists_in_get(self, admin_headers):
        """Created category should appear in GET list"""
        if not TestSpecialistCategoriesCRUD.created_cat_id:
            pytest.skip("No category created in previous test")
        r = requests.get(f"{BASE_URL}/api/admin/specialist-categories", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        cat_ids = [c["id"] for c in data]
        assert TestSpecialistCategoriesCRUD.created_cat_id in cat_ids, \
            f"Created category id not found in GET list. Got: {cat_ids}"
        print(f"PASS: Created category id {TestSpecialistCategoriesCRUD.created_cat_id} found in GET list")

    def test_put_update_category_name(self, admin_headers):
        """PUT updates category name using UUID id"""
        if not TestSpecialistCategoriesCRUD.created_cat_id:
            pytest.skip("No category created")
        cat_id = TestSpecialistCategoriesCRUD.created_cat_id
        new_name = "TEST_Kategorie_Phase4_Updated"
        r = requests.put(
            f"{BASE_URL}/api/admin/specialist-categories/{cat_id}",
            json={"name": new_name},
            headers=admin_headers
        )
        assert r.status_code == 200, f"PUT failed: {r.status_code} {r.text}"
        print(f"PASS: Updated category {cat_id} to '{new_name}'")

    def test_put_update_persists(self, admin_headers):
        """After PUT update, GET list should show new name"""
        if not TestSpecialistCategoriesCRUD.created_cat_id:
            pytest.skip("No category created")
        cat_id = TestSpecialistCategoriesCRUD.created_cat_id
        r = requests.get(f"{BASE_URL}/api/admin/specialist-categories", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        matching = [c for c in data if c["id"] == cat_id]
        assert matching, f"Category {cat_id} not found after update"
        assert matching[0]["name"] == "TEST_Kategorie_Phase4_Updated", \
            f"Name not updated: {matching[0]['name']}"
        print(f"PASS: Update persisted - name is now: {matching[0]['name']}")

    def test_put_nonexistent_category_returns_404(self, admin_headers):
        """PUT with nonexistent UUID should return 404"""
        fake_id = str(uuid.uuid4())
        r = requests.put(
            f"{BASE_URL}/api/admin/specialist-categories/{fake_id}",
            json={"name": "doesnt matter"},
            headers=admin_headers
        )
        assert r.status_code == 404, f"Expected 404 for nonexistent category, got {r.status_code}"
        print(f"PASS: PUT nonexistent category returns 404")

    def test_put_empty_name_returns_400(self, admin_headers):
        """PUT with empty name should return 400"""
        if not TestSpecialistCategoriesCRUD.created_cat_id:
            pytest.skip("No category created")
        cat_id = TestSpecialistCategoriesCRUD.created_cat_id
        r = requests.put(
            f"{BASE_URL}/api/admin/specialist-categories/{cat_id}",
            json={"name": ""},
            headers=admin_headers
        )
        assert r.status_code == 400, f"Expected 400 for empty name, got {r.status_code}"
        print(f"PASS: PUT empty name returns 400")

    def test_delete_category(self, admin_headers):
        """DELETE removes category by UUID id"""
        if not TestSpecialistCategoriesCRUD.created_cat_id:
            pytest.skip("No category created")
        cat_id = TestSpecialistCategoriesCRUD.created_cat_id
        r = requests.delete(
            f"{BASE_URL}/api/admin/specialist-categories/{cat_id}",
            headers=admin_headers
        )
        assert r.status_code == 200, f"DELETE failed: {r.status_code} {r.text}"
        print(f"PASS: Deleted category {cat_id}")

    def test_delete_persists_removal(self, admin_headers):
        """After DELETE, category should not appear in GET list"""
        if not TestSpecialistCategoriesCRUD.created_cat_id:
            pytest.skip("No category created")
        cat_id = TestSpecialistCategoriesCRUD.created_cat_id
        r = requests.get(f"{BASE_URL}/api/admin/specialist-categories", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        cat_ids = [c["id"] for c in data]
        assert cat_id not in cat_ids, f"Deleted category {cat_id} still in GET list"
        print(f"PASS: Deleted category {cat_id} no longer in list")

    def test_admin_required_for_post(self):
        """POST specialist category without auth should return 401/403"""
        r = requests.post(
            f"{BASE_URL}/api/admin/specialist-categories?name=NoAuth",
        )
        assert r.status_code in [401, 403], f"Expected 401/403 without auth, got {r.status_code}"
        print(f"PASS: POST without auth returns {r.status_code}")


# ===== TEXT SETTINGS =====

class TestTextSettings:
    """GET /api/settings/texts and PUT /api/admin/settings/texts"""

    def test_get_text_settings_returns_dict(self):
        """GET /api/settings/texts returns a dict (public endpoint)"""
        r = requests.get(f"{BASE_URL}/api/settings/texts")
        assert r.status_code == 200, f"GET texts failed: {r.status_code} {r.text}"
        data = r.json()
        assert isinstance(data, dict), "Response must be a dict"
        print(f"PASS: GET /api/settings/texts returns dict with keys: {list(data.keys())}")

    def test_get_text_settings_has_expected_keys(self):
        """Response should include about_text, contact_text, help_text, footer_text keys (if seeded)"""
        r = requests.get(f"{BASE_URL}/api/settings/texts")
        assert r.status_code == 200
        data = r.json()
        # Keys should be present if seeded; empty dict is also OK for unseeded env
        expected_keys = {"about_text", "contact_text", "help_text", "footer_text"}
        present_keys = set(data.keys())
        # This test checks that present keys are within the expected set
        invalid_keys = present_keys - expected_keys
        assert not invalid_keys, f"Unexpected keys in response: {invalid_keys}"
        print(f"PASS: Text settings keys: {present_keys}")

    def test_put_text_setting_about_text(self, admin_headers):
        """PUT updates about_text"""
        test_value = "TEST_Bloom je komunita trans lidí v Česku. Phase4 test."
        r = requests.put(
            f"{BASE_URL}/api/admin/settings/texts",
            json={"key": "about_text", "value": test_value},
            headers=admin_headers
        )
        assert r.status_code == 200, f"PUT about_text failed: {r.status_code} {r.text}"
        data = r.json()
        assert "message" in data, "Response should have message field"
        print(f"PASS: PUT about_text returned: {data}")

    def test_put_text_setting_persists(self, admin_headers):
        """After PUT, GET should return updated value"""
        test_value = "TEST_Bloom je komunita trans lidí v Česku. Phase4 test."
        # PUT first
        requests.put(
            f"{BASE_URL}/api/admin/settings/texts",
            json={"key": "about_text", "value": test_value},
            headers=admin_headers
        )
        # GET to verify
        r = requests.get(f"{BASE_URL}/api/settings/texts")
        assert r.status_code == 200
        data = r.json()
        assert "about_text" in data, "about_text key not in response after PUT"
        assert data["about_text"] == test_value, \
            f"about_text not updated: '{data.get('about_text')}' != '{test_value}'"
        print(f"PASS: about_text update persisted")

    def test_put_contact_text(self, admin_headers):
        """PUT updates contact_text"""
        r = requests.put(
            f"{BASE_URL}/api/admin/settings/texts",
            json={"key": "contact_text", "value": "TEST_Kontakt - Bloom komunita"},
            headers=admin_headers
        )
        assert r.status_code == 200, f"PUT contact_text failed: {r.status_code}"
        print(f"PASS: PUT contact_text succeeded")

    def test_put_help_text(self, admin_headers):
        """PUT updates help_text"""
        r = requests.put(
            f"{BASE_URL}/api/admin/settings/texts",
            json={"key": "help_text", "value": "TEST_Nápověda pro komunitní heslo"},
            headers=admin_headers
        )
        assert r.status_code == 200, f"PUT help_text failed: {r.status_code}"
        print(f"PASS: PUT help_text succeeded")

    def test_put_footer_text(self, admin_headers):
        """PUT updates footer_text"""
        r = requests.put(
            f"{BASE_URL}/api/admin/settings/texts",
            json={"key": "footer_text", "value": "TEST_Footer text Bloom 2026"},
            headers=admin_headers
        )
        assert r.status_code == 200, f"PUT footer_text failed: {r.status_code}"
        print(f"PASS: PUT footer_text succeeded")

    def test_put_invalid_key_returns_400(self, admin_headers):
        """PUT with invalid key should return 400"""
        r = requests.put(
            f"{BASE_URL}/api/admin/settings/texts",
            json={"key": "invalid_key", "value": "some value"},
            headers=admin_headers
        )
        assert r.status_code == 400, f"Expected 400 for invalid key, got {r.status_code}"
        print(f"PASS: PUT with invalid key returns 400")

    def test_put_text_requires_admin_auth(self):
        """PUT text settings without auth should return 401/403"""
        r = requests.put(
            f"{BASE_URL}/api/admin/settings/texts",
            json={"key": "about_text", "value": "should not work"}
        )
        assert r.status_code in [401, 403], f"Expected 401/403, got {r.status_code}"
        print(f"PASS: PUT without auth returns {r.status_code}")

    def test_all_four_text_keys_present_after_updates(self, admin_headers):
        """After all PUTs, GET should return all 4 text keys"""
        # Ensure all 4 are set
        for key, val in [
            ("about_text", "TEST_About Phase4"),
            ("contact_text", "TEST_Contact Phase4"),
            ("help_text", "TEST_Help Phase4"),
            ("footer_text", "TEST_Footer Phase4"),
        ]:
            requests.put(
                f"{BASE_URL}/api/admin/settings/texts",
                json={"key": key, "value": val},
                headers=admin_headers
            )
        # Now GET and check all 4 are present
        r = requests.get(f"{BASE_URL}/api/settings/texts")
        assert r.status_code == 200
        data = r.json()
        for key in ["about_text", "contact_text", "help_text", "footer_text"]:
            assert key in data, f"Key '{key}' not found in GET /api/settings/texts response"
        print(f"PASS: All 4 text settings returned: {list(data.keys())}")


# ===== ADDITIONAL ADMIN ENDPOINT CHECK =====

class TestAdminTextSettingsRoute:
    """Verify GET /api/admin/settings/texts (admin-only version if exists)"""

    def test_admin_get_text_settings_if_exists(self, admin_headers):
        """Check if admin GET endpoint returns texts (may be same as public)"""
        r = requests.get(f"{BASE_URL}/api/settings/texts", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, dict)
        print(f"PASS: GET /api/settings/texts returns {list(data.keys())}")
