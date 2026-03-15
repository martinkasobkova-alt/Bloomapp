import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { SectionHeader } from '../components/SectionHeader';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Plus, ArrowLeft, Calendar, Trash2, MessageCircle, Send, Pencil, Upload } from 'lucide-react';
import { API, getMediaUrl } from '../lib/api';
import { IMAGE_FIT_OPTIONS, getImageFitClass } from '../lib/newsImageFit';
import { getAvatarImage } from '../components/Layout';
import { RichTextEditor } from '../components/RichTextEditor';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui/select';

const StoriesPage = () => {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const { markerColors } = useAppSettings();

  const [stories, setStories] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  // Comments
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  // Create story dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Edit story dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingStory, setEditingStory] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editImageFit, setEditImageFit] = useState('cover');
  const [editImageFile, setEditImageFile] = useState(null);
  const [imageFit, setImageFit] = useState('cover');

  const fetchStories = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/news?category=zkusenosti`);
      setStories(r.data);
    } catch { toast.error('Nepodařilo se načíst příběhy'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStories(); }, [fetchStories]);

  const fetchComments = useCallback(async (articleId) => {
    try {
      const r = await axios.get(`${API}/news/${articleId}/comments`);
      setComments(r.data);
    } catch { setComments([]); }
  }, []);

  const handleSelectStory = (story) => {
    setSelected(story);
    setComments([]);
    fetchComments(story.id);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) { toast.error('Vyplňte nadpis a obsah'); return; }
    setUploading(true);
    try {
      let finalImageUrl = imageUrl;
      if (imageFile) {
        const fd = new FormData(); fd.append('file', imageFile);
        const r = await axios.post(`${API}/news/upload-media`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        finalImageUrl = r.data.url;
      }
      await axios.post(`${API}/news`, { title, content, image_url: finalImageUrl, category: 'zkusenosti', image_fit: imageFit });
      toast.success('Příběh sdílen!');
      setDialogOpen(false); setTitle(''); setContent(''); setImageUrl(''); setImageFit('cover'); setImageFile(null);
      await fetchStories();
    } catch (err) { toast.error(err.response?.data?.detail || 'Nepodařilo se sdílet'); }
    finally { setUploading(false); }
  };

  const handleDelete = async (storyId) => {
    if (!window.confirm('Opravdu smazat tento příběh?')) return;
    try {
      await axios.delete(`${API}/news/${storyId}`);
      toast.success('Příběh smazán');
      setSelected(null); await fetchStories();
    } catch { toast.error('Nepodařilo se smazat'); }
  };

  const handleOpenEdit = (story) => {
    setEditingStory(story);
    setEditTitle(story.title || '');
    setEditContent(story.content || '');
    setEditImageUrl(story.image_url || '');
    setEditImageFit(story.image_fit || 'cover');
    setEditImageFile(null);
    setEditDialogOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingStory) return;
    setUploading(true);
    try {
      let finalImageUrl = editImageUrl;
      if (editImageFile) {
        const fd = new FormData(); fd.append('file', editImageFile);
        const r = await axios.post(`${API}/news/upload-media`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        finalImageUrl = r.data.url;
      }
      const updated = await axios.put(`${API}/news/${editingStory.id}`, {
        title: editTitle, content: editContent, image_url: finalImageUrl, category: 'zkusenosti', image_fit: editImageFit
      });
      toast.success('Příběh aktualizován!');
      setEditDialogOpen(false); setEditingStory(null);
      setSelected(updated.data);
      await fetchStories();
    } catch (err) { toast.error(err.response?.data?.detail || 'Nepodařilo se uložit'); }
    finally { setUploading(false); }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setCommentLoading(true);
    try {
      await axios.post(`${API}/news/${selected.id}/comments`, { content: commentText });
      setCommentText('');
      await fetchComments(selected.id);
    } catch (err) { toast.error(err.response?.data?.detail || 'Nepodařilo se přidat komentář'); }
    finally { setCommentLoading(false); }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await axios.delete(`${API}/news/comments/${commentId}`);
      await fetchComments(selected.id);
    } catch { toast.error('Nepodařilo se smazat komentář'); }
  };

  const markerColor = markerColors?.stories || '#F5A9B8';

  // ── Article detail view ──────────────────────────────────────────────────
  if (selected) {
    return (
      <>
      <div className="min-h-screen py-6" data-testid="story-detail">
        <div className="pride-bar mb-6" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-sm text-bloom-sub hover:text-bloom-violet mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />Zpět na příběhy
          </button>
          <article className="bg-white rounded-2xl border border-border/50 overflow-hidden shadow-sm" data-testid="story-article">
            {selected.image_url && (
              <img src={getMediaUrl(selected.image_url)} alt={selected.title} className={`w-full h-56 sm:h-72 bg-muted/30 ${getImageFitClass(selected.image_fit)}`} />
            )}
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: markerColor }} />
                <span className="text-xs text-bloom-sub font-medium">Zkušenosti komunity</span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-bloom-text mb-4 leading-tight">
                {selected.title}
              </h1>
              <div className="flex items-center gap-3 mb-6 text-xs text-bloom-sub">
                <Avatar className="w-7 h-7">
                  <AvatarImage src={getAvatarImage(selected.admin_avatar, selected.admin_custom_avatar)} />
                  <AvatarFallback className="bg-bloom-pride-pink text-white text-[10px]">
                    {(selected.author_name || selected.admin_name || 'A').charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <Link to={selected.author_id ? `/users/${selected.author_id}` : '#'} className="font-medium hover:text-bloom-violet">
                  {selected.author_name || selected.admin_name || 'Komunita'}
                </Link>
                <Calendar className="w-3.5 h-3.5" />
                {new Date(selected.created_at).toLocaleDateString('cs-CZ')}
              </div>
              <div className="article-content prose prose-sm max-w-none text-bloom-text leading-relaxed"
                dangerouslySetInnerHTML={{ __html: selected.content }} />
              {(isAdmin || (user?.id === selected.author_id)) && (
                <div className="mt-6 pt-6 border-t border-border flex gap-2">
                  <Button variant="outline" size="sm" className="border-bloom-violet/40 text-bloom-violet hover:bg-bloom-violet/10"
                    onClick={() => handleOpenEdit(selected)} data-testid="edit-story-btn">
                    <Pencil className="w-4 h-4 mr-1.5" />Upravit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(selected.id)} data-testid="delete-story-btn">
                    <Trash2 className="w-4 h-4 mr-1" />Smazat
                  </Button>
                </div>
              )}
            </div>
          </article>

          {/* Comments section */}
          <div className="mt-8" data-testid="story-comments">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle className="w-4 h-4 text-bloom-violet" />
              <h2 className="font-semibold text-bloom-text text-sm">Komentáře ({comments.length})</h2>
            </div>

            {/* Comment list */}
            <div className="space-y-3 mb-6">
              {comments.length === 0 && (
                <p className="text-sm text-bloom-sub/70 py-3">Zatím žádné komentáře. Buďte první!</p>
              )}
              {comments.map(c => (
                <div key={c.id} className="flex gap-3 group" data-testid={`comment-${c.id}`}>
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarImage src={getAvatarImage(c.avatar, c.custom_avatar)} />
                    <AvatarFallback className="bg-bloom-pride-pink/30 text-bloom-pride-pink text-[10px]">
                      {c.username?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="bg-white rounded-xl border border-border/50 px-3.5 py-2.5">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <Link to={`/users/${c.user_id}`} className="text-xs font-semibold text-bloom-violet hover:underline">
                          {c.username}
                        </Link>
                        <span className="text-[10px] text-bloom-sub/60">
                          {new Date(c.created_at).toLocaleString('cs-CZ', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-bloom-text leading-relaxed">{c.content}</p>
                    </div>
                    {(isAdmin || user?.id === c.user_id) && (
                      <button onClick={() => handleDeleteComment(c.id)}
                        className="mt-1 ml-2 text-[10px] text-bloom-sub/50 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        data-testid={`delete-comment-${c.id}`}>
                        Smazat
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add comment */}
            {isAuthenticated ? (
              <form onSubmit={handleAddComment} className="flex gap-2 items-start" data-testid="comment-form">
                <Avatar className="w-8 h-8 shrink-0 mt-0.5">
                  <AvatarImage src={getAvatarImage(user?.avatar, user?.custom_avatar)} />
                  <AvatarFallback className="bg-bloom-violet text-white text-[10px]">
                    {user?.username?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 flex gap-2">
                  <Input
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder="Přidat komentář..."
                    className="flex-1"
                    data-testid="comment-input"
                  />
                  <Button type="submit" size="sm" className="bg-bloom-violet text-white shrink-0" disabled={commentLoading || !commentText.trim() || !user?.email_verified} title={!user?.email_verified ? 'Pro komentování musíte ověřit e-mail' : ''}
                    data-testid="comment-submit">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            ) : (
              <p className="text-sm text-bloom-sub">Přihlaste se pro komentování.</p>
            )}
          </div>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={editDialogOpen} onOpenChange={open => { setEditDialogOpen(open); if (!open) { setEditingStory(null); setEditTitle(''); setEditContent(''); setEditImageUrl(''); setEditImageFit('cover'); setEditImageFile(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-bloom-text">Upravit příběh</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 pt-2">
            <div>
              <Label>Nadpis *</Label>
              <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} required data-testid="edit-story-title" />
            </div>
            <div>
              <Label>Obsah *</Label>
              <RichTextEditor
              value={editContent}
              onChange={setEditContent}
              placeholder="Text příběhu..."
              onUploadImage={async (file) => {
                const fd = new FormData();
                fd.append('file', file);
                const r = await axios.post(`${API}/news/upload-media`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                return r.data.url;
              }}
            />
            </div>
            <div>
              <Label>Obrázek (URL nebo soubor)</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-bloom-violet/30 rounded-lg cursor-pointer hover:bg-bloom-violet/5 transition-colors">
                  <Upload className="w-4 h-4 text-bloom-violet shrink-0" />
                  <span className="text-sm text-bloom-sub">{editImageFile ? editImageFile.name : 'Zvolit soubor'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={e => { setEditImageFile(e.target.files[0]); setEditImageUrl(''); }} />
                </label>
                <div className="flex gap-2 items-center text-xs text-bloom-sub">
                  <span>nebo URL:</span>
                  <Input value={editImageUrl} onChange={e => { setEditImageUrl(e.target.value); setEditImageFile(null); }} placeholder="https://..." className="flex-1 h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-xs text-bloom-sub">Jak oříznout fotku</Label>
                  <Select value={editImageFit} onValueChange={setEditImageFit}>
                    <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{IMAGE_FIT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <Button type="submit" className="w-full bg-bloom-violet text-white" disabled={uploading} data-testid="edit-story-submit">
              {uploading ? 'Ukládám...' : 'Uložit změny'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      </>
    );
  }

  // ── Story list view ──────────────────────────────────────────────────────
  return (
    <>
    <div className="min-h-screen pt-0 pb-6" data-testid="stories-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          sectionKey="stories"
          defaultTitle="Zkušenosti komunity"
          defaultSubtitle="Tady se sdílí příběhy."
          defaultColor={markerColor}
        />
        <div className="pride-bar mb-2" />

        {/* Create story button */}
        {isAuthenticated && (
          <div className="mb-6">
            <Button onClick={() => setDialogOpen(true)} className="bg-bloom-violet text-white hover:bg-bloom-violet/90" data-testid="add-story-btn"
              disabled={!user?.email_verified} title={!user?.email_verified ? 'Pro přispívání musíte ověřit e-mail' : ''}>
              <Plus className="w-4 h-4 mr-1.5" />Sdílet příběh
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><div className="spinner" /></div>
        ) : stories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-bloom-sub text-sm mb-3">Zatím žádné příběhy. Buďte první!</p>
          </div>
        ) : (
          <div className="grid gap-4" data-testid="stories-list">
            {stories.map(story => (
              <Card key={story.id} className="bg-white border-border/50 hover:border-bloom-pride-pink/40 transition-all cursor-pointer shadow-sm"
                onClick={() => handleSelectStory(story)} data-testid={`story-card-${story.id}`}>
                <CardContent className="p-0">
                  <div className="flex gap-4 items-start p-4">
                    {story.image_url && (
                      <img src={getMediaUrl(story.image_url)} alt={story.title}
                        className={`w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-muted/30 shrink-0 ${getImageFitClass(story.image_fit)}`} />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: markerColor }} />
                        <span className="text-[10px] text-bloom-sub font-medium uppercase tracking-wide">Příběh</span>
                      </div>
                      <h2 className="font-serif font-semibold text-bloom-text text-base sm:text-lg leading-tight mb-2 line-clamp-2">
                        {story.title}
                      </h2>
                      <div className="flex items-center gap-2 text-xs text-bloom-sub">
                        <Link to={story.author_id ? `/users/${story.author_id}` : '#'} className="flex items-center gap-2 hover:text-bloom-violet transition-colors" onClick={e => e.stopPropagation()} data-testid={`story-author-link-${story.id}`}>
                          <Avatar className="w-5 h-5">
                            <AvatarImage src={getAvatarImage(story.admin_avatar, story.admin_custom_avatar)} />
                            <AvatarFallback className="bg-bloom-pride-pink/30 text-[8px]">
                              {(story.author_name || story.admin_name || 'A').charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{story.author_name || story.admin_name || 'Komunita'}</span>
                        </Link>
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(story.created_at).toLocaleDateString('cs-CZ')}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>

    {/* Create story dialog */}
    <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) { setTitle(''); setContent(''); setImageUrl(''); setImageFile(null); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-bloom-text">Sdílet příběh</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4 pt-2">
          <div>
            <Label>Nadpis *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Název vašeho příběhu..." required data-testid="create-story-title" />
          </div>
          <div>
            <Label>Příběh *</Label>
            <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="Sdílejte svou zkušenost s komunitou..."
            onUploadImage={async (file) => {
              const fd = new FormData();
              fd.append('file', file);
              const r = await axios.post(`${API}/news/upload-media`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
              return r.data.url;
            }}
          />
          </div>
          <div>
            <Label>Obrázek (URL nebo soubor)</Label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-bloom-violet/30 rounded-lg cursor-pointer hover:bg-bloom-violet/5 transition-colors">
                <Upload className="w-4 h-4 text-bloom-violet shrink-0" />
                <span className="text-sm text-bloom-sub">{imageFile ? imageFile.name : 'Zvolit soubor'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={e => { setImageFile(e.target.files[0]); setImageUrl(''); }} />
              </label>
              <div className="flex gap-2 items-center text-xs text-bloom-sub">
                <span>nebo URL:</span>
                <Input value={imageUrl} onChange={e => { setImageUrl(e.target.value); setImageFile(null); }} placeholder="https://..." className="flex-1 h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs text-bloom-sub">Jak oříznout fotku</Label>
                <Select value={imageFit} onValueChange={setImageFit}>
                  <SelectTrigger className="h-8 mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{IMAGE_FIT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <Button type="submit" className="w-full bg-bloom-violet text-white" disabled={uploading} data-testid="create-story-submit">
            {uploading ? 'Nahrávám...' : 'Sdílet příběh'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default StoriesPage;
