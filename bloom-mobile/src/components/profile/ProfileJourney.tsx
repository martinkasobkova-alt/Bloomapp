import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Switch,
  TextInput,
  Modal,
  Pressable,
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { API } from '../../config/api';
import { AvatarImage } from '../AvatarImage';
import { fixAvatarUrl } from '../../config/api';
import { BLOOM_COLORS } from '../../theme/colors';

const COLORS = BLOOM_COLORS;

const STAGES = [
  { id: 'thinking', label: 'Uvažuji o tranzici', color: '#E8E8E8', desc: 'Přemýšlím, kdo jsem a jaká cesta je ta moje.' },
  { id: 'research', label: 'Hledám informace', color: '#C3AED6', desc: 'Čtu, ptám se, hledám zdroje a komunitu.' },
  { id: 'therapist', label: 'První návštěva terapeuta', color: '#A8D8EA', desc: 'Mluvím s odborníkem o své cestě.' },
  { id: 'hormones', label: 'Hormonální léčba', color: '#5BCEFA', desc: 'Začínám nebo pokračuji v hormonální terapii.' },
  { id: 'documents', label: 'Změna dokladů', color: '#8A7CFF', desc: 'Pracuji na úřední změně jména nebo pohlaví.' },
  { id: 'cosmetic', label: 'Kosmetické úpravy', color: '#F5A9B8', desc: 'Pracuji na svém vzhledu – vlasy, make-up, styl.' },
  { id: 'surgery-thinking', label: 'Zvažuji operace', color: '#F7C59F', desc: 'Přemýšlím o chirurgických možnostech.' },
  { id: 'surgery', label: 'Po operacích', color: '#A8E6CF', desc: 'Jsem po jedné nebo více operacích.' },
  { id: 'stable', label: 'Stabilní fáze', color: '#B5C99A', desc: 'Jsem na místě, kde chci být, a žiji svůj život.' },
  { id: 'individual', label: 'Individuální cesta', color: '#FFD1DC', desc: 'Moje cesta neodpovídá žádné škatulce – a to je OK.' },
];

interface SimilarUser {
  id: string;
  username?: string;
  avatar?: string;
  custom_avatar?: string;
  location?: string;
}

export function ProfileJourney() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [journeyStage, setJourneyStage] = useState('');
  const [journeyPublic, setJourneyPublic] = useState(false);
  const [journeyNote, setJourneyNote] = useState('');
  const [journeySaving, setJourneySaving] = useState(false);
  const [similarUsers, setSimilarUsers] = useState<SimilarUser[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [searchStage, setSearchStage] = useState<string>('');
  const [stagePickerVisible, setStagePickerVisible] = useState(false);

  useEffect(() => {
    axios
      .get(`${API}/users/me`)
      .then((r) => {
        const journey = r.data?.journey;
        if (journey) {
          setJourneyStage(journey.stage || '');
          setJourneyPublic(journey.is_public || false);
          setJourneyNote(journey.note || '');
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveJourney = async () => {
    if (!journeyStage) return;
    setJourneySaving(true);
    const stageData = STAGES.find((s) => s.id === journeyStage);
    const payload = {
      stage: journeyStage,
      stage_label: stageData?.label || journeyStage,
      is_public: journeyPublic,
      note: journeyNote,
    };
    try {
      await axios.put(`${API}/users/me/journey`, payload);
      if (journeyPublic) fetchSimilarUsers();
    } catch {
      // silent fail
    } finally {
      setJourneySaving(false);
    }
  };

  const fetchSimilarUsers = async () => {
    setLoadingSimilar(true);
    try {
      const url = searchStage ? `${API}/journey/similar?stage=${encodeURIComponent(searchStage)}` : `${API}/journey/similar`;
      const r = await axios.get(url);
      setSimilarUsers(r.data);
    } catch {
      // silent fail, same as web
    } finally {
      setLoadingSimilar(false);
    }
  };

  const searchStageLabel = searchStage
    ? STAGES.find((s) => s.id === searchStage)?.label || searchStage
    : journeyStage
      ? `Moje fáze (${STAGES.find((s) => s.id === journeyStage)?.label || journeyStage})`
      : 'Moje fáze';

  const openUserProfile = (userId: string) => {
    // ProfileJourney is inside ProfileStack (Profile tab); UserProfile is in root Stack
    const rootNav = navigation.getParent?.()?.getParent?.() as any;
    if (rootNav?.navigate) {
      rootNav.navigate('UserProfile', { userId });
    } else {
      navigation.navigate('UserProfile', { userId });
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Kde se nacházím?</Text>
        <Text style={styles.cardDesc}>Sdílej svou fázi tranzice, pokud chceš – nebo si ji nech jen pro sebe.</Text>
        <View style={styles.stagesGrid}>
          {STAGES.map((stage) => (
            <TouchableOpacity
              key={stage.id}
              style={[
                styles.stageBtn,
                journeyStage === stage.id && styles.stageBtnActive,
              ]}
              onPress={() => setJourneyStage(stage.id)}
            >
              <View
                style={[
                  styles.stageDot,
                  { backgroundColor: stage.color },
                  journeyStage === stage.id && styles.stageDotActive,
                ]}
              />
              <View style={styles.stageTextWrap}>
                <Text
                  style={[
                    styles.stageLabel,
                    journeyStage === stage.id && styles.stageLabelActive,
                  ]}
                  numberOfLines={1}
                >
                  {stage.label}
                </Text>
                {journeyStage === stage.id && stage.desc ? (
                  <Text style={styles.stageDesc} numberOfLines={2}>
                    {stage.desc}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Osobní poznámka (volitelná)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={journeyNote}
          onChangeText={setJourneyNote}
          placeholder="Cokoliv, co chceš sdílet nebo si zapamatovat..."
          placeholderTextColor={COLORS.sub}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.card}>
        <View style={styles.publicRow}>
          <View style={styles.publicTextWrap}>
            <Text style={styles.publicTitle}>
              {journeyPublic ? 'Fáze je viditelná ostatním' : 'Fáze je soukromá'}
            </Text>
            <Text style={styles.publicDesc}>
              {journeyPublic
                ? 'Ostatní tě mohou najít přes „Najít lidi"'
                : 'Pouze ty vidíš svou fázi'}
            </Text>
          </View>
          <Switch
            value={journeyPublic}
            onValueChange={setJourneyPublic}
            trackColor={{ false: COLORS.border, true: COLORS.violet }}
            thumbColor={COLORS.white}
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, (journeySaving || !journeyStage) && styles.saveBtnDisabled]}
        onPress={handleSaveJourney}
        disabled={journeySaving || !journeyStage}
      >
        {journeySaving ? (
          <ActivityIndicator color={COLORS.white} size="small" />
        ) : (
          <Text style={styles.saveBtnText}>Uložit moji cestu</Text>
        )}
      </TouchableOpacity>

      {journeyStage && (
        <View style={styles.similarCard}>
          <View style={styles.similarHeader}>
            <Text style={styles.similarTitle}>Najít lidi</Text>
            <TouchableOpacity
              style={[styles.findBtn, loadingSimilar && styles.findBtnDisabled]}
              onPress={fetchSimilarUsers}
              disabled={loadingSimilar}
            >
              {loadingSimilar ? (
                <ActivityIndicator color={COLORS.violet} size="small" />
              ) : (
                <Text style={styles.findBtnText}>Hledat</Text>
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.searchStageRow}>
            <Text style={styles.searchStageLabel}>Hledat v:</Text>
            <TouchableOpacity
              style={styles.searchStageBtn}
              onPress={() => setStagePickerVisible(true)}
            >
              <Text style={styles.searchStageBtnText} numberOfLines={1}>{searchStageLabel}</Text>
              <Text style={styles.searchStageChevron}>▼</Text>
            </TouchableOpacity>
          </View>
          <Modal visible={stagePickerVisible} transparent animationType="fade">
            <Pressable style={styles.modalOverlay} onPress={() => setStagePickerVisible(false)}>
              <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
                <Text style={styles.modalTitle}>Vyber fázi</Text>
                <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
                  <TouchableOpacity
                    style={[styles.modalItem, !searchStage && styles.modalItemActive]}
                    onPress={() => { setSearchStage(''); setStagePickerVisible(false); }}
                  >
                    <Text style={[styles.modalItemText, !searchStage && styles.modalItemTextActive]}>
                      Moje fáze{journeyStage ? ` (${STAGES.find((s) => s.id === journeyStage)?.label})` : ''}
                    </Text>
                  </TouchableOpacity>
                  {STAGES.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.modalItem, searchStage === s.id && styles.modalItemActive]}
                      onPress={() => { setSearchStage(s.id); setStagePickerVisible(false); }}
                    >
                      <View style={[styles.modalItemDot, { backgroundColor: s.color }]} />
                      <Text style={[styles.modalItemText, searchStage === s.id && styles.modalItemTextActive]} numberOfLines={1}>
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity style={styles.modalClose} onPress={() => setStagePickerVisible(false)}>
                  <Text style={styles.modalCloseText}>Zavřít</Text>
                </TouchableOpacity>
              </Pressable>
            </Pressable>
          </Modal>
          {similarUsers.length > 0 && (
            <View style={styles.similarList}>
              {similarUsers.map((u) => (
                <TouchableOpacity
                  key={u.id}
                  style={styles.similarItem}
                  onPress={() => openUserProfile(u.id)}
                >
                  <AvatarImage
                    avatar={u.avatar || 'fem-pink'}
                    customImage={fixAvatarUrl(u.custom_avatar)}
                    size={32}
                  />
                  <View style={styles.similarInfo}>
                    <Text style={styles.similarName}>{u.username || 'Uživatel'}</Text>
                    {u.location ? (
                      <Text style={styles.similarLocation}>{u.location}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}
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
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: COLORS.sub,
    marginBottom: 16,
  },
  stagesGrid: {
    gap: 8,
  },
  stageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    marginBottom: 8,
  },
  stageBtnActive: {
    borderColor: `${COLORS.violet}99`,
    backgroundColor: `${COLORS.violet}10`,
  },
  stageDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  stageDotActive: {
    borderWidth: 2,
    borderColor: COLORS.violet,
  },
  stageTextWrap: { flex: 1, minWidth: 0 },
  stageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  stageLabelActive: { color: COLORS.violet },
  stageDesc: {
    fontSize: 11,
    color: COLORS.sub,
    marginTop: 2,
  },
  section: { marginBottom: 20 },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: COLORS.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  publicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  publicTextWrap: { flex: 1, marginRight: 16 },
  publicTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  publicDesc: {
    fontSize: 12,
    color: COLORS.sub,
    marginTop: 2,
  },
  saveBtn: {
    backgroundColor: COLORS.violet,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  similarCard: {
    backgroundColor: `${COLORS.violet}08`,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: `${COLORS.violet}30`,
  },
  similarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  similarTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  findBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${COLORS.violet}50`,
  },
  findBtnDisabled: { opacity: 0.6 },
  findBtnText: {
    fontSize: 14,
    color: COLORS.violet,
    fontWeight: '600',
  },
  searchStageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  searchStageLabel: {
    fontSize: 12,
    color: COLORS.sub,
  },
  searchStageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchStageBtnText: {
    fontSize: 13,
    color: COLORS.text,
    flex: 1,
  },
  searchStageChevron: {
    fontSize: 10,
    color: COLORS.sub,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  modalList: {
    maxHeight: 280,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  modalItemActive: {
    backgroundColor: `${COLORS.violet}15`,
  },
  modalItemDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  modalItemText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  modalItemTextActive: {
    color: COLORS.violet,
    fontWeight: '600',
  },
  modalClose: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  modalCloseText: {
    fontSize: 14,
    color: COLORS.violet,
    fontWeight: '600',
  },
  similarList: { gap: 8 },
  similarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 12,
  },
  similarInfo: { flex: 1, marginLeft: 12 },
  similarName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  similarLocation: {
    fontSize: 12,
    color: COLORS.sub,
    marginTop: 2,
  },
  chevron: {
    fontSize: 18,
    color: COLORS.sub,
  },
});
