import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import axios from 'axios';
import { API } from '../config/api';
import { SECTION_HEADING, ARTICLE_TITLE } from '../theme/typography';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useMarkerColors } from '../hooks/useMarkerColors';

const COLORS = {
  violet: '#8A7CFF',
  text: '#2F3441',
  sub: '#5D6472',
  bg: '#F8F7FC',
  white: '#FFFFFF',
  border: '#E5E3ED',
};

interface Article {
  id: string;
  title?: string;
  content?: string;
  category?: string;
  author_name?: string;
  created_at?: string;
  published?: boolean;
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

const DEFAULT_CATS = [
  { id: 'pravni', name: 'Právní' },
  { id: 'zdravi', name: 'Zdraví' },
  { id: 'socialni', name: 'Sociální' },
  { id: 'ostatni', name: 'Ostatní' },
];

export default function LegalScreen({ route }: { route?: any }) {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const markerColors = useMarkerColors();
  const openArticleId = route?.params?.openArticleId;
  const openQuestionId = route?.params?.openQuestionId;
  const isLawyerOrAdmin = user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'lawyer';
  const [mode, setMode] = useState<'articles' | 'questions'>('articles');
  const [articles, setArticles] = useState<Article[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState(DEFAULT_CATS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [catFilter, setCatFilter] = useState('all');
  const [selected, setSelected] = useState<Article | null>(null);
  const [expandedQ, setExpandedQ] = useState<string | null>(null);
  const [answerTexts, setAnswerTexts] = useState<Record<string, string>>({});
  const [createQModal, setCreateQModal] = useState(false);
  const [newQuestionTitle, setNewQuestionTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchArticles = async () => {
    try {
      const r = await (isLawyerOrAdmin ? axios.get(`${API}/admin/articles`) : axios.get(`${API}/articles`));
      setArticles(r.data);
    } catch {}
  };

  const fetchQuestions = async () => {
    try {
      const r = await axios.get(`${API}/questions`, { params: { section: 'legal', category: catFilter } });
      setQuestions(r.data);
    } catch {}
  };

  const fetchCategories = async () => {
    try {
      const r = await axios.get(`${API}/article-categories`).catch(() => ({ data: DEFAULT_CATS }));
      setCategories(r.data?.length ? r.data : DEFAULT_CATS);
    } catch {}
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchArticles(), fetchQuestions(), fetchCategories()]);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (mode === 'questions') fetchQuestions();
  }, [mode, catFilter]);

  useEffect(() => {
    if (openArticleId) {
      setMode('articles');
      axios.get(`${API}/articles/${openArticleId}`).then((r) => setSelected(r.data)).catch(() => {});
    }
  }, [openArticleId]);

  useEffect(() => {
    if (openQuestionId) {
      setMode('questions');
      setExpandedQ(openQuestionId);
      fetchQuestions();
    }
  }, [openQuestionId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  const filtered = catFilter === 'all' ? articles : articles.filter((a) => a.category === catFilter);
  const catName = (id: string) => categories.find((c) => c.id === id)?.name || id;

  const handleCreateQuestion = async () => {
    if (!newQuestionTitle.trim()) return;
    setSubmitting(true);
    try {
      await axios.post(`${API}/questions`, { title: newQuestionTitle.trim(), section: 'legal', category: catFilter === 'all' ? 'all' : catFilter });
      setCreateQModal(false);
      setNewQuestionTitle('');
      fetchQuestions();
    } catch (e: any) {
      Alert.alert('Chyba', e.response?.data?.detail || 'Nepodařilo se přidat otázku.');
    } finally {
      setSubmitting(false);
    }
  };

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

  if (selected) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => setSelected(null)} style={styles.backBtn}>
          <Text style={styles.backText}>← Zpět</Text>
        </TouchableOpacity>
        <Text style={styles.badge}>{catName(selected.category || '')}</Text>
        <Text style={styles.articleTitle}>{selected.title}</Text>
        <Text style={styles.articleMeta}>
          {selected.author_name} · {selected.created_at ? new Date(selected.created_at).toLocaleDateString('cs-CZ') : ''}
        </Text>
        <Text style={styles.articleContent}>{selected.content?.replace(/<[^>]*>/g, '') || ''}</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.titleRow}>
        <View style={[styles.titleDot, { backgroundColor: markerColors?.legal || '#8A7CFF' }]} />
        <Text style={styles.title}>Právní poradna</Text>
      </View>
      <Text style={styles.subtitle}>Právní pomoc, články a odpovědi na vaše otázky</Text>

      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'articles' && styles.modeBtnActive]}
          onPress={() => setMode('articles')}
        >
          <Text style={[styles.modeText, mode === 'articles' && styles.modeTextActive]}>Články</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'questions' && styles.modeBtnActive]}
          onPress={() => setMode('questions')}
        >
          <Text style={[styles.modeText, mode === 'questions' && styles.modeTextActive]}>Otázky a odpovědi</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
        <TouchableOpacity style={[styles.catChip, catFilter === 'all' && styles.catChipActive]} onPress={() => setCatFilter('all')}>
          <Text style={[styles.catText, catFilter === 'all' && styles.catTextActive]}>Vše</Text>
        </TouchableOpacity>
        {categories.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[styles.catChip, catFilter === c.id && styles.catChipActive]}
            onPress={() => setCatFilter(c.id)}
          >
            <Text style={[styles.catText, catFilter === c.id && styles.catTextActive]}>{c.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {mode === 'articles' ? (
        <>
          {loading ? (
            <ActivityIndicator color={COLORS.violet} style={{ marginTop: 24 }} />
          ) : (
            filtered.map((a) => (
              <TouchableOpacity key={a.id} style={styles.card} onPress={() => setSelected(a)} activeOpacity={0.8}>
                <Text style={styles.badge}>{catName(a.category || '')}</Text>
                <Text style={styles.cardTitle}>{a.title}</Text>
                <Text style={styles.cardMeta}>{a.author_name} · {a.created_at ? new Date(a.created_at).toLocaleDateString('cs-CZ') : ''}</Text>
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
                    <Text style={styles.qMeta}>
                      {q.username} · {q.created_at ? new Date(q.created_at).toLocaleDateString('cs-CZ') : ''} · {q.answers?.length || 0} odpovědí
                    </Text>
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
                              <Text style={styles.answerMetaLink}>{a.username}{a.specialization_label ? ` · ${a.specialization_label}` : a.user_role ? ` · ${a.user_role}` : ''}</Text>
                            </TouchableOpacity>
                          ) : (
                            <Text style={styles.answerMeta}>{a.username}{a.specialization_label ? ` · ${a.specialization_label}` : a.user_role ? ` · ${a.user_role}` : ''}</Text>
                          )}
                          <Text style={styles.answerMeta}> · {a.created_at ? new Date(a.created_at).toLocaleDateString('cs-CZ') : ''}</Text>
                        </View>
                      </View>
                    ))}
                    {isLawyerOrAdmin && (
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

      <Modal visible={createQModal} animationType="fade" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nová otázka</Text>
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
  content: { padding: 20, paddingBottom: 40 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  titleDot: { width: 10, height: 10, borderRadius: 5, opacity: 0.9 },
  title: SECTION_HEADING,
  subtitle: { fontSize: 14, color: COLORS.sub, marginTop: 4, marginBottom: 16 },
  modeRow: { flexDirection: 'row', marginBottom: 12, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  modeBtn: { flex: 1, padding: 12, alignItems: 'center' },
  modeBtnActive: { backgroundColor: COLORS.violet },
  modeText: { fontSize: 14, color: COLORS.sub },
  modeTextActive: { color: COLORS.white },
  catScroll: { marginBottom: 20, marginHorizontal: -20, paddingHorizontal: 20 },
  catChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: COLORS.border },
  catChipActive: { backgroundColor: COLORS.violet, borderColor: COLORS.violet },
  catText: { fontSize: 14, color: COLORS.text },
  catTextActive: { color: COLORS.white },
  card: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  badge: { fontSize: 11, fontWeight: '600', color: COLORS.violet, marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  cardMeta: { fontSize: 12, color: COLORS.sub, marginTop: 4 },
  backBtn: { marginBottom: 16 },
  backText: { fontSize: 16, color: COLORS.violet },
  articleTitle: ARTICLE_TITLE,
  articleMeta: { fontSize: 14, color: COLORS.sub, marginBottom: 16 },
  articleContent: { fontSize: 16, color: COLORS.text, lineHeight: 24 },
  addQBtn: { backgroundColor: COLORS.violet, borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 16 },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, maxHeight: '85%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  modalInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, fontSize: 16, color: COLORS.text, marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelBtnText: { fontSize: 16, color: COLORS.sub },
  submitBtn: { flex: 1, backgroundColor: COLORS.violet, padding: 12, borderRadius: 10, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 16, color: COLORS.white, fontWeight: '600' },
});
