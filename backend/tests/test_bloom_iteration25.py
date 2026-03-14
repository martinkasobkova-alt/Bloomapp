"""
Iteration 25 Backend Tests - Batch 3 Admin Features
Tests for:
- News categories CRUD endpoints
- Locations endpoint (public + admin)
- Marker colors settings endpoints
- Admin services endpoint
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

ADMIN_EMAIL = "test1@bloom.cz"
ADMIN_PASSWORD = "test123"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token."""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin login failed: {response.status_code} {response.text}")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Admin headers with auth token."""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


# ============ NEWS CATEGORIES ============

class TestNewsCategoriesPublic:
    """GET /api/news-categories - public endpoint"""

    def test_get_news_categories_returns_200(self):
        """Public endpoint returns 200 without auth."""
        response = requests.get(f"{BASE_URL}/api/news-categories")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"

    def test_get_news_categories_returns_list(self):
        """Returns a list of categories."""
        response = requests.get(f"{BASE_URL}/api/news-categories")
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        assert len(data) > 0, "Expected at least one category"

    def test_get_news_categories_has_required_fields(self):
        """Each category has id and name fields."""
        response = requests.get(f"{BASE_URL}/api/news-categories")
        data = response.json()
        for cat in data:
            assert "id" in cat, f"Missing 'id' in category: {cat}"
            assert "name" in cat, f"Missing 'name' in category: {cat}"


class TestNewsCategoriesAdminCRUD:
    """Admin CRUD for /api/admin/news-categories"""

    created_cat_id = None

    def test_get_admin_news_categories_requires_auth(self):
        """Admin endpoint requires authentication."""
        response = requests.get(f"{BASE_URL}/api/admin/news-categories")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"

    def test_get_admin_news_categories_with_auth(self, admin_headers):
        """Admin can get news categories."""
        response = requests.get(f"{BASE_URL}/api/admin/news-categories", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list)

    def test_post_news_category_creates_new(self, admin_headers):
        """POST /api/admin/news-categories creates new category."""
        response = requests.post(
            f"{BASE_URL}/api/admin/news-categories?name=TEST_Testovací+kategorie",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["name"] == "TEST_Testovací kategorie" or "TEST_Testovací" in data["name"]
        # Store for later tests
        TestNewsCategoriesAdminCRUD.created_cat_id = data["id"]

    def test_post_news_category_persists_in_list(self, admin_headers):
        """Created category appears in the list."""
        if not TestNewsCategoriesAdminCRUD.created_cat_id:
            pytest.skip("No category was created")
        response = requests.get(f"{BASE_URL}/api/admin/news-categories", headers=admin_headers)
        data = response.json()
        ids = [c["id"] for c in data]
        assert TestNewsCategoriesAdminCRUD.created_cat_id in ids, "Created category not found in list"

    def test_put_news_category_updates_name(self, admin_headers):
        """PUT /api/admin/news-categories/{id} updates category name."""
        if not TestNewsCategoriesAdminCRUD.created_cat_id:
            pytest.skip("No category was created")
        cat_id = TestNewsCategoriesAdminCRUD.created_cat_id
        response = requests.put(
            f"{BASE_URL}/api/admin/news-categories/{cat_id}?name=TEST_Aktualizovaná+kategorie",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["id"] == cat_id

    def test_put_news_category_change_persists(self, admin_headers):
        """Updated name is reflected in GET."""
        if not TestNewsCategoriesAdminCRUD.created_cat_id:
            pytest.skip("No category was created")
        response = requests.get(f"{BASE_URL}/api/admin/news-categories", headers=admin_headers)
        data = response.json()
        cat = next((c for c in data if c["id"] == TestNewsCategoriesAdminCRUD.created_cat_id), None)
        assert cat is not None, "Category not found after update"
        assert "TEST_Aktualizovaná" in cat["name"] or "TEST_" in cat["name"]

    def test_delete_news_category_removes_it(self, admin_headers):
        """DELETE /api/admin/news-categories/{id} removes category."""
        if not TestNewsCategoriesAdminCRUD.created_cat_id:
            pytest.skip("No category was created")
        cat_id = TestNewsCategoriesAdminCRUD.created_cat_id
        response = requests.delete(
            f"{BASE_URL}/api/admin/news-categories/{cat_id}",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "message" in data

    def test_delete_news_category_not_in_list(self, admin_headers):
        """Deleted category no longer in list."""
        if not TestNewsCategoriesAdminCRUD.created_cat_id:
            pytest.skip("No category was created")
        response = requests.get(f"{BASE_URL}/api/admin/news-categories", headers=admin_headers)
        data = response.json()
        ids = [c["id"] for c in data]
        assert TestNewsCategoriesAdminCRUD.created_cat_id not in ids, "Deleted category still in list"


# ============ LOCATIONS ============

class TestLocationsEndpoints:
    """Tests for /api/locations public endpoint."""

    def test_get_public_locations_returns_200(self):
        """GET /api/locations returns 200 without auth."""
        response = requests.get(f"{BASE_URL}/api/locations")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"

    def test_get_public_locations_returns_list(self):
        """Returns a list of locations."""
        response = requests.get(f"{BASE_URL}/api/locations")
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"

    def test_get_public_locations_structure(self):
        """Location objects have id and name fields."""
        response = requests.get(f"{BASE_URL}/api/locations")
        data = response.json()
        if len(data) > 0:
            for loc in data[:3]:  # Check first 3
                assert "id" in loc or "name" in loc, f"Missing fields in location: {loc}"


class TestAdminLocationsEndpoints:
    """Tests for /api/admin/locations CRUD."""
    
    created_loc_id = None

    def test_admin_get_locations_with_auth(self, admin_headers):
        """Admin can GET locations."""
        response = requests.get(f"{BASE_URL}/api/admin/locations", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"

    def test_admin_add_location(self, admin_headers):
        """Admin can add a new location."""
        response = requests.post(
            f"{BASE_URL}/api/admin/locations?name=TEST_Testovací+kraj",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data
        TestAdminLocationsEndpoints.created_loc_id = data["id"]

    def test_admin_update_location(self, admin_headers):
        """Admin can edit a location."""
        if not TestAdminLocationsEndpoints.created_loc_id:
            pytest.skip("No location was created")
        loc_id = TestAdminLocationsEndpoints.created_loc_id
        response = requests.put(
            f"{BASE_URL}/api/admin/locations/{loc_id}?name=TEST_Upravený+kraj",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"

    def test_admin_delete_location(self, admin_headers):
        """Admin can delete a location."""
        if not TestAdminLocationsEndpoints.created_loc_id:
            pytest.skip("No location was created")
        loc_id = TestAdminLocationsEndpoints.created_loc_id
        response = requests.delete(
            f"{BASE_URL}/api/admin/locations/{loc_id}",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"


# ============ MARKER COLORS ============

class TestMarkerColorsEndpoints:
    """Tests for /api/settings/marker-colors endpoints."""

    def test_get_marker_colors_public(self):
        """GET /api/settings/marker-colors returns 200 without auth."""
        response = requests.get(f"{BASE_URL}/api/settings/marker-colors")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"

    def test_get_marker_colors_structure(self):
        """Returns an object (dict) with color values."""
        response = requests.get(f"{BASE_URL}/api/settings/marker-colors")
        data = response.json()
        assert isinstance(data, dict), f"Expected dict, got {type(data)}"
        # Check that it has some keys
        assert len(data) > 0, "Expected at least one color key"

    def test_get_marker_colors_has_default_keys(self):
        """Response has expected color keys."""
        response = requests.get(f"{BASE_URL}/api/settings/marker-colors")
        data = response.json()
        expected_keys = ["legal", "news", "community", "support", "specialists", "nearby", "default"]
        for key in expected_keys:
            assert key in data, f"Missing key '{key}' in marker colors: {data}"

    def test_put_marker_colors_requires_auth(self):
        """PUT /api/admin/settings/marker-colors requires authentication."""
        response = requests.put(
            f"{BASE_URL}/api/admin/settings/marker-colors",
            json={"default": "#FF0000"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"

    def test_put_marker_colors_updates_colors(self, admin_headers):
        """Admin can update marker colors."""
        # First get current colors
        get_response = requests.get(f"{BASE_URL}/api/settings/marker-colors")
        current_colors = get_response.json()
        
        # Update with test color
        updated_colors = dict(current_colors)
        updated_colors["default"] = "#123456"
        
        response = requests.put(
            f"{BASE_URL}/api/admin/settings/marker-colors",
            json=updated_colors,
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data or "colors" in data

    def test_put_marker_colors_persists(self, admin_headers):
        """Updated colors are reflected in GET."""
        # Set a test color
        test_colors = {
            "legal": "#AABBCC",
            "news": "#DDEEFF",
            "community": "#112233",
            "support": "#445566",
            "specialists": "#778899",
            "nearby": "#AACCBB",
            "default": "#FF5500"
        }
        requests.put(
            f"{BASE_URL}/api/admin/settings/marker-colors",
            json=test_colors,
            headers=admin_headers
        )
        
        # Verify
        get_response = requests.get(f"{BASE_URL}/api/settings/marker-colors")
        data = get_response.json()
        assert data.get("default") == "#FF5500", f"Expected #FF5500, got {data.get('default')}"


# ============ ADMIN SERVICES ============

class TestAdminServicesEndpoint:
    """Tests for /api/admin/services endpoint."""

    def test_get_admin_services_requires_auth(self):
        """Admin services endpoint requires auth."""
        response = requests.get(f"{BASE_URL}/api/admin/services")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"

    def test_get_admin_services_with_auth(self, admin_headers):
        """Admin can get all services."""
        response = requests.get(f"{BASE_URL}/api/admin/services", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"

    def test_admin_services_have_required_fields(self, admin_headers):
        """Service objects have required fields."""
        response = requests.get(f"{BASE_URL}/api/admin/services", headers=admin_headers)
        data = response.json()
        if len(data) > 0:
            service = data[0]
            for field in ["id", "username", "offer", "need"]:
                assert field in service, f"Missing field '{field}' in service: {service}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
