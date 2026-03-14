import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking } from 'react-native';
import { OutlineIcon } from '../components/OutlineIcon';
import { SECTION_HEADING } from '../theme/typography';
import { useContactEmail } from '../hooks/useContactEmail';

const COLORS = {
  violet: '#8A7CFF',
  text: '#2F3441',
  sub: '#5D6472',
  bg: '#F8F7FC',
  white: '#FFFFFF',
  border: '#E5E3ED',
};

const PRINCIPLES = [
  { icon: 'heart' as const, title: 'Respektujeme se navzájem', text: 'Oslovujeme každého jeho preferovanými jmény a zájmeny.' },
  { icon: 'shield' as const, title: 'Netolerujeme obtěžování', text: 'Jakékoli obtěžování nemá v Bloom místo.' },
  { icon: 'message-circle' as const, title: 'Žádný spam ani reklama', text: 'Bloom není obchodní platforma.' },
  { icon: 'lock' as const, title: 'Chráníme soukromí', text: 'Co se sdílí v Bloom, zůstává v Bloom.' },
  { icon: 'users' as const, title: 'Pomáháme si', text: 'Bloom je o vzájemné podpoře.' },
  { icon: 'star' as const, title: 'Prostor pro všechny etapy', text: 'Ať jste na jakékoli etapě své cesty.' },
];

export default function CommunityScreen() {
  const contactEmail = useContactEmail();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Zásady komunity</Text>
      <Text style={styles.subtitle}>Bezpečný prostor pro všechny</Text>

      <View style={styles.prideBar}>
        <View style={[styles.prideStrip, { backgroundColor: '#5BCEFA' }]} />
        <View style={[styles.prideStrip, { backgroundColor: '#F5A9B8' }]} />
        <View style={[styles.prideStrip, { backgroundColor: '#FFFFFF' }]} />
      </View>

      {PRINCIPLES.map((p) => (
        <View key={p.title} style={styles.card}>
          <View style={styles.cardIconWrap}>
            <OutlineIcon name={p.icon} size={24} color={COLORS.sub} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>{p.title}</Text>
            <Text style={styles.cardText}>{p.text}</Text>
          </View>
        </View>
      ))}

      <View style={styles.reportCard}>
        <Text style={styles.reportTitle}>Jak nahlásit problém?</Text>
        <Text style={styles.reportText}>
          Napište na{' '}
          <Text style={styles.link} onPress={() => Linking.openURL(`mailto:${contactEmail}`)}>
            {contactEmail}
          </Text>
          . Vaše nahlášení je důvěrné.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 40 },
  title: SECTION_HEADING,
  subtitle: { fontSize: 14, color: COLORS.sub, marginTop: 4, marginBottom: 20 },
  prideBar: { flexDirection: 'row', height: 4, marginBottom: 24, borderRadius: 2, overflow: 'hidden' },
  prideStrip: { flex: 1 },
  card: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardIconWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  cardText: { fontSize: 14, color: COLORS.sub, marginTop: 4 },
  reportCard: { backgroundColor: `${COLORS.violet}15`, borderRadius: 12, padding: 20, marginTop: 8, borderWidth: 1, borderColor: `${COLORS.violet}30` },
  reportTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  reportText: { fontSize: 14, color: COLORS.sub },
  link: { color: COLORS.violet, fontWeight: '600' },
});
