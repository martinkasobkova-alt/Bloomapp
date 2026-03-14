import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import { API } from '../config/api';
import { SECTION_HEADING, SECTION_SUBTITLE } from '../theme/typography';
import { useAuth } from '../context/AuthContext';

const COLORS = {
  violet: '#8A7CFF',
  text: '#2F3441',
  sub: '#5D6472',
  bg: '#F8F7FC',
  white: '#FFFFFF',
  border: '#E5E3ED',
};

export default function JourneyScreen() {
  const { user } = useAuth();
  const [journey, setJourney] = useState<string>('');
  const [similar, setSimilar] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const r = await axios.get(`${API}/users/me`);
      setJourney(r.data?.journey || '');
    } catch {}
    finally { setLoading(false); }
  };

  const fetchSimilar = async () => {
    try {
      const r = await axios.get(`${API}/journey/similar`);
      setSimilar(r.data || []);
    } catch {}
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (journey) fetchSimilar();
  }, [journey]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/users/me/journey`, { journey });
    } catch {}
    finally { setSaving(false); }
  };

  if (loading) {
    return <ActivityIndicator color={COLORS.violet} style={{ flex: 1 }} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Moje cesta</Text>
      <Text style={styles.subtitle}>Sdílejte svou cestu (volitelně) a najděte podobné příběhy</Text>

      <Text style={styles.label}>Vaše cesta</Text>
      <TextInput
        style={styles.textArea}
        placeholder="Napište o své cestě..."
        placeholderTextColor={COLORS.sub}
        value={journey}
        onChangeText={setJourney}
        multiline
        numberOfLines={6}
      />
      <TouchableOpacity style={[styles.button, saving && styles.buttonDisabled]} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.buttonText}>Uložit</Text>}
      </TouchableOpacity>

      {similar.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Podobné cesty</Text>
          {similar.map((s) => (
            <View key={s.id} style={styles.card}>
              <Text style={styles.cardUser}>@{s.username}</Text>
              <Text style={styles.cardJourney} numberOfLines={3}>{s.journey}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 40 },
  title: SECTION_HEADING,
  subtitle: { fontSize: 14, color: COLORS.sub, marginTop: 4, marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '500', color: COLORS.text, marginBottom: 8 },
  textArea: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 16, fontSize: 16, color: COLORS.text, minHeight: 120, textAlignVertical: 'top', marginBottom: 16 },
  button: { backgroundColor: COLORS.violet, borderRadius: 10, padding: 16, alignItems: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  section: { marginTop: 32 },
  sectionTitle: SECTION_SUBTITLE,
  card: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardUser: { fontSize: 14, fontWeight: '600', color: COLORS.violet },
  cardJourney: { fontSize: 14, color: COLORS.text, marginTop: 8 },
});
