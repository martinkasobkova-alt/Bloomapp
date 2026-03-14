import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { OutlineIcon } from '../components/OutlineIcon';
import { useAuth } from '../context/AuthContext';
import { useLocations } from '../hooks/useLocations';
import { AVATAR_OPTIONS } from '../constants/avatars';
import { AvatarImage } from '../components/AvatarImage';
import { API, API_BASE } from '../config/api';
import axios from 'axios';

import { BLOOM_COLORS } from '../theme/colors';

const COLORS = {
  ...BLOOM_COLORS,
  error: '#E53935',
};

const PRONOUN_OPTIONS = [
  { value: 'ona/její', label: 'ona/její' },
  { value: 'on/jeho', label: 'on/jeho' },
  { value: 'oni/jejich', label: 'oni/jejich' },
  { value: 'ono/jeho', label: 'ono/jeho' },
  { value: 'jiné', label: 'jiné' },
];

interface EditProfileScreenProps {
  onBack: () => void;
}

export default function EditProfileScreen({ onBack }: EditProfileScreenProps) {
  const navigation = useNavigation<any>();
  const { user, updateProfile, refreshUser, deleteAccount } = useAuth();
  const [profileCountry, setProfileCountry] = useState<'CZ' | 'WORLD'>(
    user?.location === 'Svět' ? 'WORLD' : 'CZ'
  );
  const { allLocations } = useLocations({ includeNone: false });
  const locationsFiltered = [
    { id: 'none', name: 'Nechci uvádět', country: '' },
    ...allLocations.filter((l) => l.country === profileCountry),
  ];
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [pronouns, setPronouns] = useState(user?.pronouns || 'ona/její');
  const [phone, setPhone] = useState(user?.phone || '');
  const [location, setLocation] = useState(user?.location || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState(user?.avatar || 'fem-pink');
  const [customAvatar, setCustomAvatar] = useState<string | null>(user?.custom_avatar || null);
  useEffect(() => {
    if (user?.location && allLocations.length > 0) {
      const found = allLocations.find((l) => l.name === user.location);
      if (found && found.country !== profileCountry) {
        setProfileCountry((found.country as 'CZ' | 'WORLD') || 'CZ');
      }
    }
  }, [user?.location, allLocations]);
  const [instagram, setInstagram] = useState(user?.instagram || '');
  const [facebook, setFacebook] = useState(user?.facebook || '');
  const [linkedin, setLinkedin] = useState(user?.linkedin || '');
  const [error, setError] = useState<string | null>(null);
  const [socialExpanded, setSocialExpanded] = useState(false);
  const [pronounModalOpen, setPronounModalOpen] = useState(false);
  const [countryModalOpen, setCountryModalOpen] = useState(false);
  const [regionModalOpen, setRegionModalOpen] = useState(false);

  const isValidUrl = (url: string) =>
    !url || url.startsWith('http://') || url.startsWith('https://');

  const handleSave = async () => {
    setError(null);
    if (!username.trim()) {
      setError('Vyplňte přezdívku');
      return;
    }
    if (!isValidUrl(instagram)) {
      setError('Instagram URL musí začínat https://');
      return;
    }
    if (!isValidUrl(facebook)) {
      setError('Facebook URL musí začínat https://');
      return;
    }
    if (!isValidUrl(linkedin)) {
      setError('LinkedIn URL musí začínat https://');
      return;
    }
    setLoading(true);
    try {
      await updateProfile({
        username: username.trim(),
        pronouns,
        phone: phone.trim(),
        location: location === 'Nechci uvádět' ? '' : location,
        bio: bio.trim(),
        avatar,
        instagram: instagram.trim(),
        facebook: facebook.trim(),
        linkedin: linkedin.trim(),
      });
      onBack();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Nepodařilo se uložit profil';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Oprávnění', 'Pro nahrání fotky potřebujeme přístup k galerii.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
      setError('Obrázek je příliš velký (max 5 MB)');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: 'avatar.jpg',
      } as unknown as Blob);
      const res = await axios.post(`${API}/users/me/upload-avatar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = (res.data?.url || '').replace(/^https?:\/\/[^/]+/, API_BASE);
      setCustomAvatar(url);
      setAvatar('custom');
      await refreshUser();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Nepodařilo se nahrát obrázek';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCountryChange = (country: 'CZ' | 'WORLD') => {
    setProfileCountry(country);
    if (country === 'WORLD') {
      setLocation(location === 'Svět' ? location : '');
    } else if (location === 'Svět') {
      setLocation('');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Zrušit profil',
      'Opravdu chcete zrušit svůj profil? Tato akce je nevratná a všechna vaše data budou smazána.',
      [
        { text: 'Zrušit', style: 'cancel' },
        {
          text: 'Ano, zrušit profil',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
            } catch (err: unknown) {
              const msg =
                (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
                'Nepodařilo se zrušit profil';
              setError(msg);
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Zpět</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upravit profil</Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* SECTION 1 — Identity */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Identita</Text>
          <View style={styles.avatarRow}>
            <TouchableOpacity
              style={[styles.avatarOption, styles.avatarOptionLarge, avatar === 'custom' && styles.avatarOptionActive]}
              onPress={handlePickImage}
              disabled={loading}
            >
              {avatar === 'custom' && (customAvatar || user?.custom_avatar) ? (
                <AvatarImage avatar="custom" customImage={customAvatar || user?.custom_avatar || undefined} size={48} />
              ) : (
                <OutlineIcon name="camera" size={28} color={COLORS.violet} />
              )}
              <Text style={styles.uploadAvatarLabel}>Nahrát</Text>
            </TouchableOpacity>
            <View style={styles.avatarGrid}>
              {AVATAR_OPTIONS.map((a) => (
                <TouchableOpacity
                  key={a.value}
                  style={[styles.avatarOption, avatar === a.value && styles.avatarOptionActive]}
                  onPress={() => setAvatar(a.value)}
                >
                  <AvatarImage avatar={a.value} size={36} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Přezdívka *</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Vaše přezdívka"
              placeholderTextColor={COLORS.sub}
              autoCapitalize="none"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Zájmeno</Text>
            <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setPronounModalOpen(true)}>
              <Text style={styles.dropdownValue}>{PRONOUN_OPTIONS.find((p) => p.value === pronouns)?.label || pronouns}</Text>
              <Text style={styles.dropdownChevron}>▼</Text>
            </TouchableOpacity>
            <Modal visible={pronounModalOpen} transparent animationType="fade">
              <Pressable style={styles.dropdownOverlay} onPress={() => setPronounModalOpen(false)}>
                <View style={styles.dropdownModal}>
                  <Text style={styles.dropdownModalTitle}>Zájmeno</Text>
                  <ScrollView style={styles.dropdownList}>
                    {PRONOUN_OPTIONS.map((p) => (
                      <TouchableOpacity
                        key={p.value}
                        style={[styles.dropdownOption, pronouns === p.value && styles.dropdownOptionActive]}
                        onPress={() => { setPronouns(p.value); setPronounModalOpen(false); }}
                      >
                        <Text style={[styles.dropdownOptionText, pronouns === p.value && styles.dropdownOptionTextActive]}>{p.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <TouchableOpacity style={styles.dropdownCloseBtn} onPress={() => setPronounModalOpen(false)}>
                    <Text style={styles.dropdownCloseText}>Zavřít</Text>
                  </TouchableOpacity>
                </View>
              </Pressable>
            </Modal>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Telefon</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+420 xxx xxx xxx"
              placeholderTextColor={COLORS.sub}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* SECTION 2 — Location */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Lokalita</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Země</Text>
            <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setCountryModalOpen(true)}>
              <Text style={styles.dropdownValue}>{profileCountry === 'CZ' ? 'Česko' : 'Svět'}</Text>
              <Text style={styles.dropdownChevron}>▼</Text>
            </TouchableOpacity>
            <Modal visible={countryModalOpen} transparent animationType="fade">
              <Pressable style={styles.dropdownOverlay} onPress={() => setCountryModalOpen(false)}>
                <View style={styles.dropdownModal}>
                  <Text style={styles.dropdownModalTitle}>Země</Text>
                  <TouchableOpacity
                    style={[styles.dropdownOption, profileCountry === 'CZ' && styles.dropdownOptionActive]}
                    onPress={() => { handleCountryChange('CZ'); setCountryModalOpen(false); }}
                  >
                    <Text style={[styles.dropdownOptionText, profileCountry === 'CZ' && styles.dropdownOptionTextActive]}>Česko</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.dropdownOption, profileCountry === 'WORLD' && styles.dropdownOptionActive]}
                    onPress={() => { handleCountryChange('WORLD'); setCountryModalOpen(false); }}
                  >
                    <Text style={[styles.dropdownOptionText, profileCountry === 'WORLD' && styles.dropdownOptionTextActive]}>Svět</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.dropdownCloseBtn} onPress={() => setCountryModalOpen(false)}>
                    <Text style={styles.dropdownCloseText}>Zavřít</Text>
                  </TouchableOpacity>
                </View>
              </Pressable>
            </Modal>
          </View>
          {profileCountry === 'CZ' && (
            <View style={styles.field}>
              <Text style={styles.label}>Region</Text>
              <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setRegionModalOpen(true)}>
                <Text style={styles.dropdownValue}>{location || 'Nechci uvádět'}</Text>
                <Text style={styles.dropdownChevron}>▼</Text>
              </TouchableOpacity>
              <Modal visible={regionModalOpen} transparent animationType="fade">
                <Pressable style={styles.dropdownOverlay} onPress={() => setRegionModalOpen(false)}>
                  <View style={styles.dropdownModal}>
                    <Text style={styles.dropdownModalTitle}>Region</Text>
                    <ScrollView style={styles.dropdownList}>
                      {locationsFiltered.map((loc) => {
                        const locName = loc.id === 'none' ? 'Nechci uvádět' : loc.name;
                        const isSelected = (location || 'Nechci uvádět') === locName;
                        return (
                          <TouchableOpacity
                            key={loc.id}
                            style={[styles.dropdownOption, isSelected && styles.dropdownOptionActive]}
                            onPress={() => {
                              setLocation(loc.id === 'none' ? '' : loc.name);
                              setRegionModalOpen(false);
                            }}
                          >
                            <Text style={[styles.dropdownOptionText, isSelected && styles.dropdownOptionTextActive]}>{locName}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                    <TouchableOpacity style={styles.dropdownCloseBtn} onPress={() => setRegionModalOpen(false)}>
                      <Text style={styles.dropdownCloseText}>Zavřít</Text>
                    </TouchableOpacity>
                  </View>
                </Pressable>
              </Modal>
            </View>
          )}
        </View>

        {/* SECTION 3 — About */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>O mně</Text>
          <View style={styles.field}>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder="Krátce o sobě..."
              placeholderTextColor={COLORS.sub}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* SECTION 4 — Social links (collapsible) */}
        <View style={styles.sectionBlock}>
          <TouchableOpacity
            style={styles.collapsibleHeader}
            onPress={() => setSocialExpanded(!socialExpanded)}
            activeOpacity={0.7}
          >
            <Text style={styles.sectionTitle}>Sociální sítě</Text>
            <Text style={styles.collapsibleChevron}>{socialExpanded ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {socialExpanded && (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>Instagram</Text>
                <TextInput
                  style={styles.input}
                  value={instagram}
                  onChangeText={setInstagram}
                  placeholder="https://instagram.com/..."
                  placeholderTextColor={COLORS.sub}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>Facebook</Text>
                <TextInput
                  style={styles.input}
                  value={facebook}
                  onChangeText={setFacebook}
                  placeholder="https://facebook.com/..."
                  placeholderTextColor={COLORS.sub}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>LinkedIn</Text>
                <TextInput
                  style={styles.input}
                  value={linkedin}
                  onChangeText={setLinkedin}
                  placeholder="https://linkedin.com/in/..."
                  placeholderTextColor={COLORS.sub}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>
            </>
          )}
        </View>

        {/* SECTION 5 — Privacy & Security */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Soukromí a bezpečnost</Text>
          <TouchableOpacity style={styles.privacyLink} onPress={() => navigation.navigate('Privacy')}>
            <Text style={styles.privacyLinkText}>Nastavení soukromí</Text>
            <Text style={styles.privacyLinkChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* SECTION 6 — Danger zone */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Nebezpečná zóna</Text>
          <TouchableOpacity
            style={styles.deleteAccountBtn}
            onPress={handleDeleteAccount}
            disabled={loading}
          >
            <Text style={styles.deleteAccountText}>Zrušit profil</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.scrollBottomSpacer} />
      </ScrollView>

      {/* Sticky Save Button */}
      <View style={styles.stickyFooter}>
        <TouchableOpacity
          style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.saveBtnText}>Uložit změny</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
  },
  backText: {
    fontSize: 16,
    color: COLORS.violet,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  scrollBottomSpacer: {
    height: 8,
  },
  errorBox: {
    backgroundColor: '#FFEBEE',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
  },
  sectionBlock: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.sub,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  field: {
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 5,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 10,
    fontSize: 15,
    color: COLORS.text,
  },
  textArea: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownValue: { fontSize: 15, color: COLORS.text },
  dropdownChevron: { fontSize: 10, color: COLORS.sub },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  dropdownModal: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    maxHeight: 360,
  },
  dropdownModalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    padding: 14,
    paddingBottom: 4,
  },
  dropdownList: { maxHeight: 240 },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dropdownOptionActive: { backgroundColor: `${COLORS.violet}12` },
  dropdownOptionText: { fontSize: 15, color: COLORS.text },
  dropdownOptionTextActive: { color: COLORS.violet, fontWeight: '600' },
  dropdownCloseBtn: {
    padding: 14,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  dropdownCloseText: { fontSize: 15, color: COLORS.violet, fontWeight: '600' },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  collapsibleChevron: { fontSize: 12, color: COLORS.sub },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  avatarGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  avatarOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  avatarOptionActive: {
    borderColor: COLORS.violet,
    borderWidth: 3,
  },
  avatarOptionLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadAvatarLabel: {
    fontSize: 9,
    color: COLORS.sub,
    marginTop: 2,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 6,
  },
  chipActive: {
    backgroundColor: COLORS.violet,
    borderColor: COLORS.violet,
  },
  chipText: {
    fontSize: 14,
    color: COLORS.text,
  },
  chipTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 24,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  saveBtn: {
    backgroundColor: COLORS.violet,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
  deleteAccountBtn: {
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: 'transparent',
  },
  deleteAccountText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: '600',
  },
  privacyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  privacyLinkText: {
    fontSize: 15,
    color: COLORS.violet,
    fontWeight: '600',
  },
  privacyLinkChevron: {
    fontSize: 18,
    color: COLORS.sub,
  },
});
