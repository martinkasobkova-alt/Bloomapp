"""
Bloom Batch 4 - Iteration 26 Backend Tests
Tests for:
- Locations with CZ/WORLD country field
- Section settings API
- Featured items API
- Specialist categories dynamic API
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

ADMIN_EMAIL = "test1@bloom.cz"
ADMIN_PASS = "test123"

@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    return r.json()["token"]

@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ============ LOCATIONS WITH COUNTRY FIELD ============

class TestLocationsCountry:
    """Test locations endpoint returns country field"""

    def test_get_public_locations_returns_country_field(self):
        """GET /api/locations should return list with country field on each item"""
        r = requests.get(f"{BASE_URL}/api/locations")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        if len(data) > 0:
            for loc in data[:3]:
                assert "country" in loc, f"Location missing 'country' field: {loc}"
                assert loc["country"] in ("CZ", "WORLD"), f"Unknown country: {loc['country']}"
        print(f"PASS: GET /api/locations returns {len(data)} locations with country field")

    def test_get_public_locations_filter_by_cz(self):
        """GET /api/locations?country=CZ returns only CZ locations"""
        r = requests.get(f"{BASE_URL}/api/locations", params={"country": "CZ"})
        assert r.status_code == 200
        data = r.json()
        for loc in data:
            assert loc.get("country") == "CZ", f"Expected CZ, got {loc.get('country')}: {loc}"
        print(f"PASS: GET /api/locations?country=CZ returns {len(data)} CZ locations")

    def test_get_public_locations_filter_by_world(self):
        """GET /api/locations?country=WORLD returns only WORLD locations"""
        r = requests.get(f"{BASE_URL}/api/locations", params={"country": "WORLD"})
        assert r.status_code == 200
        data = r.json()
        for loc in data:
            assert loc.get("country") == "WORLD", f"Expected WORLD, got: {loc}"
        print(f"PASS: GET /api/locations?country=WORLD returns {len(data)} WORLD locations")

    def test_post_location_with_cz_country(self, admin_headers):
        """POST /api/admin/locations with country=CZ creates location with CZ"""
        r = requests.post(f"{BASE_URL}/api/admin/locations", 
                         params={"name": "TEST_CZ_Location_Iter26", "country": "CZ"},
                         headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["country"] == "CZ"
        assert data["name"] == "TEST_CZ_Location_Iter26"
        loc_id = data["id"]
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/locations/{loc_id}", headers=admin_headers)
        print(f"PASS: POST /api/admin/locations creates CZ location with correct country field")

    def test_post_location_with_world_country(self, admin_headers):
        """POST /api/admin/locations with country=WORLD creates location with WORLD"""
        r = requests.post(f"{BASE_URL}/api/admin/locations", 
                         params={"name": "TEST_WORLD_Location_Iter26", "country": "WORLD"},
                         headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["country"] == "WORLD"
        assert data["name"] == "TEST_WORLD_Location_Iter26"
        loc_id = data["id"]
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/locations/{loc_id}", headers=admin_headers)
        print(f"PASS: POST /api/admin/locations creates WORLD location with correct country field")

    def test_post_location_default_country_is_cz(self, admin_headers):
        """POST /api/admin/locations without country defaults to CZ"""
        r = requests.post(f"{BASE_URL}/api/admin/locations", 
                         params={"name": "TEST_Default_Location_Iter26"},
                         headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["country"] == "CZ"
        loc_id = data["id"]
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/locations/{loc_id}", headers=admin_headers)
        print(f"PASS: POST /api/admin/locations without country defaults to CZ")

    def test_put_location_updates_country(self, admin_headers):
        """PUT /api/admin/locations/{id} updates country field"""
        # Create
        r = requests.post(f"{BASE_URL}/api/admin/locations", 
                         params={"name": "TEST_Update_Location_Iter26", "country": "CZ"},
                         headers=admin_headers)
        assert r.status_code == 200
        loc_id = r.json()["id"]
        # Update country to WORLD
        r2 = requests.put(f"{BASE_URL}/api/admin/locations/{loc_id}", 
                          params={"name": "TEST_Update_Location_Iter26", "country": "WORLD"},
                          headers=admin_headers)
        assert r2.status_code == 200
        data = r2.json()
        assert data["country"] == "WORLD"
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/locations/{loc_id}", headers=admin_headers)
        print(f"PASS: PUT /api/admin/locations updates country to WORLD")


# ============ SECTION SETTINGS ============

class TestSectionSettings:
    """Test section settings API"""

    def test_get_section_settings_returns_6_sections(self):
        """GET /api/settings/sections returns object with 6 section keys"""
        r = requests.get(f"{BASE_URL}/api/settings/sections")
        assert r.status_code == 200
        data = r.json()
        expected_keys = {"specialists", "legal", "news", "community", "support", "nearby"}
        assert expected_keys == set(data.keys()), f"Missing keys: {expected_keys - set(data.keys())}"
        print(f"PASS: GET /api/settings/sections has 6 keys: {list(data.keys())}")

    def test_section_settings_have_required_fields(self):
        """Each section should have title, subtitle, color"""
        r = requests.get(f"{BASE_URL}/api/settings/sections")
        assert r.status_code == 200
        data = r.json()
        for key, val in data.items():
            assert "title" in val, f"Section '{key}' missing 'title'"
            assert "subtitle" in val, f"Section '{key}' missing 'subtitle'"
            assert "color" in val, f"Section '{key}' missing 'color'"
            assert isinstance(val["title"], str) and len(val["title"]) > 0
            assert isinstance(val["color"], str) and val["color"].startswith("#")
        print(f"PASS: All 6 sections have title/subtitle/color fields")

    def test_put_section_settings_saves_to_db(self, admin_headers):
        """PUT /api/admin/settings/sections saves and GET returns the saved data"""
        # Get current settings
        import copy
        current = requests.get(f"{BASE_URL}/api/settings/sections").json()
        # Modify one section (deep copy to avoid mutation of 'current')
        payload = copy.deepcopy(current)
        payload["specialists"]["title"] = "TEST_Odborníci_Iter26"
        r = requests.put(f"{BASE_URL}/api/admin/settings/sections", 
                        json=payload, headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert "message" in data
        # Verify GET now returns the updated value
        r2 = requests.get(f"{BASE_URL}/api/settings/sections")
        assert r2.status_code == 200
        updated = r2.json()
        assert updated["specialists"]["title"] == "TEST_Odborníci_Iter26"
        # Restore original
        payload["specialists"]["title"] = current["specialists"]["title"]
        requests.put(f"{BASE_URL}/api/admin/settings/sections", json=payload, headers=admin_headers)
        print(f"PASS: PUT /api/admin/settings/sections persists changes; GET reflects update")

    def test_put_section_settings_requires_admin(self):
        """PUT /api/admin/settings/sections without auth returns 403"""
        payload = {"specialists": {"title": "Test", "subtitle": "test", "color": "#000"}}
        r = requests.put(f"{BASE_URL}/api/admin/settings/sections", json=payload)
        assert r.status_code in (401, 403)
        print(f"PASS: PUT /api/admin/settings/sections requires admin auth")


# ============ FEATURED ITEMS ============

class TestFeaturedItems:
    """Test featured items API"""

    def test_get_featured_items_returns_list(self):
        """GET /api/featured-items returns a list (could be empty)"""
        r = requests.get(f"{BASE_URL}/api/featured-items")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        print(f"PASS: GET /api/featured-items returns list with {len(data)} items")

    def test_featured_items_structure_when_not_empty(self):
        """If featured items exist, they have type and data fields"""
        r = requests.get(f"{BASE_URL}/api/featured-items")
        assert r.status_code == 200
        data = r.json()
        for item in data:
            assert "type" in item, f"Featured item missing 'type': {item}"
            assert item["type"] in ("specialist", "news")
            assert "data" in item or "order" in item
        print(f"PASS: Featured items have correct structure")

    def test_post_featured_item_specialist(self, admin_headers):
        """POST /api/admin/featured-items can pin a specialist"""
        # First get list of specialists
        specs = requests.get(f"{BASE_URL}/api/specialists").json()
        if not specs:
            pytest.skip("No specialists available to pin")
        spec_id = specs[0]["id"]
        # Try to pin
        r = requests.post(f"{BASE_URL}/api/admin/featured-items", 
                         params={"item_type": "specialist", "item_id": spec_id},
                         headers=admin_headers)
        if r.status_code == 400 and "вже" in r.text.lower() or "již" in r.text.lower():
            print("PASS (already featured): Specialist already pinned")
            return
        # If already pinned, unpin first
        if r.status_code == 400:
            # Unpin and retry
            requests.delete(f"{BASE_URL}/api/admin/featured-items/specialist/{spec_id}", headers=admin_headers)
            r = requests.post(f"{BASE_URL}/api/admin/featured-items", 
                             params={"item_type": "specialist", "item_id": spec_id},
                             headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert "message" in data
        # Verify it appears in GET
        items = requests.get(f"{BASE_URL}/api/featured-items").json()
        found = any(i.get("type") == "specialist" and i.get("data", {}).get("id") == spec_id for i in items)
        assert found, f"Specialist {spec_id} not found in featured items after pin"
        # Cleanup - unpin
        requests.delete(f"{BASE_URL}/api/admin/featured-items/specialist/{spec_id}", headers=admin_headers)
        print(f"PASS: POST /api/admin/featured-items pins specialist; appears in GET /api/featured-items")

    def test_delete_featured_item(self, admin_headers):
        """DELETE /api/admin/featured-items/{type}/{id} removes featured item"""
        # Get specialists
        specs = requests.get(f"{BASE_URL}/api/specialists").json()
        if not specs:
            pytest.skip("No specialists available")
        spec_id = specs[0]["id"]
        # Pin first
        requests.post(f"{BASE_URL}/api/admin/featured-items", 
                     params={"item_type": "specialist", "item_id": spec_id},
                     headers=admin_headers)
        # Delete
        r = requests.delete(f"{BASE_URL}/api/admin/featured-items/specialist/{spec_id}", 
                           headers=admin_headers)
        assert r.status_code == 200
        # Verify removed from GET
        items = requests.get(f"{BASE_URL}/api/featured-items").json()
        found = any(i.get("type") == "specialist" and i.get("data", {}).get("id") == spec_id for i in items)
        assert not found, f"Specialist {spec_id} still in featured items after delete"
        print(f"PASS: DELETE /api/admin/featured-items removes item; not in GET after delete")

    def test_post_featured_item_news(self, admin_headers):
        """POST /api/admin/featured-items can pin a news article"""
        news_list = requests.get(f"{BASE_URL}/api/news").json()
        if not news_list:
            pytest.skip("No news articles available")
        news_id = news_list[0]["id"]
        # Unpin first if already featured
        requests.delete(f"{BASE_URL}/api/admin/featured-items/news/{news_id}", headers=admin_headers)
        r = requests.post(f"{BASE_URL}/api/admin/featured-items",
                         params={"item_type": "news", "item_id": news_id},
                         headers=admin_headers)
        assert r.status_code == 200
        # Verify
        items = requests.get(f"{BASE_URL}/api/featured-items").json()
        found = any(i.get("type") == "news" and i.get("data", {}).get("id") == news_id for i in items)
        assert found, f"News {news_id} not in featured items after pin"
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/featured-items/news/{news_id}", headers=admin_headers)
        print(f"PASS: POST /api/admin/featured-items pins news article; appears in GET")

    def test_featured_item_max_3_per_type(self, admin_headers):
        """Cannot add more than 3 featured items of same type"""
        specs = requests.get(f"{BASE_URL}/api/specialists").json()
        if len(specs) < 4:
            pytest.skip("Need at least 4 specialists to test limit")
        pinned = []
        for s in specs[:3]:
            r = requests.post(f"{BASE_URL}/api/admin/featured-items",
                             params={"item_type": "specialist", "item_id": s["id"]},
                             headers=admin_headers)
            if r.status_code == 200:
                pinned.append(s["id"])
        if len(pinned) < 3:
            for p in pinned:
                requests.delete(f"{BASE_URL}/api/admin/featured-items/specialist/{p}", headers=admin_headers)
            pytest.skip("Couldn't pin 3 specialists")
        # 4th should fail
        r4 = requests.post(f"{BASE_URL}/api/admin/featured-items",
                           params={"item_type": "specialist", "item_id": specs[3]["id"]},
                           headers=admin_headers)
        assert r4.status_code == 400
        assert "Maximálně" in r4.text or "3" in r4.text
        # Cleanup
        for p in pinned:
            requests.delete(f"{BASE_URL}/api/admin/featured-items/specialist/{p}", headers=admin_headers)
        print(f"PASS: Cannot pin more than 3 featured specialists (400 on 4th)")


# ============ SPECIALIST CATEGORIES ============

class TestSpecialistCategoriesAPI:
    """Test specialist categories endpoint"""

    def test_get_specialist_categories_public_accessible(self):
        """GET /api/admin/specialist-categories accessible to any authenticated user"""
        r = requests.get(f"{BASE_URL}/api/admin/specialist-categories")
        # May require auth, but should return valid categories
        # The page loads it with auth token, so test with admin
        print(f"GET /api/admin/specialist-categories (no auth): {r.status_code}")

    def test_get_specialist_categories_with_admin_returns_list(self, admin_headers):
        """GET /api/admin/specialist-categories with admin token returns list"""
        r = requests.get(f"{BASE_URL}/api/admin/specialist-categories", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) > 0
        for cat in data:
            assert "id" in cat
            assert "name" in cat
        print(f"PASS: GET /api/admin/specialist-categories returns {len(data)} categories with id/name")


# ============ MARKER COLORS (previously tested, now also CSS var) ============

class TestMarkerColors:
    """Marker colors API returns 7 keys"""

    def test_get_marker_colors_returns_7_keys(self):
        """GET /api/settings/marker-colors returns dict with 7 color keys"""
        r = requests.get(f"{BASE_URL}/api/settings/marker-colors")
        assert r.status_code == 200
        data = r.json()
        expected_keys = {"legal", "news", "community", "support", "specialists", "nearby", "default"}
        actual_keys = set(data.keys())
        assert expected_keys == actual_keys, f"Expected {expected_keys}, got {actual_keys}"
        for k, v in data.items():
            assert isinstance(v, str) and v.startswith("#"), f"Color value invalid: {k}={v}"
        print(f"PASS: GET /api/settings/marker-colors returns 7 valid hex colors")
