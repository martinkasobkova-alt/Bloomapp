import React from 'react';
import { Plus, X, Check, Trash2, Tag } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';

export function ServiceTypesCard({
  serviceTypes,
  newServiceType, setNewServiceType,
  editingServiceType, setEditingServiceType,
  editingServiceTypeName, setEditingServiceTypeName,
  handleAddServiceType, handleSaveServiceType, handleDeleteServiceType,
}) {
  return (
    <Card className="bg-white border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-bloom-text flex items-center gap-2">
          <Tag className="w-4 h-4 text-bloom-violet" />Typy nabídek
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-3">
          <Input
            value={newServiceType}
            onChange={e => setNewServiceType(e.target.value)}
            placeholder="Nový typ..."
            className="flex-1"
            onKeyDown={e => e.key === 'Enter' && handleAddServiceType()}
            data-testid="new-service-type-input"
          />
          <Button size="sm" className="bg-bloom-violet text-white" onClick={handleAddServiceType} data-testid="add-service-type-btn">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {serviceTypes.map(t => (
            <div key={t.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
              {editingServiceType === t.id ? (
                <>
                  <Input value={editingServiceTypeName} onChange={e => setEditingServiceTypeName(e.target.value)} className="flex-1 h-7 text-xs" />
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-bloom-mint" onClick={() => handleSaveServiceType(t.id)}><Check className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-bloom-sub" onClick={() => setEditingServiceType(null)}><X className="w-3.5 h-3.5" /></Button>
                </>
              ) : (
                <>
                  <span className="text-sm text-bloom-text flex-1">{t.name}</span>
                  <button onClick={() => { setEditingServiceType(t.id); setEditingServiceTypeName(t.name); }} className="p-1 hover:text-bloom-violet text-bloom-sub/50 text-xs">✎</button>
                  <button onClick={() => handleDeleteServiceType(t.id)} className="p-1 hover:text-destructive text-bloom-sub/50"><Trash2 className="w-3.5 h-3.5" /></button>
                </>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
