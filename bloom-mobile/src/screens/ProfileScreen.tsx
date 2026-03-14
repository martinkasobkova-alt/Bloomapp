import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { AvatarImage } from '../components/AvatarImage';
import { fixAvatarUrl } from '../config/api';
import { ProfileGallery } from '../components/profile/ProfileGallery';
import { ProfileJourney } from '../components/profile/ProfileJourney';
import { API } from '../config/api';
import { BLOOM_COLORS } from '../theme/colors';

const COLORS = BLOOM_COLORS;

type TabValue = 'profile' | 'gallery' | 'journey';

interface Photo {
  id: string;
  url?: string;
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<TabValue>('profile');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [verifyForm, setVerifyForm] = useState({
    requested_role: 'specialist' as 'specialist' | 'lawyer',
    specialization_text: '',
    profile_link: '',
    message: '',
  });
  const [verifySubmitting, setVerifySubmitting] = useState(false);
  const [verifySubmitted, setVerifySubmitted] = useState(false);
  const [resendingVerif, setResendingVerif] = useState(false);
  const [verifSent, setVerifSent] = useState(false);

  useEffect(() => {
    checkExistingVerifRequest();
  }, []);

  useEffect(() => {
    if (activeTab === 'gallery' && user?.id) {
      axios
        .get(`${API}/users/${user.id}/photos`)
        .then((r) => setPhotos(r.data || []))
        .catch(() => setPhotos([]));
    }
  }, [activeTab, user?.id]);

  const checkExistingVerifRequest = async () => {
    try {
      const r = await axios.get(`${API}/verification-requests/my`);
      if (r.data?.status === 'pending') setVerifySubmitted(true);
    } catch {
      /* no pending request */
    }
  };

  const handleResendVerification = async () => {
    setResendingVerif(true);
    try {
      await axios.post(`${API}/auth/resend-verification`);
      setVerifSent(true);
    } catch {
      Alert.alert('Chyba', 'Nepodařilo se odeslat e-mail');
    } finally {
      setResendingVerif(false);
    }
  };

  const handleVerifySubmit = async () => {
    if (!verifyForm.specialization_text.trim()) {
      Alert.alert('Chyba', 'Vyplňte prosím specializaci');
      return;
    }
    setVerifySubmitting(true);
    try {
      await axios.post(`${API}/verification-requests`, verifyForm);
      setVerifySubmitted(true);
      setVerifyDialogOpen(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Chyba při odesílání žádosti';
      Alert.alert('Chyba', msg);
    } finally {
      setVerifySubmitting(false);
    }
  };

  const showVerificationCard = !['specialist', 'lawyer', 'admin', 'superadmin'].includes(user?.role || '');

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'profile' && styles.tabActive]}
          onPress={() => setActiveTab('profile')}
        >
          <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>
            Profil
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'gallery' && styles.tabActive]}
          onPress={() => setActiveTab('gallery')}
        >
          <Text style={[styles.tabText, activeTab === 'gallery' && styles.tabTextActive]}>
            Galerie
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'journey' && styles.tabActive]}
          onPress={() => setActiveTab('journey')}
        >
          <Text style={[styles.tabText, activeTab === 'journey' && styles.tabTextActive]}>
            Moje cesta
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'profile' && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <View style={styles.avatarWrap}>
              <AvatarImage
                avatar={user?.avatar || 'fem-pink'}
                customImage={fixAvatarUrl(user?.custom_avatar)}
                size={72}
              />
            </View>
            <Text style={styles.username}>{user?.username ?? 'Uživatel'}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            {user?.pronouns ? (
              <Text style={styles.pronouns}>{user.pronouns}</Text>
            ) : null}
            {user?.bio ? (
              <Text style={styles.bio} numberOfLines={3}>
                {user.bio}
              </Text>
            ) : null}
          </View>

          <View
            style={[
              styles.statusCard,
              user?.email_verified ? styles.statusCardVerified : styles.statusCardUnverified,
            ]}
          >
            <Text style={styles.statusIcon}>{user?.email_verified ? '✓' : '!'}</Text>
            <View style={styles.statusTextWrap}>
              <Text style={styles.statusTitle}>
                E-mail: {user?.email_verified ? 'Ověřený' : 'Neověřený'}
              </Text>
              <Text style={styles.statusEmail}>{user?.email}</Text>
            </View>
            {!user?.email_verified && (
              <TouchableOpacity
                style={[styles.resendBtn, (resendingVerif || verifSent) && styles.resendBtnDisabled]}
                onPress={handleResendVerification}
                disabled={resendingVerif || verifSent}
              >
                {resendingVerif ? (
                  <ActivityIndicator color="#92400E" size="small" />
                ) : (
                  <Text style={styles.resendBtnText}>
                    {verifSent ? 'Odesláno!' : 'Odeslat znovu'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {showVerificationCard && (
            <View style={styles.verifyCard}>
              <Text style={styles.verifyIcon}>✓</Text>
              <View style={styles.verifyTextWrap}>
                <Text style={styles.verifyTitle}>Ověření odborníka nebo právníka</Text>
                <Text style={styles.verifyDesc}>Pracujete v oboru? Získejte ověřený štítek.</Text>
              </View>
              <TouchableOpacity
                style={[styles.verifyBtn, verifySubmitted && styles.verifyBtnDisabled]}
                onPress={() => setVerifyDialogOpen(true)}
                disabled={verifySubmitted}
              >
                <Text style={styles.verifyBtnText}>
                  {verifySubmitted ? 'Žádost odeslána' : 'Požádat o ověření'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Text style={styles.editBtnText}>Upravit profil</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>Odhlásit se</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.aboutLink}
            onPress={() => navigation.navigate('About')}
          >
            <Text style={styles.aboutLinkText}>O projektu</Text>
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {activeTab === 'gallery' && <ProfileGallery photos={photos} setPhotos={setPhotos} />}
      {activeTab === 'journey' && <ProfileJourney />}

      <Modal
        visible={verifyDialogOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setVerifyDialogOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Žádost o ověření odborníka / právníka</Text>
            <View style={styles.modalForm}>
              <Text style={styles.label}>Požadovaná role *</Text>
              <View style={styles.roleRow}>
                <TouchableOpacity
                  style={[
                    styles.roleBtn,
                    verifyForm.requested_role === 'specialist' && styles.roleBtnActive,
                  ]}
                  onPress={() => setVerifyForm((f) => ({ ...f, requested_role: 'specialist' }))}
                >
                  <Text
                    style={[
                      styles.roleBtnText,
                      verifyForm.requested_role === 'specialist' && styles.roleBtnTextActive,
                    ]}
                  >
                    Odborník
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.roleBtn,
                    verifyForm.requested_role === 'lawyer' && styles.roleBtnActive,
                  ]}
                  onPress={() => setVerifyForm((f) => ({ ...f, requested_role: 'lawyer' }))}
                >
                  <Text
                    style={[
                      styles.roleBtnText,
                      verifyForm.requested_role === 'lawyer' && styles.roleBtnTextActive,
                    ]}
                  >
                    Právník
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.label}>Specializace *</Text>
              <TextInput
                style={styles.input}
                value={verifyForm.specialization_text}
                onChangeText={(t) => setVerifyForm((f) => ({ ...f, specialization_text: t }))}
                placeholder="např. plastická chirurgie, rodinné právo..."
                placeholderTextColor={COLORS.sub}
              />
              <Text style={styles.label}>Odkaz na profesní profil</Text>
              <TextInput
                style={styles.input}
                value={verifyForm.profile_link}
                onChangeText={(t) => setVerifyForm((f) => ({ ...f, profile_link: t }))}
                placeholder="https://..."
                placeholderTextColor={COLORS.sub}
                autoCapitalize="none"
              />
              <Text style={styles.label}>Krátká zpráva pro admina</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={verifyForm.message}
                onChangeText={(t) => setVerifyForm((f) => ({ ...f, message: t }))}
                placeholder="Nepovinný doplňující text..."
                placeholderTextColor={COLORS.sub}
                multiline
                numberOfLines={3}
              />
              <TouchableOpacity
                style={[styles.submitBtn, verifySubmitting && styles.submitBtnDisabled]}
                onPress={handleVerifySubmit}
                disabled={verifySubmitting}
              >
                {verifySubmitting ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Odeslat žádost o ověření</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setVerifyDialogOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Zrušit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.violet,
  },
  tabText: { fontSize: 14, color: COLORS.sub, fontWeight: '500' },
  tabTextActive: { color: COLORS.violet, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarWrap: { marginBottom: 12 },
  username: { fontSize: 20, fontWeight: '600', color: COLORS.text },
  email: { fontSize: 14, color: COLORS.sub, marginTop: 4 },
  pronouns: { fontSize: 12, color: COLORS.violet, marginTop: 4 },
  bio: { fontSize: 14, color: COLORS.sub, marginTop: 8, textAlign: 'center' },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  statusCardVerified: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  statusCardUnverified: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
  },
  statusIcon: { fontSize: 18, marginRight: 12, fontWeight: '700' },
  statusTextWrap: { flex: 1 },
  statusTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  statusEmail: { fontSize: 12, color: COLORS.sub, marginTop: 2 },
  resendBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  resendBtnDisabled: { opacity: 0.6 },
  resendBtnText: { fontSize: 12, color: '#92400E', fontWeight: '600' },
  verifyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.violet}10`,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: `${COLORS.violet}30`,
  },
  verifyIcon: { fontSize: 18, marginRight: 12, color: COLORS.violet },
  verifyTextWrap: { flex: 1 },
  verifyTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  verifyDesc: { fontSize: 12, color: COLORS.sub, marginTop: 2 },
  verifyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.violet,
  },
  verifyBtnDisabled: { opacity: 0.6 },
  verifyBtnText: { fontSize: 13, color: COLORS.white, fontWeight: '600' },
  editBtn: {
    backgroundColor: COLORS.violet,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  editBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.white },
  logoutBtn: { padding: 16, alignItems: 'center' },
  logoutText: { fontSize: 14, color: COLORS.sub },
  aboutLink: { padding: 16, alignItems: 'center' },
  aboutLinkText: { fontSize: 14, color: COLORS.violet },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalForm: { gap: 12 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  roleRow: { flexDirection: 'row', gap: 12 },
  roleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  roleBtnActive: {
    borderColor: COLORS.violet,
    backgroundColor: `${COLORS.violet}15`,
  },
  roleBtnText: { fontSize: 14, color: COLORS.sub },
  roleBtnTextActive: { color: COLORS.violet, fontWeight: '600' },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: COLORS.text,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  submitBtn: {
    backgroundColor: COLORS.violet,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.white },
  cancelBtn: { padding: 16, alignItems: 'center', marginTop: 8 },
  cancelBtnText: { fontSize: 16, color: COLORS.sub },
});
