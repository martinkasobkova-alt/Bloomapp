/**
 * Bloom API configuration.
 * Backend runs on http://localhost:8000 during development.
 * - iOS Simulator: localhost works
 * - Android Emulator: 10.0.2.2 (maps to host machine)
 * - Physical device: uses hostUri from Expo or EXPO_PUBLIC_API_URL
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/** Fallback pro fyzické zařízení, když Expo nedetekuje host. Změň na IP svého PC nebo nastav EXPO_PUBLIC_API_URL v .env */
const DEV_API_FALLBACK = 'http://192.168.0.191:8000';

const getBaseUrl = (): string => {
  // 1. Explicitní override z .env (nejspolehlivější)
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');

  if (__DEV__) {
    // 2. IP z Expo hostUri (Metro bundler)
    const hostUri = Constants.expoConfig?.hostUri ?? Constants.platform?.hostUri ?? (Constants.manifest as { hostUri?: string })?.hostUri;
    if (hostUri) {
      const host = hostUri.split(':')[0];
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        return `http://${host}:8000`;
      }
    }
    // 3. Android emulator
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:8000';
    }
    // 4. Fyzické zařízení: použij fallback (localhost na telefonu nefunguje)
    if (Platform.OS !== 'web') {
      return DEV_API_FALLBACK;
    }
  }
  return 'http://localhost:8000';
};

export const API_BASE = getBaseUrl();
export const API = `${API_BASE}/api`;

/** Base URL webové aplikace (pro Turnstile WebView). Např. https://bloom.cz */
export const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL || '';

/** Cloudflare Turnstile site key (pro mobilní registraci). Pokud není nastaveno, Turnstile se přeskočí. */
export const TURNSTILE_SITE_KEY = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY || '';

/** Sestaví plnou URL pro media (obrázky, audio). Přidá base URL k relativní cestě a token. */
export function buildMediaUrl(mediaUrl: string, token: string | null): string {
  if (!mediaUrl) return '';
  const base = mediaUrl.startsWith('http') ? '' : API_BASE;
  const sep = mediaUrl.includes('?') ? '&' : '?';
  const t = token ? encodeURIComponent(token) : '';
  return `${base}${mediaUrl}${sep}token=${t}`;
}

/** Pro mobil: opraví URL avataru vrácenou backendem (localhost:3000 → náš host) */
export function fixAvatarUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url.replace(/^https?:\/\/[^/]+/, API_BASE);
  return url;
}

if (__DEV__) {
  console.log('[Bloom] API URL:', API_BASE);
  if (API_BASE.includes('localhost') && Platform.OS !== 'web') {
    console.warn('[Bloom] ⚠ Na fyzickém zařízení localhost nefunguje! Nastav EXPO_PUBLIC_API_URL v .env (IP tvého PC, např. http://192.168.1.100:8000)');
  }
}
