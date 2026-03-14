import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import { API } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { SECTION_HEADING, SECTION_SUBTITLE } from '../theme/typography';
import { useLocations } from '../hooks/useLocations';
import { useMarkerColors } from '../hooks/useMarkerColors';
import { LocationDropdown } from '../components/LocationDropdown';

const COLORS = {
  violet: '#8A7CFF',
  text: '#2F3441',
  sub: '#5D6472',
  bg: '#F8F7FC',
  white: '#FFFFFF',
  border: '#E5E3ED',
};

export default function NearbyScreen() {
  const { user, updateProfile } = useAuth();
  const markerColors = useMarkerColors();
  const { allLocations } = useLocations();
  const [location, setLocation] = useState(user?.location || '');
  const [services, setServices] = useState<any[]>([]);
  const [specialists, setSpecialists] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [country, setCountry] = useState<'CZ' | 'WORLD'>('CZ');

  const czLocations = allLocations.filter((l) => l.country === 'CZ');
  const worldLocations = allLocations.filter((l) => l.country === 'WORLD');
  const locations = country === 'CZ' ? czLocations : worldLocations;

  const fetchNearby = async () => {
    if (!location) return;
    setLoading(true);
    try {
      const [svc, spec, usrs] = await Promise.all([
        axios.get(`${API}/services`, { params: { location } }),
        axios.get(`${API}/specialists`, { params: { search: location } }),
        axios.get(`${API}/users/nearby`, { params: { location } }),
      ]);
      setServices(svc.data.slice(0, 6));
      setSpecialists(spec.data.slice(0, 6));
      setUsers(usrs.data.slice(0, 6));
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (location) fetchNearby();
  }, [location]);

  const handleLocationChange = async (v: string) => {
    setLocation(v);
    try {
      await updateProfile({ location: v });
    } catch {}
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.titleRow}>
        <View style={[styles.titleDot, { backgroundColor: markerColors?.nearby || '#8A7CFF' }]} />
        <Text style={styles.title}>V mém okolí</Text>
      </View>
      <Text style={styles.subtitle}>Služby a odborníci ve vašem okolí</Text>

      <View style={styles.toggle}>
        {(['CZ', 'WORLD'] as const).map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.toggleBtn, country === c && styles.toggleBtnActive]}
            onPress={() => { setCountry(c); setLocation(''); }}
          >
            <Text style={[styles.toggleText, country === c && styles.toggleTextActive]}>{c === 'CZ' ? 'ČR' : 'Svět'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {locations.length > 0 && (
        <View style={styles.regionRow}>
          <LocationDropdown
            country={country}
            region={location}
            onRegionChange={handleLocationChange}
            locations={allLocations}
            label=""
            firstOptionLabel="Vyberte region"
          />
        </View>
      )}

      {!location ? (
        <Text style={styles.hint}>Vyberte lokalitu výše</Text>
      ) : loading ? (
        <ActivityIndicator color={COLORS.violet} style={{ marginTop: 24 }} />
      ) : (
        <>
          {services.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Nabídky pomoci</Text>
              {services.map((s) => (
                <View key={s.id} style={styles.card}>
                  <Text style={styles.cardTitle}>{s.offer || s.need}</Text>
                  <Text style={styles.cardUser}>@{s.username}</Text>
                </View>
              ))}
            </View>
          )}
          {specialists.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Odborníci</Text>
              {specialists.map((s) => (
                <View key={s.id} style={styles.card}>
                  <Text style={styles.cardTitle}>{s.name}</Text>
                  <Text style={styles.cardSpec}>{s.specialty}</Text>
                </View>
              ))}
            </View>
          )}
          {users.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Členové komunity</Text>
              {users.map((u) => (
                <View key={u.id} style={styles.card}>
                  <Text style={styles.cardTitle}>@{u.username}</Text>
                </View>
              ))}
            </View>
          )}
        </>
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
  toggle: { flexDirection: 'row', marginBottom: 16, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  toggleBtn: { flex: 1, padding: 12, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: COLORS.violet },
  toggleText: { fontSize: 14, color: COLORS.sub },
  toggleTextActive: { color: COLORS.white },
  regionRow: { marginBottom: 24 },
  hint: { textAlign: 'center', color: COLORS.sub, marginTop: 24 },
  section: { marginBottom: 24 },
  sectionTitle: SECTION_SUBTITLE,
  card: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  cardUser: { fontSize: 13, color: COLORS.sub, marginTop: 4 },
  cardSpec: { fontSize: 14, color: COLORS.violet, marginTop: 4 },
});
