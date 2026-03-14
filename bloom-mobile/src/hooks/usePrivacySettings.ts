import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_REAUTH = '@bloom_reauth_required';
const KEY_BIOMETRIC = '@bloom_use_biometric';

export type ReauthRequired = 'never' | 'on_reopen' | '5' | '15';

export interface PrivacySettings {
  reauthRequired: ReauthRequired;
  useBiometric: boolean;
}

const DEFAULT: PrivacySettings = {
  reauthRequired: 'never',
  useBiometric: false,
};

export function usePrivacySettings() {
  const [settings, setSettings] = useState<PrivacySettings>(DEFAULT);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [reauth, biometric] = await Promise.all([
          AsyncStorage.getItem(KEY_REAUTH),
          AsyncStorage.getItem(KEY_BIOMETRIC),
        ]);
        setSettings({
          reauthRequired: (reauth as ReauthRequired) || 'never',
          useBiometric: biometric === 'true',
        });
      } catch {
        setSettings(DEFAULT);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const setReauthRequired = useCallback(async (value: ReauthRequired) => {
    setSettings((s) => ({ ...s, reauthRequired: value }));
    await AsyncStorage.setItem(KEY_REAUTH, value);
  }, []);

  const setUseBiometric = useCallback(async (value: boolean) => {
    setSettings((s) => ({ ...s, useBiometric: value }));
    await AsyncStorage.setItem(KEY_BIOMETRIC, value ? 'true' : 'false');
  }, []);

  const inactivityMinutes = (): number | null => {
    if (settings.reauthRequired === '5') return 5;
    if (settings.reauthRequired === '15') return 15;
    return null;
  };

  return {
    settings,
    loaded,
    setReauthRequired,
    setUseBiometric,
    inactivityMinutes,
  };
}
