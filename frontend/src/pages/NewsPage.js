import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { SectionHeader } from '../components/SectionHeader';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { RichTextEditor } from '../components/RichTextEditor';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Plus, Calendar, ArrowLeft, Trash2, Newspaper, Image, MapPin, Heart, Video, BookOpen, Upload, Pencil } from 'lucide-react';

import { API, getMediaUrl } from '../lib/api';

// Helper: render video from URL (YouTube, Vimeo, or direct file)
const renderVideo = (url, className = '') => {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s?]+)/);
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (ytMatch) {
    return (
      <div className={`aspect-video rounded-xl overflow-hidden bg-black ${className}`}>
        <iframe
          src={`https://www.youtube.com/embed/${ytMatch[1]}`}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="YouTube video"
        />
      </div>
    );
  }
  if (vimeoMatch) {
    return (
      <div className={`aspect-video rounded-xl overflow-hidden bg-black ${className}`}>
        <iframe
          src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
          className="w-full h-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title="Vimeo video"
        />
      </div>
    );
  }
  return (
    <div className={`rounded-xl overflow-hidden bg-black ${className}`}>
      <video controls className="w-full max-h-[400px]" src={url}>
        <a href={url} className="text-bloom-violet">Přehrát video</a>
      </video>
    </div>
  );
};

// Helper: render article content — supports HTML (from rich editor) and plain text
const renderContent = (content) => {
  if (!content) return null;
  // If content looks like HTML (starts with tag or has tags)
  const isHtml = /<[a-z][^>]*>/.test(content);
  if (isHtml) {
    return (
      <div
        className="article-content text-sm md:text-base text-bloom-sub leading-relaxed"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }
  // Plain text with inline media detection
  const lines = content.split('\n');
  return lines.map((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.match(/^https?:\/\/\S+$/) && trimmed.length > 10) {
      // Image URL
      if (trimmed.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i)) {
        return (
          <div key={idx} className="my-4">
            <img src={trimmed} alt="Obrázek v článku" className="max-w-full rounded-xl shadow-sm" />
          </div>
        );
      }
      // YouTube
      const ytMatch = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s?]+)/);
      if (ytMatch) {
        return (
          <div key={idx} className="aspect-video my-4 rounded-xl overflow-hidden bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${ytMatch[1]}`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="YouTube video"
            />
          </div>
        );
      }
      // Vimeo
      const vimeoMatch = trimmed.match(/vimeo\.com\/(\d+)/);
      if (vimeoMatch) {
        return (
          <div key={idx} className="aspect-video my-4 rounded-xl overflow-hidden bg-black">
            <iframe
              src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
              className="w-full h-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title="Vimeo video"
            />
          </div>
        );
      }
      // Direct video file
      if (trimmed.match(/\.(mp4|webm|ogg)(\?.*)?$/i)) {
        return (
          <div key={idx} className="my-4 rounded-xl overflow-hidden bg-black">
            <video controls className="w-full max-h-[400px]" src={trimmed} />
          </div>
        );
      }
    }
    if (!trimmed) return <br key={idx} />;
    return <p key={idx} className="mb-2 leading-relaxed">{line}</p>;
  });
};

const NewsPage = () => {
  const { newsId } = useParams();
  const { isAdmin, user, isAuthenticated } = useAuth();
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [activeCat, setActiveCat] = useState('all');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [newsCat, setNewsCat] = useState('local');
  const [imageFile, setImageFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [newsCats, setNewsCats] = useState([
    { id: 'all', name: 'Vše' },
    { id: 'zkusenosti', name: 'Zkušenosti komunity' },
    { id: 'world', name: 'Ze světa' },
    { id: 'local', name: 'Domácí' },
    { id: 'tips', name: 'Tipy a triky' },
    { id: 'events', name: 'Eventy' },
    { id: 'interviews', name: 'Rozhovory' },
  ]);

  useEffect(() => {
    fetchNews();
    axios.get(`${API}/news-categories`).then(r => {
      setNewsCats([{ id: 'all', name: 'Vše' }, ...r.data]);
    }).catch(() => {});
  }, []);
  useEffect(() => { if (newsId && newsList.length > 0) { const f = newsList.find(n => n.id === newsId); if (f) setSelected(f); } }, [newsId, newsList]);

  const fetchNews = async () => { try { const r = await axios.get(`${API}/news`); setNewsList(r.data); } catch {} finally { setLoading(false); } };

  const handleCreate = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      let finalImageUrl = imageUrl;
      let finalVideoUrl = videoUrl;
      
      // Upload image file if selected
      if (imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);
        const r = await axios.post(`${API}/news/upload-media`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        finalImageUrl = r.data.url;
      }
      // Upload video file if selected
      if (videoFile) {
        const formData = new FormData();
        formData.append('file', videoFile);
        const r = await axios.post(`${API}/news/upload-media`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        finalVideoUrl = r.data.url;
      }
      
      await axios.post(`${API}/news`, { title, content, image_url: finalImageUrl, video_url: finalVideoUrl, thumbnail_url: thumbnailUrl || finalImageUrl, category: newsCat });
      toast.success('Příspěvek publikován!');
      setDialogOpen(false); setTitle(''); setContent(''); setImageUrl(''); setVideoUrl(''); setThumbnailUrl('');
      setImageFile(null); setVideoFile(null);
      fetchNews();
    } catch (e) { toast.error(e.response?.data?.detail || 'Nepodařilo se publikovat'); }
    finally { setUploading(false); }
  };

  const handleDelete = async (id, authorId) => {
    if (!window.confirm('Opravdu chcete smazat tento příspěvek?')) return;
    try { await axios.delete(`${API}/news/${id}`); toast.success('Smazáno'); setSelected(null); fetchNews(); } catch { toast.error('Chyba'); }
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setTitle(item.title || '');
    setContent(item.content || '');
    setImageUrl(item.image_url || '');
    setVideoUrl(item.video_url || '');
    setThumbnailUrl(item.thumbnail_url || '');
    setNewsCat(item.category || 'local');
    setImageFile(null); setVideoFile(null);
    setEditDialogOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    setUploading(true);
    try {
      let finalImageUrl = imageUrl;
      let finalVideoUrl = videoUrl;
      if (imageFile) {
        const fd = new FormData(); fd.append('file', imageFile);
        const r = await axios.post(`${API}/news/upload-media`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        finalImageUrl = r.data.url;
      }
      if (videoFile) {
        const fd = new FormData(); fd.append('file', videoFile);
        const r = await axios.post(`${API}/news/upload-media`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        finalVideoUrl = r.data.url;
      }
      await axios.put(`${API}/news/${editingItem.id}`, { title, content, image_url: finalImageUrl, video_url: finalVideoUrl, thumbnail_url: thumbnailUrl || finalImageUrl, category: newsCat });
      toast.success('Příspěvek aktualizován!');
      setEditDialogOpen(false); setEditingItem(null);
      setTitle(''); setContent(''); setImageUrl(''); setVideoUrl(''); setThumbnailUrl('');
      setImageFile(null); setVideoFile(null);
      await fetchNews();
      // Refresh selected if editing the viewed article
      setSelected(prev => prev?.id === editingItem.id ? { ...prev, title, content, image_url: finalImageUrl, video_url: finalVideoUrl, category: newsCat } : prev);
    } catch (e) { toast.error(e.response?.data?.detail || 'Nepodařilo se uložit'); }
    finally { setUploading(false); }
  };

  const activeCatData = newsCats.find(c => c.id === activeCat);
  const allowedRoles = activeCatData?.allowed_roles;
  const canPost = isAuthenticated && user && (
    user.role === 'superadmin' || (allowedRoles ? allowedRoles.includes(user.role) : (isAdmin || activeCat === 'zkusenosti'))
  );
  const filtered = activeCat === 'all' ? newsList : newsList.filter(n => n.category === activeCat);
  const getAuthorName = (n) => n.is_community_story ? n.author_name : (n.admin_name || n.author_name);

  if (selected) return (
    <>
    <div className="min-h-screen py-6" data-testid="news-detail">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Button variant="ghost" onClick={() => setSelected(null)} className="mb-4 text-bloom-violet" data-testid="back-to-news"><ArrowLeft className="w-4 h-4 mr-1"/>Zpět na aktuality</Button>
        <article>
          {(selected.thumbnail_url || selected.image_url) && (
            <div className="aspect-video mb-6 rounded-xl overflow-hidden">
              <img src={getMediaUrl(selected.thumbnail_url || selected.image_url)} alt={selected.title} className="w-full h-full object-cover"/>
            </div>
          )}
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-bloom-text mb-3">{selected.title}</h1>
          <div className="flex items-center gap-3 text-sm text-bloom-sub mb-6 flex-wrap">
            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5"/>{new Date(selected.created_at).toLocaleDateString('cs-CZ',{day:'numeric',month:'long',year:'numeric'})}</span>
            {selected.author_id ? (
              <Link to={`/users/${selected.author_id}`} className="hover:text-bloom-violet transition-colors" data-testid="news-detail-author-link">Autor: {getAuthorName(selected)}</Link>
            ) : (
              <span>Autor: {getAuthorName(selected)}</span>
            )}
            {selected.category && <span className="px-2 py-0.5 rounded-full bg-bloom-violet/10 text-bloom-violet text-xs">{newsCats.find(c=>c.id===selected.category)?.name}</span>}
            {selected.is_community_story && <span className="px-2 py-0.5 rounded-full bg-[#F5A9B8]/20 text-[#F5A9B8] text-xs">Osobní příběh</span>}
          </div>
          {selected.video_url && (
            <div className="mb-6">
              {renderVideo(selected.video_url)}
            </div>
          )}
          <div className="text-bloom-text">
            {renderContent(selected.content)}
          </div>
          {(isAdmin || (user && user.id === selected.author_id)) && (
            <div className="mt-6 pt-6 border-t border-border flex gap-2">
              <Button variant="outline" className="border-bloom-violet/40 text-bloom-violet hover:bg-bloom-violet/10"
                onClick={() => handleOpenEdit(selected)} data-testid="edit-news-btn">
                <Pencil className="w-4 h-4 mr-1.5"/>Upravit článek
              </Button>
              <Button variant="destructive" onClick={() => handleDelete(selected.id, selected.author_id)} data-testid="delete-news-btn">
                <Trash2 className="w-4 h-4 mr-1"/>Smazat
              </Button>
            </div>
          )}
        </article>
      </div>
    </div>
    {/* Edit dialog available from detail view */}
    <Dialog open={editDialogOpen} onOpenChange={open => { setEditDialogOpen(open); if (!open) { setEditingItem(null); setTitle(''); setContent(''); setImageUrl(''); setVideoUrl(''); setThumbnailUrl(''); setImageFile(null); setVideoFile(null); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-bloom-text">Upravit článek</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleUpdate} className="space-y-4 pt-2">
          <div>
            <Label>Nadpis *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} required data-testid="edit-news-title" />
          </div>
          <div>
            <Label>Kategorie</Label>
            <Select value={newsCat} onValueChange={setNewsCat}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{newsCats.filter(c => c.id !== 'all').map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Obsah *</Label>
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Text článku..."
              data-testid="edit-news-content"
              onUploadImage={async (file) => {
                const fd = new FormData();
                fd.append('file', file);
                const r = await axios.post(`${API}/news/upload-media`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                return r.data.url;
              }}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="flex items-center gap-1"><Image className="w-3.5 h-3.5"/>Obrázek (URL nebo soubor)</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-bloom-violet/30 rounded-lg cursor-pointer hover:bg-bloom-violet/5 transition-colors">
                  <Upload className="w-4 h-4 text-bloom-violet shrink-0" />
                  <span className="text-sm text-bloom-sub">{imageFile ? imageFile.name : 'Zvolit soubor'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={e => { setImageFile(e.target.files[0]); setImageUrl(''); }} />
                </label>
                <Input value={imageUrl} onChange={e => { setImageUrl(e.target.value); setImageFile(null); }} placeholder="https://..." className="h-8 text-xs" />
              </div>
            </div>
            <div>
              <Label className="flex items-center gap-1"><Video className="w-3.5 h-3.5"/>Video (URL nebo soubor)</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-bloom-violet/30 rounded-lg cursor-pointer hover:bg-bloom-violet/5 transition-colors">
                  <Upload className="w-4 h-4 text-bloom-violet shrink-0" />
                  <span className="text-sm text-bloom-sub">{videoFile ? videoFile.name : 'Zvolit soubor'}</span>
                  <input type="file" accept="video/*" className="hidden" onChange={e => { setVideoFile(e.target.files[0]); setVideoUrl(''); }} />
                </label>
                <Input value={videoUrl} onChange={e => { setVideoUrl(e.target.value); setVideoFile(null); }} placeholder="YouTube / Vimeo / URL" className="h-8 text-xs" />
              </div>
            </div>
          </div>
          <Button type="submit" className="w-full bg-bloom-violet text-white" disabled={uploading} data-testid="edit-news-submit">
            {uploading ? 'Ukládám...' : 'Uložit změny'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );

  return (
    <>
    <div className="min-h-screen pt-0 pb-6" data-testid="news-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader sectionKey="news" defaultTitle="Aktuality" defaultSubtitle="Novinky ze světa trans komunity" defaultColor="#5BCEFA" />
        <div className="pride-bar mb-2" />

        <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
          <div className="flex flex-wrap gap-1.5">
            {newsCats.map(c=>(
              <button key={c.id} onClick={()=>setActiveCat(c.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeCat===c.id?'bg-bloom-violet text-white shadow-sm':'bg-white border border-border text-bloom-sub hover:border-bloom-violet/50 hover:text-bloom-violet'}`}
                data-testid={`news-cat-${c.id}`}>{c.name}</button>
            ))}
          </div>
          {canPost && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-bloom-mint text-white shrink-0" data-testid="create-news-btn" onClick={() => { if(!isAdmin) setNewsCat(activeCat !== 'all' ? activeCat : 'zkusenosti'); }}>
                  <Plus className="w-4 h-4 mr-1"/>
                  {isAdmin ? 'Nová aktualita' : 'Sdílet příběh'}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="font-serif text-bloom-text">
                    {isAdmin ? 'Vytvořit aktualitu' : 'Sdílet zkušenost'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div><Label className="text-bloom-text">Nadpis</Label><Input value={title} onChange={(e)=>setTitle(e.target.value)} required data-testid="news-title-input"/></div>
                  {isAdmin && (
                    <div><Label className="text-bloom-text">Kategorie</Label>
                      <Select value={newsCat} onValueChange={setNewsCat}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>{newsCats.filter(c=>c.id!=='all').map(c=><SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                  {!isAdmin && (() => {
                    const myCats = newsCats.filter(c => c.id !== 'all' && c.allowed_roles?.includes(user?.role));
                    return myCats.length > 1 ? (
                      <div><Label className="text-bloom-text">Kategorie</Label>
                        <Select value={newsCat} onValueChange={setNewsCat}>
                          <SelectTrigger><SelectValue/></SelectTrigger>
                          <SelectContent>{myCats.map(c=><SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    ) : null;
                  })()}
                  <div><Label className="text-bloom-text">Obrázek</Label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-bloom-violet/30 rounded-lg cursor-pointer hover:bg-bloom-violet/5 transition-colors" data-testid="news-image-upload">
                        <Upload className="w-4 h-4 text-bloom-violet" />
                        <span className="text-sm text-bloom-sub">{imageFile ? imageFile.name : 'Nahrát obrázek...'}</span>
                        <input type="file" accept="image/*" className="hidden" onChange={e => { setImageFile(e.target.files[0]); setImageUrl(''); }} />
                      </label>
                      <div className="flex items-center gap-2 text-xs text-bloom-sub">
                        <span>nebo URL:</span>
                        <Input value={imageUrl} onChange={(e) => { setImageUrl(e.target.value); setImageFile(null); }} className="flex-1 h-8 text-xs" placeholder="https://..." data-testid="news-image-input" />
                      </div>
                    </div>
                  </div>
                  <div><Label className="text-bloom-text">Video</Label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-bloom-violet/30 rounded-lg cursor-pointer hover:bg-bloom-violet/5 transition-colors" data-testid="news-video-upload">
                        <Upload className="w-4 h-4 text-bloom-violet" />
                        <span className="text-sm text-bloom-sub">{videoFile ? videoFile.name : 'Nahrát video...'}</span>
                        <input type="file" accept="video/*" className="hidden" onChange={e => { setVideoFile(e.target.files[0]); setVideoUrl(''); }} />
                      </label>
                      <div className="flex items-center gap-2 text-xs text-bloom-sub">
                        <span>nebo URL:</span>
                        <Input value={videoUrl} onChange={(e) => { setVideoUrl(e.target.value); setVideoFile(null); }} className="flex-1 h-8 text-xs" placeholder="https://youtube.com/..." data-testid="news-video-input" />
                      </div>
                    </div>
                  </div>
                  <div><Label className="text-bloom-text">Obsah *</Label>
                    <RichTextEditor
                      value={content}
                      onChange={v => setContent(v)}
                      rows={8}
                      placeholder={isAdmin ? 'Text aktuality...' : 'Sdílejte svůj příběh nebo zkušenost s komunitou...'}
                      onUploadImage={async (file) => {
                        const fd = new FormData();
                        fd.append('file', file);
                        const r = await axios.post(`${API}/news/upload-media`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                        return r.data.url;
                      }}
                    />
                  </div>
                  <Button type="submit" className="w-full bg-bloom-violet text-white" data-testid="news-submit-btn" disabled={uploading}>
                    {uploading ? 'Nahrávám...' : (isAdmin ? 'Publikovat' : 'Sdílet příběh')}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {activeCat === 'zkusenosti' && (
          <div className="mb-5 p-4 bg-[#F5A9B8]/10 border border-[#F5A9B8]/30 rounded-xl flex items-start gap-3" data-testid="zkusenosti-note">
            <Heart className="w-4 h-4 text-[#F5A9B8] mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-bloom-sub leading-relaxed">
                <strong className="text-bloom-text">Osobní zkušenosti členů komunity.</strong>{' '}
                Tato sekce slouží ke sdílení životních zkušeností a příběhů. Příspěvky mohou obsahovat text, obrázky nebo videa.
              </p>
              {isAuthenticated && !canPost && activeCat === 'zkusenosti' && (
                <Button size="sm" className="mt-2 bg-[#F5A9B8] text-white text-xs" onClick={() => { setNewsCat('zkusenosti'); setDialogOpen(true); }}>
                  <BookOpen className="w-3.5 h-3.5 mr-1"/>Sdílet svůj příběh
                </Button>
              )}
            </div>
          </div>
        )}

        {loading?<div className="flex justify-center py-12"><div className="spinner"/></div>:filtered.length===0?(
          <Card className="bg-white border-border/50"><CardContent className="p-12 text-center"><Newspaper className="w-10 h-10 text-bloom-sub/30 mx-auto mb-3"/><h3 className="font-serif text-lg font-semibold text-bloom-text mb-1">Žádné aktuality</h3><p className="text-sm text-bloom-sub">V této kategorii zatím nejsou žádné aktuality</p></CardContent></Card>
        ):(
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {filtered.map((n,i)=>(
              <Card key={n.id} className={`bg-white border-border/50 card-hover cursor-pointer overflow-hidden ${i===0?'md:col-span-2':''}`} onClick={()=>setSelected(n)} data-testid={`news-card-${n.id}`}>
                <CardContent className="p-0">
                  {/* Show thumbnail on desktop always; on mobile only for featured card */}
                  {(n.thumbnail_url||n.image_url)&&(
                    <div className={`overflow-hidden ${i===0?'aspect-[21/9]':'aspect-video hidden md:block'}`}>
                      <img src={getMediaUrl(n.thumbnail_url||n.image_url)} alt={n.title} className="w-full h-full object-cover"/>
                    </div>
                  )}
                  <div className="p-3 md:p-4">
                    <div className="flex items-center gap-1.5 text-xs text-bloom-sub mb-1.5 flex-wrap">
                      <Calendar className="w-3 h-3 hidden sm:block"/><span className="hidden sm:inline">{new Date(n.created_at).toLocaleDateString('cs-CZ')}</span>
                      {n.category&&<span className="px-2 py-0.5 rounded-full bg-bloom-violet/10 text-bloom-violet">{newsCats.find(c=>c.id===n.category)?.name}</span>}
                      {n.is_community_story && <span className="px-2 py-0.5 rounded-full bg-[#F5A9B8]/20 text-[#F5A9B8]">Osobní příběh</span>}
                      {n.video_url && <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 flex items-center gap-0.5"><Video className="w-3 h-3"/>Video</span>}
                    </div>
                    <h2 className={`font-serif font-semibold text-bloom-text mb-1 leading-snug ${i===0?'text-lg md:text-xl':'text-sm md:text-base'}`}>{n.title}</h2>
                    <p className={`text-xs md:text-sm text-bloom-sub line-clamp-1 md:line-clamp-2`}>{n.content.replace(/<[^>]*>/g,'').replace(/https?:\/\/\S+/g,'').substring(0,i===0?200:100)}...</p>
                    <p className="text-xs text-bloom-sub/60 mt-1.5 hidden sm:block">
                      {n.author_id ? (
                        <Link to={`/users/${n.author_id}`} className="hover:text-bloom-violet transition-colors" onClick={e => e.stopPropagation()} data-testid={`news-card-author-link-${n.id}`}>Autor: {getAuthorName(n)}</Link>
                      ) : (
                        <span>Autor: {getAuthorName(n)}</span>
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>

    {/* Edit article dialog (admin or author) */}
    <Dialog open={editDialogOpen} onOpenChange={open => { setEditDialogOpen(open); if (!open) { setEditingItem(null); setTitle(''); setContent(''); setImageUrl(''); setVideoUrl(''); setThumbnailUrl(''); setImageFile(null); setVideoFile(null); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-bloom-text">Upravit článek</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleUpdate} className="space-y-4 pt-2">
          <div>
            <Label>Nadpis *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} required data-testid="edit-news-title" />
          </div>
          <div>
            <Label>Kategorie</Label>
            <Select value={newsCat} onValueChange={setNewsCat}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{newsCats.filter(c => c.id !== 'all').map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Obsah *</Label>
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Text článku..."
              data-testid="edit-news-content"
              onUploadImage={async (file) => {
                const fd = new FormData();
                fd.append('file', file);
                const r = await axios.post(`${API}/news/upload-media`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                return r.data.url;
              }}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="flex items-center gap-1"><Image className="w-3.5 h-3.5"/>Obrázek (URL nebo soubor)</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-bloom-violet/30 rounded-lg cursor-pointer hover:bg-bloom-violet/5 transition-colors">
                  <Upload className="w-4 h-4 text-bloom-violet shrink-0" />
                  <span className="text-sm text-bloom-sub">{imageFile ? imageFile.name : 'Zvolit soubor'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={e => { setImageFile(e.target.files[0]); setImageUrl(''); }} />
                </label>
                <Input value={imageUrl} onChange={e => { setImageUrl(e.target.value); setImageFile(null); }} placeholder="https://..." className="h-8 text-xs" />
              </div>
            </div>
            <div>
              <Label className="flex items-center gap-1"><Video className="w-3.5 h-3.5"/>Video (URL nebo soubor)</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-bloom-violet/30 rounded-lg cursor-pointer hover:bg-bloom-violet/5 transition-colors">
                  <Upload className="w-4 h-4 text-bloom-violet shrink-0" />
                  <span className="text-sm text-bloom-sub">{videoFile ? videoFile.name : 'Zvolit soubor'}</span>
                  <input type="file" accept="video/*" className="hidden" onChange={e => { setVideoFile(e.target.files[0]); setVideoUrl(''); }} />
                </label>
                <Input value={videoUrl} onChange={e => { setVideoUrl(e.target.value); setVideoFile(null); }} placeholder="YouTube / Vimeo / URL" className="h-8 text-xs" />
              </div>
            </div>
          </div>
          <Button type="submit" className="w-full bg-bloom-violet text-white" disabled={uploading} data-testid="edit-news-submit">
            {uploading ? 'Ukládám...' : 'Uložit změny'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  </>
  );
};

export default NewsPage;
