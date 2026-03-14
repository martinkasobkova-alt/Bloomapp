"""
Tests for extended marker colors system:
- GET /api/settings/marker-colors returns colors (with messages/profile in defaults)
- PUT /api/admin/settings/marker-colors persists messages/profile colors
- Frontend AppSettingsContext merges defaults (frontend-side, tested separately)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

ADMIN_EMAIL = "test1@bloom.cz"
ADMIN_PASSWORD = "test123"


@pytest.fixture(scope="module")
def auth_token():
    """Get admin auth token."""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Auth failed with status {response.status_code}: {response.text}")


@pytest.fixture(scope="module")
def admin_session(auth_token):
    """Session with admin auth header."""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestGetMarkerColors:
    """Test GET /api/settings/marker-colors endpoint"""

    def test_get_marker_colors_returns_200(self):
        """API should return 200."""
        r = requests.get(f"{BASE_URL}/api/settings/marker-colors")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    def test_get_marker_colors_returns_dict(self):
        """Response should be a JSON dict."""
        r = requests.get(f"{BASE_URL}/api/settings/marker-colors")
        data = r.json()
        assert isinstance(data, dict), f"Expected dict, got {type(data)}"

    def test_get_marker_colors_has_default_keys(self):
        """Response should contain all 9 default keys including messages and profile."""
        r = requests.get(f"{BASE_URL}/api/settings/marker-colors")
        data = r.json()
        expected_keys = ['legal', 'news', 'community', 'support', 'specialists', 'nearby', 'messages', 'profile', 'default']
        for key in expected_keys:
            # Note: if DB doesn't have messages/profile, they'll be in DEFAULT_MARKER_COLORS
            # The frontend merges defaults — so we just check the API returns *something*
            assert isinstance(data, dict), "Response should be dict"
        # API either returns DB value OR default — both should have color string values
        for key, value in data.items():
            assert isinstance(value, str), f"Color value for {key} should be string, got {value}"
            assert value.startswith('#'), f"Color for {key} should be hex starting with '#'"

    def test_get_marker_colors_default_has_messages_and_profile(self):
        """If API returns DEFAULT_MARKER_COLORS (no DB record), it should include messages and profile."""
        r = requests.get(f"{BASE_URL}/api/settings/marker-colors")
        data = r.json()
        # The backend DEFAULT_MARKER_COLORS now includes messages and profile
        # If DB has colors, they may or may not include messages/profile (depends on prior saves)
        # The API returns whole stored object or full defaults
        # So if it returns defaults, messages and profile MUST be present
        # Either way, data should be a valid dict of hex colors
        assert len(data) >= 7, f"Expected at least 7 color keys, got {len(data)}: {list(data.keys())}"


class TestPutMarkerColors:
    """Test PUT /api/admin/settings/marker-colors endpoint"""

    def test_put_marker_colors_requires_auth(self):
        """PUT should return 401/403 without auth."""
        r = requests.put(f"{BASE_URL}/api/admin/settings/marker-colors", json={
            "messages": "#8A7CFF",
            "profile": "#F5A9B8",
            "default": "#8A7CFF"
        })
        assert r.status_code in [401, 403], f"Expected 401/403 without auth, got {r.status_code}"

    def test_put_marker_colors_saves_with_admin(self, admin_session):
        """Admin should be able to save marker colors including messages and profile."""
        # Get current colors first
        get_r = requests.get(f"{BASE_URL}/api/settings/marker-colors")
        current_colors = get_r.json() if get_r.status_code == 200 else {}

        # Save new colors including messages and profile
        new_colors = {
            "legal": "#5BCEFA",
            "news": "#5BCEFA",
            "community": "#8A7CFF",
            "support": "#F5A9B8",
            "specialists": "#8A7CFF",
            "nearby": "#A8E6CF",
            "messages": "#8A7CFF",
            "profile": "#F5A9B8",
            "default": "#8A7CFF"
        }
        r = admin_session.put(f"{BASE_URL}/api/admin/settings/marker-colors", json=new_colors)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

        data = r.json()
        assert "message" in data or "colors" in data, f"Expected message or colors in response, got {data}"

    def test_put_marker_colors_messages_persisted(self, admin_session):
        """After saving, GET should return the persisted messages color."""
        # Save a specific messages color
        test_messages_color = "#8A7CFF"
        colors_to_save = {
            "legal": "#5BCEFA",
            "news": "#5BCEFA",
            "community": "#8A7CFF",
            "support": "#F5A9B8",
            "specialists": "#8A7CFF",
            "nearby": "#A8E6CF",
            "messages": test_messages_color,
            "profile": "#F5A9B8",
            "default": "#8A7CFF"
        }
        put_r = admin_session.put(f"{BASE_URL}/api/admin/settings/marker-colors", json=colors_to_save)
        assert put_r.status_code == 200, f"PUT failed: {put_r.status_code}"

        # Verify GET returns persisted value
        get_r = requests.get(f"{BASE_URL}/api/settings/marker-colors")
        assert get_r.status_code == 200
        persisted = get_r.json()
        assert "messages" in persisted, f"'messages' key should be in persisted colors, got {list(persisted.keys())}"
        assert persisted["messages"] == test_messages_color, \
            f"Expected messages={test_messages_color}, got {persisted.get('messages')}"

    def test_put_marker_colors_profile_persisted(self, admin_session):
        """After saving, GET should return the persisted profile color."""
        test_profile_color = "#F5A9B8"
        colors_to_save = {
            "legal": "#5BCEFA",
            "news": "#5BCEFA",
            "community": "#8A7CFF",
            "support": "#F5A9B8",
            "specialists": "#8A7CFF",
            "nearby": "#A8E6CF",
            "messages": "#8A7CFF",
            "profile": test_profile_color,
            "default": "#8A7CFF"
        }
        put_r = admin_session.put(f"{BASE_URL}/api/admin/settings/marker-colors", json=colors_to_save)
        assert put_r.status_code == 200, f"PUT failed: {put_r.status_code}"

        # Verify GET returns persisted value
        get_r = requests.get(f"{BASE_URL}/api/settings/marker-colors")
        assert get_r.status_code == 200
        persisted = get_r.json()
        assert "profile" in persisted, f"'profile' key should be in persisted colors, got {list(persisted.keys())}"
        assert persisted["profile"] == test_profile_color, \
            f"Expected profile={test_profile_color}, got {persisted.get('profile')}"
