/**
 * Dropdown pro výběr regionu – Česko/Svět + regiony z API (admin změny se projeví)
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Pressable } from 'react-native';
import type { LocationItem } from '../hooks/useLocations';

const COLORS = {
  violet: '#8A7CFF',
  text: '#2F3441',
  sub: '#5D6472',
  border: '#E5E3ED',
  white: '#FFFFFF',
};

interface LocationDropdownProps {
  country: 'CZ' | 'WORLD';
  region: string;
  onRegionChange: (region: string) => void;
  locations: LocationItem[];
  label?: string;
  /** První volba při prázdném regionu (např. "Nechci uvádět" pro formulář) */
  firstOptionLabel?: string;
}

export function LocationDropdown({
  country,
  region,
  onRegionChange,
  locations,
  label = 'Region',
  firstOptionLabel = 'Všechny regiony',
}: LocationDropdownProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const options = locations.filter((l) => l.country === country);
  const displayText = region || firstOptionLabel;

  return (
    <>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        {label ? <Text style={styles.triggerLabel}>{label}</Text> : null}
        <Text style={styles.triggerValue}>{displayText}</Text>
        <Text style={styles.chevron}>▼</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Vybrat {label ? label.toLowerCase() : 'lokalitu'}</Text>
            <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
              <TouchableOpacity
                style={[styles.option, !region && styles.optionActive]}
                onPress={() => {
                  onRegionChange('');
                  setModalVisible(false);
                }}
              >
                <Text style={[styles.optionText, !region && styles.optionTextActive]}>{firstOptionLabel}</Text>
              </TouchableOpacity>
              {options.map((loc) => (
                <TouchableOpacity
                  key={loc.id}
                  style={[styles.option, region === loc.name && styles.optionActive]}
                  onPress={() => {
                    onRegionChange(loc.name);
                    setModalVisible(false);
                  }}
                >
                  <Text style={[styles.optionText, region === loc.name && styles.optionTextActive]}>{loc.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeBtnText}>Zavřít</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    minWidth: 160,
  },
  triggerLabel: { fontSize: 12, color: COLORS.sub, marginRight: 8 },
  triggerValue: { flex: 1, fontSize: 14, color: COLORS.text },
  chevron: { fontSize: 10, color: COLORS.sub },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    maxHeight: 400,
  },
  modalTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, padding: 16, paddingBottom: 8 },
  list: { maxHeight: 280 },
  option: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  optionActive: { backgroundColor: `${COLORS.violet}15` },
  optionText: { fontSize: 16, color: COLORS.text },
  optionTextActive: { color: COLORS.violet, fontWeight: '600' },
  closeBtn: { padding: 16, alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.border },
  closeBtnText: { fontSize: 16, color: COLORS.violet, fontWeight: '600' },
});
