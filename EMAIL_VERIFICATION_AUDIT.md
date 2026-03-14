# Email Verification & Auth Flow – Audit Report

**Date:** 2025-03-12  
**Scope:** Backend, Web Frontend, Mobile App (Bloom)

---

## 1. Short Summary of Current State

The email verification flow is **mostly implemented and working**. Backend, web, and mobile share the same API and logic. Main gaps:

- **Stale user state** after verification (web and mobile) – banner stays until refresh
- **Mobile VerifyEmailScreen** is effectively unreachable (email links open web)
- **Mobile** has no homepage banner for unverified users (only on Profile tab)
- **verify_email** does not clear `verification_token` after success (minor security)
- **Layout resend** does not refresh user or show success feedback

**Recommendation:** **Repair** the existing flow with minimal changes. Do not rebuild.

---

## 2. What Exists (by Area)

### 2.1 Registration Email Sending ✅

| Location | Status | Notes |
|----------|--------|------|
| `backend/routes/auth.py` L71–106 | ✅ Implemented | Sends welcome + verification email via Resend |
| Uses `SENDER_EMAIL`, `FRONTEND_URL` | ✅ | From `database.py` / `.env` |
| Fallback when `resend.api_key` missing | ✅ | Skips email, logs error, registration still succeeds |

### 2.2 Welcome Email ✅

| Location | Status | Notes |
|----------|--------|------|
| Same block as registration | ✅ | Combined with verification in one email |
| Content: welcome text, verify button, profile/guidelines links | ✅ | `bloom_email_html()` in `backend/utils.py` |

### 2.3 Email Verification ✅

| Location | Status | Notes |
|----------|--------|------|
| `backend/routes/auth.py` L124–132 | ✅ | `GET /api/auth/verify-email/{token}` |
| Sets `email_verified: True` | ✅ | Does not clear `verification_token` |
| Idempotent (already verified → friendly message) | ✅ | |

### 2.4 Verification Tokens ✅

| Location | Status | Notes |
|----------|--------|------|
| `verification_token` (UUID) at registration | ✅ | `backend/routes/auth.py` L49 |
| Stored in `users` collection | ✅ | |
| Resend generates new token | ✅ | `auth.py` L174–175 |
| No expiry | ⚠️ | Tokens never expire |

### 2.5 verify-email Endpoint ✅

| Location | Status | Notes |
|----------|--------|------|
| `GET /api/auth/verify-email/{token}` | ✅ | Public, no auth |
| Returns `{ message, username }` | ✅ | |
| 400 for invalid/unknown token | ✅ | |

### 2.6 Resend Verification Email ✅

| Location | Status | Notes |
|----------|--------|------|
| `POST /api/auth/resend-verification` | ✅ | Requires auth |
| Generates new token, sends email | ✅ | `auth.py` L170–195 |
| Returns success even if Resend fails | ⚠️ | No error to user when email fails |
| Web: `Layout.js` L39–47 | ✅ | Uses axios (auth from defaults) |
| Mobile: `ProfileScreen.tsx` L71–81 | ✅ | Resend button in status card |

### 2.7 Blocking Unverified Users ✅

| Location | Status | Notes |
|----------|--------|------|
| `auth_helpers.py` L129–136 `require_verified_email` | ✅ | 403 if `!email_verified` |
| `routes/users.py` L161 `upload_photo` | ✅ | Uses `require_verified_email` |
| `routes/services.py` L17 `create_service` | ✅ | Uses `require_verified_email` |
| Web `ProfileGallery` | ✅ | Disables upload when `!email_verified` |
| Mobile `ProfileGallery.tsx` L39, 163–176 | ✅ | Same behavior |

### 2.8 Homepage/Main-Screen Notice for Unverified Users

| Platform | Status | Notes |
|----------|--------|------|
| Web `Layout.js` L50–71 | ✅ | Amber banner on all pages when `!email_verified` |
| Mobile | ⚠️ Partial | Only on **Profile** tab (status card + resend), no global banner |

### 2.9 Mobile App Auth Parity

| Feature | Web | Mobile | Parity |
|---------|-----|--------|--------|
| Register | ✅ | ✅ | ✅ |
| Login | ✅ | ✅ | ✅ |
| Verify email (API) | ✅ | ✅ | ✅ |
| Verify email (UI from link) | ✅ Web page | ⚠️ Link opens web | Email uses `FRONTEND_URL` |
| Resend verification | ✅ | ✅ | ✅ |
| Forgot password | ✅ | ✅ | ✅ |
| Reset password (API) | ✅ | ✅ | ✅ |
| Reset password (UI from link) | ✅ Web page | ⚠️ Link opens web | Same as verify |
| Unverified banner | ✅ Global | ⚠️ Profile only | Partial |

### 2.10 Password Reset Flow ✅

| Component | Web | Mobile | Backend |
|-----------|-----|--------|---------|
| Request (`reset-password-request`) | ✅ `LoginForm.js` | ✅ `ForgotPasswordScreen` | ✅ |
| Email with link | — | — | ✅ `FRONTEND_URL/reset-password?token=` |
| Reset page | ✅ `ResetPasswordPage.js` | ✅ `ResetPasswordScreen` | — |
| Reset API | ✅ | ✅ | ✅ |
| Rate limiting (IP + email) | — | — | ✅ |
| Redirect `/auth/reset/{token}` | — | — | ✅ |

---

## 3. What Is Partially Implemented

| Item | Details |
|------|---------|
| Mobile VerifyEmailScreen | Exists, receives `token` from route params, but email links use `FRONTEND_URL` → opens web. Screen only reachable via deep link `bloom://verify-email?token=`, which is not used. |
| Mobile ResetPasswordScreen | Same: email links open web. Mobile screen only reachable via deep link. |
| Mobile unverified notice | Shown only on Profile tab, not on Home/main screen. |
| Resend error handling | Backend logs Resend errors but returns success. User is not informed if email fails. |
| User refresh after verify | After verify-email or resend, `user` in AuthContext is not refreshed. Banner/status stays until page reload. |

---

## 4. What Is Missing

| Item | Impact |
|------|--------|
| `refreshUser` / refetch after verify | Web/mobile keep showing unverified state until manual refresh. |
| Layout success/error feedback for resend | User does not see clear success or error. |
| Mobile homepage banner for unverified | Unverified users may not notice they need to verify. |
| Token expiry for verification | Old tokens remain valid indefinitely. |
| Clearing `verification_token` after verify | Minor: token could be reused (idempotent, but not ideal). |

---

## 5. What Is Broken

| Item | Severity | Notes |
|------|----------|-------|
| Stale `user` after verification | Medium | Banner/status incorrect until refresh. |
| Layout resend: no success toast | Low | User unsure if resend worked. |
| Layout resend: no error handling | Low | Failures not surfaced to user. |

---

## 6. What Can Be Reused Safely

- All backend endpoints (register, verify-email, resend-verification, reset-password)
- Web `VerifyEmailPage`, `ResetPasswordPage`, `Layout` banner
- Mobile `VerifyEmailScreen`, `ResetPasswordScreen`, Profile status card + resend
- `require_verified_email` and its usage
- Resend integration and `bloom_email_html`
- Migration that sets `email_verified: True` for legacy users

---

## 7. What Should Be Repaired (Not Rebuilt)

1. **Web AuthContext** – add `refreshUser` and call it after verify-email success and after resend success.
2. **Web Layout** – call `refreshUser` after resend, add success toast and error handling.
3. **Web VerifyEmailPage** – after success, call `refreshUser` before navigating home (or ensure home refetches).
4. **Mobile ProfileScreen** – call `refreshUser` after resend success.
5. **Mobile** – optional: add a small banner on HomeScreen when `!email_verified` (similar to web).
6. **Backend verify_email** – optionally clear `verification_token` after success (low priority).

---

## 8. Exact Files Involved

### Backend

| File | Role |
|------|------|
| `backend/routes/auth.py` | register, verify-email, resend-verification, reset-password |
| `backend/auth_helpers.py` | `require_verified_email`, `get_current_user`, rate limiting |
| `backend/database.py` | `FRONTEND_URL`, `SENDER_EMAIL`, Resend config |
| `backend/utils.py` | `bloom_email_html` |
| `backend/server.py` | Migration for `email_verified` |

### Web Frontend

| File | Role |
|------|------|
| `frontend/src/context/AuthContext.js` | Token, user, login, register – needs `refreshUser` |
| `frontend/src/components/Layout.js` | Verification banner, resend handler |
| `frontend/src/pages/VerifyEmailPage.jsx` | Verify-email UI, success/error |
| `frontend/src/pages/ResetPasswordPage.js` | Reset password form |
| `frontend/src/components/auth/LoginForm.js` | Forgot password modal |
| `frontend/src/App.js` | Routes for `/verify-email`, `/reset-password` |

### Mobile

| File | Role |
|------|------|
| `bloom-mobile/src/context/AuthContext.tsx` | Has `refreshUser` |
| `bloom-mobile/src/screens/ProfileScreen.tsx` | Status card, resend, expert verification |
| `bloom-mobile/src/screens/VerifyEmailScreen.tsx` | Verify-email UI (token from params) |
| `bloom-mobile/src/screens/ForgotPasswordScreen.tsx` | Forgot password |
| `bloom-mobile/src/screens/ResetPasswordScreen.tsx` | Reset password form |
| `bloom-mobile/src/components/profile/ProfileGallery.tsx` | Blocks upload when unverified |
| `bloom-mobile/src/navigation/AppNavigator.tsx` | Auth routes, VerifyEmail/ResetPassword wrappers |

---

## 9. Recommended Minimal-Change Implementation Plan

### Phase 1: Fix Stale User State (High Priority)

1. **Web AuthContext** – add `refreshUser` and expose it.
2. **Web VerifyEmailPage** – on success, call `refreshUser` before navigating.
3. **Web Layout** – after resend success, call `refreshUser`; add success toast and error handling.
4. **Mobile ProfileScreen** – after resend success, call `refreshUser`.

### Phase 2: UX Improvements (Medium Priority)

5. **Web Layout** – show success toast on resend success; show error toast on failure.
6. **Mobile** – optional: add unverified banner on HomeScreen (or main tab).

### Phase 3: Optional Hardening (Low Priority)

7. **Backend verify_email** – clear `verification_token` after successful verify.
8. **Resend verification** – return 503 when Resend fails.

---

## 10. Repair vs Build Fresh

**Recommendation: Repair**

- Core flow is complete and consistent across platforms.
- No duplicate logic or second verification system.
- Changes are limited to:
  - AuthContext `refreshUser`
  - Layout and VerifyEmailPage resend/verify handling
  - Mobile ProfileScreen resend handling
  - Optional banner and UX tweaks

---

## 11. Deep Linking (Future Enhancement)

To use mobile VerifyEmailScreen and ResetPasswordScreen from email links:

1. Add `APP_URL` or `MOBILE_APP_URL` env var (e.g. `bloom://`).
2. In emails, use either:
   - Web: `FRONTEND_URL/verify-email?token=`
   - Mobile: `bloom://verify-email?token=` (or universal link)
3. Or use a single URL that redirects to app when installed, otherwise to web.

This is out of scope for the minimal repair plan above.
