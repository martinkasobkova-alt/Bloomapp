"""
Backend tests for RichTextEditor features:
- HTML sanitization (sanitize_html via bleach)
- POST /api/news with HTML content
- GET /api/articles returns content field
- Article create/update with HTML content
- Script tag stripping (XSS prevention)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "test1@bloom.cz"
ADMIN_PASS = "test123"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token."""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASS
    })
    if resp.status_code != 200:
        pytest.skip(f"Admin login failed: {resp.status_code} {resp.text}")
    token = resp.json().get("access_token") or resp.json().get("token")
    if not token:
        pytest.skip("No token in login response")
    return token


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


class TestHTMLSanitization:
    """Tests for backend HTML sanitization via bleach"""

    def test_news_with_script_tag_stripped(self, admin_headers):
        """POST /api/news with script tag - script must be stripped"""
        payload = {
            "title": "TEST_XSS News",
            "content": "<p>Safe content</p><script>alert(1)</script><p>More content</p>",
            "category": "local"
        }
        resp = requests.post(f"{BASE_URL}/api/news", json=payload, headers=admin_headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "id" in data
        content = data.get("content", "")
        assert "<script>" not in content, "Script tag should be stripped"
        assert "</script>" not in content, "Closing script tag should be stripped"
        # bleach strips tags but keeps text content (alert(1) becomes plain text - not executable)
        assert "<p>" in content or "Safe content" in content, "Safe content should be preserved"
        print(f"PASS: Script tag stripped (text may remain as plain text). Content: {content}")
        # Cleanup
        news_id = data["id"]
        requests.delete(f"{BASE_URL}/api/news/{news_id}", headers=admin_headers)

    def test_news_with_allowed_tags_preserved(self, admin_headers):
        """POST /api/news with allowed HTML tags - should be preserved"""
        html_content = (
            "<h1>Nadpis 1</h1>"
            "<h2>Nadpis 2</h2>"
            "<h3>Nadpis 3</h3>"
            "<p>Odstavec s <strong>tučným</strong> a <em>kurzívou</em></p>"
            "<ul><li>Bod 1</li><li>Bod 2</li></ul>"
            "<a href='https://example.com'>Odkaz</a>"
        )
        payload = {
            "title": "TEST_AllowedTags News",
            "content": html_content,
            "category": "local"
        }
        resp = requests.post(f"{BASE_URL}/api/news", json=payload, headers=admin_headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        content = data.get("content", "")
        assert "<h1>" in content, "h1 tag should be preserved"
        assert "<h2>" in content, "h2 tag should be preserved"
        assert "<h3>" in content, "h3 tag should be preserved"
        assert "<p>" in content, "p tag should be preserved"
        assert "<strong>" in content, "strong tag should be preserved"
        assert "<em>" in content, "em tag should be preserved"
        assert "<ul>" in content, "ul tag should be preserved"
        assert "<li>" in content, "li tag should be preserved"
        assert "<a " in content, "a tag should be preserved"
        print(f"PASS: Allowed tags preserved. Content: {content[:200]}")
        # Cleanup
        news_id = data["id"]
        requests.delete(f"{BASE_URL}/api/news/{news_id}", headers=admin_headers)

    def test_news_with_table_html_preserved(self, admin_headers):
        """POST /api/news with table HTML - table tags should be preserved"""
        table_html = (
            "<table style='border-collapse:collapse;width:100%'>"
            "<thead><tr><th style='border:1px solid #d1d5db'>Col 1</th><th style='border:1px solid #d1d5db'>Col 2</th></tr></thead>"
            "<tbody><tr><td style='border:1px solid #d1d5db'>Data 1</td><td style='border:1px solid #d1d5db'>Data 2</td></tr></tbody>"
            "</table>"
        )
        payload = {
            "title": "TEST_Table News",
            "content": table_html,
            "category": "local"
        }
        resp = requests.post(f"{BASE_URL}/api/news", json=payload, headers=admin_headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        content = data.get("content", "")
        assert "<table" in content, "table tag should be preserved"
        assert "<thead>" in content, "thead should be preserved"
        assert "<tbody>" in content, "tbody should be preserved"
        assert "<tr>" in content, "tr should be preserved"
        assert "<td" in content, "td should be preserved"
        assert "<th" in content, "th should be preserved"
        print(f"PASS: Table tags preserved.")
        # Cleanup
        news_id = data["id"]
        requests.delete(f"{BASE_URL}/api/news/{news_id}", headers=admin_headers)

    def test_news_iframe_tag_stripped(self, admin_headers):
        """POST /api/news with iframe tag - should be stripped"""
        payload = {
            "title": "TEST_Iframe News",
            "content": "<p>Text</p><iframe src='evil.com'></iframe><p>After</p>",
            "category": "local"
        }
        resp = requests.post(f"{BASE_URL}/api/news", json=payload, headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        content = data.get("content", "")
        assert "<iframe" not in content, "iframe tag should be stripped"
        assert "<p>" in content, "p tags should be preserved"
        print(f"PASS: iframe stripped. Content: {content}")
        # Cleanup
        news_id = data["id"]
        requests.delete(f"{BASE_URL}/api/news/{news_id}", headers=admin_headers)

    def test_news_onclick_attribute_stripped(self, admin_headers):
        """POST /api/news with onclick attribute - should be stripped"""
        payload = {
            "title": "TEST_OnClick News",
            "content": '<p onclick="alert(1)">Paragraph</p>',
            "category": "local"
        }
        resp = requests.post(f"{BASE_URL}/api/news", json=payload, headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        content = data.get("content", "")
        assert "onclick" not in content, "onclick attribute should be stripped"
        assert "<p>" in content or "Paragraph" in content, "p content should be preserved"
        print(f"PASS: onclick stripped. Content: {content}")
        # Cleanup
        news_id = data["id"]
        requests.delete(f"{BASE_URL}/api/news/{news_id}", headers=admin_headers)


class TestArticleAPIs:
    """Tests for /api/articles endpoints"""

    def test_get_articles_returns_content_field(self, admin_headers):
        """GET /api/articles returns articles with content field"""
        resp = requests.get(f"{BASE_URL}/api/articles")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        assert isinstance(data, list), "Should return a list"
        print(f"PASS: GET /api/articles returns {len(data)} articles")
        if len(data) > 0:
            article = data[0]
            assert "content" in article, "Article should have content field"
            assert "title" in article, "Article should have title field"
            assert "id" in article, "Article should have id field"
            print(f"PASS: Article has content field: {str(article['content'])[:100]}")

    def test_create_article_with_html_content(self, admin_headers):
        """POST /api/articles creates article with HTML, sanitized correctly"""
        html_content = (
            "<h2>Test Article</h2>"
            "<p>This is a <strong>test</strong> article with <em>formatting</em>.</p>"
            "<ul><li>Item 1</li><li>Item 2</li></ul>"
            "<script>alert('xss')</script>"
        )
        payload = {
            "title": "TEST_HTML Article",
            "content": html_content,
            "category": "pravni",
            "published": True
        }
        resp = requests.post(f"{BASE_URL}/api/articles", json=payload, headers=admin_headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "id" in data
        content = data.get("content", "")
        assert "<script>" not in content, "Script tag should be stripped from article"
        assert "<h2>" in content, "h2 should be preserved"
        assert "<strong>" in content, "strong should be preserved"
        assert "<em>" in content, "em should be preserved"
        assert "<ul>" in content, "ul should be preserved"
        print(f"PASS: Article created with sanitized HTML. Content: {content[:200]}")

        # Verify persistence via GET
        article_id = data["id"]
        get_resp = requests.get(f"{BASE_URL}/api/admin/articles", headers=admin_headers)
        assert get_resp.status_code == 200
        articles = get_resp.json()
        found = next((a for a in articles if a["id"] == article_id), None)
        assert found is not None, "Article should persist in DB"
        assert found["content"] == data["content"], "Content should match"
        print(f"PASS: Article persisted correctly")

        # Cleanup
        requests.delete(f"{BASE_URL}/api/articles/{article_id}", headers=admin_headers)

    def test_update_article_html_sanitized(self, admin_headers):
        """PUT /api/articles/:id updates content and sanitizes HTML"""
        # First create
        resp = requests.post(f"{BASE_URL}/api/articles", json={
            "title": "TEST_Update Article",
            "content": "<p>Original</p>",
            "category": "pravni",
            "published": True
        }, headers=admin_headers)
        assert resp.status_code == 200
        article_id = resp.json()["id"]

        # Update with HTML including script tag
        update_payload = {
            "title": "TEST_Updated Article",
            "content": "<h1>Updated</h1><script>evil()</script><p>Safe</p>",
        }
        upd_resp = requests.put(f"{BASE_URL}/api/articles/{article_id}", json=update_payload, headers=admin_headers)
        assert upd_resp.status_code == 200, f"Expected 200, got {upd_resp.status_code}: {upd_resp.text}"
        upd_data = upd_resp.json()
        content = upd_data.get("content", "")
        assert "<script>" not in content, "Script should be stripped from updated content"
        assert "<h1>" in content, "h1 should be in updated content"
        assert "<p>" in content, "p should be in updated content"
        print(f"PASS: Article update sanitized. Content: {content}")

        # Verify via GET
        get_resp = requests.get(f"{BASE_URL}/api/articles/{article_id}")
        assert get_resp.status_code == 200
        fetched = get_resp.json()
        assert fetched["content"] == upd_data["content"], "Updated content should persist"
        print(f"PASS: Updated content persisted correctly")

        # Cleanup
        requests.delete(f"{BASE_URL}/api/articles/{article_id}", headers=admin_headers)

    def test_delete_article(self, admin_headers):
        """DELETE /api/articles/:id removes article"""
        # Create
        resp = requests.post(f"{BASE_URL}/api/articles", json={
            "title": "TEST_Delete Article",
            "content": "<p>To be deleted</p>",
            "category": "pravni",
            "published": False
        }, headers=admin_headers)
        assert resp.status_code == 200
        article_id = resp.json()["id"]

        # Delete
        del_resp = requests.delete(f"{BASE_URL}/api/articles/{article_id}", headers=admin_headers)
        assert del_resp.status_code == 200, f"Expected 200, got {del_resp.status_code}"

        # Verify gone
        get_resp = requests.get(f"{BASE_URL}/api/articles/{article_id}")
        assert get_resp.status_code == 404, "Deleted article should return 404"
        print(f"PASS: Article deleted and confirmed 404")

    def test_admin_get_all_articles(self, admin_headers):
        """GET /api/admin/articles returns all articles including unpublished"""
        resp = requests.get(f"{BASE_URL}/api/admin/articles", headers=admin_headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        data = resp.json()
        assert isinstance(data, list), "Should return list"
        print(f"PASS: Admin can get all articles ({len(data)} articles)")

    def test_article_toggle_publish(self, admin_headers):
        """PUT /api/articles/:id/toggle-publish toggles publish state"""
        # Create
        resp = requests.post(f"{BASE_URL}/api/articles", json={
            "title": "TEST_Toggle Article",
            "content": "<p>Toggle test</p>",
            "category": "pravni",
            "published": True
        }, headers=admin_headers)
        assert resp.status_code == 200
        article_id = resp.json()["id"]
        original_published = resp.json().get("published", True)

        # Toggle
        tog_resp = requests.put(f"{BASE_URL}/api/articles/{article_id}/toggle-publish", headers=admin_headers)
        assert tog_resp.status_code == 200
        tog_data = tog_resp.json()
        assert tog_data["published"] != original_published, "Published state should be toggled"
        print(f"PASS: Toggle publish works. Now: {tog_data['published']}")

        # Cleanup
        requests.delete(f"{BASE_URL}/api/articles/{article_id}", headers=admin_headers)

    def test_news_plain_text_backward_compat(self, admin_headers):
        """POST /api/news with plain text (no HTML) - should work correctly"""
        payload = {
            "title": "TEST_Plain Text News",
            "content": "This is plain text without any HTML tags.",
            "category": "local"
        }
        resp = requests.post(f"{BASE_URL}/api/news", json=payload, headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        content = data.get("content", "")
        assert "plain text" in content, "Plain text should be preserved"
        print(f"PASS: Plain text backward compat works. Content: {content}")
        # Cleanup
        news_id = data["id"]
        requests.delete(f"{BASE_URL}/api/news/{news_id}", headers=admin_headers)
