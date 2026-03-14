import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import axios from 'axios';
import { API, API_BASE } from '../config/api';
import { useMarkerColors } from '../hooks/useMarkerColors';
import { SECTION_HEADING, ARTICLE_TITLE } from '../theme/typography';

const COLORS = {
  violet: '#8A7CFF',
  text: '#2F3441',
  sub: '#5D6472',
  bg: '#F8F7FC',
  white: '#FFFFFF',
  border: '#E5E3ED',
};

interface NewsItem {
  id: string;
  title?: string;
  content?: string;
  image_url?: string;
  category?: string;
  author_name?: string;
  created_at?: string;
}

export default function NewsScreen({ route }: { route?: any }) {
  const openId = route?.params?.openId;
  const markerColors = useMarkerColors();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<NewsItem | null>(null);

  const fetchCategories = async () => {
    try {
      const r = await axios.get(`${API}/news-categories`).catch(() => ({ data: [] }));
      setCategories(r.data || []);
    } catch {}
  };

  const fetchNews = async () => {
    setLoading(true);
    try {
      const params = categoryFilter ? { category: categoryFilter } : {};
      const r = await axios.get(`${API}/news`, { params });
      setNews(r.data || []);
    } catch {
      setNews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchNews();
  }, [categoryFilter]);

  useEffect(() => {
    if (!openId) return;
    const item = news.find((n) => n.id === openId);
    if (item) {
      setSelected(item);
    } else {
      axios.get(`${API}/news/${openId}`).then((r) => setSelected(r.data)).catch(() => {});
    }
  }, [openId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchNews(), fetchCategories()]);
    setRefreshing(false);
  };

  const imageUrl = (url?: string) => {
    if (!url) return undefined;
    if (url.startsWith('http')) return url;
    return `${API_BASE}${url}`;
  };

  if (selected) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => setSelected(null)} style={styles.backBtn}>
          <Text style={styles.backText}>← Zpět</Text>
        </TouchableOpacity>
        {selected.image_url ? (
          <Image source={{ uri: imageUrl(selected.image_url) }} style={styles.detailImage} resizeMode="cover" />
        ) : null}
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
        <View style={[styles.titleDot, { backgroundColor: markerColors?.news || '#8A7CFF' }]} />
        <Text style={styles.title}>Aktuality</Text>
      </View>
      <Text style={styles.subtitle}>Články a novinky z komunity</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryFilter}>
        <TouchableOpacity
          style={[styles.filterChip, !categoryFilter && styles.filterChipActive]}
          onPress={() => setCategoryFilter('')}
        >
          <Text style={[styles.filterText, !categoryFilter && styles.filterTextActive]}>Vše</Text>
        </TouchableOpacity>
        {categories.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[styles.filterChip, categoryFilter === c.id && styles.filterChipActive]}
            onPress={() => setCategoryFilter(categoryFilter === c.id ? '' : c.id)}
          >
            <Text style={[styles.filterText, categoryFilter === c.id && styles.filterTextActive]}>{c.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color={COLORS.violet} style={{ marginTop: 24 }} />
      ) : news.length === 0 ? (
        <Text style={styles.emptyText}>Zatím žádné aktuality.</Text>
      ) : (
        news.map((n) => (
          <TouchableOpacity key={n.id} style={styles.card} onPress={() => setSelected(n)} activeOpacity={0.8}>
            {n.image_url ? (
              <Image source={{ uri: imageUrl(n.image_url) }} style={styles.cardImage} resizeMode="cover" />
            ) : null}
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{n.title}</Text>
              <Text style={styles.cardMeta}>{n.author_name} · {n.created_at ? new Date(n.created_at).toLocaleDateString('cs-CZ') : ''}</Text>
            </View>
          </TouchableOpacity>
        ))
      )}
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
  categoryFilter: { marginBottom: 20, marginHorizontal: -20, paddingHorizontal: 20 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.violet, borderColor: COLORS.violet },
  filterText: { fontSize: 14, color: COLORS.text },
  filterTextActive: { color: COLORS.white, fontWeight: '600' },
  emptyText: { fontSize: 14, color: COLORS.sub, textAlign: 'center', marginTop: 24 },
  card: { backgroundColor: COLORS.white, borderRadius: 12, marginBottom: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardImage: { width: '100%', height: 120 },
  cardBody: { padding: 16 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  cardMeta: { fontSize: 12, color: COLORS.sub, marginTop: 4 },
  backBtn: { marginBottom: 16 },
  backText: { fontSize: 16, color: COLORS.violet },
  detailImage: { width: '100%', height: 200, marginBottom: 16, borderRadius: 8 },
  articleTitle: ARTICLE_TITLE,
  articleMeta: { fontSize: 14, color: COLORS.sub, marginBottom: 16 },
  articleContent: { fontSize: 16, color: COLORS.text, lineHeight: 24 },
});
