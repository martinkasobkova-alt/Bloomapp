import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import axios from 'axios';
import { API, API_BASE } from '../config/api';
import { SECTION_HEADING, ARTICLE_TITLE } from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import { useMarkerColors } from '../hooks/useMarkerColors';
import { RichTextToolbar } from '../components/RichTextToolbar';

const COLORS = {
  violet: '#8A7CFF',
  text: '#2F3441',
  sub: '#5D6472',
  bg: '#F8F7FC',
  white: '#FFFFFF',
  border: '#E5E3ED',
};

interface Story {
  id: string;
  title?: string;
  content?: string;
  image_url?: string;
  video_url?: string;
  author_name?: string;
  author_id?: string;
  created_at?: string;
}

interface Comment {
  id: string;
  content?: string;
  username?: string;
  created_at?: string;
}

export default function StoriesScreen() {
  const { user } = useAuth();
  const markerColors = useMarkerColors();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Story | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [contentSelection, setContentSelection] = useState({ start: 0, end: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const contentInputRef = useRef<TextInput>(null);

  const fetchStories = async () => {
    try {
      const r = await axios.get(`${API}/news`, { params: { category: 'zkusenosti' } });
      setStories(r.data);
    } catch {}
    finally { setLoading(false); }
  };

  const fetchComments = async (articleId: string) => {
    try {
      const r = await axios.get(`${API}/news/${articleId}/comments`);
      setComments(r.data);
    } catch {
      setComments([]);
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

  useEffect(() => {
    if (selected) fetchComments(selected.id);
  }, [selected?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStories();
    if (selected) await fetchComments(selected.id);
    setRefreshing(false);
  };

  const handleSelect = (s: Story) => {
    setSelected(s);
    setCommentText('');
  };

  const handleAddComment = async () => {
    if (!selected || !commentText.trim()) return;
    setCommentLoading(true);
    try {
      await axios.post(`${API}/news/${selected.id}/comments`, { content: commentText.trim() });
      setCommentText('');
      fetchComments(selected.id);
    } catch (e: any) {
      Alert.alert('Chyba', e.response?.data?.detail || 'Nepodařilo se přidat komentář.');
    } finally {
      setCommentLoading(false);
    }
  };

  const pickImage = async () => {
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
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Oprávnění', 'Pro nahrání videa potřebujeme přístup k galerii.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setVideoUri(result.assets[0].uri);
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      Alert.alert('Chyba', 'Vyplňte nadpis a obsah.');
      return;
    }
    setSubmitting(true);
    setUploading(true);
    try {
      let finalImageUrl = '';
      let finalVideoUrl = '';
      if (imageUri) {
        const formData = new FormData();
        const ext = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
        formData.append('file', {
          uri: imageUri,
          type: ext === 'png' ? 'image/png' : 'image/jpeg',
          name: `photo.${ext}`,
        } as unknown as Blob);
        const r = await axios.post(`${API}/news/upload-media`, formData);
        finalImageUrl = r.data.url;
      }
      if (videoUri) {
        const formData = new FormData();
        const ext = videoUri.split('.').pop()?.toLowerCase() || 'mp4';
        formData.append('file', {
          uri: videoUri,
          type: ext === 'mov' ? 'video/quicktime' : 'video/mp4',
          name: `video.${ext}`,
        } as unknown as Blob);
        const r = await axios.post(`${API}/news/upload-media`, formData);
        finalVideoUrl = r.data.url;
      }
      await axios.post(`${API}/news`, {
        title: newTitle.trim(),
        content: newContent.trim(),
        category: 'zkusenosti',
        image_url: finalImageUrl,
        video_url: finalVideoUrl,
        thumbnail_url: finalImageUrl || undefined,
      });
      setCreateModalVisible(false);
      setNewTitle('');
      setNewContent('');
      setImageUri(null);
      setVideoUri(null);
      fetchStories();
    } catch (e: any) {
      Alert.alert('Chyba', e.response?.data?.detail || 'Nepodařilo se sdílet.');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const handleDelete = async (storyId: string) => {
    Alert.alert('Smazat', 'Opravdu smazat tento příběh?', [
      { text: 'Zrušit', style: 'cancel' },
      {
        text: 'Smazat',
        style: 'destructive',
        onPress: async () => {
          try {
            await axios.delete(`${API}/news/${storyId}`);
            setSelected(null);
            fetchStories();
          } catch {}
        },
      },
    ]);
  };

  const imageUrl = (url?: string) => {
    if (!url) return undefined;
    if (url.startsWith('http')) return url;
    return `${API_BASE}${url}`;
  };

  const stripHtml = (s?: string) => (s || '').replace(/<[^>]*>/g, '');

  if (selected) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <TouchableOpacity onPress={() => setSelected(null)} style={styles.backBtn}>
          <Text style={styles.backText}>← Zpět</Text>
        </TouchableOpacity>
        {selected.image_url && (
          <Image source={{ uri: imageUrl(selected.image_url) }} style={styles.detailImage} resizeMode="cover" />
        )}
        {selected.video_url && (
          <Video
            source={{ uri: imageUrl(selected.video_url) }}
            style={styles.detailVideo}
            useNativeControls
            resizeMode="contain"
          />
        )}
        <Text style={styles.articleTitle}>{selected.title}</Text>
        <Text style={styles.articleMeta}>
          {selected.author_name} · {selected.created_at ? new Date(selected.created_at).toLocaleDateString('cs-CZ') : ''}
        </Text>
        <Text style={styles.articleContent}>{stripHtml(selected.content)}</Text>

        {user && selected.author_id === user.id && (
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(selected.id)}>
            <Text style={styles.deleteBtnText}>Smazat příběh</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.commentsTitle}>Komentáře ({comments.length})</Text>
        {comments.map((c) => (
          <View key={c.id} style={styles.commentBubble}>
            <Text style={styles.commentContent}>{c.content}</Text>
            <Text style={styles.commentMeta}>
              {c.username} · {c.created_at ? new Date(c.created_at).toLocaleDateString('cs-CZ') : ''}
            </Text>
          </View>
        ))}

        {user && (
          <View style={styles.commentForm}>
            <TextInput
              style={styles.commentInput}
              placeholder="Napište komentář..."
              placeholderTextColor={COLORS.sub}
              value={commentText}
              onChangeText={setCommentText}
              multiline
            />
            <TouchableOpacity
              style={[styles.commentBtn, (!commentText.trim() || commentLoading) && styles.commentBtnDisabled]}
              onPress={handleAddComment}
              disabled={!commentText.trim() || commentLoading}
            >
              <Text style={styles.commentBtnText}>{commentLoading ? 'Odesílám...' : 'Odeslat'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.titleRow}>
        <View style={[styles.titleDot, { backgroundColor: markerColors?.stories || '#8A7CFF' }]} />
        <Text style={styles.title}>Zkušenosti komunity</Text>
      </View>
      <Text style={styles.subtitle}>Čtěte příběhy a sdílejte své zkušenosti</Text>

      {user && (
        <TouchableOpacity style={styles.createBtn} onPress={() => setCreateModalVisible(true)}>
          <Text style={styles.createBtnText}>+ Přidat příběh</Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <ActivityIndicator color={COLORS.violet} style={{ marginTop: 24 }} />
      ) : (
        stories.map((s) => (
          <TouchableOpacity key={s.id} style={styles.card} onPress={() => handleSelect(s)} activeOpacity={0.8}>
            {s.image_url && (
              <Image source={{ uri: imageUrl(s.image_url) }} style={styles.cardImage} resizeMode="cover" />
            )}
            <Text style={styles.cardTitle}>{s.title}</Text>
            <Text style={styles.cardMeta}>
              {s.author_name} · {s.created_at ? new Date(s.created_at).toLocaleDateString('cs-CZ') : ''}
            </Text>
            {s.content ? (
              <Text style={styles.cardPreview} numberOfLines={2}>{stripHtml(s.content)}</Text>
            ) : null}
          </TouchableOpacity>
        ))
      )}

      {!loading && stories.length === 0 && (
        <Text style={styles.emptyText}>Zatím žádné příběhy. Buďte první, kdo sdílí!</Text>
      )}

      <Modal visible={createModalVisible} animationType="fade" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Nový příběh</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nadpis *"
              placeholderTextColor={COLORS.sub}
              value={newTitle}
              onChangeText={setNewTitle}
            />
            <Text style={styles.mediaLabel}>Fotka / video</Text>
            <View style={styles.mediaRow}>
              <TouchableOpacity style={styles.mediaBtn} onPress={pickImage} disabled={uploading}>
                <Text style={styles.mediaBtnText}>📷 Fotka</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mediaBtn} onPress={pickVideo} disabled={uploading}>
                <Text style={styles.mediaBtnText}>🎬 Video</Text>
              </TouchableOpacity>
            </View>
            {(imageUri || videoUri) && (
              <View style={styles.mediaPreview}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.mediaThumb} resizeMode="cover" />
                ) : (
                  <Text style={styles.mediaThumbText}>Video vybráno</Text>
                )}
                {videoUri && imageUri ? <Text style={styles.mediaThumbExtra}>+ Video</Text> : null}
                <TouchableOpacity style={styles.mediaRemove} onPress={() => { setImageUri(null); setVideoUri(null); }}>
                  <Text style={styles.mediaRemoveText}>× Odebrat</Text>
                </TouchableOpacity>
              </View>
            )}
            <Text style={styles.toolbarLabel}>Obsah *</Text>
            <RichTextToolbar
              value={newContent}
              onChange={setNewContent}
              selection={contentSelection}
              inputRef={contentInputRef as React.RefObject<{ focus: () => void } | null>}
            />
            <TextInput
              ref={contentInputRef}
              style={[styles.modalInput, styles.modalTextArea]}
              placeholder="Napište svůj příběh... (můžete použít tučné, kurzívu, nadpisy)"
              placeholderTextColor={COLORS.sub}
              value={newContent}
              onChangeText={setNewContent}
              onSelectionChange={(e) => setContentSelection({ start: e.nativeEvent.selection.start, end: e.nativeEvent.selection.end })}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setCreateModalVisible(false); setNewTitle(''); setNewContent(''); setImageUri(null); setVideoUri(null); }}>
                <Text style={styles.cancelBtnText}>Zrušit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, (submitting || !newTitle.trim() || !newContent.trim()) && styles.submitBtnDisabled]}
                onPress={handleCreate}
                disabled={submitting || !newTitle.trim() || !newContent.trim()}
              >
                <Text style={styles.submitBtnText}>{submitting ? (uploading ? 'Nahrávám...' : 'Odesílám...') : 'Sdílet'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
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
  createBtn: { backgroundColor: COLORS.violet, borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 16 },
  createBtnText: { color: COLORS.white, fontWeight: '600' },
  card: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, overflow: 'hidden' },
  cardImage: { width: '100%', height: 120, borderRadius: 8, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  cardMeta: { fontSize: 12, color: COLORS.sub, marginTop: 4 },
  cardPreview: { fontSize: 14, color: COLORS.sub, marginTop: 8 },
  emptyText: { fontSize: 14, color: COLORS.sub, textAlign: 'center', marginTop: 24 },
  backBtn: { marginBottom: 16 },
  backText: { fontSize: 16, color: COLORS.violet },
  detailImage: { width: '100%', height: 200, borderRadius: 12, marginBottom: 16 },
  detailVideo: { width: '100%', aspectRatio: 16 / 9, borderRadius: 12, marginBottom: 16 },
  articleTitle: ARTICLE_TITLE,
  articleMeta: { fontSize: 14, color: COLORS.sub, marginBottom: 16 },
  articleContent: { fontSize: 16, color: COLORS.text, lineHeight: 24, marginBottom: 24 },
  commentsTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: 12 },
  commentBubble: { backgroundColor: `${COLORS.violet}10`, borderRadius: 8, padding: 12, marginBottom: 8 },
  commentContent: { fontSize: 14, color: COLORS.text },
  commentMeta: { fontSize: 11, color: COLORS.sub, marginTop: 6 },
  commentForm: { marginTop: 16 },
  commentInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, fontSize: 14, color: COLORS.text, minHeight: 60, textAlignVertical: 'top', marginBottom: 8 },
  commentBtn: { backgroundColor: COLORS.violet, padding: 12, borderRadius: 8, alignItems: 'center' },
  commentBtnDisabled: { opacity: 0.6 },
  commentBtnText: { color: COLORS.white, fontWeight: '600' },
  deleteBtn: { backgroundColor: '#dc2626', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 16 },
  deleteBtnText: { color: COLORS.white, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalScroll: { maxHeight: '90%', backgroundColor: COLORS.white, borderRadius: 16 },
  modalContent: { padding: 20, paddingBottom: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  modalInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, fontSize: 16, color: COLORS.text, marginBottom: 12 },
  mediaLabel: { fontSize: 12, color: COLORS.sub, marginBottom: 6 },
  mediaRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  mediaBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  mediaBtnText: { fontSize: 14, color: COLORS.sub },
  mediaPreview: { marginBottom: 12, position: 'relative' },
  mediaThumb: { width: '100%', height: 120, borderRadius: 8 },
  mediaThumbText: { padding: 24, textAlign: 'center', color: COLORS.sub, backgroundColor: `${COLORS.border}40`, borderRadius: 8 },
  mediaThumbExtra: { marginTop: 4, fontSize: 13, color: COLORS.sub },
  mediaRemove: { marginTop: 8 },
  mediaRemoveText: { fontSize: 14, color: COLORS.violet },
  toolbarLabel: { fontSize: 12, color: COLORS.sub, marginBottom: 4 },
  modalTextArea: { minHeight: 220, textAlignVertical: 'top', marginTop: 0 },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelBtnText: { fontSize: 16, color: COLORS.sub },
  submitBtn: { flex: 1, backgroundColor: COLORS.violet, padding: 12, borderRadius: 10, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 16, color: COLORS.white, fontWeight: '600' },
});
