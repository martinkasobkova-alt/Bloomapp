import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LotusLogo } from '../components/LotusLogo';
import { useBiometricLock } from '../context/BiometricLockContext';
import { useAuth } from '../context/AuthContext';
import { usePrivacySettings } from '../hooks/usePrivacySettings';

const COLORS = {
  violet: '#8A7CFF',
  text: '#2F3441',
  sub: '#5D6472',
  bg: '#F8F7FC',
  white: '#FFFFFF',
};

export default function BiometricLockScreen() {
  const { unlock, biometricType } = useBiometricLock();
  const { logout } = useAuth();
  const { settings } = usePrivacySettings();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasAutoTriggered = useRef(false);

  const useBiometric = settings.useBiometric && !!biometricType;

  useEffect(() => {
    if (useBiometric && !hasAutoTriggered.current) {
      hasAutoTriggered.current = true;
      setLoading(true);
      unlock().then((success) => {
        setLoading(false);
        if (!success) setError('Ověření se nezdařilo.');
      });
    }
  }, [useBiometric, unlock]);

  const handleUnlock = async () => {
    setError(null);
    setLoading(true);
    try {
      const success = await unlock();
      if (!success) {
        setError('Ověření se nezdařilo. Zkuste to znovu.');
      }
    } catch {
      setError('Ověření se nezdařilo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.prideBar}>
        <View style={[styles.prideStrip, { backgroundColor: '#5BCEFA' }]} />
        <View style={[styles.prideStrip, { backgroundColor: '#F5A9B8' }]} />
        <View style={[styles.prideStrip, { backgroundColor: '#FFFFFF' }]} />
        <View style={[styles.prideStrip, { backgroundColor: '#F5A9B8' }]} />
        <View style={[styles.prideStrip, { backgroundColor: '#5BCEFA' }]} />
      </View>

      <View style={styles.content}>
        <View style={styles.logoWrap}>
          <LotusLogo size={64} />
          <Text style={styles.title}>Bloom</Text>
        </View>
        <Text style={styles.subtitle}>
          {useBiometric
            ? `Odemkněte pomocí ${biometricType}`
            : 'Pro pokračování se prosím přihlaste znovu.'}
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {useBiometric ? (
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleUnlock}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.buttonText}>Odemknout {biometricType}</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.button}
            onPress={logout}
          >
            <Text style={styles.buttonText}>Přihlásit se znovu</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prideBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    height: 4,
  },
  prideStrip: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    padding: 24,
  },
  logoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  title: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.violet,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.sub,
    textAlign: 'center',
    marginBottom: 24,
  },
  error: {
    color: '#E53935',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: COLORS.violet,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
