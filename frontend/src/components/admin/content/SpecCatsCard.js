import React from 'react';
import { Plus, X, Check, Trash2, Stethoscope } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';

export function SpecCatsCard({
  specCats,
  newSpecCat, setNewSpecCat,
  editingSpecCat, setEditingSpecCat,
  editingSpecCatName, setEditingSpecCatName,
  handleAddSpecCat, handleDeleteSpecCat, handleSaveSpecCat,
}) {
  return (
    <Card className="bg-white border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-bloom-text flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-bloom-pride-pink" />Kategorie odborníků
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-3">
          <Input
            value={newSpecCat}
            onChange={e => setNewSpecCat(e.target.value)}
            placeholder="Nová kategorie..."
            className="flex-1"
            onKeyDown={e => e.key === 'Enter' && handleAddSpecCat()}
            data-testid="new-spec-cat-input"
          />
          <Button size="sm" className="bg-bloom-pride-pink text-white" onClick={handleAddSpecCat} data-testid="add-spec-cat-btn">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {specCats.map(c => (
            <div key={c.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
              {editingSpecCat === c.id ? (
                <>
                  <Input value={editingSpecCatName} onChange={e => setEditingSpecCatName(e.target.value)} className="flex-1 h-7 text-xs" />
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-bloom-mint" onClick={() => handleSaveSpecCat(c.id)} data-testid={`save-spec-cat-${c.id}`}><Check className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-bloom-sub" onClick={() => setEditingSpecCat(null)}><X className="w-3.5 h-3.5" /></Button>
                </>
              ) : (
                <>
                  <span className="text-sm text-bloom-text flex-1">{c.name}</span>
                  <button onClick={() => { setEditingSpecCat(c.id); setEditingSpecCatName(c.name); }} className="p-1 hover:text-bloom-violet text-bloom-sub/50 text-xs" data-testid={`edit-spec-cat-${c.id}`}>✎</button>
                  <button onClick={() => handleDeleteSpecCat(c.id)} className="p-1 hover:text-destructive text-bloom-sub/50" data-testid={`delete-spec-cat-${c.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
                </>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
