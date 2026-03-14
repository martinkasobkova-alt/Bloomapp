import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAvatarImage } from '../components/Layout';
import { Input } from '../components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { toast } from 'sonner';
import { Search, Send, ArrowLeft, MessageCircle, ExternalLink, Smile, Image, Video, X, ZoomIn, Loader, Mic, MicOff, Trash2 } from 'lucide-react';

import { API } from '../lib/api';
import { useAppSettings } from '../context/AppSettingsContext';
import { SectionHeader } from '../components/SectionHeader';
const MEDIA_BASE = process.env.REACT_APP_BACKEND_URL;

// Simple emoji picker
const EMOJIS = [
  '😀','😊','😂','🥰','😍','😎','😘','🥺','😢','😭','😡','🤔','😴','🤗','😏',
  '🙄','🤩','😇','🤣','😅','❤️','🧡','💛','💚','💙','💜','🖤','🤍','💕','💖',
  '👍','👎','👋','🙌','🤝','🙏','💪','✌️','🤞','👌','🌸','🌺','🌻','🌈','☀️',
  '🌙','⭐','🎉','🎁','🎵','🍕','🌍','💻','📱','🔥','✨','💯','🎭','🦋','🌷',
];

const EmojiPicker = ({ onSelect }) => (
  <div className="grid grid-cols-8 gap-0.5 p-2 w-[240px] max-h-[180px] overflow-y-auto bg-white">
    {EMOJIS.map(e => (
      <button key={e} type="button" onClick={() => onSelect(e)}
        className="text-lg hover:bg-muted rounded p-1 transition-colors leading-none">{e}</button>
    ))}
  </div>
);

// Lightbox for image preview
const Lightbox = ({ src, onClose }) => (
  <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
    <button className="absolute top-4 right-4 text-white hover:text-gray-300" onClick={onClose}><X className="w-8 h-8" /></button>
    <img src={src} alt="Preview" className="max-w-full max-h-[90vh] object-contain rounded-lg" onClick={e => e.stopPropagation()} />
  </div>
);

const MessagesPage = () => {
  const { user } = useAuth();
  const { markerColors } = useAppSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const messagesContainerRef = useRef(null);
  const prevMsgCountRef = useRef(0);
  const textareaRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  // Track if we already processed the initial startChatWith
  const initialChatHandled = useRef(false);

  const fetchConversations = useCallback(async () => {
    try { const r = await axios.get(`${API}/messages/conversations`); setConversations(r.data); }
    catch {} finally { setLoading(false); }
  }, []);

  const fetchMessages = useCallback(async (userId) => {
    try { const r = await axios.get(`${API}/messages/${userId}`); setMessages(r.data); } catch {}
  }, []);

  const selectConversation = useCallback((conv) => {
    setSelectedUser(conv); setSearchResults([]); setSearchQuery('');
    fetchMessages(conv.user_id);
  }, [fetchMessages]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // Auto-open conversation when navigated with startChatWith state
  useEffect(() => {
    if (initialChatHandled.current) return;
    const startChatWith = location.state?.startChatWith;
    if (!startChatWith || loading) return;
    initialChatHandled.current = true;
    // Check if conversation already exists
    const existing = conversations.find(c => c.user_id === startChatWith);
    if (existing) {
      selectConversation(existing);
    } else {
      // Fetch user and open new conversation
      axios.get(`${API}/users/${startChatWith}/public-profile`)
        .then(r => {
          const profile = r.data;
          setSelectedUser({ user_id: startChatWith, username: profile.username, avatar: profile.avatar || 'fem-pink' });
          fetchMessages(startChatWith);
        })
        .catch(() => toast.error('Uživatel nenalezen'));
    }
  }, [loading, conversations, location.state, selectConversation, fetchMessages]);

  // Lock body scroll, hide footer, and constrain main height
  useEffect(() => {
    document.body.classList.add('messages-active');
    const main = document.querySelector('main');
    const applyStyles = () => {
      if (!main) return;
      const isMobile = window.matchMedia('(max-width: 768px)').matches;
      if (isMobile && selectedUser) {
        main.style.height = '100dvh';
        main.style.maxHeight = '100dvh';
        main.style.paddingTop = '59px';
      } else {
        main.style.height = 'calc(100dvh - 60px)';
        main.style.maxHeight = 'calc(100dvh - 60px)';
        main.style.paddingTop = '';
      }
      main.style.overflow = 'hidden';
      main.style.flex = 'none';
    };
    applyStyles();
    const mql = window.matchMedia('(max-width: 768px)');
    mql.addEventListener('change', applyStyles);
    return () => {
      document.body.classList.remove('messages-active');
      mql.removeEventListener('change', applyStyles);
      if (main) {
        main.style.height = '';
        main.style.maxHeight = '';
        main.style.overflow = '';
        main.style.flex = '';
        main.style.paddingTop = '';
      }
    };
  }, [selectedUser]);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser.user_id);
      const i = setInterval(() => fetchMessages(selectedUser.user_id), 5000);
      return () => clearInterval(i);
    }
  }, [selectedUser, fetchMessages]);

  // --- Smart auto-scroll ---
  const isNearBottomRef = useRef(true);

  const scrollToBottom = useCallback((smooth = false) => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'instant' });
  }, []);

  // Track whether user is near the bottom of the scroll area
  const handleMessagesScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    // "Near bottom" = within 120px of the end
    isNearBottomRef.current = (el.scrollHeight - el.scrollTop - el.clientHeight) < 120;
  }, []);

  useEffect(() => {
    // When new messages arrive, only auto-scroll if user is already near the bottom
    // or if it's the initial load for this conversation
    if (messages.length > prevMsgCountRef.current) {
      if (isNearBottomRef.current || prevMsgCountRef.current === 0) {
        // Use requestAnimationFrame so DOM has painted the new message
        requestAnimationFrame(() => scrollToBottom(prevMsgCountRef.current > 0));
      }
    }
    prevMsgCountRef.current = messages.length;
  }, [messages.length, scrollToBottom]);

  // Always scroll to bottom when opening a conversation
  useEffect(() => {
    if (selectedUser) {
      prevMsgCountRef.current = 0; // reset so next message load scrolls
      isNearBottomRef.current = true;
      // Ensure scroll after messages render (handles initial load and fast subsequent loads)
      const t = setTimeout(() => scrollToBottom(false), 100);
      return () => clearTimeout(t);
    }
  }, [selectedUser, scrollToBottom]);

  // Track mobile keyboard via visualViewport
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      const kbH = Math.max(0, window.innerHeight - vv.height);
      document.documentElement.style.setProperty('--keyboard-height', `${kbH}px`);
    };
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, []);

  // Scroll messages to bottom when input receives focus (mobile keyboard opens)
  const handleInputFocus = useCallback(() => {
    setTimeout(() => scrollToBottom(true), 300);
  }, [scrollToBottom]);

  // Auto-resize textarea: grow up to max, then enable internal scroll
  const TEXTAREA_MAX = 120;
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const scrollH = el.scrollHeight;
    if (scrollH > TEXTAREA_MAX) {
      el.style.height = TEXTAREA_MAX + 'px';
      el.style.overflowY = 'auto';
    } else {
      el.style.height = scrollH + 'px';
      el.style.overflowY = 'hidden';
    }
    // Keep messages pinned to bottom when composer grows
    if (isNearBottomRef.current) {
      requestAnimationFrame(() => scrollToBottom(false));
    }
  }, [newMessage, scrollToBottom]);

  const handleSearch = async (query = searchQuery) => {
    if (!query.trim() || query.trim().length < 2) { setSearchResults([]); return; }
    try { const r = await axios.get(`${API}/users/search`, { params: { q: query } }); setSearchResults(r.data); }
    catch { setSearchResults([]); }
  };

  const searchDebounceRef = useRef(null);

  const selectSearchUser = (u) => {
    setSelectedUser({ user_id: u.id, username: u.username, avatar: u.avatar });
    setSearchResults([]); setSearchQuery('');
    fetchMessages(u.id);
  };

  const formatApiError = (err) => {
    const d = err?.response?.data?.detail;
    if (Array.isArray(d) && d.length > 0) return d[0].msg || JSON.stringify(d[0]);
    if (typeof d === 'string') return d;
    if (err?.response?.status === 401) return 'Přihlaste se znovu (platnost tokenu vypršela)';
    if (err?.response?.status === 404) return 'Příjemce nenalezen';
    if (!err?.response) return 'Nelze se připojit k serveru. Zkontrolujte, zda běží backend.';
    return 'Chyba při odesílání';
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim()) || !selectedUser) return;
    try {
      await axios.post(`${API}/messages`, { to_user_id: selectedUser.user_id, content: newMessage });
      setNewMessage('');
      // Reset textarea height immediately
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.overflowY = 'hidden';
      }
      isNearBottomRef.current = true; // force scroll after send
      fetchMessages(selectedUser.user_id);
      fetchConversations();
    } catch (err) {
      console.error('[Messages] Send failed:', err?.response?.status, err?.response?.data, err?.message);
      toast.error(formatApiError(err));
    }
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file || !selectedUser) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Soubor je příliš velký (max 5 MB)'); return; }
    const allowed = type === 'image' ? ['image/jpeg', 'image/png', 'image/gif'] : ['video/mp4', 'video/webm'];
    if (!allowed.includes(file.type)) { toast.error('Nepodporovaný formát souboru'); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const r = await axios.post(`${API}/messages/upload-media`, formData);
      await axios.post(`${API}/messages`, {
        to_user_id: selectedUser.user_id,
        content: '',
        media_public_id: r.data.media_public_id,
        media_resource_type: r.data.media_resource_type,
        media_type: r.data.media_type
      });
      fetchMessages(selectedUser.user_id);
      fetchConversations();
      toast.success('Média odesláno');
    } catch (err) { toast.error(formatApiError(err)); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const insertEmoji = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setEmojiOpen(false);
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Opravdu smazat tuto zprávu?')) return;
    try {
      await axios.delete(`${API}/messages/${messageId}`);
      if (selectedUser) {
        fetchMessages(selectedUser.user_id);
        fetchConversations();
      }
      toast.success('Zpráva smazána');
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    } catch {
      toast.error('Mikrofon není dostupný');
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;
    const recorder = mediaRecorderRef.current;
    recorder.onstop = async () => {
      // Strip codec suffix: "audio/webm;codecs=opus" → "audio/webm"
      const rawMime = recorder.mimeType || 'audio/webm';
      const mimeType = rawMime.split(';')[0].trim();
      const blob = new Blob(audioChunksRef.current, { type: mimeType });
      recorder.stream.getTracks().forEach(t => t.stop());
      mediaRecorderRef.current = null;
      if (!selectedUser) return;
      setUploading(true);
      try {
        const ext = mimeType.includes('mp4') ? '.m4a' : mimeType.includes('ogg') ? '.ogg' : '.webm';
        const file = new File([blob], `voice${ext}`, { type: mimeType });
        const formData = new FormData();
        formData.append('file', file);
        const r = await axios.post(`${API}/messages/upload-media`, formData);
        await axios.post(`${API}/messages`, {
          to_user_id: selectedUser.user_id, content: '',
          media_public_id: r.data.media_public_id,
          media_resource_type: r.data.media_resource_type,
          media_type: 'audio'
        });
        fetchMessages(selectedUser.user_id);
        fetchConversations();
        toast.success('Hlasová zpráva odeslána');
      } catch (err) {
        console.error('[Voice] Upload failed:', err?.response?.status, err?.response?.data, err?.message);
        toast.error(`Chyba při odesílání hlasové zprávy: ${formatApiError(err)}`);
      } finally { setUploading(false); }
    };
    recorder.stop();
    setIsRecording(false);
    clearInterval(recordingTimerRef.current);
    setRecordingSeconds(0);
  };

  const renderMediaMsg = (m) => {
    const isSent = m.from_user_id === user?.id;
    const token = localStorage.getItem('token');
    const src = m.media_url?.startsWith('http')
      ? m.media_url
      : `${MEDIA_BASE}${m.media_url}${m.media_url?.includes('?') ? '&' : '?'}token=${token}`;
    if (m.media_type === 'image') {
      return (
        <button onClick={() => setLightboxSrc(src)} className="block mt-1 group relative">
          <img src={src} alt="Obrázek" className="max-w-[220px] max-h-[200px] rounded-lg object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg flex items-center justify-center transition-colors">
            <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>
      );
    }
    if (m.media_type === 'video') {
      return <video src={src} controls className="max-w-[220px] rounded-lg mt-1" preload="metadata" />;
    }
    if (m.media_type === 'audio') {
      return (
        <audio
          src={src}
          controls
          preload="metadata"
          className="mt-1 rounded-lg"
          style={{ maxWidth: '220px', height: '36px', filter: isSent ? 'invert(1) brightness(1.5) saturate(0)' : 'none' }}
          data-testid="audio-player"
        />
      );
    }
    return null;
  };

  const isMobileChatView = !!selectedUser;
  return (
    <div className={`flex flex-col h-full overflow-hidden ${isMobileChatView ? 'messages-page--chat-open' : ''}`} data-testid="messages-page">
      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
      <div className={`flex-1 min-h-0 max-w-5xl mx-auto w-full flex flex-col overflow-hidden ${isMobileChatView ? 'px-0 md:px-4 lg:px-8' : 'px-4 sm:px-6 lg:px-8'}`}>
        {/* Header + pride-bar: hidden on mobile when in conversation detail; shown on desktop always */}
        <div className={`flex-shrink-0 ${isMobileChatView ? 'hidden md:block' : ''}`}>
          <SectionHeader
            sectionKey="messages"
            defaultTitle="Zprávy"
            defaultSubtitle=""
            defaultColor={markerColors?.messages || '#8A7CFF'}
          />
          <div className="pride-bar mb-2" />
        </div>
        <div className="grid md:grid-cols-3 md:grid-rows-1 gap-0 md:gap-3 flex-1 min-h-0">
          {/* Sidebar - hidden on mobile when chat is open */}
          <div className={`md:col-span-1 flex flex-col bg-white rounded-xl border border-border/50 min-h-0 overflow-hidden ${selectedUser ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-3 border-b border-border">
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bloom-sub/50"/>
                <Input placeholder="Hledat uživatele..." value={searchQuery} onChange={(e) => {
                  const val = e.target.value;
                  setSearchQuery(val);
                  clearTimeout(searchDebounceRef.current);
                  if (!val.trim()) { setSearchResults([]); return; }
                  searchDebounceRef.current = setTimeout(() => handleSearch(val), 280);
                }} style={{ fontSize: '16px' }} className="pl-10 text-base md:text-sm" data-testid="message-search-input" onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
              </form>
              {searchResults.length > 0 && (
                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                  {searchResults.map(u => (
                    <button key={u.id} onClick={() => selectSearchUser(u)} className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-muted text-left" data-testid={`search-user-${u.id}`}>
                      <Avatar className="w-7 h-7"><AvatarImage src={getAvatarImage(u.avatar)}/><AvatarFallback className="bg-bloom-violet text-white text-xs">{u.username?.charAt(0)}</AvatarFallback></Avatar>
                      <span className="text-sm text-bloom-text">{u.username}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? <div className="flex justify-center py-8"><div className="spinner"/></div> :
                conversations.length === 0 ? (
                  <div className="p-6 text-center">
                    <MessageCircle className="w-8 h-8 text-bloom-sub/30 mx-auto mb-2"/>
                    <p className="text-sm text-bloom-sub">Zatím žádné konverzace</p>
                    <p className="text-xs text-bloom-sub mt-1">Vyhledejte uživatele výše</p>
                  </div>
                ) : conversations.map(c => (
                  <button key={c.user_id} onClick={() => selectConversation(c)} data-testid={`conversation-${c.user_id}`}
                    className={`flex items-center gap-3 w-full p-3 text-left transition-colors border-b border-border/30 ${selectedUser?.user_id===c.user_id?'bg-bloom-violet/5':'hover:bg-muted/50'}`}>
                    <Avatar className="w-9 h-9"><AvatarImage src={getAvatarImage(c.avatar)}/><AvatarFallback className="bg-bloom-violet text-white text-xs">{c.username?.charAt(0)}</AvatarFallback></Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-bloom-text">{c.username}</span>
                        {c.unread_count > 0 && <span className="min-w-[18px] h-[18px] rounded-full bg-bloom-violet text-white text-[10px] font-bold flex items-center justify-center">{c.unread_count}</span>}
                      </div>
                      <p className="text-xs text-bloom-sub truncate">{c.last_message}</p>
                    </div>
                  </button>
                ))}
            </div>
          </div>

          {/* Chat - fullscreen on mobile when open */}
          <div className={`md:col-span-2 flex flex-col h-full min-h-0 bg-white overflow-hidden ${!selectedUser ? 'hidden md:flex' : 'flex'} ${isMobileChatView ? 'rounded-none border-0 md:rounded-xl md:border md:border-border/50 chat-panel' : 'rounded-xl border border-border/50'}`}>
            {selectedUser ? (
              <>
                <div className="p-3 border-b border-border flex items-center gap-3 flex-shrink-0">
                  <button onClick={() => setSelectedUser(null)} className="md:hidden p-1"><ArrowLeft className="w-5 h-5 text-bloom-text"/></button>
                  <Avatar className="w-8 h-8"><AvatarImage src={getAvatarImage(selectedUser.avatar)}/><AvatarFallback className="bg-bloom-violet text-white text-xs">{selectedUser.username?.charAt(0)}</AvatarFallback></Avatar>
                  <button onClick={() => navigate(`/users/${selectedUser.user_id}`)}
                    className="font-medium text-bloom-text text-sm hover:text-bloom-violet transition-colors flex items-center gap-1 group" data-testid="chat-profile-link">
                    {selectedUser.username}
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                  </button>
                </div>
                <div ref={messagesContainerRef} onScroll={handleMessagesScroll} className="flex-1 overflow-y-auto p-4 space-y-3 overscroll-contain chat-messages" style={{ minHeight: 0 }}>
                  {messages.map(m => (
                    <div key={m.id} className={`flex ${m.from_user_id===user?.id?'justify-end':'justify-start'} group/message`} data-testid={`message-${m.id}`}>
                      <div className={`relative max-w-[75%] px-3 py-2 text-sm ${m.from_user_id===user?.id?'message-sent':'message-received'}${m.media_url ? ' message-has-media' : ''}`}>
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(m.id)}
                          className="absolute -top-1 -right-1 p-1 rounded-full bg-white/95 hover:bg-destructive hover:text-white text-bloom-sub shadow-sm border border-border/50 opacity-70 hover:opacity-100 transition-opacity"
                          title="Smazat zprávu"
                          data-testid={`delete-message-${m.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
                        {m.media_url && renderMediaMsg(m)}
                        <p className={`text-[10px] mt-1 ${m.from_user_id===user?.id && !m.media_url ?'text-white/60':'text-bloom-sub/60'}`}>{new Date(m.created_at).toLocaleTimeString('cs-CZ',{hour:'2-digit',minute:'2-digit'})}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={sendMessage} className="px-3 pt-2 pb-2 border-t border-border flex-shrink-0 chat-input-bar">
                  {/* Hidden file inputs */}
                  <input type="file" ref={imageInputRef} accept="image/jpeg,image/png,image/gif" className="hidden" onChange={e => handleFileUpload(e, 'image')} />
                  <input type="file" ref={videoInputRef} accept="video/mp4,video/webm" className="hidden" onChange={e => handleFileUpload(e, 'video')} />

                  {/* Single row: icons + textarea + send */}
                  <div className="flex items-end gap-1.5">
                    {/* Action icons */}
                    <div className="flex items-center gap-0.5 flex-shrink-0 pb-1">
                      <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
                        <PopoverTrigger asChild>
                          <button type="button" className="p-1.5 hover:bg-muted rounded-lg transition-colors text-bloom-sub hover:text-bloom-violet" data-testid="emoji-picker-btn" title="Emoji">
                            <Smile className="w-4 h-4" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="p-0 w-auto">
                          <EmojiPicker onSelect={insertEmoji} />
                        </PopoverContent>
                      </Popover>
                      <button type="button" disabled={uploading || isRecording || !user?.email_verified} onClick={() => imageInputRef.current?.click()}
                        className="p-1.5 hover:bg-muted rounded-lg transition-colors text-bloom-sub hover:text-bloom-violet disabled:opacity-40" data-testid="image-upload-btn" title="Přiložit obrázek">
                        <Image className="w-4 h-4" />
                      </button>
                      <button type="button" disabled={uploading || !user?.email_verified}
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`p-1.5 rounded-lg transition-colors ${isRecording ? 'text-red-500 bg-red-50 hover:bg-red-100 animate-pulse' : 'text-bloom-sub hover:text-bloom-violet hover:bg-muted'} disabled:opacity-40`}
                        data-testid="voice-record-btn" title={!user?.email_verified ? 'Pro odesílání ověřte e-mail' : isRecording ? 'Zastavit nahrávání' : 'Hlasová zpráva'}>
                        {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </button>
                      {isRecording && (
                        <span className="text-xs text-red-500 font-medium tabular-nums" data-testid="recording-timer">
                          {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:{String(recordingSeconds % 60).padStart(2, '0')}
                        </span>
                      )}
                      {uploading && <Loader className="w-3.5 h-3.5 animate-spin text-bloom-sub" />}
                    </div>

                    {/* Textarea */}
                    <textarea
                      ref={textareaRef}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={!user?.email_verified ? 'Pro odesílání ověřte e-mail' : isRecording ? 'Nahrávám...' : 'Napište zprávu...'}
                      rows={1}
                      disabled={isRecording || !user?.email_verified}
                      style={{ fontSize: '16px' }}
                      className="flex-1 min-w-0 text-base md:text-sm resize-none bg-transparent border border-input rounded-lg px-3 py-2 leading-5 outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground disabled:opacity-60"
                      data-testid="message-input"
                      onFocus={handleInputFocus}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e); }}}
                    />

                    {/* Send button */}
                    <button type="submit" disabled={!newMessage.trim() || isRecording || !user?.email_verified}
                      className="p-2 bg-bloom-violet text-white rounded-lg transition-colors hover:bg-bloom-violet/90 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 self-end"
                      data-testid="send-message-btn">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="w-12 h-12 text-bloom-sub/20 mx-auto mb-3"/>
                  <p className="text-bloom-sub">Vyberte konverzaci nebo vyhledejte uživatele</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
