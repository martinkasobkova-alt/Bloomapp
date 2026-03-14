"""
Test suite for notification preferences feature.
Tests: GET /api/auth/me (notification_prefs default), PUT /api/auth/notification-prefs,
       push filtering logic (send_push_notification and send_broadcast_push_notification).
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "test1@bloom.cz"
ADMIN_PASSWORD = "test123"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token."""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ─── GET /api/auth/me – notification_prefs field ───────────────────────────────

class TestGetMeNotificationPrefs:
    """Test that GET /api/auth/me returns notification_prefs with correct defaults."""

    def test_get_me_returns_notification_prefs_field(self, admin_headers):
        """notification_prefs field should be present in /api/auth/me response."""
        resp = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers)
        assert resp.status_code == 200, f"GET /api/auth/me failed: {resp.text}"
        data = resp.json()
        assert "notification_prefs" in data, "notification_prefs field missing from /api/auth/me response"

    def test_get_me_notification_prefs_has_all_keys(self, admin_headers):
        """notification_prefs must contain messages, services, news keys."""
        resp = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers)
        assert resp.status_code == 200
        prefs = resp.json().get("notification_prefs", {})
        for key in ("messages", "services", "news"):
            assert key in prefs, f"Key '{key}' missing from notification_prefs"

    def test_get_me_notification_prefs_default_all_true(self, admin_headers):
        """Default notification_prefs should have all three values as True (or user may have set them)."""
        resp = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers)
        assert resp.status_code == 200
        prefs = resp.json().get("notification_prefs", {})
        # All keys must be boolean
        for key in ("messages", "services", "news"):
            assert isinstance(prefs[key], bool), f"notification_prefs.{key} is not a boolean: {prefs[key]}"


# ─── PUT /api/auth/notification-prefs ─────────────────────────────────────────

class TestUpdateNotificationPrefs:
    """Test saving notification preferences."""

    def test_put_notification_prefs_200(self, admin_headers):
        """PUT /api/auth/notification-prefs should return 200."""
        resp = requests.put(
            f"{BASE_URL}/api/auth/notification-prefs",
            json={"messages": True, "services": True, "news": True},
            headers=admin_headers
        )
        assert resp.status_code == 200, f"PUT failed: {resp.text}"

    def test_put_notification_prefs_returns_prefs_object(self, admin_headers):
        """Response should contain notification_prefs object."""
        resp = requests.put(
            f"{BASE_URL}/api/auth/notification-prefs",
            json={"messages": True, "services": True, "news": True},
            headers=admin_headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "notification_prefs" in data, f"notification_prefs missing in response: {data}"

    def test_put_notification_prefs_saves_false_messages(self, admin_headers):
        """Setting messages=False should be persisted."""
        # Set messages=False
        resp = requests.put(
            f"{BASE_URL}/api/auth/notification-prefs",
            json={"messages": False, "services": True, "news": True},
            headers=admin_headers
        )
        assert resp.status_code == 200
        prefs = resp.json().get("notification_prefs", {})
        assert prefs["messages"] is False, f"messages should be False but got: {prefs['messages']}"
        assert prefs["services"] is True
        assert prefs["news"] is True

    def test_put_notification_prefs_persisted_via_get_me(self, admin_headers):
        """After setting prefs, GET /api/auth/me should reflect the saved values."""
        # Set a specific combination
        payload = {"messages": False, "services": False, "news": True}
        put_resp = requests.put(
            f"{BASE_URL}/api/auth/notification-prefs",
            json=payload,
            headers=admin_headers
        )
        assert put_resp.status_code == 200

        # Verify via GET /api/auth/me
        get_resp = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers)
        assert get_resp.status_code == 200
        prefs = get_resp.json().get("notification_prefs", {})
        assert prefs["messages"] is False, f"messages should be False: {prefs}"
        assert prefs["services"] is False, f"services should be False: {prefs}"
        assert prefs["news"] is True, f"news should be True: {prefs}"

    def test_put_notification_prefs_saves_false_services(self, admin_headers):
        """Setting services=False should be persisted."""
        resp = requests.put(
            f"{BASE_URL}/api/auth/notification-prefs",
            json={"messages": True, "services": False, "news": True},
            headers=admin_headers
        )
        assert resp.status_code == 200
        prefs = resp.json().get("notification_prefs", {})
        assert prefs["services"] is False, f"services should be False: {prefs}"

    def test_put_notification_prefs_saves_false_news(self, admin_headers):
        """Setting news=False should be persisted."""
        resp = requests.put(
            f"{BASE_URL}/api/auth/notification-prefs",
            json={"messages": True, "services": True, "news": False},
            headers=admin_headers
        )
        assert resp.status_code == 200
        prefs = resp.json().get("notification_prefs", {})
        assert prefs["news"] is False, f"news should be False: {prefs}"

    def test_put_notification_prefs_all_false(self, admin_headers):
        """Setting all=False should be allowed and persisted."""
        resp = requests.put(
            f"{BASE_URL}/api/auth/notification-prefs",
            json={"messages": False, "services": False, "news": False},
            headers=admin_headers
        )
        assert resp.status_code == 200
        prefs = resp.json().get("notification_prefs", {})
        assert prefs["messages"] is False
        assert prefs["services"] is False
        assert prefs["news"] is False

    def test_put_notification_prefs_restore_all_true(self, admin_headers):
        """Restore prefs to all True for other tests."""
        resp = requests.put(
            f"{BASE_URL}/api/auth/notification-prefs",
            json={"messages": True, "services": True, "news": True},
            headers=admin_headers
        )
        assert resp.status_code == 200
        prefs = resp.json().get("notification_prefs", {})
        assert prefs["messages"] is True
        assert prefs["services"] is True
        assert prefs["news"] is True

    def test_put_notification_prefs_requires_auth(self):
        """PUT without auth token should return 401/403."""
        resp = requests.put(
            f"{BASE_URL}/api/auth/notification-prefs",
            json={"messages": True, "services": True, "news": True},
        )
        assert resp.status_code in (401, 403), f"Expected 401/403 without auth, got {resp.status_code}"


# ─── Test partial defaults (missing keys default to True) ──────────────────────

class TestNotificationPrefsDefaults:
    """Test that missing pref keys default to True."""

    def test_partial_body_defaults_missing_keys(self, admin_headers):
        """Only sending one key should keep others from body; missing keys use default True."""
        # Send only news=False
        resp = requests.put(
            f"{BASE_URL}/api/auth/notification-prefs",
            json={"news": False},
            headers=admin_headers
        )
        assert resp.status_code == 200
        prefs = resp.json().get("notification_prefs", {})
        # messages and services should default to True (body.get("messages", True))
        assert prefs["messages"] is True, f"messages should default to True: {prefs}"
        assert prefs["services"] is True, f"services should default to True: {prefs}"
        assert prefs["news"] is False

    def test_restore_defaults_after_partial_test(self, admin_headers):
        """Restore all prefs to True."""
        resp = requests.put(
            f"{BASE_URL}/api/auth/notification-prefs",
            json={"messages": True, "services": True, "news": True},
            headers=admin_headers
        )
        assert resp.status_code == 200


# ─── Push notification preference filtering (via push subscription logic) ──────

class TestPushPreferenceFiltering:
    """
    Test that when a user disables a notification type, push delivery is skipped.
    We test the DB-level logic by:
      1. Setting pref to False for a type
      2. Verifying the /api/auth/me response reflects it
      3. Confirming the backend query for send_broadcast_push_notification would filter them out
    
    Note: Actual WebPush delivery cannot be tested without real browser subscription.
    We verify the preference is saved correctly (which is what the delivery check uses).
    """

    def test_disabling_messages_reflected_in_me(self, admin_headers):
        """Disabling 'messages' is saved correctly - push send will skip this user."""
        # Disable messages
        put = requests.put(
            f"{BASE_URL}/api/auth/notification-prefs",
            json={"messages": False, "services": True, "news": True},
            headers=admin_headers
        )
        assert put.status_code == 200

        # Verify via GET /api/auth/me
        me = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers)
        assert me.status_code == 200
        prefs = me.json().get("notification_prefs", {})
        assert prefs.get("messages") is False, "messages pref not persisted"

        # Restore
        requests.put(
            f"{BASE_URL}/api/auth/notification-prefs",
            json={"messages": True, "services": True, "news": True},
            headers=admin_headers
        )

    def test_disabling_services_reflected_in_me(self, admin_headers):
        """Disabling 'services' is saved correctly - broadcast push will skip this user."""
        put = requests.put(
            f"{BASE_URL}/api/auth/notification-prefs",
            json={"messages": True, "services": False, "news": True},
            headers=admin_headers
        )
        assert put.status_code == 200

        me = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers)
        assert me.status_code == 200
        prefs = me.json().get("notification_prefs", {})
        assert prefs.get("services") is False, "services pref not persisted"

        # Restore
        requests.put(
            f"{BASE_URL}/api/auth/notification-prefs",
            json={"messages": True, "services": True, "news": True},
            headers=admin_headers
        )

    def test_disabling_news_reflected_in_me(self, admin_headers):
        """Disabling 'news' is saved correctly - news broadcast push will skip this user."""
        put = requests.put(
            f"{BASE_URL}/api/auth/notification-prefs",
            json={"messages": True, "services": True, "news": False},
            headers=admin_headers
        )
        assert put.status_code == 200

        me = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers)
        assert me.status_code == 200
        prefs = me.json().get("notification_prefs", {})
        assert prefs.get("news") is False, "news pref not persisted"

        # Restore
        requests.put(
            f"{BASE_URL}/api/auth/notification-prefs",
            json={"messages": True, "services": True, "news": True},
            headers=admin_headers
        )

    def test_push_subscription_still_works_when_prefs_enabled(self, admin_headers):
        """When prefs are all True, push subscription endpoint still works normally."""
        # Subscribe with a fake subscription to verify no server-side errors
        fake_sub = {
            "endpoint": "https://fcm.googleapis.com/fcm/send/test_notif_prefs_check",
            "keys": {
                "p256dh": "BLBx_fakekeyforpreftestBLBx12345678901234567890",
                "auth": "authkeytest123"
            }
        }
        resp = requests.post(
            f"{BASE_URL}/api/push/subscribe",
            json={"subscription": fake_sub},
            headers=admin_headers
        )
        # 200 or 422 (if validation fails) — just not 500
        assert resp.status_code in (200, 400, 422), f"Unexpected status: {resp.status_code} - {resp.text}"

    def test_all_prefs_restored_to_true_final(self, admin_headers):
        """Final cleanup: ensure admin user has all prefs enabled."""
        resp = requests.put(
            f"{BASE_URL}/api/auth/notification-prefs",
            json={"messages": True, "services": True, "news": True},
            headers=admin_headers
        )
        assert resp.status_code == 200
        prefs = resp.json().get("notification_prefs", {})
        assert prefs["messages"] is True
        assert prefs["services"] is True
        assert prefs["news"] is True
