import React, { useState } from 'react';
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
  Image,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API } from '../config/api';

import { BLOOM_COLORS } from '../theme/colors';
import { LotusLogo } from '../components/LotusLogo';

const COLORS = {
  ...BLOOM_COLORS,
  error: '#E53935',
};

interface AuthScreenProps {
  onForgotPassword: () => void;
  onRegister: () => void;
}

export default function AuthScreen({ onForgotPassword, onRegister }: AuthScreenProps) {
  const { login, loginWithToken } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Vyplňte e-mail a heslo');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg || 'Nesprávný e-mail nebo heslo');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'bloom',
        path: 'auth/google-callback',
      });
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUri)}`;
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
      if (result.type === 'success' && result.url) {
        const match = result.url.match(/session_id=([^&]+)/);
        if (match) {
          const sessionId = match[1];
          const mode = 'login';
          const r = await axios.post(`${API}/auth/google/session`, { session_id: sessionId, mode });
          loginWithToken(r.data.token, r.data.user);
        } else {
          setError('Přihlášení přes Google se nezdařilo');
        }
      }
    } catch (err) {
      setError('Přihlášení přes Google se nezdařilo');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.prideBar}>
          <View style={[styles.prideStrip, { backgroundColor: '#5BCEFA' }]} />
          <View style={[styles.prideStrip, { backgroundColor: '#F5A9B8' }]} />
          <View style={[styles.prideStrip, { backgroundColor: '#FFFFFF' }]} />
          <View style={[styles.prideStrip, { backgroundColor: '#F5A9B8' }]} />
          <View style={[styles.prideStrip, { backgroundColor: '#5BCEFA' }]} />
        </View>

        <View style={styles.card}>
          <View style={styles.logoWrap}>
            <LotusLogo size={80} />
          </View>
          <Text style={styles.title}>Bloom</Text>
          <Text style={styles.subtitle}>Bezpečný prostor pro trans komunitu v ČR</Text>

          <TextInput
            style={styles.input}
            placeholder="E-mail"
            placeholderTextColor={COLORS.sub}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Heslo"
            placeholderTextColor={COLORS.sub}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.showPassword}>
            <Text style={styles.showPasswordText}>{showPassword ? 'Skrýt heslo' : 'Zobrazit heslo'}</Text>
          </TouchableOpacity>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.buttonText}>Přihlásit se</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={onForgotPassword} style={styles.link}>
            <Text style={styles.linkText}>Zapomněli jste heslo?</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>nebo</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.googleBtn, googleLoading && styles.buttonDisabled]}
            onPress={handleGoogleAuth}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color={COLORS.text} />
            ) : (
              <>
                <Image source={require('../../assets/google-icon.png')} style={styles.googleIcon} resizeMode="contain" />
                <Text style={styles.googleBtnText}>Přihlásit se přes Google</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={onRegister} style={styles.registerLink}>
            <Text style={styles.registerText}>Nemáte účet? Zaregistrujte se</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: 48 },
  prideBar: { flexDirection: 'row', height: 4, marginBottom: 16, borderRadius: 2, overflow: 'hidden' },
  prideStrip: { flex: 1 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  logoWrap: { alignItems: 'center', marginBottom: 12 },
  googleIcon: { width: 22, height: 22, marginRight: 10 },
  title: { fontSize: 28, fontFamily: 'Nunito_800ExtraBold', color: COLORS.violet, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, fontFamily: 'DMSans_400Regular', color: COLORS.sub, textAlign: 'center', marginBottom: 24 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 14, fontSize: 16, fontFamily: 'DMSans_400Regular', color: COLORS.text, marginBottom: 12 },
  showPassword: { alignSelf: 'flex-end', marginBottom: 16 },
  showPasswordText: { fontSize: 13, fontFamily: 'DMSans_500Medium', color: COLORS.violet },
  error: { fontFamily: 'DMSans_400Regular', color: COLORS.error, fontSize: 14, marginBottom: 12 },
  button: { backgroundColor: COLORS.violet, borderRadius: 10, padding: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { fontFamily: 'DMSans_600SemiBold', color: COLORS.white, fontSize: 16 },
  link: { marginTop: 12, alignItems: 'center' },
  linkText: { fontSize: 14, fontFamily: 'DMSans_500Medium', color: COLORS.violet },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { marginHorizontal: 12, fontSize: 12, fontFamily: 'DMSans_400Regular', color: COLORS.sub },
  googleBtn: { flexDirection: 'row', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 16, alignItems: 'center', justifyContent: 'center' },
  googleBtnText: { fontSize: 16, fontFamily: 'DMSans_500Medium', color: COLORS.text },
  registerLink: { marginTop: 20, alignItems: 'center' },
  registerText: { fontSize: 14, fontFamily: 'DMSans_400Regular', color: COLORS.sub },
});
