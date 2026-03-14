import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { SectionHeader } from '../components/SectionHeader';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { RichTextEditor } from '../components/RichTextEditor';
import {
  Scale, BookOpen, HelpCircle, Plus, Trash2,
  Eye, EyeOff, ChevronDown, ChevronRight, X, MessageSquare, Send, BadgeCheck, Edit
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { QnASection } from '../components/shared/QnASection';
import { API } from '../lib/api';



const DEFAULT_CATS = [
  { id: 'pravni', name: 'Právní' },
  { id: 'zdravi', name: 'Zdraví' },
  { id: 'socialni', name: 'Sociální' },
  { id: 'prava', name: 'Práva a legislativa' },
  { id: 'ostatni', name: 'Ostatní' },
];

const LegalPage = () => {
  const { user, isAdmin } = useAuth();

  const [articles, setArticles] = useState([]);
  const [allArticles, setAllArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [catFilter, setCatFilter] = useState('all');
  const [expandedArticle, setExpandedArticle] = useState(null);
  const [articleDialogOpen, setArticleDialogOpen] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [af, setAf] = useState({ title: '', content: '', category: '', published: true });

  // Compute which article categories the current user can post to
  const allowedPostCats = categories.filter(c =>
    user && ((c.allowed_roles || ['admin', 'lawyer']).includes(user.role) || user.role === 'superadmin')
  );
  const isLawyerOrAdmin = isAdmin || user?.role === 'lawyer';
  const canPostAnyArticle = allowedPostCats.length > 0;

  // canPost for the current active category filter
  const canPostInFilter = catFilter === 'all'
    ? canPostAnyArticle
    : allowedPostCats.some(c => c.id === catFilter);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [a, cats] = await Promise.all([
        isLawyerOrAdmin ? axios.get(`${API}/admin/articles`) : axios.get(`${API}/articles`),
        axios.get(`${API}/article-categories`).catch(() => ({ data: DEFAULT_CATS })),
      ]);
      setAllArticles(a.data);
      const loadedCats = cats.data?.length ? cats.data : DEFAULT_CATS;
      setCategories(loadedCats);
      const firstAllowed = loadedCats.find(c => user && ((c.allowed_roles || ['admin', 'lawyer']).includes(user?.role) || user?.role === 'superadmin'));
      setAf(prev => ({ ...prev, category: firstAllowed?.id || loadedCats[0]?.id || '' }));
    } catch {} finally { setLoading(false); }
  }, [isLawyerOrAdmin, user]);

  const filterArticles = useCallback(() => {
    if (catFilter === 'all') setArticles(allArticles);
    else setArticles(allArticles.filter(a => a.category === catFilter));
  }, [catFilter, allArticles]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { filterArticles(); }, [filterArticles]);

  const handleCreateArticle = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/articles`, af);
      toast.success('Článek přidán!');
      setArticleDialogOpen(false); setAf({ title: '', content: '', category: 'pravni', published: true });
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || 'Nepodařilo se přidat článek'); }
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editingArticle) return;
    try {
      await axios.put(`${API}/articles/${editingArticle.id}`, {
        title: editingArticle.title,
        content: editingArticle.content,
        category: editingArticle.category,
        published: editingArticle.published,
      });
      toast.success('Článek upraven!');
      setEditDialog(false); setEditingArticle(null); fetchAll();
    } catch (err) { toast.error('Nepodařilo se uložit'); }
  };

  const handleDeleteArticle = async (id) => {
    if (!window.confirm('Opravdu smazat tento článek?')) return;
    try { await axios.delete(`${API}/articles/${id}`); toast.success('Smazáno'); fetchAll(); }
    catch { toast.error('Nepodařilo se smazat'); }
  };

  const handleTogglePublish = async (id) => {
    try {
      const r = await axios.put(`${API}/articles/${id}/toggle-publish`);
      toast.success(r.data.message); fetchAll();
    } catch { toast.error('Nepodařilo se změnit stav'); }
  };

  const catName = (id) => categories.find(c => c.id === id)?.name || id;

  const [selectedArticle, setSelectedArticle] = useState(null);

  // If viewing article detail, show it
  if (selectedArticle) {
    return (
      <div className="min-h-screen py-6" data-testid="legal-article-detail">
        <div className="pride-bar mb-6" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => setSelectedArticle(null)}
            className="flex items-center gap-1.5 text-sm text-bloom-sub hover:text-bloom-violet transition-colors mb-6"
            data-testid="back-to-legal"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />Zpět na Právní poradnu
          </button>
          <article>
            <div className="mb-6">
              <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-bloom-violet/10 text-bloom-violet mb-3">
                {catName(selectedArticle.category)}
              </span>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-bloom-text mb-2">{selectedArticle.title}</h1>
              <p className="text-sm text-bloom-sub">
                {selectedArticle.author_name} · {new Date(selectedArticle.created_at).toLocaleDateString('cs-CZ')}
              </p>
            </div>
            <div className="article-content max-w-none">
              {/<[a-z][^>]*>/i.test(selectedArticle.content)
                ? <div dangerouslySetInnerHTML={{ __html: selectedArticle.content }} />
                : selectedArticle.content.split('\n').map((p, i) =>
                    p.trim() ? <p key={i} className="text-base text-bloom-text mb-3 leading-relaxed">{p}</p> : <br key={i} />
                  )
              }
            </div>
          </article>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-0 pb-6" data-testid="legal-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader sectionKey="legal" defaultTitle="Právní poradna" defaultSubtitle="Informace a podpora pro trans komunitu" defaultColor="#5BCEFA" />
        <div className="pride-bar mb-2" />

        {/* ARTICLES SECTION */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl font-semibold text-bloom-text flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-bloom-violet" />Články a průvodci
            </h2>
            {canPostInFilter && (
              <Dialog open={articleDialogOpen} onOpenChange={setArticleDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-bloom-violet text-white" data-testid="add-article-btn">
                    <Plus className="w-4 h-4 mr-1" />Přidat článek
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-serif text-bloom-text">Nový článek</DialogTitle></DialogHeader>
                  <div className="h-1 bg-gradient-to-r from-[#5BCEFA] via-[#F5A9B8] to-[#5BCEFA] rounded mb-4" />
                  <form onSubmit={handleCreateArticle} className="space-y-4">
                    <div><Label className="text-bloom-text">Název *</Label><Input value={af.title} onChange={e => setAf({ ...af, title: e.target.value })} required data-testid="article-title-input" /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-bloom-text">Kategorie</Label>
                        <Select value={af.category} onValueChange={v => setAf({ ...af, category: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(isAdmin ? categories : allowedPostCats).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      {isAdmin && (
                        <div className="flex items-end gap-2">
                          <Label className="text-bloom-text mb-2">Publikovat ihned</Label>
                          <input type="checkbox" checked={af.published} onChange={e => setAf({ ...af, published: e.target.checked })} className="w-5 h-5 rounded accent-bloom-violet" />
                        </div>
                      )}
                    </div>
                    <div><Label className="text-bloom-text">Obsah *</Label>
                      <RichTextEditor
                        value={af.content}
                        onChange={v => setAf({ ...af, content: v })}
                        placeholder="Obsah článku..."
                        rows={10}
                      />
                    </div>
                    <Button type="submit" className="w-full bg-bloom-violet text-white" data-testid="article-submit-btn">Přidat článek</Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Category filter */}
          <div className="section-filters flex flex-wrap gap-1.5 mb-4">
            {[{ id: 'all', name: 'Vše' }, ...categories].map(c => (
              <button key={c.id} onClick={() => setCatFilter(c.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${catFilter === c.id ? 'bg-bloom-violet text-white' : 'bg-white border border-border text-bloom-sub hover:border-bloom-violet/50 hover:text-bloom-violet'}`}
                data-testid={`cat-filter-${c.id}`}>
                {c.name}
              </button>
            ))}
          </div>

          {loading ? <div className="flex justify-center py-8"><div className="spinner" /></div> :
            articles.length === 0 ? (
              <Card className="empty-state-card bg-white border-border/50"><CardContent className="p-8 text-center">
                <BookOpen className="w-8 h-8 text-bloom-sub/30 mx-auto mb-2" />
                <p className="text-sm text-bloom-sub">Žádné články v této kategorii</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-2">
                {articles.map(a => (
                  <Card key={a.id} className={`bg-white border-border/50 transition-all hover:shadow-sm cursor-pointer ${!a.published ? 'opacity-60 border-dashed' : ''}`} data-testid={`article-${a.id}`}
                    onClick={() => setSelectedArticle(a)}>
                    <CardContent className="p-4 flex items-start justify-between">
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-medium text-bloom-text">{a.title}</span>
                          {!a.published && <span className="px-1.5 py-0.5 rounded text-[10px] bg-muted text-bloom-sub font-medium">Skryto</span>}
                        </div>
                        <p className="text-xs text-bloom-sub">
                          {catName(a.category)} · {a.author_name} · {new Date(a.created_at).toLocaleDateString('cs-CZ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {(isLawyerOrAdmin || a.author_id === user?.id) && (
                          <>
                            {isAdmin && (
                              <button type="button" onClick={e => { e.stopPropagation(); handleTogglePublish(a.id); }}
                                className="p-1.5 rounded hover:bg-muted text-bloom-sub hover:text-bloom-violet transition-colors"
                                title={a.published ? 'Skrýt' : 'Publikovat'}
                                data-testid={`toggle-publish-${a.id}`}>
                                {a.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                              </button>
                            )}
                            <button type="button" onClick={e => { e.stopPropagation(); setEditingArticle({ ...a }); setEditDialog(true); }}
                              className="p-1.5 rounded hover:bg-muted text-bloom-sub hover:text-bloom-violet transition-colors"
                              data-testid={`edit-article-${a.id}`}>
                              <Edit className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={e => { e.stopPropagation(); handleDeleteArticle(a.id); }}
                              className="p-1.5 rounded hover:bg-destructive/10 text-bloom-sub hover:text-destructive transition-colors"
                              data-testid={`delete-article-${a.id}`}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <ChevronRight className="w-4 h-4 text-bloom-sub/50" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
        </div>

        {/* Edit Article Dialog */}
        <Dialog open={editDialog} onOpenChange={setEditDialog}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-serif text-bloom-text">Upravit článek</DialogTitle></DialogHeader>
            {editingArticle && (
              <form onSubmit={handleEditSave} className="space-y-4">
                <div><Label className="text-bloom-text">Název *</Label><Input value={editingArticle.title} onChange={e => setEditingArticle({ ...editingArticle, title: e.target.value })} required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-bloom-text">Kategorie</Label>
                    <Select value={editingArticle.category} onValueChange={v => setEditingArticle({ ...editingArticle, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-2">
                    <Label className="text-bloom-text mb-2">Publikováno</Label>
                    <input type="checkbox" checked={editingArticle.published} onChange={e => setEditingArticle({ ...editingArticle, published: e.target.checked })} className="w-5 h-5 rounded accent-bloom-violet" />
                  </div>
                </div>
                <div><Label className="text-bloom-text">Obsah *</Label>
                  <RichTextEditor
                    value={editingArticle.content}
                    onChange={v => setEditingArticle({ ...editingArticle, content: v })}
                    rows={10}
                  />
                </div>
                <div className="flex gap-3">
                  <Button type="submit" className="flex-1 bg-bloom-violet text-white">Uložit změny</Button>
                  <Button type="button" variant="outline" onClick={() => setEditDialog(false)}>Zrušit</Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* QUESTIONS SECTION */}
        <QnASection
          section="legal"
          canAnswer={isLawyerOrAdmin}
          canDelete={isLawyerOrAdmin}
          accentColor="violet"
          testIdPrefix="question"
          addButtonLabel="Přidat otázku"
          dialogTitle="Nová otázka"
          dialogPlaceholder="Na co se chcete zeptat?"
          user={user}
          categories={categories}
          activeCategory={catFilter}
          legalContext={true}
        />
      </div>
    </div>
  );
};

export default LegalPage;
