/**
 * O projektu Bloom – převedeno z webové CommunityPage
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SECTION_HEADING } from '../theme/typography';
import { useTextSettings } from '../hooks/useTextSettings';
import { useContactEmail } from '../hooks/useContactEmail';

const COLORS = {
  violet: '#8A7CFF',
  text: '#2F3441',
  sub: '#5D6472',
  bg: '#F8F7FC',
  white: '#FFFFFF',
  border: '#E5E3ED',
};

const DEFAULT_ABOUT =
  'Bloom vznikl jako bezpečný komunitní prostor pro trans lidi v České republice – místo, kde lze sdílet zkušenosti, najít podporu, propojit se s odborníky a navazovat kontakty. Projekt provozuje komunita dobrovolně. Cílem je diskrétnost, soukromí a vzájemná pomoc.';

interface AboutScreenProps {
  onBack: () => void;
}

export default function AboutScreen({ onBack }: AboutScreenProps) {
  const texts = useTextSettings();
  const contactEmail = useContactEmail();
  const aboutText = texts.about_text || DEFAULT_ABOUT;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Zpět</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>O projektu Bloom</Text>
        <View style={styles.card}>
          <Text style={styles.body}>{aboutText}</Text>
          {contactEmail ? (
            <Text style={styles.contactRow}>
              Kontakt:{' '}
              <Text style={styles.link} onPress={() => Linking.openURL(`mailto:${contactEmail}`)}>
                {contactEmail}
              </Text>
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 16, color: COLORS.violet },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  title: SECTION_HEADING,
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  body: { fontSize: 15, color: COLORS.sub, lineHeight: 24 },
  contactRow: { fontSize: 15, color: COLORS.sub, marginTop: 16 },
  link: { color: COLORS.violet, fontWeight: '600' },
});
