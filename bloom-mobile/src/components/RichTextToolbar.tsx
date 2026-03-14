/**
 * Toolbar pro formátování textu – stejné možnosti jako web (tučné, kurzíva, seznam, barvy, smajlíky).
 * Vkládá HTML tagy na pozici kurzoru.
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';

const COLORS = {
  violet: '#8A7CFF',
  text: '#2F3441',
  sub: '#5D6472',
  border: '#E5E3ED',
};

const TEXT_COLORS = [
  { name: 'Černá', value: '#2F3441' },
  { name: 'Šedá', value: '#5D6472' },
  { name: 'Fialová', value: '#8A7CFF' },
  { name: 'Růžová', value: '#F5A9B8' },
  { name: 'Modrá', value: '#5BCEFA' },
  { name: 'Zelená', value: '#6FE3C1' },
  { name: 'Červená', value: '#E53935' },
  { name: 'Oranžová', value: '#F57C00' },
];

const EMOJIS = [
  '😀','😊','😂','🥰','😍','😎','😘','🥺','😢','😭','😡','🤔','😴','🤗','😏',
  '🙄','🤩','😇','🤣','😅','❤️','🧡','💛','💚','💙','💜','🖤','🤍','💕','💖',
  '👍','👎','👋','🙌','🤝','🙏','💪','✌️','🤞','👌','🌸','🌺','🌻','🌈','☀️',
  '🌙','⭐','🎉','🎁','🎵','🍕','🌍','💻','📱','🔥','✨','💯','🎭','🦋','🌷',
];

interface RichTextToolbarProps {
  value: string;
  onChange: (v: string) => void;
  selection: { start: number; end: number };
  inputRef: React.RefObject<{ focus: () => void } | null>;
}

const wrapTag = (before: string, after: string) => (content: string, start: number, end: number) => {
  const sel = content.slice(start, end);
  return content.slice(0, start) + before + sel + after + content.slice(end);
};

export function RichTextToolbar({ value, onChange, selection, inputRef }: RichTextToolbarProps): React.ReactElement {
  const { start, end } = selection;
  const [showColors, setShowColors] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);

  const apply = (fn: (c: string, s: number, e: number) => string) => {
    const newVal = fn(value, start, end);
    onChange(newVal);
    inputRef.current?.focus();
  };

  const applyInsert = (fn: (c: string, s: number) => string) => {
    const newVal = fn(value, start);
    onChange(newVal);
    inputRef.current?.focus();
  };

  const insertEmoji = (emoji: string) => {
    applyInsert((c, s) => c.slice(0, s) + emoji + c.slice(s));
    setShowEmojis(false);
  };

  const applyColor = (color: string) => {
    apply((c, s, e) => {
      const sel = c.slice(s, e);
      return c.slice(0, s) + `<span style="color:${color}">${sel}</span>` + c.slice(e);
    });
    setShowColors(false);
  };

  const Btn = ({ label, onPress }: { label: string; onPress: () => void }) => (
    <TouchableOpacity style={styles.btn} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.btnText}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.toolbar}>
      <Btn label="H1" onPress={() => apply(wrapTag('<h2>', '</h2>'))} />
      <Btn label="H2" onPress={() => apply(wrapTag('<h3>', '</h3>'))} />
      <Btn label="H3" onPress={() => apply(wrapTag('<h4>', '</h4>'))} />
      <View style={styles.sep} />
      <Btn label="B" onPress={() => apply(wrapTag('<b>', '</b>'))} />
      <Btn label="I" onPress={() => apply(wrapTag('<i>', '</i>'))} />
      <View style={styles.sep} />
      <Btn label="•" onPress={() => applyInsert((c, s) => c.slice(0, s) + '<ul><li></li></ul>' + c.slice(s))} />
      <Btn label="Link" onPress={() => applyInsert((c, s) => c.slice(0, s) + '<a href="https://">odkaz</a>' + c.slice(s))} />
      <View style={styles.sep} />
      <TouchableOpacity style={styles.btn} onPress={() => { setShowEmojis(false); setShowColors((v) => !v); }} activeOpacity={0.7}>
        <Text style={styles.btnText}>A</Text>
      </TouchableOpacity>
      {showColors && (
        <View style={styles.colorRow}>
          {TEXT_COLORS.map(({ value: color }) => (
            <TouchableOpacity
              key={color}
              style={[styles.colorBtn, { backgroundColor: color }]}
              onPress={() => applyColor(color)}
            />
          ))}
        </View>
      )}
      <TouchableOpacity style={styles.btn} onPress={() => { setShowColors(false); setShowEmojis((v) => !v); }} activeOpacity={0.7}>
        <Text style={styles.btnText}>😀</Text>
      </TouchableOpacity>
      {showEmojis && (
        <Modal visible transparent animationType="fade">
          <Pressable style={styles.emojiOverlay} onPress={() => setShowEmojis(false)}>
            <Pressable style={styles.emojiPicker} onPress={() => {}}>
              <ScrollView style={styles.emojiScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.emojiGrid}>
                  {EMOJIS.map((e) => (
                    <TouchableOpacity key={e} style={styles.emojiBtn} onPress={() => insertEmoji(e)}>
                      <Text style={styles.emojiText}>{e}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: `${COLORS.border}40`,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 4,
  },
  btn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: COLORS.text + '08',
  },
  btnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  sep: {
    width: 1,
    height: 18,
    backgroundColor: COLORS.border,
    marginHorizontal: 2,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingVertical: 8,
    width: '100%',
  },
  colorBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emojiOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  emojiPicker: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 12,
    maxHeight: 200,
  },
  emojiScroll: { maxHeight: 180 },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  emojiBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: { fontSize: 22 },
});
