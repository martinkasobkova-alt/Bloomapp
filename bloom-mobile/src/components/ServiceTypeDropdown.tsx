/**
 * Dropdown pro výběr druhu služby – předpřipravené typy z API
 */
import React, { useState } from 'react';
import { Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Pressable } from 'react-native';

const COLORS = {
  violet: '#8A7CFF',
  text: '#2F3441',
  sub: '#5D6472',
  border: '#E5E3ED',
  white: '#FFFFFF',
};

interface ServiceTypeItem {
  id: string;
  name: string;
}

interface ServiceTypeDropdownProps {
  options: ServiceTypeItem[];
  value: string;
  onSelect: (id: string) => void;
  label?: string;
  placeholder?: string;
}

export function ServiceTypeDropdown({
  options,
  value,
  onSelect,
  label = 'Druh služby',
  placeholder = 'Vyberte druh služby',
}: ServiceTypeDropdownProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const selected = options.find((o) => o.id === value);
  const displayText = selected?.name || placeholder;

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
            <Text style={styles.modalTitle}>Vybrat {label.toLowerCase()}</Text>
            <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
              {options.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.option, value === opt.id && styles.optionActive]}
                  onPress={() => {
                    onSelect(opt.id);
                    setModalVisible(false);
                  }}
                >
                  <Text style={[styles.optionText, value === opt.id && styles.optionTextActive]}>{opt.name}</Text>
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
