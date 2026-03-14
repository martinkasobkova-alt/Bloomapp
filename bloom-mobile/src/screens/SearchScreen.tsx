import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { OutlineIcon } from '../components/OutlineIcon';
import axios from 'axios';
import { API } from '../config/api';
import { SECTION_HEADING, SECTION_SUBTITLE } from '../theme/typography';

const COLORS = {
  violet: '#8A7CFF',
  text: '#2F3441',
  sub: '#5D6472',
  bg: '#F8F7FC',
  white: '#FFFFFF',
  border: '#E5E3ED',
};

const SECTION_META: Record<string, { label: string; icon: 'file-text' | 'user' | 'activity' | 'heart' | 'help-circle' | 'star' }> = {
  posts: { label: 'Příspěvky', icon: 'file-text' },
  users: { label: 'Uživatelé', icon: 'user' },
  specialists: { label: 'Odborníci', icon: 'activity' },
  services: { label: 'Nabídky pomoci', icon: 'heart' },
  articles: { label: 'Právní poradna', icon: 'file-text' },
  questions: { label: 'Otázky komunity', icon: 'help-circle' },
  reviews: { label: 'Recenze', icon: 'star' },
};

function getSuggestionTitle(type: string, item: any): string {
  if (type === 'services') return [item.offer, item.need].filter(Boolean).join(' ↔ ') || '—';
  return item.title || item.username || item.name || item.content?.slice(0, 50) || '—';
}

function getSuggestionSubtitle(type: string, item: any): string {
  if (type === 'reviews' && item.rating) return '★'.repeat(item.rating) + '☆'.repeat(5 - item.rating);
  return item.specialty || item.location || item.category || item.bio || item.description || item.content?.slice(0, 80) || '';
}

export default function SearchScreen({ navigation }: { navigation: any }) {
  const [inputVal, setInputVal] = useState('');
  const [suggestions, setSuggestions] = useState<Record<string, any[]> | null>(null);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [fullResults, setFullResults] = useState<Record<string, any[]> | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q || q.trim().length < 2) {
      setSuggestions(null);
      setTotals({});
      return;
    }
    setLoading(true);
    try {
      const r = await axios.get(`${API}/search`, { params: { q: q.trim(), limit: 5 } });
      setSuggestions(r.data.results || {});
      setTotals(r.data.totals || {});
    } catch {
      setSuggestions(null);
      setTotals({});
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (val: string) => {
    setInputVal(val);
    setShowSuggestions(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 280);
  };

  const doFullSearch = useCallback(async () => {
    const q = inputVal.trim();
    if (!q || q.length < 2) return;
    setLoading(true);
    setShowSuggestions(false);
    Keyboard.dismiss();
    try {
      const r = await axios.get(`${API}/search`, { params: { q, limit: 10 } });
      setFullResults(r.data.results || {});
      setTotals(r.data.totals || {});
      setSuggestions(r.data.results || {});
    } catch {
      setFullResults(null);
    } finally {
      setLoading(false);
    }
  }, [inputVal]);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const handleSelectItem = (type: string, item: any) => {
    setShowSuggestions(false);
    Keyboard.dismiss();
    if (type === 'users' && item.id) {
      navigation.navigate('UserProfile', { userId: item.id });
    } else if (type === 'posts' && item.id) {
      navigation.navigate('HomeTab', { screen: 'News', params: { openId: item.id } });
    } else if (type === 'articles' && item.id) {
      navigation.navigate('HomeTab', { screen: 'Legal', params: { openArticleId: item.id } });
    } else if (type === 'questions' && item.id) {
      navigation.navigate('HomeTab', { screen: 'Legal', params: { openQuestionId: item.id } });
    } else if (type === 'services') {
      navigation.navigate('HomeTab', { screen: 'Support' });
    } else if (type === 'specialists' || type === 'reviews') {
      navigation.navigate('HomeTab', { screen: 'Specialists' });
    }
  };

  const hasSuggestions = suggestions && Object.values(suggestions).some((a) => a?.length > 0);
  const displayResults = showSuggestions ? suggestions : fullResults;
  const totalCount = Object.values(totals).reduce((s, v) => s + v, 0);

  const allSections = Object.keys(SECTION_META);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Vyhledávání</Text>
          <Text style={styles.subtitle}>Hledejte napříč celou aplikací – uživatelé, články, příběhy, recenze...</Text>

          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Hledat v Bloom..."
              placeholderTextColor={COLORS.sub}
              value={inputVal}
              onChangeText={handleInputChange}
              onSubmitEditing={doFullSearch}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.searchBtn, (inputVal.trim().length < 2 || loading) && styles.searchBtnDisabled]}
              onPress={doFullSearch}
              disabled={inputVal.trim().length < 2 || loading}
            >
              <Text style={styles.searchBtnText}>{loading ? '…' : 'Hledat'}</Text>
            </TouchableOpacity>
          </View>

          {inputVal.length >= 2 && (
            <TouchableOpacity style={styles.showAllBtn} onPress={doFullSearch}>
              <Text style={styles.showAllText}>
                Zobrazit všechny výsledky pro „{inputVal.trim()}"
              </Text>
            </TouchableOpacity>
          )}

          {loading && <ActivityIndicator color={COLORS.violet} style={{ marginTop: 16 }} />}

          {!loading && displayResults && (
            <View style={styles.results}>
              {totalCount > 0 && (
                <Text style={styles.resultCount}>
                  Nalezeno {totalCount} výsledků
                </Text>
              )}
              {allSections.map((key) => {
                const items = displayResults[key] || [];
                if (items.length === 0) return null;
                const meta = SECTION_META[key];
                return (
                  <View key={key} style={styles.section}>
                    <View style={styles.sectionTitleRow}>
                      <OutlineIcon name={meta.icon} size={18} color={COLORS.sub} />
                      <Text style={styles.sectionTitle}>
                        {meta.label}
                        {totals[key] > 0 && (
                          <Text style={styles.sectionCount}> ({totals[key]})</Text>
                        )}
                      </Text>
                    </View>
                    {items.map((r) => (
                      <TouchableOpacity
                        key={r.id}
                        style={styles.resultItem}
                        activeOpacity={0.7}
                        onPress={() => handleSelectItem(key, r)}
                      >
                        <Text style={styles.resultTitle} numberOfLines={1}>
                          {getSuggestionTitle(key, r)}
                        </Text>
                        {(getSuggestionSubtitle(key, r) || r.username) && (
                          <Text style={styles.resultSub} numberOfLines={2}>
                            {getSuggestionSubtitle(key, r) || (r.username ? `@${r.username}` : '')}
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              })}
            </View>
          )}

          {!loading && inputVal.length >= 2 && displayResults && totalCount === 0 && (
            <Text style={styles.empty}>Žádné výsledky pro „{inputVal.trim()}"</Text>
          )}

          {inputVal.length < 2 && (
            <Text style={styles.hint}>Zadejte alespoň 2 znaky pro vyhledávání</Text>
          )}
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  title: SECTION_HEADING,
  subtitle: { fontSize: 14, color: COLORS.sub, marginTop: 4, marginBottom: 16 },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: COLORS.text,
  },
  searchBtn: {
    backgroundColor: COLORS.violet,
    borderRadius: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  searchBtnDisabled: { opacity: 0.5 },
  searchBtnText: { color: COLORS.white, fontWeight: '600' },
  showAllBtn: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: `${COLORS.violet}15`,
    borderRadius: 8,
  },
  showAllText: { fontSize: 13, color: COLORS.violet, fontWeight: '500' },
  results: { marginTop: 24 },
  resultCount: { fontSize: 14, color: COLORS.sub, marginBottom: 16 },
  section: { marginBottom: 20 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sectionTitle: { ...SECTION_SUBTITLE, fontSize: 16, marginBottom: 8 },
  sectionCount: { fontWeight: '400', color: COLORS.sub },
  resultItem: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  resultTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  resultSub: { fontSize: 14, color: COLORS.sub, marginTop: 4 },
  empty: { textAlign: 'center', color: COLORS.sub, marginTop: 24, fontSize: 14 },
  hint: { textAlign: 'center', color: COLORS.sub, marginTop: 24, fontSize: 13 },
});
