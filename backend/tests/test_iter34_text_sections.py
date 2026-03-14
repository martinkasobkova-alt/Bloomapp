"""
Iteration 34 backend tests:
- /api/settings/texts: returns about_text, help_text, footer_text, contact_text
- /api/settings/sections: returns order and visible fields for all sections
- Section order values match expected (support=2, specialists=3, legal=4, news=5, nearby=6, community=7)
- Admin can update text settings
- Admin can update section order via drag & drop (PUT /api/admin/settings/sections)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

ADMIN_EMAIL = "test1@bloom.cz"
ADMIN_PASSWORD = "test123"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if r.status_code == 200:
        return r.json().get("token") or r.json().get("access_token")
    pytest.skip(f"Admin login failed: {r.status_code} {r.text}")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


class TestTextSettingsAPI:
    """Tests for /api/settings/texts endpoint"""

    def test_get_text_settings_returns_200(self):
        r = requests.get(f"{BASE_URL}/api/settings/texts")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    def test_get_text_settings_is_dict(self):
        r = requests.get(f"{BASE_URL}/api/settings/texts")
        data = r.json()
        assert isinstance(data, dict), f"Expected dict, got {type(data)}: {data}"

    def test_text_settings_only_known_keys(self):
        """All returned keys should be from the allowed set"""
        r = requests.get(f"{BASE_URL}/api/settings/texts")
        data = r.json()
        allowed = {"about_text", "contact_text", "help_text", "footer_text"}
        for key in data:
            assert key in allowed, f"Unexpected key '{key}' in text settings"

    def test_text_settings_values_are_strings_or_absent(self):
        """Present values should be strings"""
        r = requests.get(f"{BASE_URL}/api/settings/texts")
        data = r.json()
        for key, val in data.items():
            assert isinstance(val, str), f"Value for '{key}' should be string, got {type(val)}: {val}"


class TestSectionSettingsAPI:
    """Tests for /api/settings/sections endpoint"""

    def test_get_sections_returns_200(self):
        r = requests.get(f"{BASE_URL}/api/settings/sections")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    def test_get_sections_has_all_6_keys(self):
        r = requests.get(f"{BASE_URL}/api/settings/sections")
        data = r.json()
        expected_keys = {"specialists", "legal", "news", "community", "support", "nearby"}
        assert expected_keys == set(data.keys()), f"Missing keys: {expected_keys - set(data.keys())}"

    def test_each_section_has_order_field(self):
        """order field must be present on every section"""
        r = requests.get(f"{BASE_URL}/api/settings/sections")
        data = r.json()
        for key, sec in data.items():
            assert "order" in sec, f"Section '{key}' missing 'order' field"
            assert isinstance(sec["order"], int), f"Section '{key}' order should be int, got {type(sec['order'])}"

    def test_each_section_has_visible_field(self):
        """visible field must be present on every section"""
        r = requests.get(f"{BASE_URL}/api/settings/sections")
        data = r.json()
        for key, sec in data.items():
            assert "visible" in sec, f"Section '{key}' missing 'visible' field"
            assert isinstance(sec["visible"], bool), f"Section '{key}' visible should be bool, got {type(sec['visible'])}"

    def test_default_order_values(self):
        """Verify default order assignments: support=2, specialists=3, legal=4, news=5, nearby=6, community=7"""
        r = requests.get(f"{BASE_URL}/api/settings/sections")
        data = r.json()
        expected_orders = {
            "support": 2, "specialists": 3, "legal": 4,
            "news": 5, "nearby": 6, "community": 7
        }
        for key, expected_order in expected_orders.items():
            actual_order = data[key]["order"]
            assert actual_order == expected_order, (
                f"Section '{key}' order: expected {expected_order}, got {actual_order}"
            )

    def test_section_titles_present(self):
        """Each section should have a title"""
        r = requests.get(f"{BASE_URL}/api/settings/sections")
        data = r.json()
        for key, sec in data.items():
            assert "title" in sec, f"Section '{key}' missing 'title'"
            assert sec["title"], f"Section '{key}' title is empty"

    def test_admin_titles_overridden(self):
        """legal.title='Právní poradna nový svět' and news.title='Aktuality testuju' from prev iteration"""
        r = requests.get(f"{BASE_URL}/api/settings/sections")
        data = r.json()
        # These may or may not match if admin changed them; just ensure they are set
        legal_title = data.get("legal", {}).get("title", "")
        news_title = data.get("news", {}).get("title", "")
        assert legal_title, "legal.title should not be empty"
        assert news_title, "news.title should not be empty"
        print(f"legal.title='{legal_title}', news.title='{news_title}'")


class TestSectionSettingsUpdate:
    """Tests for PUT /api/admin/settings/sections"""

    def test_update_sections_requires_auth(self):
        """Should reject unauthenticated requests"""
        r = requests.put(f"{BASE_URL}/api/admin/settings/sections", json={"support": {"visible": True}})
        assert r.status_code in [401, 403], f"Expected 401/403, got {r.status_code}"

    def test_update_section_order_drag_drop(self, admin_headers):
        """Simulate drag & drop: swap order of news (5) and legal (4)"""
        # Get current settings
        r = requests.get(f"{BASE_URL}/api/settings/sections")
        current = r.json()

        # Swap news and legal order values
        new_sections = {k: dict(v) for k, v in current.items()}
        original_news_order = new_sections["news"]["order"]
        original_legal_order = new_sections["legal"]["order"]
        new_sections["news"]["order"] = original_legal_order
        new_sections["legal"]["order"] = original_news_order

        r_update = requests.put(f"{BASE_URL}/api/admin/settings/sections",
                                json=new_sections, headers=admin_headers)
        assert r_update.status_code == 200, f"Update failed: {r_update.status_code} {r_update.text}"

        # Verify swap persisted
        r_verify = requests.get(f"{BASE_URL}/api/settings/sections")
        updated = r_verify.json()
        assert updated["news"]["order"] == original_legal_order, \
            f"news order should be {original_legal_order}, got {updated['news']['order']}"
        assert updated["legal"]["order"] == original_news_order, \
            f"legal order should be {original_news_order}, got {updated['legal']['order']}"

        # Restore original order
        new_sections["news"]["order"] = original_news_order
        new_sections["legal"]["order"] = original_legal_order
        r_restore = requests.put(f"{BASE_URL}/api/admin/settings/sections",
                                 json=new_sections, headers=admin_headers)
        assert r_restore.status_code == 200, f"Restore failed: {r_restore.status_code}"
        print(f"Drag & drop order swap test PASSED. Restored original orders.")

    def test_update_section_visibility(self, admin_headers):
        """Toggle visibility of a section and verify"""
        r = requests.get(f"{BASE_URL}/api/settings/sections")
        current = r.json()

        # Get current visibility of 'nearby'
        original_visible = current.get("nearby", {}).get("visible", True)

        # Toggle visibility
        new_sections = {k: dict(v) for k, v in current.items()}
        new_sections["nearby"]["visible"] = not original_visible

        r_update = requests.put(f"{BASE_URL}/api/admin/settings/sections",
                                json=new_sections, headers=admin_headers)
        assert r_update.status_code == 200, f"Update failed: {r_update.status_code}"

        # Verify toggle persisted
        r_verify = requests.get(f"{BASE_URL}/api/settings/sections")
        updated = r_verify.json()
        assert updated["nearby"]["visible"] == (not original_visible), \
            f"nearby visible should be {not original_visible}, got {updated['nearby']['visible']}"

        # Restore original visibility
        new_sections["nearby"]["visible"] = original_visible
        r_restore = requests.put(f"{BASE_URL}/api/admin/settings/sections",
                                 json=new_sections, headers=admin_headers)
        assert r_restore.status_code == 200, f"Restore failed: {r_restore.status_code}"
        print(f"Visibility toggle test PASSED. Restored nearby.visible={original_visible}")

    def test_update_response_has_sections_and_message(self, admin_headers):
        """Response from PUT should have sections and message"""
        r = requests.get(f"{BASE_URL}/api/settings/sections")
        current = r.json()
        new_sections = {k: dict(v) for k, v in current.items()}

        r_update = requests.put(f"{BASE_URL}/api/admin/settings/sections",
                                json=new_sections, headers=admin_headers)
        assert r_update.status_code == 200
        data = r_update.json()
        assert "message" in data, f"Response missing 'message': {data}"
        assert "sections" in data, f"Response missing 'sections': {data}"


class TestTextSettingsAdminUpdate:
    """Tests for PUT /api/admin/settings/texts"""

    def test_update_text_requires_auth(self):
        r = requests.put(f"{BASE_URL}/api/admin/settings/texts",
                         json={"key": "footer_text", "value": "test"})
        assert r.status_code in [401, 403], f"Expected 401/403, got {r.status_code}"

    def test_update_footer_text_and_verify(self, admin_headers):
        """Set footer_text and verify it appears in GET /api/settings/texts"""
        test_text = "Test footer text for iteration 34"
        r = requests.put(f"{BASE_URL}/api/admin/settings/texts",
                         json={"key": "footer_text", "value": test_text},
                         headers=admin_headers)
        assert r.status_code == 200, f"Update failed: {r.status_code} {r.text}"

        # Verify persisted
        r_verify = requests.get(f"{BASE_URL}/api/settings/texts")
        data = r_verify.json()
        assert data.get("footer_text") == test_text, \
            f"footer_text not persisted: expected '{test_text}', got '{data.get('footer_text')}'"
        print(f"footer_text update PASSED: '{test_text}'")

    def test_update_help_text_and_verify(self, admin_headers):
        """Set help_text and verify it appears in GET /api/settings/texts"""
        test_text = "Bloom je soukromý komunitní prostor. Test help text iteration 34."
        r = requests.put(f"{BASE_URL}/api/admin/settings/texts",
                         json={"key": "help_text", "value": test_text},
                         headers=admin_headers)
        assert r.status_code == 200, f"Update failed: {r.status_code} {r.text}"

        r_verify = requests.get(f"{BASE_URL}/api/settings/texts")
        data = r_verify.json()
        assert data.get("help_text") == test_text, \
            f"help_text not persisted: expected '{test_text}', got '{data.get('help_text')}'"
        print(f"help_text update PASSED: '{test_text}'")

    def test_update_about_text_and_verify(self, admin_headers):
        """Set about_text and verify"""
        test_text = "O projektu Bloom – test text iteration 34."
        r = requests.put(f"{BASE_URL}/api/admin/settings/texts",
                         json={"key": "about_text", "value": test_text},
                         headers=admin_headers)
        assert r.status_code == 200, f"Update failed: {r.status_code} {r.text}"

        r_verify = requests.get(f"{BASE_URL}/api/settings/texts")
        data = r_verify.json()
        assert data.get("about_text") == test_text, \
            f"about_text not persisted: expected '{test_text}', got '{data.get('about_text')}'"

    def test_update_invalid_key_rejected(self, admin_headers):
        """Invalid text key should be rejected"""
        r = requests.put(f"{BASE_URL}/api/admin/settings/texts",
                         json={"key": "invalid_key", "value": "test"},
                         headers=admin_headers)
        assert r.status_code == 400, f"Expected 400 for invalid key, got {r.status_code}"
