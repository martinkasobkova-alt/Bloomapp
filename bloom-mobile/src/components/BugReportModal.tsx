import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import axios from 'axios';
import { API } from '../config/api';
import { OutlineIcon } from './OutlineIcon';
import { SECTION_SUBTITLE } from '../theme/typography';

const COLORS = {
  violet: '#8A7CFF',
  text: '#2F3441',
  sub: '#5D6472',
  border: '#E5E3ED',
  white: '#FFFFFF',
};

const REPORT_TYPES = [
  { value: 'app_error', label: 'Chyba v aplikaci' },
  { value: 'not_working', label: 'Něco nefunguje' },
  { value: 'suggestion', label: 'Návrh zlepšení' },
  { value: 'security', label: 'Bezpečnostní problém' },
  { value: 'other', label: 'Jiný problém' },
];

export function BugReportModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [reportType, setReportType] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reportType) {
      Alert.alert('Chyba', 'Vyberte prosím typ problému.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Chyba', 'Popište prosím problém.');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/bug-reports`, {
        report_type: reportType,
        description: description.trim(),
        page_url: 'Bloom Mobile',
        browser_info: `${Platform.OS} ${Platform.Version}`,
      });
      Alert.alert('Odesláno', 'Hlášení odesláno, děkujeme!');
      setReportType('');
      setDescription('');
      onClose();
    } catch (e: any) {
      Alert.alert('Chyba', e.response?.data?.detail || 'Nepodařilo se odeslat hlášení.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.content} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <OutlineIcon name="bug" size={20} color={COLORS.violet} />
            <Text style={styles.title}>Nahlásit problém</Text>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Typ problému</Text>
            <View style={styles.typeRow}>
              {REPORT_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.typeChip, reportType === t.value && styles.typeChipActive]}
                  onPress={() => setReportType(t.value)}
                >
                  <Text style={[styles.typeText, reportType === t.value && styles.typeTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Popis problému</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Popište co se stalo, co jste očekávali..."
              placeholderTextColor={COLORS.sub}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />
            <Text style={styles.hint}>Automaticky přiložíme: aktuální obrazovku, čas a informace o zařízení.</Text>
          </ScrollView>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={submitting}>
              <Text style={styles.cancelBtnText}>Zrušit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text style={styles.submitBtnText}>{submitting ? 'Odesílám...' : 'Odeslat'}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    maxHeight: '85%',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  title: { ...SECTION_SUBTITLE, marginBottom: 0 },
  label: { fontSize: 12, color: COLORS.sub, marginBottom: 6, marginTop: 8 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  typeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  typeChipActive: { backgroundColor: COLORS.violet, borderColor: COLORS.violet },
  typeText: { fontSize: 13, color: COLORS.text },
  typeTextActive: { color: COLORS.white, fontWeight: '600' },
  textArea: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  hint: { fontSize: 11, color: COLORS.sub, marginTop: 8 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelBtnText: { fontSize: 16, color: COLORS.sub },
  submitBtn: { flex: 1, backgroundColor: COLORS.violet, padding: 12, borderRadius: 10, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 16, color: COLORS.white, fontWeight: '600' },
});
