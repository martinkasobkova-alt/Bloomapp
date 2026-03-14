import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useAuth, RegisterData } from '../context/AuthContext';
import { useContactEmail } from '../hooks/useContactEmail';
import { useTextSettings } from '../hooks/useTextSettings';
import { TurnstileModal } from '../components/TurnstileModal';
import { API, WEB_URL, TURNSTILE_SITE_KEY } from '../config/api';
import axios from 'axios';

const COLORS = {
  violet: '#8A7CFF',
  text: '#2F3441',
  sub: '#5D6472',
  bg: '#F8F7FC',
  white: '#FFFFFF',
  border: '#E5E3ED',
  error: '#E53935',
};

const PRONOUN_OPTIONS = [
  { value: 'ona/její', label: 'ona/její' },
  { value: 'on/jeho', label: 'on/jeho' },
  { value: 'oni/jejich', label: 'oni/jejich' },
  { value: 'ono/jeho', label: 'ono/jeho' },
  { value: 'jiné', label: 'jiné' },
];

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return 'Heslo musí mít alespoň 8 znaků';
  if (!/[a-z]/.test(pw)) return 'Heslo musí obsahovat malé písmeno';
  if (!/[A-Z]/.test(pw)) return 'Heslo musí obsahovat velké písmeno';
  if (!/[0-9]/.test(pw)) return 'Heslo musí obsahovat číslo';
  if (!/[^a-zA-Z0-9]/.test(pw)) return 'Heslo musí obsahovat speciální znak (!@#$%)';
  return null;
}

interface RegisterScreenProps {
  onSuccess?: () => void;
  onBack?: () => void;
}

export default function RegisterScreen({ onSuccess, onBack }: RegisterScreenProps) {
  const { register } = useAuth();
  const contactEmail = useContactEmail();
  const texts = useTextSettings();
  const [entryPasswordRequired, setEntryPasswordRequired] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTurnstile, setShowTurnstile] = useState(false);
  const turnstileRequired = !!(WEB_URL && TURNSTILE_SITE_KEY);
  const [form, setForm] = useState<RegisterData & { passwordConfirm: string }>({
    email: '',
    password: '',
    passwordConfirm: '',
    username: '',
    secret_code: '',
  });

  useEffect(() => {
    axios
      .get(`${API}/settings/entry-password-status`)
      .then((r) => setEntryPasswordRequired(r.data?.enabled ?? true))
      .catch(() => setEntryPasswordRequired(true));
  }, []);

  const update = (field: keyof typeof form, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
  };

  const doRegister = async (turnstileToken?: string) => {
    setLoading(true);
    try {
      await register({
        ...form,
        pronouns: 'ona/její',
        avatar: 'fem-pink',
        location: '',
        district: '',
        phone: '',
        bio: '',
        turnstile_token: turnstileToken,
      });
      onSuccess?.();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || 'Registrace selhala');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError(null);
    const pwErr = validatePassword(form.password);
    if (pwErr) {
      setError(pwErr);
      return;
    }
    if (form.password !== form.passwordConfirm) {
      setError('Hesla se neshodují');
      return;
    }
    if (form.username.length < 3) {
      setError('Přezdívka musí mít alespoň 3 znaky');
      return;
    }
    if (entryPasswordRequired && !form.secret_code) {
      setError('Komunitní heslo je povinné');
      return;
    }
    if (turnstileRequired) {
      setShowTurnstile(true);
      return;
    }
    await doRegister();
  };

  const handleTurnstileToken = (token: string) => {
    setShowTurnstile(false);
    doRegister(token);
  };


  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backText}>← Zpět</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.title}>Registrace</Text>

        {entryPasswordRequired && (
          <View style={styles.field}>
            <Text style={styles.label}>Komunitní heslo *</Text>
            <TextInput
              style={styles.input}
              placeholder="Zadejte komunitní heslo..."
              placeholderTextColor={COLORS.sub}
              value={form.secret_code}
              onChangeText={(v) => update('secret_code', v)}
              secureTextEntry
            />
            <Text style={styles.hint}>
              {texts.help_text || 'Bloom je soukromý prostor. Heslo ti může předat někdo z komunity.'}
              {' '}
              Napiš na {contactEmail}
            </Text>
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Přezdívka *</Text>
          <TextInput
            style={styles.input}
            placeholder="Min. 3 znaky"
            placeholderTextColor={COLORS.sub}
            value={form.username}
            onChangeText={(v) => update('username', v)}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>E-mail *</Text>
          <TextInput
            style={styles.input}
            placeholder="váš@email.cz"
            placeholderTextColor={COLORS.sub}
            value={form.email}
            onChangeText={(v) => update('email', v)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Telefon (volitelné)</Text>
          <TextInput
            style={styles.input}
            placeholder="+420 xxx xxx xxx"
            placeholderTextColor={COLORS.sub}
            value={form.phone}
            onChangeText={(v) => update('phone', v)}
            keyboardType="phone-pad"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Heslo *</Text>
          <TextInput
            style={styles.input}
            placeholder="Min. 8 znaků, velké, číslo, speciální"
            placeholderTextColor={COLORS.sub}
            value={form.password}
            onChangeText={(v) => update('password', v)}
            secureTextEntry
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Potvrdit heslo *</Text>
          <TextInput
            style={styles.input}
            placeholder="Zopakujte heslo"
            placeholderTextColor={COLORS.sub}
            value={form.passwordConfirm}
            onChangeText={(v) => update('passwordConfirm', v)}
            secureTextEntry
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TurnstileModal
          visible={showTurnstile}
          onToken={handleTurnstileToken}
          onCancel={() => setShowTurnstile(false)}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.buttonText}>Zaregistrovat se</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 20, paddingBottom: 40 },
  backBtn: { marginBottom: 16 },
  backText: { fontSize: 16, color: COLORS.violet },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text, marginBottom: 20 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: COLORS.text, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: COLORS.text,
  },
  inputText: { color: COLORS.text },
  placeholder: { color: COLORS.sub },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  hint: { fontSize: 12, color: COLORS.sub, marginTop: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.violet, borderColor: COLORS.violet },
  chipText: { fontSize: 14, color: COLORS.text },
  chipTextActive: { color: COLORS.white },
  toggle: { flexDirection: 'row', marginBottom: 8, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  toggleBtn: { flex: 1, padding: 12, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: COLORS.violet },
  toggleText: { fontSize: 14, color: COLORS.sub },
  toggleTextActive: { color: COLORS.white },
  picker: { marginTop: 4 },
  error: { color: COLORS.error, fontSize: 14, marginBottom: 12 },
  button: {
    backgroundColor: COLORS.violet,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
});
