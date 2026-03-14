// Single source of truth for the backend API base URL.
// All frontend files import API from here instead of defining it locally.
export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Origin used for the Google auth redirect URL. The auth provider derives the displayed
 * app name ("Log in to X") from the redirect URL hostname. For production set
 * REACT_APP_AUTH_REDIRECT_ORIGIN=https://bloomapp.cz (bez www). Must point to the same app.
 */
export function getAuthRedirectOrigin() {
  const env = process.env.REACT_APP_AUTH_REDIRECT_ORIGIN;
  if (env && typeof env === 'string' && env.trim()) return env.trim().replace(/\/$/, '');
  return window.location.origin;
}

/** Název aplikace pro OAuth obrazovku – defaultně "Bloom". Nastav REACT_APP_AUTH_APP_NAME pro změnu. */
export function getAuthAppName() {
  const env = process.env.REACT_APP_AUTH_APP_NAME;
  if (env && typeof env === 'string' && env.trim()) return env.trim();
  return 'Bloom';
}

/** URL pro Google přihlášení s volitelným app_name (některé auth servery ho zobrazují místo hostname). */
export function getGoogleAuthUrl() {
  const redirect = getAuthRedirectOrigin() + '/auth/google-callback';
  const appName = getAuthAppName();
  return `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirect)}&app_name=${encodeURIComponent(appName)}`;
}

/** Sestaví plnou URL pro media (obrázky, videa) – backend vrací relativní cestu /api/media/... */
export function getMediaUrl(url) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${process.env.REACT_APP_BACKEND_URL || ''}${url}`;
}

/** Returns URL if safe for href (http/https only), else null. Use before rendering user-controlled URLs in <a href>. */
export function safeUrlForHref(url) {
  if (!url || typeof url !== 'string') return null;
  const s = url.trim();
  const lower = s.toLowerCase();
  if (lower.startsWith('https://') || lower.startsWith('http://')) return s;
  return null;
}

/** Normalizuje URL custom avataru – backend vrací FRONTEND_URL/api/... ale obrázky servíruje backend. */
export function fixAvatarUrl(url) {
  if (!url) return '';
  if (url.startsWith('data:')) return url; // data URL (registrace) – ponechat
  const backend = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/$/, '');
  if (!backend) return url;
  const match = url.match(/\/api\/uploads\/avatars\/[^?#]+/);
  if (match) return `${backend}${match[0]}`;
  if (url.startsWith('/api/')) return `${backend}${url}`;
  return url;
}
