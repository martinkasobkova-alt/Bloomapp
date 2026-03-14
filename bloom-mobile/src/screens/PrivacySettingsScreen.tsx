import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import { usePrivacySettings, ReauthRequired } from '../hooks/usePrivacySettings';
import { useBiometricLock } from '../context/BiometricLockContext';
import { useAuth } from '../context/AuthContext';
import { API } from '../config/api';
import { BLOOM_COLORS } from '../theme/colors';

const COLORS = BLOOM_COLORS;

const REAUTH_OPTIONS: { value: ReauthRequired; label: string }[] = [
  { value: 'never', label: 'Nikdy' },
  { value: 'on_reopen', label: 'Při každém otevření aplikace' },
  { value: '5', label: 'Po 5 minutách nečinnosti' },
  { value: '15', label: 'Po 15 minutách nečinnosti' },
];

const NOTIF_OPTIONS = [
  { key: 'messages' as const, label: 'Přímé zprávy', desc: 'Nová zpráva od jiného uživatele' },
  { key: 'services' as const, label: 'Nabídky a poptávky', desc: 'Nový příspěvek v sekci Podpora' },
  { key: 'news' as const, label: 'Aktuality', desc: 'Nová zpráva od administrátora' },
];

export default function PrivacySettingsScreen({ onBack }: { onBack: () => void }) {
  const { user, refreshUser } = useAuth();
  const { settings, setReauthRequired, setUseBiometric } = usePrivacySettings();
  const { isBiometricAvailable } = useBiometricLock();
  const defaultPrefs = { messages: true, services: true, news: true };
  const [notifPrefs, setNotifPrefs] = useState({ ...defaultPrefs, ...(user?.notification_prefs || {}) });
  const [savingNotif, setSavingNotif] = useState(false);

  useEffect(() => {
    const prefs = (user as { notification_prefs?: Record<string, boolean> })?.notification_prefs;
    if (prefs) {
      setNotifPrefs({ ...defaultPrefs, ...prefs });
    }
  }, [user]);

  const handleSaveNotifPrefs = async () => {
    setSavingNotif(true);
    try {
      await axios.put(`${API}/auth/notification-prefs`, notifPrefs);
      await refreshUser();
    } catch {
      /* ignore */
    } finally {
      setSavingNotif(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>← Zpět</Text>
      </TouchableOpacity>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Vyžadovat znovu přihlášení</Text>
        <Text style={styles.sectionDesc}>
          Vyberte, kdy má aplikace vyžadovat ověření identity při návratu.
        </Text>
        {REAUTH_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.option, settings.reauthRequired === opt.value && styles.optionActive]}
            onPress={() => setReauthRequired(opt.value)}
          >
            <Text style={[styles.optionText, settings.reauthRequired === opt.value && styles.optionTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Face ID / biometrické odemknutí</Text>
        <Text style={styles.sectionDesc}>
          {isBiometricAvailable
            ? 'Použít biometrii při odemknutí místo znovu přihlášení.'
            : 'Biometrie není na tomto zařízení dostupná.'}
        </Text>
        {isBiometricAvailable && (
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Použít Face ID / biometrici</Text>
            <Switch
              value={settings.useBiometric}
              onValueChange={setUseBiometric}
              trackColor={{ false: COLORS.border, true: COLORS.violet }}
              thumbColor={COLORS.white}
            />
          </View>
        )}

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Push oznámení</Text>
        <Text style={styles.sectionDesc}>
          Vyberte, pro které události chcete dostávat push oznámení.
        </Text>
        {NOTIF_OPTIONS.map(({ key, label, desc }) => (
          <View key={key} style={styles.switchRow}>
            <View style={styles.notifLabelWrap}>
              <Text style={styles.switchLabel}>{label}</Text>
              <Text style={styles.notifDesc}>{desc}</Text>
            </View>
            <Switch
              value={notifPrefs[key] !== false}
              onValueChange={(val) => setNotifPrefs((p) => ({ ...p, [key]: val }))}
              trackColor={{ false: COLORS.border, true: COLORS.violet }}
              thumbColor={COLORS.white}
            />
          </View>
        ))}
        <TouchableOpacity
          style={[styles.saveNotifBtn, savingNotif && styles.saveNotifBtnDisabled]}
          onPress={handleSaveNotifPrefs}
          disabled={savingNotif}
        >
          {savingNotif ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.saveNotifBtnText}>Uložit nastavení oznámení</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  backBtn: { padding: 16 },
  backText: { fontSize: 16, color: COLORS.violet },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  sectionDesc: { fontSize: 14, color: COLORS.sub, marginBottom: 16 },
  option: {
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  optionActive: {
    borderColor: COLORS.violet,
    backgroundColor: `${COLORS.violet}15`,
  },
  optionText: { fontSize: 15, color: COLORS.text },
  optionTextActive: { color: COLORS.violet, fontWeight: '600' },
  divider: { height: 24 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  switchLabel: { fontSize: 15, color: COLORS.text },
  notifLabelWrap: { flex: 1, marginRight: 12 },
  notifDesc: { fontSize: 12, color: COLORS.sub, marginTop: 2 },
  saveNotifBtn: {
    backgroundColor: COLORS.violet,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  saveNotifBtnDisabled: { opacity: 0.7 },
  saveNotifBtnText: { fontSize: 15, color: COLORS.white, fontWeight: '600' },
});
