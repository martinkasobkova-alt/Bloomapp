import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { OutlineIcon } from '../components/OutlineIcon';
import axios from 'axios';
import { API } from '../config/api';

const COLORS = {
  violet: '#8A7CFF',
  text: '#2F3441',
  sub: '#5D6472',
  bg: '#F8F7FC',
  white: '#FFFFFF',
};

interface VerifyEmailScreenProps {
  token: string;
  onSuccess: () => void;
  onBack: () => void;
}

export default function VerifyEmailScreen({ token, onSuccess, onBack }: VerifyEmailScreenProps) {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    axios
      .get(`${API}/auth/verify-email/${token}`)
      .then((r) => {
        if (!cancelled) {
          setStatus('success');
          setMessage(r.data.message || 'E-mail byl úspěšně ověřen!');
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setStatus('error');
          setMessage(e.response?.data?.detail || 'Ověřovací odkaz je neplatný nebo vypršel.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (status === 'loading') {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color={COLORS.violet} />
          <Text style={styles.title}>Ověřuji e-mail...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <OutlineIcon
            name={status === 'success' ? 'check-circle' : 'x-circle'}
            size={56}
            color={status === 'success' ? '#10B981' : '#E53935'}
          />
        <Text style={styles.title}>{status === 'success' ? 'E-mail ověřen!' : 'Ověření selhalo'}</Text>
        <Text style={styles.subtitle}>{message}</Text>
        <TouchableOpacity style={styles.button} onPress={status === 'success' ? onSuccess : onBack}>
          <Text style={styles.buttonText}>{status === 'success' ? 'Přejít na Bloom' : 'Zpět na přihlášení'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', padding: 24 },
  card: { backgroundColor: COLORS.white, borderRadius: 16, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: COLORS.sub, textAlign: 'center', marginBottom: 24 },
  button: { backgroundColor: COLORS.violet, borderRadius: 10, padding: 16, alignItems: 'center', width: '100%' },
  buttonText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
});
