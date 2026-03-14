import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  TextInput,
} from 'react-native';
import axios from 'axios';
import { API } from '../config/api';
import { fixAvatarUrl } from '../config/api';
import { AvatarImage } from '../components/AvatarImage';
import { BLOOM_COLORS } from '../theme/colors';

const COLORS = BLOOM_COLORS;

const JOURNEY_STAGES: Record<string, { label: string; color: string; desc: string }> = {
  thinking: { label: 'Uvažuji o tranzici', color: '#E8E8E8', desc: 'Přemýšlím, kdo jsem a jaká cesta je ta moje.' },
  research: { label: 'Hledám informace', color: '#C3AED6', desc: 'Čtu, ptám se, hledám zdroje a komunitu.' },
  therapist: { label: 'První návštěva terapeuta', color: '#A8D8EA', desc: 'Mluvím s odborníkem o své cestě.' },
  hormones: { label: 'Hormonální léčba', color: '#5BCEFA', desc: 'Začínám nebo pokračuji v hormonální terapii.' },
  documents: { label: 'Změna dokladů', color: '#8A7CFF', desc: 'Pracuji na úřední změně jména nebo pohlaví.' },
  cosmetic: { label: 'Kosmetické úpravy', color: '#F5A9B8', desc: 'Pracuji na svém vzhledu – vlasy, make-up, styl.' },
  'surgery-thinking': { label: 'Zvažuji operace', color: '#F7C59F', desc: 'Přemýšlím o chirurgických možnostech.' },
  surgery: { label: 'Po operacích', color: '#A8E6CF', desc: 'Jsem po jedné nebo více operacích.' },
  stable: { label: 'Stabilní fáze', color: '#B5C99A', desc: 'Jsem na místě, kde chci být, a žiji svůj život.' },
  individual: { label: 'Individuální cesta', color: '#FFD1DC', desc: 'Moje cesta neodpovídá žádné škatulce – a to je OK.' },
};

type TabValue = 'profile' | 'gallery' | 'journey';

interface UserProfileScreenProps {
  userId: string;
  onBack: () => void;
  onMessage?: (userId: string) => void;
}

export default function UserProfileScreen({ userId, onBack, onMessage }: UserProfileScreenProps) {
  const [profile, setProfile] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabValue>('profile');
  const [galleryPassword, setGalleryPassword] = useState('');
  const [galleryError, setGalleryError] = useState<string | null>(null);

  useEffect(() => {
    axios
      .get(`${API}/users/${userId}/public-profile`)
      .then((r) => setProfile(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    if (activeTab === 'gallery' && userId) {
      setPhotosLoading(true);
      setGalleryError(null);
      const params = galleryPassword ? `?gallery_password=${encodeURIComponent(galleryPassword)}` : '';
      axios
        .get(`${API}/users/${userId}/photos${params}`)
        .then((r) => setPhotos(r.data || []))
        .catch((e) => {
          if (e.response?.status === 403) {
            setGalleryError('Galerie je chráněna heslem');
            setPhotos([]);
          } else {
            setPhotos([]);
          }
        })
        .finally(() => setPhotosLoading(false));
    }
  }, [activeTab, userId, galleryPassword]);

  if (loading) {
    return <ActivityIndicator color={COLORS.violet} style={{ flex: 1 }} />;
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={onBack}><Text style={styles.backText}>← Zpět</Text></TouchableOpacity>
        <Text style={styles.error}>Profil nenalezen</Text>
      </View>
    );
  }

  const hasJourney = profile.journey && profile.journey.stage;
  const journeyStage = profile.journey?.stage ? JOURNEY_STAGES[profile.journey.stage] : null;

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={styles.backText}>← Zpět</Text>
      </TouchableOpacity>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'profile' && styles.tabActive]}
          onPress={() => setActiveTab('profile')}
        >
          <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>Profil</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'gallery' && styles.tabActive]}
          onPress={() => setActiveTab('gallery')}
        >
          <Text style={[styles.tabText, activeTab === 'gallery' && styles.tabTextActive]}>Galerie</Text>
        </TouchableOpacity>
        {hasJourney && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'journey' && styles.tabActive]}
            onPress={() => setActiveTab('journey')}
          >
            <Text style={[styles.tabText, activeTab === 'journey' && styles.tabTextActive]}>Cesta</Text>
          </TouchableOpacity>
        )}
      </View>

      {activeTab === 'profile' && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <View style={styles.avatarWrap}>
              <AvatarImage
                avatar={profile.avatar || 'fem-pink'}
                customImage={fixAvatarUrl(profile.custom_avatar)}
                size={72}
              />
            </View>
            <Text style={styles.username}>@{profile.username}</Text>
            <Text style={styles.pronouns}>Zájmeno: {profile.pronouns || '—'}</Text>
            {(profile.location || profile.location_country) ? (
              <Text style={styles.location}>
                {(() => {
                  const countryLabel = profile.location_country === 'CZ' ? 'Česká republika' : profile.location_country === 'WORLD' ? 'Svět' : '';
                  const region = profile.location || '';
                  return region === 'Svět' ? 'Svět' : (countryLabel && region ? `${countryLabel}, ${region}` : countryLabel || region);
                })()}
                {profile.district ? ` · ${profile.district}` : ''}
              </Text>
            ) : null}
            {profile.specialization_label ? (
              <View style={styles.specBadge}>
                <Text style={styles.specText}>{profile.specialization_label}</Text>
              </View>
            ) : null}
            {profile.bio ? (
              <Text style={styles.bio} numberOfLines={10}>
                {profile.bio}
              </Text>
            ) : null}

            {profile.services && profile.services.length > 0 && (
              <View style={styles.servicesSection}>
                <Text style={styles.sectionTitle}>Nabídky pomoci</Text>
                {profile.services.slice(0, 5).map((s: any) => (
                  <View key={s.id} style={styles.serviceItem}>
                    <Text style={styles.serviceText}>
                      {[s.offer, s.need].filter(Boolean).join(' ↔ ') || '—'}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {onMessage && (
              <TouchableOpacity style={styles.messageBtn} onPress={() => onMessage(userId)}>
                <Text style={styles.messageBtnText}>Napsat zprávu</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      )}

      {activeTab === 'gallery' && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {galleryError && (
            <View style={styles.passwordCard}>
              <Text style={styles.passwordLabel}>Galerie je chráněna heslem</Text>
              <TextInput
                style={styles.passwordInput}
                value={galleryPassword}
                onChangeText={(t) => { setGalleryPassword(t); setGalleryError(null); }}
                placeholder="Zadejte heslo galerie"
                placeholderTextColor={COLORS.sub}
                secureTextEntry
              />
              <TouchableOpacity
                style={styles.passwordBtn}
                onPress={() => {
                  setGalleryError(null);
                  setPhotosLoading(true);
                  axios
                    .get(`${API}/users/${userId}/photos?gallery_password=${encodeURIComponent(galleryPassword)}`)
                    .then((r) => setPhotos(r.data || []))
                    .catch(() => setGalleryError('Nesprávné heslo'))
                    .finally(() => setPhotosLoading(false));
                }}
              >
                <Text style={styles.passwordBtnText}>Otevřít galerii</Text>
              </TouchableOpacity>
            </View>
          )}
          {!galleryError && (
            <>
              {photosLoading ? (
                <ActivityIndicator color={COLORS.violet} style={{ marginTop: 24 }} />
              ) : photos.length === 0 ? (
                <Text style={styles.emptyText}>Žádné fotografie v galerii</Text>
              ) : (
                <View style={styles.photoGrid}>
                  {photos.map((p) => (
                    <View key={p.id} style={styles.photoWrap}>
                      <Image
                        source={{ uri: `${API}/photos/${p.id}` }}
                        style={styles.photo}
                        resizeMode="cover"
                      />
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}

      {activeTab === 'journey' && hasJourney && (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Kde se nachází</Text>
            {journeyStage && (
              <>
                <View style={[styles.journeyDot, { backgroundColor: journeyStage.color }]} />
                <Text style={styles.journeyLabel}>{journeyStage.label}</Text>
                {journeyStage.desc ? (
                  <Text style={styles.journeyDesc}>{journeyStage.desc}</Text>
                ) : null}
              </>
            )}
            {profile.journey?.note ? (
              <Text style={styles.journeyNote}>{profile.journey.note}</Text>
            ) : null}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  backBtn: { padding: 16, paddingTop: 48 },
  backText: { fontSize: 16, color: COLORS.violet, fontWeight: '600' },
  error: { color: COLORS.sub, marginTop: 24, textAlign: 'center' },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8 },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.violet },
  tabText: { fontSize: 14, color: COLORS.sub },
  tabTextActive: { color: COLORS.violet, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  avatarWrap: { marginBottom: 12 },
  username: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  pronouns: { fontSize: 14, color: COLORS.sub, marginTop: 4 },
  location: { fontSize: 14, color: COLORS.sub, marginTop: 4 },
  specBadge: {
    backgroundColor: `${COLORS.violet}20`,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 8,
  },
  specText: { fontSize: 12, color: COLORS.violet, fontWeight: '600' },
  bio: { fontSize: 15, color: COLORS.text, marginTop: 16, textAlign: 'center', lineHeight: 22 },
  servicesSection: { width: '100%', marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 12 },
  serviceItem: {
    backgroundColor: `${COLORS.violet}08`,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  serviceText: { fontSize: 14, color: COLORS.text },
  messageBtn: {
    marginTop: 24,
    backgroundColor: COLORS.violet,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  messageBtnText: { color: COLORS.white, fontWeight: '600', fontSize: 16 },
  passwordCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  passwordLabel: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 12 },
  passwordInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 12,
  },
  passwordBtn: {
    backgroundColor: COLORS.violet,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  passwordBtnText: { color: COLORS.white, fontWeight: '600' },
  emptyText: { fontSize: 14, color: COLORS.sub, textAlign: 'center', paddingVertical: 32 },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoWrap: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  photo: { width: '100%', height: '100%' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 16, alignSelf: 'flex-start' },
  journeyDot: { width: 48, height: 48, borderRadius: 24, marginBottom: 12 },
  journeyLabel: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  journeyDesc: { fontSize: 14, color: COLORS.sub, marginTop: 8, textAlign: 'center' },
  journeyNote: { fontSize: 14, color: COLORS.text, marginTop: 16, fontStyle: 'italic', textAlign: 'center' },
});
