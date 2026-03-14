import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { API } from '../../config/api';
import { BLOOM_COLORS } from '../../theme/colors';

const COLORS = BLOOM_COLORS;

interface Photo {
  id: string;
  url?: string;
}

interface ProfileGalleryProps {
  photos: Photo[];
  setPhotos: (photos: Photo[] | ((prev: Photo[]) => Photo[])) => void;
}

export function ProfileGallery({ photos, setPhotos }: ProfileGalleryProps) {
  const { user } = useAuth();
  const [galleryPrivacy, setGalleryPrivacy] = useState<'public' | 'protected'>('public');
  const [galleryPassword, setGalleryPassword] = useState('');
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  const handleGalleryUpload = async () => {
    if (!user?.email_verified) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Oprávnění', 'Pro nahrání fotky potřebujeme přístup k galerii.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
      Alert.alert('Chyba', 'Soubor je příliš velký (max 5 MB)');
      return;
    }
    setPhotoUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: 'photo.jpg',
      } as unknown as Blob);
      await axios.post(`${API}/users/me/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const res = await axios.get(`${API}/users/${user.id}/photos`);
      setPhotos(res.data);
    } catch {
      Alert.alert('Chyba', 'Nepodařilo se nahrát fotografii');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleDeletePhoto = (photoId: string) => {
    Alert.alert('Smazat fotografii', 'Opravdu chcete smazat tuto fotografii?', [
      { text: 'Zrušit', style: 'cancel' },
      {
        text: 'Smazat',
        style: 'destructive',
        onPress: async () => {
          try {
            await axios.delete(`${API}/users/me/photos/${photoId}`);
            setPhotos((ps) => ps.filter((p) => p.id !== photoId));
          } catch {
            Alert.alert('Chyba', 'Nepodařilo se smazat fotografii');
          }
        },
      },
    ]);
  };

  const handleSaveGallerySettings = async () => {
    if (galleryPrivacy === 'protected' && (!galleryPassword || galleryPassword.length < 4)) {
      Alert.alert('Chyba', 'Heslo galerie musí mít alespoň 4 znaky');
      return;
    }
    setGalleryLoading(true);
    try {
      const payload: { privacy: string; password?: string } = { privacy: galleryPrivacy };
      if (galleryPrivacy === 'protected') payload.password = galleryPassword;
      await axios.put(`${API}/users/me/gallery-settings`, payload);
      setGalleryPassword('');
    } catch {
      Alert.alert('Chyba', 'Nepodařilo se uložit nastavení');
    } finally {
      setGalleryLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Soukromí galerie</Text>
        <View style={styles.privacyRow}>
          <TouchableOpacity
            style={[styles.privacyBtn, galleryPrivacy === 'public' && styles.privacyBtnActive]}
            onPress={() => setGalleryPrivacy('public')}
          >
            <Text style={[styles.privacyBtnText, galleryPrivacy === 'public' && styles.privacyBtnTextActive]}>
              Veřejná
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.privacyBtn, galleryPrivacy === 'protected' && styles.privacyBtnActive]}
            onPress={() => setGalleryPrivacy('protected')}
          >
            <Text style={[styles.privacyBtnText, galleryPrivacy === 'protected' && styles.privacyBtnTextActive]}>
              Heslem chráněná
            </Text>
          </TouchableOpacity>
        </View>
        {galleryPrivacy === 'protected' && (
          <View style={styles.passwordRow}>
            <Text style={styles.label}>Heslo galerie</Text>
            <TextInput
              style={styles.input}
              value={galleryPassword}
              onChangeText={setGalleryPassword}
              placeholder="Nastavte heslo pro galerii"
              placeholderTextColor={COLORS.sub}
              secureTextEntry
            />
            <Text style={styles.hint}>Návštěvníci budou muset zadat heslo pro zobrazení galerie.</Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.saveBtn, galleryLoading && styles.saveBtnDisabled]}
          onPress={handleSaveGallerySettings}
          disabled={galleryLoading}
        >
          {galleryLoading ? (
            <ActivityIndicator color={COLORS.white} size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Uložit nastavení</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Fotografie v galerii ({photos.length})</Text>
        {!user?.email_verified && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              Pro nahrávání fotografií musíte nejprve ověřit svůj e-mail.
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={[
            styles.uploadBtn,
            (photoUploading || !user?.email_verified) && styles.uploadBtnDisabled,
          ]}
          onPress={handleGalleryUpload}
          disabled={photoUploading || !user?.email_verified}
        >
          {photoUploading ? (
            <ActivityIndicator color={COLORS.violet} size="small" />
          ) : (
            <Text style={styles.uploadBtnText}>+ Přidat fotografii</Text>
          )}
        </TouchableOpacity>
        {photos.length === 0 ? (
          <Text style={styles.emptyText}>Zatím žádné fotografie v galerii</Text>
        ) : (
          <View style={styles.photoGrid}>
            {photos.map((p) => (
              <View key={p.id} style={styles.photoWrap}>
                <Image
                  source={{ uri: `${API}/photos/${p.id}` }}
                  style={styles.photo}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeletePhoto(p.id)}
                >
                  <Text style={styles.deleteBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  privacyRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  privacyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  privacyBtnActive: {
    borderColor: COLORS.violet,
    backgroundColor: `${COLORS.violet}15`,
  },
  privacyBtnText: { fontSize: 14, color: COLORS.sub },
  privacyBtnTextActive: { color: COLORS.violet, fontWeight: '600' },
  passwordRow: { marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '500', color: COLORS.text, marginBottom: 4 },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 4,
  },
  hint: { fontSize: 12, color: COLORS.sub },
  saveBtn: {
    backgroundColor: COLORS.violet,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: COLORS.white, fontWeight: '600', fontSize: 16 },
  warningBox: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  warningText: { fontSize: 14, color: '#92400E' },
  uploadBtn: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: `${COLORS.violet}50`,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadBtnDisabled: { opacity: 0.5 },
  uploadBtnText: { color: COLORS.violet, fontWeight: '600', fontSize: 14 },
  emptyText: { fontSize: 14, color: COLORS.sub, textAlign: 'center', paddingVertical: 24 },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoWrap: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: { width: '100%', height: '100%' },
  deleteBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: { fontSize: 14, color: '#E53935', fontWeight: '600' },
});
