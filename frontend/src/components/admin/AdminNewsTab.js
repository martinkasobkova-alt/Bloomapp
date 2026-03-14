import React, { useState, useMemo } from 'react';
import { Plus, X, Trash2, Edit, Save } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { RichTextEditor } from '../RichTextEditor';
import { AdminSortControl, DATE_SORT_OPTIONS, sortByDate } from './AdminSortControl';
import { getMediaUrl } from '../../lib/api';

export function AdminNewsTab({
  news, newsCatsApi,
  showNewsForm, setShowNewsForm,
  newsForm, setNewsForm,
  newsLoading, handleCreateNews, handleDeleteNews, handleUpdateNews,
}) {
  const [editDialog, setEditDialog] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [sortOrder, setSortOrder] = useState('date-desc');
  const sortedNews = useMemo(() => sortByDate(news, sortOrder), [news, sortOrder]);

  const openEdit = (n) => { setEditItem({ ...n }); setEditDialog(true); };
  const saveEdit = async (e) => {
    e.preventDefault();
    await handleUpdateNews(editItem.id, { title: editItem.title, content: editItem.content, category: editItem.category, image_url: editItem.image_url });
    setEditDialog(false);
  };
  return (
    <>
      <div className="mb-4">
        <Button
          onClick={() => setShowNewsForm(!showNewsForm)}
          className="bg-bloom-violet text-white"
          data-testid="add-news-btn"
        >
          {showNewsForm ? <><X className="w-4 h-4 mr-1.5" />Zrušit</> : <><Plus className="w-4 h-4 mr-1.5" />Přidat aktualitu</>}
        </Button>
      </div>

      {showNewsForm && (
        <Card className="bg-white border-bloom-violet/20 mb-5">
          <div className="h-1 bg-gradient-to-r from-[#5BCEFA] via-[#F5A9B8] to-[#5BCEFA] rounded-t-lg" />
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-lg text-bloom-text">Nová aktualita</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateNews} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-bloom-text">Název *</Label>
                  <Input
                    value={newsForm.title}
                    onChange={e => setNewsForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="Název aktuality"
                    required
                    data-testid="news-title-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-bloom-text">Kategorie</Label>
                  <Select value={newsForm.category} onValueChange={v => setNewsForm(p => ({ ...p, category: v }))}>
                    <SelectTrigger data-testid="news-category-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(newsCatsApi.length > 0 ? newsCatsApi : [
                        { id: 'local', name: 'Domácí' },
                        { id: 'world', name: 'Ze světa' },
                        { id: 'tips', name: 'Tipy a triky' },
                        { id: 'events', name: 'Eventy' },
                        { id: 'interviews', name: 'Rozhovory' },
                      ]).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-bloom-text">Obsah *</Label>
                <RichTextEditor
                  value={newsForm.content}
                  onChange={v => setNewsForm(p => ({ ...p, content: v }))}
                  placeholder="Text aktuality..."
                  rows={8}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-bloom-text">URL obrázku <span className="text-bloom-sub text-xs">(volitelné)</span></Label>
                <Input
                  value={newsForm.image_url}
                  onChange={e => setNewsForm(p => ({ ...p, image_url: e.target.value }))}
                  placeholder="https://..."
                  data-testid="news-image-input"
                />
              </div>
              <div className="flex gap-3">
                <Button type="submit" className="bg-bloom-violet text-white" disabled={newsLoading} data-testid="news-submit-btn">
                  {newsLoading ? 'Ukládám...' : 'Přidat aktualitu'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowNewsForm(false)}>Zrušit</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between mb-2">
        <AdminSortControl value={sortOrder} onChange={setSortOrder} options={DATE_SORT_OPTIONS} testId="news-sort" />
      </div>
      <div className="space-y-2">
        {sortedNews.length === 0
          ? <p className="text-sm text-bloom-sub text-center py-8">Žádné aktuality. Přidejte první!</p>
          : sortedNews.map(n => (
            <Card key={n.id} className="bg-white border-border/50">
              <CardContent className="p-3 flex items-start gap-3">
                {n.image_url && (
                  <img src={getMediaUrl(n.image_url)} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-bloom-text line-clamp-1">{n.title}</p>
                  <p className="text-xs text-bloom-sub">
                    {new Date(n.created_at).toLocaleDateString('cs-CZ')} · {newsCatsApi.find(c => c.id === n.category)?.name || n.category} · {n.admin_name}
                  </p>
                  <p className="text-xs text-bloom-sub/80 line-clamp-2 mt-0.5">{n.content.replace(/<[^>]*>/g, '').substring(0, 120)}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button variant="ghost" size="icon" className="text-bloom-violet hover:bg-bloom-violet/10 h-8 w-8"
                    onClick={() => openEdit(n)} data-testid={`edit-news-${n.id}`}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    className="text-destructive hover:bg-destructive/10 h-8 w-8 shrink-0"
                    onClick={() => handleDeleteNews(n.id)}
                    data-testid={`delete-news-${n.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Edit News Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-serif text-lg text-bloom-text">Upravit aktualitu</DialogTitle></DialogHeader>
          {editItem && (
            <form onSubmit={saveEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Název *</Label>
                  <Input value={editItem.title} onChange={e => setEditItem(p => ({ ...p, title: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Kategorie</Label>
                  <Select value={editItem.category} onValueChange={v => setEditItem(p => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(newsCatsApi.length > 0 ? newsCatsApi : [{id:'local',name:'Domácí'},{id:'world',name:'Ze světa'},{id:'tips',name:'Tipy'},{id:'events',name:'Eventy'},{id:'interviews',name:'Rozhovory'}]).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>URL obrázku</Label>
                <Input value={editItem.image_url || ''} onChange={e => setEditItem(p => ({ ...p, image_url: e.target.value }))} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label>Obsah *</Label>
                <RichTextEditor key={editItem.id} value={editItem.content} onChange={v => setEditItem(p => ({ ...p, content: v }))} rows={10} />
              </div>
              <div className="flex gap-3">
                <Button type="submit" className="bg-bloom-violet text-white flex-1"><Save className="w-4 h-4 mr-1.5" />Uložit</Button>
                <Button type="button" variant="outline" onClick={() => setEditDialog(false)}>Zrušit</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
