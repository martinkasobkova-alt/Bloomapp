# Bloom Security Audit Report

**Date:** March 12, 2025  
**Scope:** Backend (FastAPI) + Frontend (React web + React Native mobile)

---

## Confirmed Fixed Issues

| Issue | Status |
|------|--------|
| **Google OAuth blocked user bypass** | **FIXED** – Added `is_user_blocked` check in `handle_google_session` before issuing token for existing users (same pattern as Facebook). |
| Blocked user enforcement in login | Already enforced in `auth.py` login endpoint |
| Blocked user enforcement in `get_current_user` | Already enforced – returns 403 for banned users |
| Blocked user enforcement in Facebook OAuth | Already enforced in `handle_facebook_oauth` |
| Avatar upload path traversal | `serve_avatar` uses `os.path.basename`, rejects `..`, `/`, `\`, and resolves path to ensure it stays within `UPLOAD_DIR` |
| JWT secret fallback | No fallback – app fails to start if `JWT_SECRET` is missing |
| CORS configuration | From env (`CORS_ORIGINS`), required at startup |
| Debug endpoints | `/api/auth/clear-reset-rate-limit` and `/api/auth/reset-password-request/clear-rate-limit` restricted to localhost (`127.0.0.1`, `::1`) |
| Admin/superadmin role escalation | `set_user_role` enforces: only superadmin can assign/remove admin/superadmin; admin cannot demote other admins; cannot remove last superadmin |

---

## Remaining Critical Issues

### 1. Forgot-password rate limit bypass when FRONTEND_URL contains localhost

**File:** `backend/routes/auth.py`  
**Lines:** 399–400

```python
skip_rate_limit = is_dev or client_ip in ("127.0.0.1", "::1")
```

When `FRONTEND_URL` contains `"localhost"` or `"127.0.0.1"`, the forgot-password rate limit is **completely bypassed** for all clients. If production is misconfigured with `FRONTEND_URL=http://localhost:3000`, an attacker can brute-force password reset emails without limit.

**Fix:** Remove the `is_dev` bypass. Only allow bypass when the request comes from localhost (`client_ip in ("127.0.0.1", "::1")`), not based on `FRONTEND_URL`.

---

### 2. setup-first-admin: secret in query string

**File:** `backend/routes/admin.py`  
**Lines:** 26–39

```python
@router.post("/admin/setup-first-admin")
async def setup_first_admin(email: str, secret: str):
```

`email` and `secret` are taken as query parameters. Secrets in URLs are often logged by proxies, load balancers, and access logs.

**Fix:** Use a POST body model, e.g.:

```python
class SetupFirstAdminBody(BaseModel):
    email: str
    secret: str

async def setup_first_admin(body: SetupFirstAdminBody):
    ...
```

---

## Remaining High Severity Issues

### 1. X-Forwarded-For / X-Real-IP trusted without validation

**File:** `backend/rate_limits.py` (slowapi limiter), `backend/auth_helpers.py` (`get_client_ip`)

The slowapi limiter and `get_client_ip` use `X-Forwarded-For` or `X-Real-IP` when present, without checking that the request comes from a trusted proxy. An attacker can spoof these headers to bypass rate limits.

**Affected:** register, resend-verification, forgot-password, uploads, public posting (slowapi endpoints). Login uses `request.client.host` directly, so it is not affected.

**Fix:** When behind a trusted proxy, only trust `X-Forwarded-For` / `X-Real-IP` if the immediate peer (e.g. `request.client.host`) is in a configured list of proxy IPs. Otherwise use `request.client.host`.

---

### 2. Web frontend: JWT stored in localStorage

**File:** `frontend/src/context/AuthContext.js`  
**Lines:** 22–23, 49–50, 58–59

```javascript
const [token, setToken] = useState(localStorage.getItem('token'));
localStorage.setItem('token', newToken);
```

JWTs in `localStorage` are exposed to XSS. Any script injection can read the token and impersonate the user.

**Fix:** Prefer `httpOnly` cookies for web, or at least document the risk and ensure strict CSP and input sanitization. Mobile app uses `expo-secure-store`, which is appropriate.

---

### 3. News media serving: missing path traversal guard

**File:** `backend/routes/news.py`  
**Lines:** 104–110

```python
@router.get("/media/news/{filename}")
async def serve_news_media(filename: str):
    safe_filename = os.path.basename(filename)
    file_path = NEWS_MEDIA_DIR / safe_filename
```

`os.path.basename("..")` returns `".."`, so `NEWS_MEDIA_DIR / ".."` can escape the intended directory. There is no `resolve()` check like in `serve_avatar`.

**Fix:** Add the same path resolution check as in `serve_avatar`:

```python
try:
    resolved = file_path.resolve()
    base = NEWS_MEDIA_DIR.resolve()
    if not str(resolved).startswith(str(base)):
        raise HTTPException(status_code=400, detail="Neplatná cesta k souboru")
except (OSError, ValueError):
    raise HTTPException(status_code=400, detail="Neplatná cesta k souboru")
```

---

### 4. News upload-media: extension from client filename

**File:** `backend/routes/news.py`  
**Lines:** 92–94

```python
ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "bin"
filename = f"{uuid.uuid4().hex[:12]}.{ext}"
```

The extension is taken from `file.filename`, which can be spoofed. A malicious client could upload `malicious.exe` as `image.jpg` and get a `.exe` file stored. Content-type is checked, but the stored filename does not match.

**Fix:** Derive extension from validated `content_type` (e.g. map `image/jpeg` → `.jpg`), similar to `upload_message_media` in `messages.py`.

---

## Remaining Medium Severity Issues

### 1. setup-first-admin not rate limited

**File:** `backend/routes/admin.py`  
**Route:** `POST /api/admin/setup-first-admin`

No rate limiting. An attacker can brute-force `ADMIN_SETUP_SECRET` if it is weak.

**Fix:** Add rate limiting (e.g. 5 attempts per IP per hour) and ensure `ADMIN_SETUP_SECRET` is strong (e.g. 32+ random characters).

---

### 2. Sensitive data in logs

**File:** `backend/routes/auth.py`

- `logger.info` logs `user_id`, `stored_email`, `normalized_email`, `to_email` in password reset flow.
- `print()` statements log `client_ip`, `X-Forwarded-For`, `X-Real-IP`, rate limit keys.

**Fix:** Avoid logging PII (emails) in production. Use structured logging with log levels; disable debug prints in production.

---

### 3. Inconsistent IP source for rate limiting

**File:** `backend/routes/auth.py`

- Login: `request.client.host` (line 141)
- Facebook OAuth: `request.client.host` (line 196)
- Google OAuth: `get_client_ip(request)` (line 177) – uses X-Forwarded-For
- Forgot-password: `get_client_ip(request)` – uses X-Forwarded-For

**Fix:** Use a single, consistent IP extraction function and document when it is safe to trust proxy headers.

---

### 4. Messages media serving: no path resolution check

**File:** `backend/routes/messages.py`  
**Lines:** 55–58

Uses `os.path.basename(filename)` but does not verify that the resolved path stays within `MEDIA_DIR`. Same risk as news media.

**Fix:** Add path resolution check as in `serve_avatar`.

---

### 5. Mobile: 403 / auth failures not surfaced to user

**File:** `bloom-mobile/src/context/AuthContext.tsx`

On `/auth/me` failure (e.g. 403 blocked), the catch block clears the token and logs out but does not show a specific message. The web frontend uses an axios interceptor to show a toast for 403 with "ověřit" or "zablokován".

**Fix:** In the mobile app, show a user-facing message (e.g. toast or alert) when 403 indicates blocked or unverified account.

---

## Remaining Low Severity Issues

### 1. Duplicate debug endpoint

**File:** `backend/server.py` (lines 75–85) and `backend/routes/auth.py` (lines 363–371)

`/api/auth/clear-reset-rate-limit` is defined in `server.py`; `/api/auth/reset-password-request/clear-rate-limit` is in `auth.py`. Both clear the reset rate limit. Redundant and slightly increases attack surface.

**Fix:** Keep a single debug endpoint and document it as dev-only.

---

### 2. Avatar upload: extension from filename

**File:** `backend/routes/users.py`  
**Lines:** 101–104

```python
ext = (file.filename or "avatar.jpg").rsplit(".", 1)[-1].lower()
if ext not in ("jpg", "jpeg", "png", "webp", "gif"):
    ext = "jpg"
```

Extension is taken from filename but constrained to a whitelist. Lower risk than news upload, but deriving from content-type would be more robust.

---

### 3. JWT expiration

**File:** `backend/auth_helpers.py`  
**Line:** 102

```python
"exp": datetime.now(timezone.utc).timestamp() + 86400 * 7
```

7-day expiration. Acceptable for many apps; consider shorter expiry (e.g. 24h) with refresh tokens for higher security.

---

## Final Risk Summary

| Category | Risk Level | Notes |
|----------|------------|-------|
| **Authentication** | Medium | JWT handling solid; Google OAuth blocked check fixed. Web token in localStorage is XSS risk. |
| **Authorization** | Low | Admin/superadmin separation enforced. Role escalation prevented. |
| **API security** | Medium | Rate limits can be bypassed via X-Forwarded-For. Forgot-password bypass when FRONTEND_URL has localhost. |
| **File handling** | Medium | Avatar upload/serve is well protected. News and messages media need path resolution checks; news upload should derive extension from content-type. |
| **Account security** | Medium | Password reset flow is sound; token expiry 1h. Logging of PII and debug prints should be reduced. |
| **Frontend** | Medium | Web: localStorage for JWT. Mobile: SecureStore. 403 handling could be improved on mobile. |

**Priority actions:**

1. Remove `is_dev` bypass for forgot-password rate limit.
2. Move setup-first-admin secret to POST body.
3. Add path resolution checks to news and messages media serving.
4. Derive news upload extension from content-type.
5. Document or fix X-Forwarded-For trust (proxy allowlist).
6. Consider httpOnly cookies or stricter CSP for web JWT storage.
