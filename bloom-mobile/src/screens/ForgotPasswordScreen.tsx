import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { OutlineIcon } from '../components/OutlineIcon';
import axios from 'axios';
import { API } from '../config/api';

const COLORS = {
  violet: '#8A7CFF',
  text: '#2F3441',
  sub: '#5D6472',
  bg: '#F8F7FC',
  white: '#FFFFFF',
  border: '#E5E3ED',
};

interface ForgotPasswordScreenProps {
  onBack: () => void;
  onSent?: () => void;
}

export default function ForgotPasswordScreen({ onBack, onSent }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email.trim()) return;
    setError(null);
    setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password-request`, { email: email.trim() });
      setSent(true);
      onSent?.();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || 'Nepodařilo se odeslat e-mail');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <OutlineIcon name="mail" size={56} color={COLORS.violet} />
          <Text style={styles.title}>E-mail odeslán</Text>
          <Text style={styles.subtitle}>
            Pokud je e-mail registrován, obdržíte odkaz pro obnovení hesla.
          </Text>
          <TouchableOpacity style={styles.button} onPress={onBack}>
            <Text style={styles.buttonText}>Zpět na přihlášení</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Obnovení hesla</Text>
        <Text style={styles.subtitle}>Zadejte e-mail a pošleme vám odkaz pro obnovení hesla.</Text>
        <TextInput
          style={styles.input}
          placeholder="váš@email.cz"
          placeholderTextColor={COLORS.sub}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.buttonText}>Odeslat odkaz</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={onBack} style={styles.link}>
          <Text style={styles.linkText}>Zpět na přihlášení</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', padding: 24 },
  card: { backgroundColor: COLORS.white, borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: COLORS.sub, textAlign: 'center', marginBottom: 24 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 14, fontSize: 16, color: COLORS.text, marginBottom: 12 },
  error: { color: '#E53935', fontSize: 14, marginBottom: 12 },
  button: { backgroundColor: COLORS.violet, borderRadius: 10, padding: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  link: { marginTop: 16, alignItems: 'center' },
  linkText: { fontSize: 14, color: COLORS.violet },
});
