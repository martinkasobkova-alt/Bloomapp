import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useMarkerColors } from '../hooks/useMarkerColors';
import { API } from '../config/api';
import { OutlineIcon } from '../components/OutlineIcon';
import { BLOOM_COLORS } from '../theme/colors';
import { BLOOM_FONTS, SECTION_SUBTITLE } from '../theme/typography';
import axios from 'axios';

interface Stats {
  members?: number;
  experiences?: number;
  specialists?: number;
  services?: number;
}

const LINKS = [
  { label: 'Vzájemná podpora', icon: 'heart' as const, desc: 'Nabídky a pomoc', screen: 'Support' as const, sectionKey: 'support' as const },
  { label: 'Odborníci', icon: 'activity' as const, desc: 'Trans-friendly odborníci', screen: 'Specialists' as const, sectionKey: 'specialists' as const },
  { label: 'Právní poradna', icon: 'file-text' as const, desc: 'Právní pomoc', screen: 'Legal' as const, sectionKey: 'legal' as const },
  { label: 'Aktuality', icon: 'file-text' as const, desc: 'Články a novinky', screen: 'News' as const, sectionKey: 'news' as const },
  { label: 'V mém okolí', icon: 'map-pin' as const, desc: 'Služby v okolí', screen: 'Nearby' as const, sectionKey: 'nearby' as const },
  { label: 'Zkušenosti komunity', icon: 'book-open' as const, desc: 'Články a příběhy, komentáře', screen: 'Stories' as const, sectionKey: 'stories' as const },
];

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const markerColors = useMarkerColors();
  const [stats, setStats] = useState<Stats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const r = await axios.get(`${API}/stats`);
      setStats(r.data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>
          Ahoj, <Text style={styles.greetingName}>{user?.username ?? 'uživateli'}</Text>
        </Text>
      </View>

      {stats && (
        <View style={styles.statsRow}>
          {[
            { emoji: '🌸', value: stats.members ?? 0, label: 'členů' },
            { emoji: '💬', value: stats.experiences ?? 0, label: 'příspěvků' },
            { emoji: '🧠', value: stats.specialists ?? 0, label: 'odborníků' },
            { emoji: '🤝', value: stats.services ?? 0, label: 'nabídek' },
          ].map((s) => (
            <View key={s.label} style={styles.statItem}>
              <View style={styles.statIconWrap}>
                <Text style={styles.statEmoji}>{s.emoji}</Text>
              </View>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rychlé odkazy</Text>
        {LINKS.map((item) => {
          const color = markerColors?.[item.sectionKey] || '#8A7CFF';
          return (
          <TouchableOpacity
            key={item.label}
            style={[styles.linkCard, { borderLeftColor: color }]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate(item.screen)}
          >
            <View style={styles.linkIconWrap}>
              <OutlineIcon name={item.icon} size={24} color={color} />
            </View>
            <View style={styles.linkText}>
              <Text style={styles.linkLabel}>{item.label}</Text>
              <Text style={styles.linkDesc}>{item.desc}</Text>
            </View>
          </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const COLORS = BLOOM_COLORS;

const STATS_PANEL_COLOR = '#E57373'; // pastel červená

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FCF8FC',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontFamily: BLOOM_FONTS.semiBold,
    color: COLORS.text,
  },
  greetingName: {
    fontFamily: BLOOM_FONTS.semiBold,
    color: COLORS.violet,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: STATS_PANEL_COLOR,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  statIconWrap: {
    marginBottom: 6,
  },
  statEmoji: {
    fontSize: 22,
  },
  statValue: {
    fontSize: 16,
    fontFamily: BLOOM_FONTS.semiBold,
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: BLOOM_FONTS.regular,
    color: COLORS.sub,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: SECTION_SUBTITLE,
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  linkIconWrap: {
    marginRight: 16,
  },
  linkText: {
    flex: 1,
  },
  linkLabel: {
    fontSize: 16,
    fontFamily: BLOOM_FONTS.semiBold,
    color: COLORS.text,
  },
  linkDesc: {
    fontSize: 13,
    fontFamily: BLOOM_FONTS.regular,
    color: COLORS.sub,
    marginTop: 2,
  },
  logoutBtn: {
    padding: 16,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 14,
    color: COLORS.sub,
  },
});
