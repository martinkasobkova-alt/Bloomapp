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

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return 'Heslo musí mít alespoň 8 znaků';
  if (!/[A-Z]/.test(pw)) return 'Heslo musí obsahovat velké písmeno';
  if (!/[0-9]/.test(pw)) return 'Heslo musí obsahovat číslo';
  if (!/[^a-zA-Z0-9]/.test(pw)) return 'Heslo musí obsahovat speciální znak';
  return null;
}

interface ResetPasswordScreenProps {
  token: string;
  onSuccess: () => void;
  onBack: () => void;
}

export default function ResetPasswordScreen({ token, onSuccess, onBack }: ResetPasswordScreenProps) {
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    const pwErr = validatePassword(password);
    if (pwErr) {
      setError(pwErr);
      return;
    }
    if (password !== passwordConfirm) {
      setError('Hesla se neshodují');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, { token, new_password: password });
      setSuccess(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || 'Nepodařilo se obnovit heslo');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <OutlineIcon name="check-circle" size={56} color="#10B981" />
          <Text style={styles.title}>Heslo obnoveno!</Text>
          <Text style={styles.subtitle}>Nyní se můžete přihlásit.</Text>
          <TouchableOpacity style={styles.button} onPress={onSuccess}>
            <Text style={styles.buttonText}>Přejít na přihlášení</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Nové heslo</Text>
        <TextInput
          style={styles.input}
          placeholder="Nové heslo"
          placeholderTextColor={COLORS.sub}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="Potvrdit heslo"
          placeholderTextColor={COLORS.sub}
          value={passwordConfirm}
          onChangeText={setPasswordConfirm}
          secureTextEntry
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.buttonText}>Nastavit heslo</Text>}
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
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  subtitle: { fontSize: 14, color: COLORS.sub, marginBottom: 24 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 14, fontSize: 16, color: COLORS.text, marginBottom: 12 },
  error: { color: '#E53935', fontSize: 14, marginBottom: 12 },
  button: { backgroundColor: COLORS.violet, borderRadius: 10, padding: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  link: { marginTop: 16, alignItems: 'center' },
  linkText: { fontSize: 14, color: COLORS.violet },
});
