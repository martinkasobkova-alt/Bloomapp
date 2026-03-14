import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import Constants from 'expo-constants';
import { usePrivacySettings } from '../hooks/usePrivacySettings';

interface BiometricLockContextType {
  isLocked: boolean;
  isBiometricAvailable: boolean;
  biometricType: string | null;
  unlock: () => Promise<boolean>;
}

const BiometricLockContext = createContext<BiometricLockContextType | null>(null);

export const BiometricLockProvider: React.FC<{
  children: React.ReactNode;
  isAuthenticated: boolean;
  isReady: boolean;
}> = ({ children, isAuthenticated, isReady }) => {
  const [isLocked, setIsLocked] = useState(false);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string | null>(null);
  const [checkComplete, setCheckComplete] = useState(false);
  const isAuthenticatingRef = useRef(false);
  const backgroundTimestampRef = useRef<number | null>(null);

  const { settings, loaded: settingsLoaded, inactivityMinutes } = usePrivacySettings();

  const checkBiometricSupport = useCallback(async () => {
    try {
      if (Constants.executionEnvironment === 'storeClient') {
        setCheckComplete(true);
        return false;
      }
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) { setCheckComplete(true); return false; }
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) { setCheckComplete(true); return false; }
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const type = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
        ? 'Face ID'
        : types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
        ? 'Touch ID'
        : 'Biometrie';
      setBiometricType(type);
      setIsBiometricAvailable(true);
      setCheckComplete(true);
      return true;
    } catch {
      setCheckComplete(true);
      return false;
    }
  }, []);

  const authenticate = useCallback(async (): Promise<boolean> => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Odemknout Bloom',
        cancelLabel: 'Zrušit',
      });
      return result.success;
    } catch {
      return false;
    }
  }, []);

  const unlock = useCallback(async (): Promise<boolean> => {
    if (!settings.useBiometric || !isBiometricAvailable) {
      setIsLocked(false);
      return true;
    }
    const success = await authenticate();
    if (success) {
      setIsLocked(false);
      return true;
    }
    return false;
  }, [settings.useBiometric, isBiometricAvailable, authenticate]);

  useEffect(() => {
    checkBiometricSupport();
  }, [checkBiometricSupport]);

  useEffect(() => {
    if (!isReady || !isAuthenticated) {
      setIsLocked(false);
      return;
    }

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (!settingsLoaded) return;

      const reauth = settings.reauthRequired;
      if (reauth === 'never') {
        if (nextState === 'background') backgroundTimestampRef.current = Date.now();
        return;
      }

      if (nextState === 'background') {
        backgroundTimestampRef.current = Date.now();
        setIsLocked(true);
        return;
      }

      if (nextState === 'active') {
        const mins = inactivityMinutes();
        if (mins !== null && backgroundTimestampRef.current !== null) {
          const elapsed = (Date.now() - backgroundTimestampRef.current) / (60 * 1000);
          if (elapsed < mins) {
            setIsLocked(false);
            backgroundTimestampRef.current = null;
            return;
          }
        }

        const useBiometric = settings.useBiometric && isBiometricAvailable;
        if (useBiometric && !isAuthenticatingRef.current) {
          isAuthenticatingRef.current = true;
          authenticate().then((success) => {
            if (success) setIsLocked(false);
          }).finally(() => {
            isAuthenticatingRef.current = false;
          });
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => subscription.remove();
  }, [isReady, isAuthenticated, settingsLoaded, settings.reauthRequired, settings.useBiometric, isBiometricAvailable, authenticate, inactivityMinutes]);

  useEffect(() => {
    if (!isReady || !isAuthenticated || !checkComplete || !settingsLoaded) return;

    if (settings.reauthRequired === 'never') {
      setIsLocked(false);
    } else {
      // Start unlocked; lock only when going to background (handleAppStateChange)
      setIsLocked(false);
    }
  }, [isReady, isAuthenticated, checkComplete, settingsLoaded, settings.reauthRequired]);

  const value: BiometricLockContextType = {
    isLocked,
    isBiometricAvailable,
    biometricType,
    unlock,
  };

  return (
    <BiometricLockContext.Provider value={value}>
      {children}
    </BiometricLockContext.Provider>
  );
};

export const useBiometricLock = (): BiometricLockContextType => {
  const ctx = useContext(BiometricLockContext);
  if (!ctx) throw new Error('useBiometricLock must be used within BiometricLockProvider');
  return ctx;
};
