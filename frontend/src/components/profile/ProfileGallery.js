import React, { useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { toast } from 'sonner';
import { Save, Images, Lock, Globe, Plus, Trash2 } from 'lucide-react';
import { API } from '../../lib/api';

export function ProfileGallery({ photos, setPhotos }) {
  const { user, token } = useAuth();
  const galleryFileInputRef = useRef(null);
  const [galleryPrivacy, setGalleryPrivacy] = useState('public');
  const [galleryPassword, setGalleryPassword] = useState('');
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  const handleGalleryUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Soubor je příliš velký (max 5 MB)'); return; }
    setPhotoUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const r = await axios.post(`${API}/users/me/photos`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Fotografie přidána do galerie!');
      const res = await axios.get(`${API}/users/${user?.id}/photos`);
      setPhotos(res.data);
    } catch (err) { toast.error(err.response?.data?.detail || 'Nepodařilo se nahrát fotografii'); }
    finally { setPhotoUploading(false); e.target.value = ''; }
  };

  const handleDeletePhoto = async (photoId) => {
    try {
      await axios.delete(`${API}/users/me/photos/${photoId}`);
      setPhotos(ps => ps.filter(p => p.id !== photoId));
      toast.success('Fotografie smazána');
    } catch { toast.error('Nepodařilo se smazat fotografii'); }
  };

  const handleSaveGallerySettings = async () => {
    setGalleryLoading(true);
    try {
      const payload = { privacy: galleryPrivacy };
      if (galleryPrivacy === 'protected') {
        if (!galleryPassword || galleryPassword.length < 4) { toast.error('Heslo galerie musí mít alespoň 4 znaky'); setGalleryLoading(false); return; }
        payload.password = galleryPassword;
      }
      await axios.put(`${API}/users/me/gallery-settings`, payload);
      toast.success('Nastavení galerie uloženo');
      setGalleryPassword('');
    } catch (err) { toast.error(err.response?.data?.detail || 'Nepodařilo se uložit nastavení'); }
    finally { setGalleryLoading(false); }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-white border-border/50">
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Lock className="w-4 h-4 text-bloom-violet"/>Soukromí galerie</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <button type="button" onClick={() => setGalleryPrivacy('public')}
              className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all ${galleryPrivacy==='public'?'border-bloom-violet bg-bloom-violet/5 text-bloom-violet':'border-border text-bloom-sub hover:border-bloom-violet'}`}
              data-testid="gallery-public-btn">
              <Globe className="w-4 h-4"/><span className="font-medium">Veřejná galerie</span>
            </button>
            <button type="button" onClick={() => setGalleryPrivacy('protected')}
              className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all ${galleryPrivacy==='protected'?'border-bloom-violet bg-bloom-violet/5 text-bloom-violet':'border-border text-bloom-sub hover:border-bloom-violet'}`}
              data-testid="gallery-protected-btn">
              <Lock className="w-4 h-4"/><span className="font-medium">Heslem chráněná</span>
            </button>
          </div>
          {galleryPrivacy === 'protected' && (
            <div className="space-y-1">
              <Label className="text-sm">Heslo galerie</Label>
              <Input type="password" value={galleryPassword} onChange={e => setGalleryPassword(e.target.value)} placeholder="Nastavte heslo pro galerii" data-testid="gallery-password-input"/>
              <p className="text-xs text-bloom-sub">Návštěvníci budou muset zadat toto heslo pro zobrazení galerie.</p>
            </div>
          )}
          <Button onClick={handleSaveGallerySettings} disabled={galleryLoading} className="bg-bloom-violet text-white" data-testid="save-gallery-settings-btn">
            <Save className="w-4 h-4 mr-1"/>{galleryLoading ? 'Ukládám...' : 'Uložit nastavení'}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-white border-border/50">
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Images className="w-4 h-4 text-bloom-violet"/>Fotografie v galerii ({photos.length})</CardTitle></CardHeader>
        <CardContent>
          {!user?.email_verified && (
            <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
              Pro nahrávání fotografií musíte nejprve ověřit svůj e-mail.
            </div>
          )}
          <input type="file" ref={galleryFileInputRef} accept="image/*,video/*" className="hidden" onChange={handleGalleryUpload} />
          <button type="button" disabled={photoUploading || !user?.email_verified}
            onClick={() => galleryFileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-bloom-violet/30 rounded-lg text-sm text-bloom-violet hover:bg-bloom-violet/5 transition-colors mb-4 w-full justify-center disabled:opacity-50"
            data-testid="gallery-upload-btn">
            {photoUploading ? <><div className="spinner w-4 h-4"/>Nahrávám...</> : <><Plus className="w-4 h-4"/>Přidat fotografii nebo video</>}
          </button>
          {photos.length === 0 ? (
            <p className="text-sm text-bloom-sub text-center py-4">Zatím žádné fotografie v galerii</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {photos.map(p => (
                <div key={p.id} className="relative group aspect-square rounded-lg overflow-hidden" data-testid={`gallery-photo-${p.id}`}>
                  <img src={`${process.env.REACT_APP_BACKEND_URL}/api/photos/${p.id}${token ? `?token=${token}` : ''}`} alt="Galerie" className="w-full h-full object-cover"/>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <button type="button" onClick={() => handleDeletePhoto(p.id)}
                      className="opacity-0 group-hover:opacity-100 bg-white/90 hover:bg-red-50 text-destructive p-1.5 rounded-full transition-all"
                      data-testid={`delete-photo-${p.id}`}>
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
