import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Pressable,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import axios from 'axios';
import { API } from '../config/api';
import { SECTION_HEADING } from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import { useLocations } from '../hooks/useLocations';
import { useMarkerColors } from '../hooks/useMarkerColors';
import { LocationDropdown } from '../components/LocationDropdown';
import { OutlineIcon } from '../components/OutlineIcon';

const COLORS = {
  violet: '#8A7CFF',
  text: '#2F3441',
  sub: '#5D6472',
  bg: '#F8F7FC',
  white: '#FFFFFF',
  border: '#E5E3ED',
};

interface Specialist {
  id: string;
  name?: string;
  specialty?: string;
  description?: string;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  avg_rating?: number;
  review_count?: number;
}

interface Review {
  id: string;
  username?: string;
  rating: number;
  content?: string;
  created_at?: string;
}

interface Question {
  id: string;
  title?: string;
  content?: string;
  user_id?: string;
  username?: string;
  created_at?: string;
  answers?: { id: string; content?: string; user_id?: string; username?: string; user_role?: string; specialization_label?: string; created_at?: string }[];
  vote_count?: number;
}

export default function SpecialistsScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const markerColors = useMarkerColors();
  const isSpecialistOrAdmin = user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'specialist';
  const [mode, setMode] = useState<'specialists' | 'questions'>('specialists');
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [country, setCountry] = useState<'CZ' | 'WORLD'>('CZ');
  const [regionFilter, setRegionFilter] = useState('');
  const { allLocations, refetch: refetchLocations } = useLocations({ includeNone: false });
  const [expandedQ, setExpandedQ] = useState<string | null>(null);
  const [answerTexts, setAnswerTexts] = useState<Record<string, string>>({});
  const [createQModal, setCreateQModal] = useState(false);
  const [newQuestionTitle, setNewQuestionTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [suggestModal, setSuggestModal] = useState(false);
  const [suggestForm, setSuggestForm] = useState({ name: '', specialty: '', description: '', address: '', city: '', region: '', country: 'CZ' as 'CZ' | 'WORLD' });
  const [selectedSpecialist, setSelectedSpecialist] = useState<Specialist | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, content: '' });
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  const fetchSpecialists = async () => {
    try {
      const params: Record<string, string> = { country };
      if (catFilter !== 'all') params.specialty = catFilter;
      if (regionFilter && regionFilter !== 'all') params.region = regionFilter;
      if (search) params.search = search;
      const r = await axios.get(`${API}/specialists`, { params });
      setSpecialists(r.data);
    } catch {}
    finally { setLoading(false); }
  };

  const fetchQuestions = async () => {
    try {
      const r = await axios.get(`${API}/questions`, { params: { section: 'specialists', category: 'all' } });
      setQuestions(r.data);
    } catch {}
  };

  const fetchCategories = async () => {
    try {
      const r = await axios.get(`${API}/specialist-categories`);
      setCategories(r.data || []);
    } catch {}
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchSpecialists(), fetchQuestions(), fetchCategories()]);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      refetchLocations();
    }, [refetchLocations])
  );

  useEffect(() => {
    fetchSpecialists();
  }, [catFilter, country, regionFilter]);

  useEffect(() => {
    if (mode === 'questions') fetchQuestions();
  }, [mode]);


  const onRefresh = async () => {
    setRefreshing(true);
    refetchLocations();
    await fetchAll();
    setRefreshing(false);
  };

  const handleCreateQuestion = async () => {
    if (!newQuestionTitle.trim()) return;
    setSubmitting(true);
    try {
      await axios.post(`${API}/questions`, { title: newQuestionTitle.trim(), section: 'specialists', category: 'all' });
      setCreateQModal(false);
      setNewQuestionTitle('');
      fetchQuestions();
    } catch (e: any) {
      Alert.alert('Chyba', e.response?.data?.detail || 'Nepodařilo se přidat otázku.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuggestSpecialist = async () => {
    const { name, specialty, address, city, country } = suggestForm;
    if (!name.trim() || !specialty.trim() || !address.trim() || !city.trim()) {
      Alert.alert('Chyba', 'Vyplňte prosím jméno, kategorii, adresu a město.');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/specialists/submit`, {
        ...suggestForm,
        name: name.trim(),
        specialty: specialty.trim(),
        description: suggestForm.description.trim(),
        address: address.trim(),
        city: city.trim(),
        region: suggestForm.region || '',
        country,
      });
      setSuggestModal(false);
      setSuggestForm({ name: '', specialty: '', description: '', address: '', city: '', region: '', country: 'CZ' });
      Alert.alert('Odesláno', 'Odborník byl odeslán ke schválení administrátorům.');
      fetchSpecialists();
    } catch (e: any) {
      Alert.alert('Chyba', e.response?.data?.detail || 'Nepodařilo se odeslat.');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchReviews = async (specialistId: string) => {
    try {
      const r = await axios.get(`${API}/specialists/${specialistId}/reviews`);
      setReviews(r.data || []);
    } catch {
      setReviews([]);
    }
  };

  const GOOGLE_MAPS_KEY = 'AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8';

  const getMapHtml = (address: string, city: string, zoom: number) => {
    const q = encodeURIComponent(`${address || ''}, ${city || ''}`.trim() || 'Praha');
    const url = `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_KEY}&q=${q}&zoom=${zoom}`;
    return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0"><iframe src="${url}" width="100%" height="100%" frameborder="0" style="border:0" allowfullscreen></iframe></body></html>`;
  };

  const openSpecialistDetail = (s: Specialist) => {
    setSelectedSpecialist(s);
    setIsReviewFormOpen(false);
    fetchReviews(s.id);
    setDetailModalVisible(true);
  };

  const handleAddReview = async () => {
    if (!selectedSpecialist || !reviewForm.content.trim()) return;
    setSubmitting(true);
    try {
      await axios.post(`${API}/specialists/${selectedSpecialist.id}/reviews`, {
        specialist_id: selectedSpecialist.id,
        rating: reviewForm.rating,
        content: reviewForm.content.trim(),
      });
      setReviewForm({ rating: 5, content: '' });
      setIsReviewFormOpen(false);
      fetchReviews(selectedSpecialist.id);
      fetchSpecialists();
      Alert.alert('Odesláno', 'Recenze byla přidána.');
    } catch (e: any) {
      Alert.alert('Chyba', e.response?.data?.detail || 'Nepodařilo se přidat recenzi.');
    } finally {
      setSubmitting(false);
    }
  };

  const openMapExternal = (address: string, city: string, name?: string) => {
    const parts = [name, address, city].filter(Boolean);
    const query = encodeURIComponent(parts.join(', '));
    if (!query) return;
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  const StarRating = ({ value, size = 14, onPress }: { value: number; size?: number; onPress?: (r: number) => void }) => (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Pressable
          key={i}
          onPress={() => onPress?.(i)}
          disabled={!onPress}
          style={({ pressed }) => [styles.starBtn, onPress && pressed && styles.starBtnPressed]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.starText, { fontSize: size, color: i <= value ? '#F5A9B8' : COLORS.border }]}>★</Text>
        </Pressable>
      ))}
    </View>
  );

  const handleSubmitAnswer = async (qId: string) => {
    const content = answerTexts[qId]?.trim();
    if (!content) return;
    setSubmitting(true);
    try {
      const r = await axios.post(`${API}/questions/${qId}/answers`, { content });
      setQuestions((prev) => prev.map((q) => (q.id === qId ? r.data : q)));
      setAnswerTexts((prev) => ({ ...prev, [qId]: '' }));
    } catch (e: any) {
      Alert.alert('Chyba', e.response?.data?.detail || 'Nepodařilo se odeslat odpověď.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.titleRow}>
        <View style={[styles.titleDot, { backgroundColor: markerColors?.specialists || '#8A7CFF' }]} />
        <Text style={styles.title}>Trans-friendly odborníci</Text>
      </View>
      <Text style={styles.subtitle}>Ověření odborníci a odpovědi na vaše otázky</Text>

      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'specialists' && styles.modeBtnActive]}
          onPress={() => setMode('specialists')}
        >
          <Text style={[styles.modeText, mode === 'specialists' && styles.modeTextActive]}>Odborníci</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'questions' && styles.modeBtnActive]}
          onPress={() => setMode('questions')}
        >
          <Text style={[styles.modeText, mode === 'questions' && styles.modeTextActive]}>Otázky a odpovědi</Text>
        </TouchableOpacity>
      </View>

      {mode === 'specialists' ? (
        <>
          <View style={styles.filtersRow}>
            <TouchableOpacity
              style={styles.compactDropdown}
              onPress={() => setLocationModalOpen(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.compactDropdownText}>
                {country === 'WORLD' ? 'Svět' : regionFilter ? `${regionFilter}` : 'Česko'} ▾
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.compactDropdown}
              onPress={() => setCategoryModalOpen(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.compactDropdownText}>Kategorie: {catFilter === 'all' ? 'Vše' : catFilter} ▾</Text>
            </TouchableOpacity>
          </View>

          <Modal visible={locationModalOpen} transparent animationType="fade">
            <Pressable style={styles.dropdownOverlay} onPress={() => setLocationModalOpen(false)}>
              <Pressable style={styles.dropdownModal} onPress={(e) => e.stopPropagation()}>
                <Text style={styles.dropdownModalTitle}>Lokalita</Text>
                <ScrollView style={styles.dropdownScroll} keyboardShouldPersistTaps="handled">
                  <TouchableOpacity
                    style={[styles.dropdownOption, country === 'CZ' && !regionFilter && styles.dropdownOptionActive]}
                    onPress={() => { setCountry('CZ'); setRegionFilter(''); setLocationModalOpen(false); }}
                  >
                    <Text style={[styles.dropdownOptionText, country === 'CZ' && !regionFilter && styles.dropdownOptionTextActive]}>Česko</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.dropdownOption, country === 'WORLD' && styles.dropdownOptionActive]}
                    onPress={() => { setCountry('WORLD'); setRegionFilter(''); setLocationModalOpen(false); }}
                  >
                    <Text style={[styles.dropdownOptionText, country === 'WORLD' && styles.dropdownOptionTextActive]}>Svět</Text>
                  </TouchableOpacity>
                  {allLocations.filter((l) => l.country === 'CZ').map((loc) => (
                    <TouchableOpacity
                      key={loc.id}
                      style={[styles.dropdownOption, styles.dropdownOptionIndent, country === 'CZ' && regionFilter === loc.name && styles.dropdownOptionActive]}
                      onPress={() => { setCountry('CZ'); setRegionFilter(loc.name); setLocationModalOpen(false); }}
                    >
                      <Text style={[styles.dropdownOptionText, country === 'CZ' && regionFilter === loc.name && styles.dropdownOptionTextActive]}>{loc.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity style={styles.dropdownCloseBtn} onPress={() => setLocationModalOpen(false)}>
                  <Text style={styles.dropdownCloseBtnText}>Zavřít</Text>
                </TouchableOpacity>
              </Pressable>
            </Pressable>
          </Modal>

          <Modal visible={categoryModalOpen} transparent animationType="fade">
            <Pressable style={styles.dropdownOverlay} onPress={() => setCategoryModalOpen(false)}>
              <Pressable style={styles.dropdownModal} onPress={(e) => e.stopPropagation()}>
                <Text style={styles.dropdownModalTitle}>Kategorie</Text>
                <ScrollView style={styles.dropdownScroll} keyboardShouldPersistTaps="handled">
                  <TouchableOpacity
                    style={[styles.dropdownOption, catFilter === 'all' && styles.dropdownOptionActive]}
                    onPress={() => { setCatFilter('all'); setCategoryModalOpen(false); }}
                  >
                    <Text style={[styles.dropdownOptionText, catFilter === 'all' && styles.dropdownOptionTextActive]}>Vše</Text>
                  </TouchableOpacity>
                  {categories.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.dropdownOption, catFilter === c.name && styles.dropdownOptionActive]}
                      onPress={() => { setCatFilter(c.name); setCategoryModalOpen(false); }}
                    >
                      <Text style={[styles.dropdownOptionText, catFilter === c.name && styles.dropdownOptionTextActive]}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity style={styles.dropdownCloseBtn} onPress={() => setCategoryModalOpen(false)}>
                  <Text style={styles.dropdownCloseBtnText}>Zavřít</Text>
                </TouchableOpacity>
              </Pressable>
            </Pressable>
          </Modal>

          {user && user.role !== 'admin' && user.role !== 'superadmin' && (
            <TouchableOpacity
              style={styles.suggestBtn}
              onPress={() => setSuggestModal(true)}
              activeOpacity={0.7}
            >
              <OutlineIcon name="plus" size={14} color={COLORS.violet} />
              <Text style={styles.suggestBtnText}>Navrhnout odborníka</Text>
            </TouchableOpacity>
          )}
          {loading ? (
            <ActivityIndicator color={COLORS.violet} style={{ marginTop: 28 }} />
          ) : (
            specialists.map((s) => (
              <TouchableOpacity key={s.id} style={styles.card} activeOpacity={0.8} onPress={() => openSpecialistDetail(s)}>
                <Text style={styles.cardName}>{s.name || 'Odborník'}</Text>
                <View style={styles.cardMetaRow}>
                  {(s.avg_rating ?? 0) > 0 && (
                    <View style={styles.cardRatingWrap}>
                      <StarRating value={Math.round(s.avg_rating!)} size={12} />
                      <Text style={styles.cardReviewCount}>{s.review_count ?? 0} recenzí</Text>
                    </View>
                  )}
                </View>
                {s.specialty ? <Text style={styles.cardSpec}>{s.specialty}</Text> : null}
                {s.city || s.region ? <Text style={styles.cardLocation}>{[s.city, s.region].filter(Boolean).join(', ')}</Text> : null}
                {s.description ? <Text style={styles.cardDesc} numberOfLines={2}>{s.description}</Text> : null}
              </TouchableOpacity>
            ))
          )}
        </>
      ) : (
        <>
          {user && (
            <TouchableOpacity style={styles.addQBtn} onPress={() => setCreateQModal(true)}>
              <Text style={styles.addQBtnText}>+ Přidat otázku</Text>
            </TouchableOpacity>
          )}
          {loading ? (
            <ActivityIndicator color={COLORS.violet} style={{ marginTop: 24 }} />
          ) : questions.length === 0 ? (
            <Text style={styles.emptyText}>Zatím žádné otázky. Buďte první!</Text>
          ) : (
            questions.map((q) => (
              <View key={q.id} style={styles.qCard}>
                <TouchableOpacity
                  style={styles.qHeader}
                  onPress={() => setExpandedQ(expandedQ === q.id ? null : q.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.qHeaderLeft}>
                    <Text style={styles.qTitle}>{q.title}</Text>
                    <View style={styles.qMetaRow}>
                      {q.user_id ? (
                        <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { userId: q.user_id })}>
                          <Text style={styles.qMetaLink}>{q.username}</Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={styles.qMeta}>{q.username}</Text>
                      )}
                      <Text style={styles.qMeta}> · {q.created_at ? new Date(q.created_at).toLocaleDateString('cs-CZ') : ''} · {q.answers?.length || 0} odpovědí</Text>
                    </View>
                  </View>
                  <Text style={styles.chevron}>{expandedQ === q.id ? '▼' : '▶'}</Text>
                </TouchableOpacity>
                {expandedQ === q.id && (
                  <View style={styles.qBody}>
                    {q.answers?.map((a) => (
                      <View key={a.id} style={styles.answerBubble}>
                        <Text style={styles.answerContent}>{a.content}</Text>
                        <View style={styles.answerMetaRow}>
                          {a.user_id ? (
                            <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { userId: a.user_id })}>
                              <Text style={styles.answerMetaLink}>{a.username}{a.specialization_label ? ` · ${a.specialization_label}` : ''}</Text>
                            </TouchableOpacity>
                          ) : (
                            <Text style={styles.answerMeta}>{a.username}{a.specialization_label ? ` · ${a.specialization_label}` : ''}</Text>
                          )}
                          <Text style={styles.answerMeta}> · {a.created_at ? new Date(a.created_at).toLocaleDateString('cs-CZ') : ''}</Text>
                        </View>
                      </View>
                    ))}
                    {isSpecialistOrAdmin && (
                      <View style={styles.answerForm}>
                        <TextInput
                          style={styles.answerInput}
                          placeholder="Napište odpověď..."
                          placeholderTextColor={COLORS.sub}
                          value={answerTexts[q.id] || ''}
                          onChangeText={(t) => setAnswerTexts((prev) => ({ ...prev, [q.id]: t }))}
                          multiline
                        />
                        <TouchableOpacity
                          style={[styles.sendBtn, (!answerTexts[q.id]?.trim() || submitting) && styles.sendBtnDisabled]}
                          onPress={() => handleSubmitAnswer(q.id)}
                          disabled={!answerTexts[q.id]?.trim() || submitting}
                        >
                          <Text style={styles.sendBtnText}>Odeslat</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>
            ))
          )}
        </>
      )}

      {/* Specialist detail modal */}
      <Modal
        visible={detailModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setDetailModalVisible(false);
          setIsReviewFormOpen(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              setDetailModalVisible(false);
              setIsReviewFormOpen(false);
            }}
          />
          <View style={styles.detailModalContent}>
            {selectedSpecialist && (
              <ScrollView showsVerticalScrollIndicator={false} style={styles.detailScroll} keyboardShouldPersistTaps="handled">
                {/* Mapa – vždy nahoře nad jménem */}
                {(selectedSpecialist.address || selectedSpecialist.city) && (
                  <View style={styles.mapEmbed}>
                    <WebView
                      source={{ html: getMapHtml(selectedSpecialist.address || '', selectedSpecialist.city || '', 15) }}
                      style={styles.mapWebView}
                      scrollEnabled={false}
                    />
                  </View>
                )}

                {/* Detail karta – jméno hned pod mapou */}
                <View style={styles.detailCard}>
                  <Text style={styles.detailName}>{selectedSpecialist.name || 'Odborník'}</Text>
                  <Text style={styles.detailSpec}>{selectedSpecialist.specialty}</Text>
                  {selectedSpecialist.description ? <Text style={styles.detailDesc}>{selectedSpecialist.description}</Text> : null}
                  <View style={styles.detailContactRow}>
                    {(selectedSpecialist.address || selectedSpecialist.city) && (
                      <Text style={styles.detailAddress}>
                        {[selectedSpecialist.address, selectedSpecialist.city, selectedSpecialist.region].filter(Boolean).join(', ')}
                      </Text>
                    )}
                    {selectedSpecialist.phone ? (
                      <TouchableOpacity onPress={() => Linking.openURL(`tel:${selectedSpecialist.phone}`)}>
                        <Text style={styles.detailContact}>📞 {selectedSpecialist.phone}</Text>
                      </TouchableOpacity>
                    ) : null}
                    {selectedSpecialist.email ? (
                      <TouchableOpacity onPress={() => Linking.openURL(`mailto:${selectedSpecialist.email}`)}>
                        <Text style={styles.detailContact}>✉ {selectedSpecialist.email}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  <View style={styles.detailRatingRow}>
                    <StarRating value={Math.round(selectedSpecialist.avg_rating ?? 0)} size={14} />
                    <Text style={styles.detailReviewCount}>({selectedSpecialist.review_count ?? 0} recenzí)</Text>
                  </View>
                  <View style={styles.detailButtonsRow}>
                    {(selectedSpecialist.address || selectedSpecialist.city) && (
                      <TouchableOpacity
                        style={styles.mapBtn}
                        onPress={() => openMapExternal(selectedSpecialist.address || '', selectedSpecialist.city || '', selectedSpecialist.name)}
                      >
                        <OutlineIcon name="map-pin" size={14} color={COLORS.violet} />
                        <Text style={styles.mapBtnText}>Otevřít v mapách</Text>
                      </TouchableOpacity>
                    )}
                    {user && (
                      <TouchableOpacity
                        style={styles.addReviewBtn}
                        onPress={() => setIsReviewFormOpen((prev) => !prev)}
                      >
                        <OutlineIcon name="star" size={18} color={COLORS.white} />
                        <Text style={styles.addReviewBtnText}>Přidat recenzi</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Inline formulář pro přidání recenze */}
                {isReviewFormOpen && user && (
                  <View style={styles.inlineReviewForm}>
                    <Text style={styles.inlineFormTitle}>Přidat recenzi</Text>
                    <Text style={styles.inputLabel}>Hodnocení</Text>
                    <View style={styles.reviewStarsWrap}>
                      <StarRating value={reviewForm.rating} size={22} onPress={(r) => setReviewForm((p) => ({ ...p, rating: r }))} />
                    </View>
                    <Text style={styles.inputLabel}>Popis zkušenosti</Text>
                    <TextInput
                      style={[styles.modalInput, styles.textArea]}
                      placeholder="Popište vaši zkušenost..."
                      placeholderTextColor={COLORS.sub}
                      value={reviewForm.content}
                      onChangeText={(t) => setReviewForm((p) => ({ ...p, content: t }))}
                      multiline
                      textAlignVertical="top"
                    />
                    <View style={styles.modalActions}>
                      <TouchableOpacity
                        style={[styles.submitBtn, (submitting || !reviewForm.content.trim()) && styles.submitBtnDisabled]}
                        onPress={handleAddReview}
                        disabled={submitting || !reviewForm.content.trim()}
                      >
                        <Text style={styles.submitBtnText}>{submitting ? 'Odesílám...' : 'Odeslat'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => {
                          setIsReviewFormOpen(false);
                          setReviewForm({ rating: 5, content: '' });
                        }}
                      >
                        <Text style={styles.cancelBtnText}>Zrušit</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Recenze – jako na webu */}
                <Text style={styles.reviewsTitle}>Recenze ({reviews.length})</Text>
                {reviews.length === 0 ? (
                  <Text style={styles.reviewsEmpty}>Zatím žádné recenze. Buďte první!</Text>
                ) : (
                  reviews.map((r) => (
                    <View key={r.id} style={styles.reviewCard}>
                      <View style={styles.reviewHeader}>
                        <Text style={styles.reviewUser}>{r.username || 'Uživatel'}</Text>
                        <StarRating value={r.rating} size={14} />
                      </View>
                      {r.content ? <Text style={styles.reviewContent}>{r.content}</Text> : null}
                      <Text style={styles.reviewDate}>{r.created_at ? new Date(r.created_at).toLocaleDateString('cs-CZ') : ''}</Text>
                    </View>
                  ))
                )}
              </ScrollView>
            )}
            <View style={styles.detailActions}>
              <TouchableOpacity style={styles.closeDetailBtn} onPress={() => { setDetailModalVisible(false); setIsReviewFormOpen(false); }}>
                <Text style={styles.closeDetailBtnText}>Zavřít</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={suggestModal} animationType="fade" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Navrhnout odborníka</Text>
            <Text style={styles.modalHint}>Váš návrh bude odeslán ke schválení administrátorům.</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.suggestForm}>
              <Text style={styles.inputLabel}>Jméno *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Jméno odborníka"
                placeholderTextColor={COLORS.sub}
                value={suggestForm.name}
                onChangeText={(t) => setSuggestForm((p) => ({ ...p, name: t }))}
              />
              <Text style={styles.inputLabel}>Kategorie *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.catChip, suggestForm.specialty === c.name && styles.catChipActive]}
                    onPress={() => setSuggestForm((p) => ({ ...p, specialty: c.name }))}
                  >
                    <Text style={[styles.catText, suggestForm.specialty === c.name && styles.catTextActive]}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.inputLabel}>Adresa *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ulice, číslo"
                placeholderTextColor={COLORS.sub}
                value={suggestForm.address}
                onChangeText={(t) => setSuggestForm((p) => ({ ...p, address: t }))}
              />
              <Text style={styles.inputLabel}>Město *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Město"
                placeholderTextColor={COLORS.sub}
                value={suggestForm.city}
                onChangeText={(t) => setSuggestForm((p) => ({ ...p, city: t }))}
              />
              <Text style={styles.inputLabel}>Region</Text>
              <View style={{ marginBottom: 12 }}>
                <LocationDropdown
                  country={suggestForm.country}
                  region={suggestForm.region}
                  onRegionChange={(r) => setSuggestForm((p) => ({ ...p, region: r }))}
                  locations={allLocations}
                  label="Region"
                />
              </View>
              <Text style={styles.inputLabel}>Země</Text>
              <View style={styles.toggle}>
                {(['CZ', 'WORLD'] as const).map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.toggleBtn, suggestForm.country === c && styles.toggleBtnActive]}
                    onPress={() => setSuggestForm((p) => ({ ...p, country: c, region: '' }))}
                  >
                    <Text style={[styles.toggleText, suggestForm.country === c && styles.toggleTextActive]}>{c === 'CZ' ? 'Česko' : 'Svět'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.inputLabel}>Popis (volitelné)</Text>
              <TextInput
                style={[styles.modalInput, styles.textArea]}
                placeholder="Popis"
                placeholderTextColor={COLORS.sub}
                value={suggestForm.description}
                onChangeText={(t) => setSuggestForm((p) => ({ ...p, description: t }))}
                multiline
              />
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setSuggestModal(false)}>
                <Text style={styles.cancelBtnText}>Zrušit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, (submitting || !suggestForm.name.trim() || !suggestForm.specialty || !suggestForm.address.trim() || !suggestForm.city.trim()) && styles.submitBtnDisabled]}
                onPress={handleSuggestSpecialist}
                disabled={submitting || !suggestForm.name.trim() || !suggestForm.specialty || !suggestForm.address.trim() || !suggestForm.city.trim()}
              >
                <Text style={styles.submitBtnText}>{submitting ? 'Odesílám...' : 'Odeslat'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={createQModal} animationType="fade" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nová otázka pro odborníky</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Na co se chcete zeptat?"
              placeholderTextColor={COLORS.sub}
              value={newQuestionTitle}
              onChangeText={setNewQuestionTitle}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setCreateQModal(false); setNewQuestionTitle(''); }}>
                <Text style={styles.cancelBtnText}>Zrušit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, (submitting || !newQuestionTitle.trim()) && styles.submitBtnDisabled]}
                onPress={handleCreateQuestion}
                disabled={submitting || !newQuestionTitle.trim()}
              >
                <Text style={styles.submitBtnText}>{submitting ? 'Odesílám...' : 'Odeslat'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 40 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  titleDot: { width: 10, height: 10, borderRadius: 5, opacity: 0.9 },
  title: SECTION_HEADING,
  subtitle: { fontSize: 12, color: COLORS.sub, marginTop: 2, marginBottom: 20 },
  modeRow: { flexDirection: 'row', marginBottom: 24, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  modeBtn: { flex: 1, padding: 10, alignItems: 'center' },
  modeBtnActive: { backgroundColor: COLORS.violet },
  modeText: { fontSize: 13, color: COLORS.sub },
  modeTextActive: { color: COLORS.white },
  filtersRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  compactDropdown: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  compactDropdownText: { fontSize: 13, color: COLORS.text },
  dropdownOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  dropdownModal: { backgroundColor: COLORS.white, borderRadius: 12, maxHeight: 400 },
  dropdownModalTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text, padding: 14, paddingBottom: 4 },
  dropdownScroll: { maxHeight: 280 },
  dropdownOption: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  dropdownOptionIndent: { paddingLeft: 24 },
  dropdownOptionActive: { backgroundColor: `${COLORS.violet}12` },
  dropdownOptionText: { fontSize: 14, color: COLORS.text },
  dropdownOptionTextActive: { color: COLORS.violet, fontWeight: '600' },
  dropdownCloseBtn: { padding: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.border },
  dropdownCloseBtnText: { fontSize: 14, color: COLORS.violet, fontWeight: '600' },
  catScroll: { marginBottom: 12 },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 6, borderWidth: 1, borderColor: COLORS.border },
  catChipActive: { backgroundColor: COLORS.violet, borderColor: COLORS.violet },
  catText: { fontSize: 12, color: COLORS.text },
  catTextActive: { color: COLORS.white },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  cardMetaRow: { marginTop: 4 },
  cardRatingWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardSpec: { fontSize: 12, color: COLORS.violet, marginTop: 4 },
  cardLocation: { fontSize: 11, color: COLORS.sub, marginTop: 2 },
  cardReviewCount: { fontSize: 10, color: COLORS.sub },
  cardDesc: { fontSize: 12, color: COLORS.sub, marginTop: 6, lineHeight: 16 },
  starRow: { flexDirection: 'row', gap: 2 },
  starBtn: { padding: 4, minWidth: 28, minHeight: 28, justifyContent: 'center', alignItems: 'center' },
  starBtnPressed: { opacity: 0.7 },
  starText: {},
  detailModalContent: { backgroundColor: COLORS.white, borderRadius: 12, padding: 14, maxHeight: '90%', marginHorizontal: 16 },
  detailScroll: { maxHeight: 500 },
  mapEmbed: { height: 140, borderRadius: 10, overflow: 'hidden', marginBottom: 12, backgroundColor: COLORS.border },
  mapWebView: { flex: 1, width: '100%' },
  detailCard: { marginBottom: 12 },
  detailName: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  detailSpec: { fontSize: 12, color: COLORS.violet, marginBottom: 8 },
  detailDesc: { fontSize: 12, color: COLORS.text, marginBottom: 8, lineHeight: 18 },
  detailContactRow: { marginBottom: 8 },
  detailAddress: { fontSize: 11, color: COLORS.sub, marginBottom: 2 },
  detailContact: { fontSize: 12, color: COLORS.violet, marginBottom: 2 },
  detailRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  detailReviewCount: { fontSize: 11, color: COLORS.sub },
  detailButtonsRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  mapBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: COLORS.violet },
  mapBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.violet },
  inlineReviewForm: { backgroundColor: `${COLORS.violet}08`, borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: `${COLORS.violet}30` },
  inlineFormTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  reviewsTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginTop: 12, marginBottom: 6 },
  reviewsEmpty: { fontSize: 12, color: COLORS.sub, marginBottom: 8 },
  reviewCard: { backgroundColor: `${COLORS.violet}08`, borderRadius: 8, padding: 10, marginBottom: 6 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  reviewUser: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  reviewContent: { fontSize: 12, color: COLORS.sub, lineHeight: 18 },
  reviewDate: { fontSize: 10, color: COLORS.sub, marginTop: 4 },
  detailActions: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  addReviewBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8, borderRadius: 8, backgroundColor: COLORS.violet },
  addReviewBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.white },
  closeDetailBtn: { padding: 10, alignItems: 'center' },
  closeDetailBtnText: { fontSize: 14, color: COLORS.sub },
  reviewStarsWrap: { marginBottom: 12 },
  addQBtn: { backgroundColor: COLORS.violet, borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 24 },
  addQBtnText: { color: COLORS.white, fontWeight: '600' },
  emptyText: { fontSize: 14, color: COLORS.sub, textAlign: 'center', marginTop: 24 },
  qCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  qHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qHeaderLeft: { flex: 1 },
  qTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  qMetaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 4 },
  qMeta: { fontSize: 12, color: COLORS.sub },
  qMetaLink: { fontSize: 12, color: COLORS.violet, textDecorationLine: 'underline' },
  chevron: { fontSize: 12, color: COLORS.sub },
  qBody: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  answerBubble: { backgroundColor: `${COLORS.violet}10`, borderRadius: 8, padding: 12, marginBottom: 8 },
  answerContent: { fontSize: 14, color: COLORS.text },
  answerMetaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 6 },
  answerMeta: { fontSize: 11, color: COLORS.sub },
  answerMetaLink: { fontSize: 11, color: COLORS.violet, textDecorationLine: 'underline' },
  answerForm: { marginTop: 8 },
  answerInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, fontSize: 14, color: COLORS.text, minHeight: 60, textAlignVertical: 'top', marginBottom: 8 },
  sendBtn: { backgroundColor: COLORS.violet, padding: 10, borderRadius: 8, alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtnText: { color: COLORS.white, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
  modalOverlayInner: { width: '100%' },
  modalContent: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, maxHeight: '85%' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  modalInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, fontSize: 14, color: COLORS.text, marginBottom: 12 },
  modalActions: { flexDirection: 'row', gap: 8 },
  cancelBtn: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, color: COLORS.sub },
  submitBtn: { flex: 1, backgroundColor: COLORS.violet, padding: 10, borderRadius: 8, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 14, color: COLORS.white, fontWeight: '600' },
  suggestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    alignSelf: 'flex-start',
  },
  suggestBtnText: { fontSize: 12, color: COLORS.violet, fontWeight: '500' },
  modalHint: { fontSize: 12, color: COLORS.sub, marginBottom: 8 },
  suggestForm: { maxHeight: 320 },
  inputLabel: { fontSize: 11, color: COLORS.sub, marginBottom: 2, marginTop: 6 },
  textArea: { minHeight: 48, textAlignVertical: 'top', fontSize: 14 },
});
