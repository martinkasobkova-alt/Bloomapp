import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Camera, Plus, Lock, Settings, X, AtSign } from 'lucide-react';
import { API } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

export function UserGallery({ userId, isSelf }) {
  const { token } = useAuth();
  const [photos, setPhotos] = useState([]);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [galleryPrivacy, setGalleryPrivacy] = useState('public');
  const [galleryPasswordInput, setGalleryPasswordInput] = useState('');
  const [galleryUnlocked, setGalleryUnlocked] = useState(false);
  const [galleryLocked, setGalleryLocked] = useState(false);
  const [gallerySettingsOpen, setGallerySettingsOpen] = useState(false);
  const [newGalleryPrivacy, setNewGalleryPrivacy] = useState('public');
  const [newGalleryPassword, setNewGalleryPassword] = useState('');
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [tagSearchResults, setTagSearchResults] = useState([]);
  const [taggingPhotoId, setTaggingPhotoId] = useState(null);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const fileRef = useRef(null);

  const fetchPhotos = useCallback(async (password = '') => {
    try {
      const params = password ? { gallery_password: password } : {};
      const r = await axios.get(`${API}/users/${userId}/photos`, { params });
      setPhotos(r.data);
      setGalleryLocked(false);
      setGalleryUnlocked(true);
    } catch (e) {
      if (e.response?.status === 403) setGalleryLocked(true);
    }
  }, [userId]);

  const fetchGalleryInfo = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/users/${userId}/gallery-info`);
      setGalleryPrivacy(r.data.privacy);
      if (r.data.privacy === 'public' || isSelf) {
        fetchPhotos();
      } else {
        setGalleryLocked(true);
      }
    } catch {}
  }, [userId, isSelf, fetchPhotos]);

  useEffect(() => {
    fetchGalleryInfo();
  }, [fetchGalleryInfo]);

  const handleGalleryVerify = async () => {
    try {
      await fetchPhotos(galleryPasswordInput);
      toast.success('Galerie odemčena');
      setGalleryPasswordInput('');
    } catch { toast.error('Nesprávné heslo galerie'); }
  };

  const handleSaveGallerySettings = async () => {
    try {
      await axios.put(`${API}/users/me/gallery-settings`, { privacy: newGalleryPrivacy, password: newGalleryPassword });
      setGalleryPrivacy(newGalleryPrivacy);
      toast.success('Nastavení galerie uloženo');
      setGallerySettingsOpen(false);
      setNewGalleryPassword('');
    } catch (e) { toast.error(e.response?.data?.detail || 'Chyba'); }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    setPhotoLoading(true);
    try {
      await axios.post(`${API}/users/me/photos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Fotka nahrána!');
      fetchPhotos();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Nepodařilo se nahrát fotku');
    } finally {
      setPhotoLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDeletePhoto = async (photoId) => {
    try {
      await axios.delete(`${API}/users/me/photos/${photoId}`);
      setPhotos(ps => ps.filter(p => p.id !== photoId));
      toast.success('Fotka smazána');
    } catch { toast.error('Nepodařilo se smazat'); }
  };

  const handleTagSearch = async (q) => {
    setTagSearchQuery(q);
    if (!q.trim()) { setTagSearchResults([]); return; }
    try {
      const r = await axios.get(`${API}/users/search?nickname=${encodeURIComponent(q)}`);
      setTagSearchResults(r.data.slice(0, 5));
    } catch {}
  };

  const handleAddTag = async (photo, tagUser) => {
    const existingTags = photo.tags || [];
    if (existingTags.some(t => t.user_id === tagUser.id)) { toast.info('Uživatel je již otagován'); return; }
    const newTags = [...existingTags, { user_id: tagUser.id, username: tagUser.username }];
    try {
      await axios.put(`${API}/users/me/photos/${photo.id}/tags`, { tags: newTags });
      setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, tags: newTags } : p));
      setTagSearchQuery(''); setTagSearchResults([]); setTaggingPhotoId(null);
      toast.success(`Otagován: ${tagUser.username}`);
    } catch { toast.error('Nepodařilo se přidat tag'); }
  };

  if (photos.length === 0 && !isSelf && !galleryLocked) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="font-serif text-lg font-semibold text-bloom-text flex items-center gap-1.5 whitespace-nowrap">
            <Camera className="w-4 h-4 text-bloom-violet shrink-0" />
            Galerie fotek
          </h2>
          {galleryPrivacy === 'protected' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0">
              <Lock className="w-2.5 h-2.5" />Chráněno heslem
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isSelf && (
            <button
              onClick={() => { setNewGalleryPrivacy(galleryPrivacy); setGallerySettingsOpen(true); }}
              className="flex items-center gap-1.5 text-xs text-bloom-sub hover:text-bloom-violet px-2 py-1.5 rounded-lg transition-colors border border-border"
              data-testid="gallery-settings-btn"
            >
              <Settings className="w-3 h-3" />Soukromí
            </button>
          )}
          {isSelf && photos.length < 12 && (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={photoLoading}
              className="flex items-center gap-1.5 text-xs text-bloom-violet hover:bg-bloom-violet/10 px-3 py-1.5 rounded-lg transition-colors border border-bloom-violet/30"
              data-testid="upload-photo-btn"
            >
              <Plus className="w-3.5 h-3.5" />{photoLoading ? 'Nahrávám...' : 'Přidat fotku'}
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} data-testid="photo-file-input" />
      </div>

      {/* Gallery settings panel */}
      {gallerySettingsOpen && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3" data-testid="gallery-settings-panel">
          <h3 className="text-sm font-semibold text-bloom-text">Nastavení soukromí galerie</h3>
          <div className="flex gap-2">
            <button onClick={() => setNewGalleryPrivacy('public')} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${newGalleryPrivacy === 'public' ? 'border-bloom-violet bg-bloom-violet/10 text-bloom-violet' : 'border-border text-bloom-sub'}`} data-testid="gallery-public-btn">Veřejná</button>
            <button onClick={() => setNewGalleryPrivacy('protected')} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${newGalleryPrivacy === 'protected' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-border text-bloom-sub'}`} data-testid="gallery-protected-btn">Chráněná heslem</button>
          </div>
          {newGalleryPrivacy === 'protected' && (
            <input
              type="password"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg"
              placeholder="Heslo galerie..."
              value={newGalleryPassword}
              onChange={e => setNewGalleryPassword(e.target.value)}
              data-testid="gallery-password-input"
            />
          )}
          <div className="flex gap-2 justify-end">
            <button onClick={() => setGallerySettingsOpen(false)} className="text-xs text-bloom-sub px-3 py-1.5 rounded border border-border">Zrušit</button>
            <button onClick={handleSaveGallerySettings} className="text-xs bg-bloom-violet text-white px-3 py-1.5 rounded" data-testid="save-gallery-settings-btn">Uložit</button>
          </div>
        </div>
      )}

      {/* Locked gallery */}
      {galleryLocked && !isSelf && (
        <div className="border-2 border-dashed border-amber-300 rounded-xl p-6 text-center space-y-3" data-testid="gallery-locked">
          <Lock className="w-8 h-8 text-amber-400 mx-auto" />
          <p className="text-sm text-bloom-sub">Tato galerie je chráněna heslem</p>
          <div className="flex flex-col gap-2 max-w-xs mx-auto w-full">
            <input
              type="password"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-bloom-violet"
              placeholder="Heslo galerie..."
              value={galleryPasswordInput}
              onChange={e => setGalleryPasswordInput(e.target.value)}
              data-testid="gallery-unlock-input"
              onKeyDown={e => e.key === 'Enter' && handleGalleryVerify()}
            />
            <button onClick={handleGalleryVerify} className="w-full px-3 py-2 bg-bloom-violet text-white text-sm font-medium rounded-lg hover:bg-bloom-violet/90 transition-colors" data-testid="gallery-unlock-btn">
              Odemknout
            </button>
          </div>
        </div>
      )}

      {photos.length === 0 && isSelf && !galleryLocked && (
        <div className="border-2 border-dashed border-bloom-violet/20 rounded-xl p-8 text-center">
          <Camera className="w-8 h-8 text-bloom-sub/30 mx-auto mb-2" />
          <p className="text-sm text-bloom-sub">Zatím žádné fotky. Přidejte svou první!</p>
        </div>
      )}

      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" data-testid="photo-gallery">
          {photos.map(photo => (
            <div key={photo.id} className="relative group" data-testid={`photo-${photo.id}`}>
              <div className="aspect-square rounded-lg overflow-hidden bg-muted/30">
                <img
                  src={`${process.env.REACT_APP_BACKEND_URL}/api/photos/${photo.id}${token ? `?token=${token}` : ''}`}
                  alt="Profile photo"
                  className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setLightboxPhoto(photo)}
                />
              </div>
              {photo.tags && photo.tags.length > 0 && (
                <div className="flex flex-wrap gap-0.5 mt-0.5">
                  {photo.tags.map(t => (
                    <Link key={t.user_id} to={`/users/${t.user_id}`} className="text-[10px] bg-bloom-violet/10 text-bloom-violet px-1.5 py-0.5 rounded hover:bg-bloom-violet/20 transition-colors" data-testid={`photo-tag-${t.user_id}`}>@{t.username}</Link>
                  ))}
                </div>
              )}
              {isSelf && (
                <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setTaggingPhotoId(taggingPhotoId === photo.id ? null : photo.id)}
                    className="bg-black/50 text-white rounded-full p-0.5"
                    title="Otagovat uživatele"
                    data-testid={`tag-photo-${photo.id}`}
                  >
                    <AtSign className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDeletePhoto(photo.id)}
                    className="bg-black/50 text-white rounded-full p-0.5"
                    data-testid={`delete-photo-${photo.id}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              {taggingPhotoId === photo.id && (
                <div className="absolute z-10 top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-border p-2 space-y-1" data-testid="tag-search-panel">
                  <input
                    className="w-full text-xs px-2 py-1.5 border border-border rounded"
                    placeholder="Hledat uživatele..."
                    value={tagSearchQuery}
                    onChange={e => handleTagSearch(e.target.value)}
                    autoFocus
                  />
                  {tagSearchResults.map(u => (
                    <button key={u.id} onClick={() => handleAddTag(photo, u)} className="w-full text-left text-xs px-2 py-1.5 hover:bg-muted rounded transition-colors" data-testid={`tag-user-${u.id}`}>
                      @{u.username}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxPhoto && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setLightboxPhoto(null)}>
          <div className="max-w-full max-h-full" onClick={e => e.stopPropagation()}>
            <img
              src={`${process.env.REACT_APP_BACKEND_URL}/api/photos/${lightboxPhoto.id}${token ? `?token=${token}` : ''}`}
              alt="Profile photo"
              className="max-w-full max-h-[80vh] rounded-xl"
            />
            {lightboxPhoto.tags && lightboxPhoto.tags.length > 0 && (
              <div className="mt-2 flex gap-1 flex-wrap justify-center">
                {lightboxPhoto.tags.map(t => (
                  <Link key={t.user_id} to={`/users/${t.user_id}`} onClick={() => setLightboxPhoto(null)} className="text-xs bg-white/20 text-white px-2 py-0.5 rounded hover:bg-white/30">@{t.username}</Link>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setLightboxPhoto(null)} className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
