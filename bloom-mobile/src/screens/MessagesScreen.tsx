import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Alert,
  Image,
  Pressable,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import axios from 'axios';
import { API, buildMediaUrl } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { SECTION_HEADING, BLOOM_FONTS } from '../theme/typography';
import { BLOOM_COLORS } from '../theme/colors';
import { OutlineIcon } from '../components/OutlineIcon';

const COLORS = {
  violet: '#8A7CFF',
  text: '#2F3441',
  sub: '#5D6472',
  bg: '#F8F7FC',
  white: '#FFFFFF',
  border: '#E5E3ED',
};

interface Conversation {
  user_id: string;
  username?: string;
  avatar?: string;
  last_message?: string;
  last_at?: string;
  unread?: number;
}

interface Message {
  id: string;
  from_user_id: string;
  to_user_id: string;
  content?: string;
  created_at?: string;
  media_url?: string;
  media_type?: string;
}

interface SearchUser {
  id: string;
  username?: string;
  avatar?: string;
}

function getExt(mediaUrl: string): string {
  const m = mediaUrl.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return m ? m[1].toLowerCase() : '';
}

const IOS_UNSUPPORTED_AUDIO = ['webm', 'ogg'];

// Emoji picker – stejné emotikony jako na webu
const EMOJIS = [
  '😀','😊','😂','🥰','😍','😎','😘','🥺','😢','😭','😡','🤔','😴','🤗','😏',
  '🙄','🤩','😇','🤣','😅','❤️','🧡','💛','💚','💙','💜','🖤','🤍','💕','💖',
  '👍','👎','👋','🙌','🤝','🙏','💪','✌️','🤞','👌','🌸','🌺','🌻','🌈','☀️',
  '🌙','⭐','🎉','🎁','🎵','🍕','🌍','💻','📱','🔥','✨','💯','🎭','🦋','🌷',
];

function AudioMessage({ mediaUrl, token, isSent, messageId }: { mediaUrl: string; token: string | null; isSent: boolean; messageId: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing' | 'error' | 'unsupported'>('idle');

  const ext = getExt(mediaUrl);
  const isIosWebm = Platform.OS === 'ios' && IOS_UNSUPPORTED_AUDIO.includes(ext);

  const play = async () => {
    if (isIosWebm) {
      setStatus('unsupported');
      return;
    }

    const url = buildMediaUrl(mediaUrl, token);
    setStatus('loading');

    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
        shouldDuckAndroid: true,
      });
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true }
      );
      setStatus('playing');
      sound.setOnPlaybackStatusUpdate((st) => {
        if (st.isLoaded && st.didJustFinish) setStatus('idle');
      });
    } catch (e) {
      setStatus('error');
    }
  };

  return (
    <TouchableOpacity onPress={play} style={[styles.audioBtn, isSent && styles.audioBtnSent]} disabled={status === 'loading'}>
      <Text style={[styles.audioBtnText, isSent && styles.audioBtnTextSent]}>
        {status === 'loading' ? '⏳' : status === 'playing' ? '🔊' : status === 'error' || status === 'unsupported' ? '⚠' : '▶'} Hlasová zpráva
      </Text>
    </TouchableOpacity>
  );
}

export default function MessagesScreen({ route }: { route?: any }) {
  const { user, token } = useAuth();
  const openUserId = route?.params?.openUserId;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchConversations = async () => {
    try {
      const r = await axios.get(`${API}/messages/conversations`);
      setConversations(r.data);
    } catch {}
    finally { setLoading(false); }
  };

  const fetchMessages = async (userId: string) => {
    try {
      const r = await axios.get(`${API}/messages/${userId}`);
      const msgs = r.data as Message[];
      const withMedia = msgs.filter((m) => m.media_url);
      if (withMedia.length > 0) {
        console.log('[MessagesScreen] fetchMessages: media messages', { count: withMedia.length, sample: withMedia[0] });
      }
      setMessages(msgs);
    } catch {}
  };

  const handleSearch = async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const r = await axios.get(`${API}/users/search`, { params: { q: query.trim() } });
      const users = (r.data || []).filter((u: SearchUser) => u.id !== user?.id);
      setSearchResults(users);
    } catch {
      setSearchResults([]);
    }
  };

  const selectSearchUser = (u: SearchUser) => {
    setSelectedUser({ user_id: u.id, username: u.username, avatar: u.avatar });
    setSearchResults([]);
    setSearchQuery('');
    fetchMessages(u.id);
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (!openUserId || selectedUser?.user_id === openUserId) return;
    const inConv = conversations.find((c) => c.user_id === openUserId);
    if (inConv) {
      setSelectedUser(inConv);
    } else {
      axios.get(`${API}/users/${openUserId}/public-profile`).then((r) => {
        setSelectedUser({
          user_id: openUserId,
          username: r.data?.username,
          avatar: r.data?.avatar || r.data?.custom_avatar,
        });
      }).catch(() => {
        setSelectedUser({ user_id: openUserId, username: 'Uživatel', avatar: undefined });
      });
    }
  }, [openUserId, conversations, selectedUser?.user_id]);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser.user_id);
      const i = setInterval(() => fetchMessages(selectedUser.user_id), 5000);
      return () => clearInterval(i);
    }
  }, [selectedUser?.user_id]);

  const sendMessage = async () => {
    if (!selectedUser || !newMessage.trim()) return;
    setSending(true);
    try {
      await axios.post(`${API}/messages`, {
        to_user_id: selectedUser.user_id,
        content: newMessage.trim(),
      });
      setNewMessage('');
      fetchMessages(selectedUser.user_id);
      fetchConversations();
    } catch {}
    finally { setSending(false); }
  };

  const sendMediaMessage = async (mediaUrl: string, mediaType: string) => {
    if (!selectedUser) return;
    setSending(true);
    try {
      await axios.post(`${API}/messages`, {
        to_user_id: selectedUser.user_id,
        content: '',
        media_url: mediaUrl,
        media_type: mediaType,
      });
      fetchMessages(selectedUser.user_id);
      fetchConversations();
    } catch {}
    finally { setSending(false); }
  };

  const handlePickImage = async () => {
    if (!selectedUser || uploading || isRecording) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Oprávnění', 'Pro nahrání fotky potřebujeme přístup k galerii.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if ((asset.fileSize ?? 0) > 5 * 1024 * 1024) return;
    setUploading(true);
    try {
      const formData = new FormData();
      const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeType = asset.mimeType || (ext === 'png' ? 'image/png' : 'image/jpeg');
      formData.append('file', {
        uri: asset.uri,
        type: mimeType,
        name: `photo.${ext}`,
      } as unknown as Blob);
      const r = await axios.post(`${API}/messages/upload-media`, formData);
      await sendMediaMessage(r.data.url, r.data.media_type);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string };
      const msg = e?.response?.data?.detail || e?.message || 'Nepodařilo se nahrát obrázek. Backend: ' + API;
      Alert.alert('Chyba', String(msg));
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    if (!selectedUser || uploading) return;
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') return;
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch {}
  };

  const stopRecording = async () => {
    const rec = recordingRef.current;
    if (!rec || !selectedUser) return;
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
    setRecordingSeconds(0);
    recordingRef.current = null;
    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      if (!uri) return;
      setUploading(true);
      const ext = uri.includes('.m4a') ? '.m4a' : uri.includes('.webm') ? '.webm' : '.m4a';
      const mimeType = ext === '.webm' ? 'audio/webm' : 'audio/mp4';
      const formData = new FormData();
      formData.append('file', {
        uri,
        type: mimeType,
        name: `voice${ext}`,
      } as unknown as Blob);
      const r = await axios.post(`${API}/messages/upload-media`, formData);
      await sendMediaMessage(r.data.url, 'audio');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string };
      const msg = e?.response?.data?.detail || e?.message || 'Nepodařilo se nahrát hlasovou zprávu. Backend: ' + API;
      Alert.alert('Chyba', String(msg));
    }
    finally { setUploading(false); }
  };

  const renderMediaMessage = (m: Message) => {
    if (!m.media_url) return null;
    const src = buildMediaUrl(m.media_url, token);
    const isSent = m.from_user_id === user?.id;
    if (m.media_type === 'image') {
      return (
        <Pressable onPress={() => setLightboxUri(src)} style={styles.imageBubbleWrap}>
          <View style={styles.imageBubble}>
            <Image source={{ uri: src }} style={styles.imageThumb} resizeMode="cover" />
          </View>
        </Pressable>
      );
    }
    if (m.media_type === 'audio') {
      return <AudioMessage mediaUrl={m.media_url} token={token} isSent={isSent} messageId={m.id} />;
    }
    return null;
  };

  const isFromMe = (m: Message) => m.from_user_id === user?.id;

  const insertEmoji = (emoji: string) => {
    setNewMessage((prev) => prev + emoji);
    setEmojiOpen(false);
  };

  console.log('[MessagesScreen] rendered', { selectedUser: !!selectedUser, messagesCount: messages.length, hasMedia: messages.some((m) => m.media_url) });

  if (selectedUser) {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        {lightboxUri && (
          <Modal visible transparent animationType="fade">
            <Pressable style={styles.lightbox} onPress={() => setLightboxUri(null)}>
              <Image source={{ uri: lightboxUri }} style={styles.lightboxImage} resizeMode="contain" />
            </Pressable>
          </Modal>
        )}
        {emojiOpen && (
          <Modal visible transparent animationType="slide">
            <Pressable style={styles.emojiOverlay} onPress={() => setEmojiOpen(false)}>
              <Pressable style={styles.emojiPicker} onPress={(e) => e.stopPropagation()}>
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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedUser(null)}>
            <Text style={styles.backText}>← Zpět</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{selectedUser.username || 'Chat'}</Text>
        </View>
        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          renderItem={({ item }) => {
            const isImageOnly = item.media_type === 'image' && !item.content;
            const bubbleStyle = isImageOnly
              ? [styles.messageBubble, isFromMe(item) ? styles.messageBubbleImageMe : styles.messageBubbleImageThem]
              : [styles.messageBubble, isFromMe(item) ? styles.messageBubbleMe : styles.messageBubbleThem];
            return (
            <View style={bubbleStyle}>
              {item.content ? <Text style={[styles.messageText, isFromMe(item) && styles.messageTextMe]}>{item.content}</Text> : null}
              {renderMediaMessage(item)}
              <Text style={[styles.messageTime, isFromMe(item) && styles.messageTimeMe]}>
                {item.created_at ? new Date(item.created_at).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }) : ''}
              </Text>
            </View>
          );}}
        />
        <View style={styles.inputRow}>
          <View style={styles.attachIconsRow}>
            <TouchableOpacity
              style={[styles.attachBtn, (uploading || isRecording) && styles.attachBtnDisabled]}
              onPress={() => setEmojiOpen(true)}
              disabled={uploading || isRecording}
            >
              <OutlineIcon name="smile" size={20} color={(uploading || isRecording) ? COLORS.border : COLORS.sub} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.attachBtn, (uploading || isRecording) && styles.attachBtnDisabled]}
              onPress={handlePickImage}
              disabled={uploading || isRecording}
            >
              <OutlineIcon name="camera" size={20} color={(uploading || isRecording) ? COLORS.border : COLORS.sub} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.attachBtn, isRecording && styles.recordBtnActive, uploading && styles.attachBtnDisabled]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={uploading}
            >
              <OutlineIcon name="mic" size={20} color={isRecording ? '#EF4444' : (uploading ? COLORS.border : COLORS.sub)} />
            </TouchableOpacity>
          </View>
          {isRecording && (
            <Text style={styles.recordingTimer}>
              {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:{String(recordingSeconds % 60).padStart(2, '0')}
            </Text>
          )}
          {uploading && <ActivityIndicator size="small" color={COLORS.sub} style={styles.uploadIndicator} />}
          <TextInput
            style={styles.input}
            placeholder={isRecording ? 'Nahrávám...' : 'Napsat zprávu...'}
            placeholderTextColor={COLORS.sub}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={2000}
            onSubmitEditing={sendMessage}
            editable={!isRecording}
          />
          <TouchableOpacity style={[styles.sendBtn, (sending || !newMessage.trim()) && styles.sendBtnDisabled]} onPress={sendMessage} disabled={sending || !newMessage.trim()}>
            {sending ? <ActivityIndicator size="small" color={COLORS.white} /> : <OutlineIcon name="send" size={20} color={COLORS.white} />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  console.log('[MessagesScreen] rendered (list view)');
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Zprávy</Text>
      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="Hledat uživatele..."
          placeholderTextColor={COLORS.sub}
          value={searchQuery}
          onChangeText={(val) => {
            setSearchQuery(val);
            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
            if (!val.trim()) {
              setSearchResults([]);
              return;
            }
            searchDebounceRef.current = setTimeout(() => handleSearch(val), 280);
          }}
        />
      </View>
      {searchResults.length > 0 && (
        <ScrollView style={styles.searchResults} keyboardShouldPersistTaps="handled">
          {searchResults.map((u) => (
            <TouchableOpacity
              key={u.id}
              style={styles.searchResultItem}
              onPress={() => selectSearchUser(u)}
              activeOpacity={0.7}
            >
              <View style={styles.avatarSmall}>
                <Text style={styles.avatarText}>{(u.username || '?').charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.searchResultName}>{u.username || 'Uživatel'}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      {loading ? (
        <ActivityIndicator color={COLORS.violet} style={{ marginTop: 24 }} />
      ) : conversations.length === 0 && searchResults.length === 0 ? (
        <Text style={styles.empty}>Žádné konverzace. Vyhledejte uživatele výše.</Text>
      ) : searchResults.length === 0 ? (
        <FlatList
          data={conversations}
          keyExtractor={(c) => c.user_id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.convItem} onPress={() => setSelectedUser(item)} activeOpacity={0.7}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(item.username || '?').charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.convBody}>
                <Text style={styles.convName}>{item.username || 'Uživatel'}</Text>
                <Text style={styles.convPreview} numberOfLines={1}>{item.last_message || 'Žádná zpráva'}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  title: { ...SECTION_HEADING, padding: 20 },
  searchBox: { paddingHorizontal: 20, paddingBottom: 12 },
  searchInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  searchResults: { paddingHorizontal: 20, marginBottom: 12, maxHeight: 200 },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.white,
    marginBottom: 6,
    borderRadius: 12,
  },
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.violet,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  searchResultName: { fontSize: 16, fontFamily: BLOOM_FONTS.semiBold, color: BLOOM_COLORS.sub },
  empty: { textAlign: 'center', color: COLORS.sub, marginTop: 40 },
  convItem: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: COLORS.white, marginHorizontal: 20, marginBottom: 8, borderRadius: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.violet, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: '600', color: COLORS.white },
  convBody: { flex: 1 },
  convName: { fontSize: 16, fontFamily: BLOOM_FONTS.semiBold, color: BLOOM_COLORS.sub },
  convPreview: { fontSize: 14, color: COLORS.sub, marginTop: 2 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backText: { fontSize: 16, color: COLORS.violet, marginRight: 16 },
  headerTitle: { fontSize: 18, fontFamily: BLOOM_FONTS.semiBold, color: BLOOM_COLORS.sub },
  messageList: { flex: 1 },
  messageListContent: { padding: 16, paddingBottom: 8 },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 8, alignSelf: 'flex-start' },
  messageBubbleMe: { alignSelf: 'flex-end', backgroundColor: COLORS.violet },
  messageBubbleThem: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  messageText: { fontSize: 16, color: COLORS.text },
  messageTextMe: { color: COLORS.white },
  messageTime: { fontSize: 11, color: COLORS.sub, marginTop: 4 },
  messageTimeMe: { color: 'rgba(255,255,255,0.8)' },
  mediaWrap: { marginTop: 6 },
  mediaImage: { width: 200, maxHeight: 200, borderRadius: 8 },
  imageBubbleWrap: { marginTop: 6 },
  imageBubble: { borderRadius: 12, overflow: 'hidden', backgroundColor: 'transparent' },
  imageThumb: { width: 200, height: 200 },
  messageBubbleImageMe: { alignSelf: 'flex-end', backgroundColor: 'transparent', padding: 0, paddingBottom: 4 },
  messageBubbleImageThem: { alignSelf: 'flex-start', backgroundColor: 'transparent', padding: 0, paddingBottom: 4 },
  audioBtn: { marginTop: 6, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 8, alignSelf: 'flex-start' },
  audioBtnSent: { backgroundColor: 'rgba(255,255,255,0.3)' },
  audioBtnText: { fontSize: 14, color: COLORS.text },
  audioBtnTextSent: { color: COLORS.white },
  lightbox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  lightboxImage: { width: '100%', height: '80%' },
  emojiOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  emojiPicker: { backgroundColor: COLORS.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 12, maxHeight: 220 },
  emojiScroll: { maxHeight: 200 },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  emojiBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  emojiText: { fontSize: 22 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border },
  attachIconsRow: { flexDirection: 'row', alignItems: 'center', marginRight: 6 },
  attachBtn: { padding: 4, justifyContent: 'center', alignItems: 'center' },
  attachBtnDisabled: { opacity: 0.4 },
  recordBtnActive: { backgroundColor: 'rgba(239,68,68,0.2)', borderRadius: 8 },
  recordBtnTextActive: { color: '#EF4444' },
  recordingTimer: { fontSize: 12, color: '#EF4444', alignSelf: 'center', marginRight: 4 },
  uploadIndicator: { marginRight: 4, alignSelf: 'center' },
  input: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 16, color: COLORS.text, maxHeight: 100, marginRight: 8 },
  sendBtn: { backgroundColor: COLORS.violet, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.7 },
});
