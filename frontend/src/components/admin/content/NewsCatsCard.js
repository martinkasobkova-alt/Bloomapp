import React, { useState } from 'react';
import { Plus, X, Check, Trash2, Newspaper, Shield } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';

const ALL_ROLES = [
  { id: 'user', label: 'Uživatel' },
  { id: 'specialist', label: 'Specialista' },
  { id: 'lawyer', label: 'Právník' },
  { id: 'admin', label: 'Admin' },
  { id: 'superadmin', label: 'Superadmin' },
];

function RolesEditor({ catId, currentRoles, onSave }) {
  const [roles, setRoles] = useState(currentRoles || ['admin']);

  const toggle = (roleId) => {
    setRoles(prev =>
      prev.includes(roleId) ? prev.filter(r => r !== roleId) : [...prev, roleId]
    );
  };

  return (
    <div className="mt-2 p-2 bg-bloom-violet/5 border border-bloom-violet/20 rounded-lg space-y-2" data-testid={`roles-editor-${catId}`}>
      <p className="text-xs font-medium text-bloom-sub flex items-center gap-1">
        <Shield className="w-3 h-3" />Kdo může přispívat:
      </p>
      <div className="flex flex-wrap gap-1.5">
        {ALL_ROLES.map(r => (
          <button
            key={r.id}
            type="button"
            onClick={() => toggle(r.id)}
            className={`px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${
              roles.includes(r.id)
                ? 'bg-bloom-violet text-white border-bloom-violet'
                : 'bg-white text-bloom-sub border-border hover:border-bloom-violet/50'
            }`}
            data-testid={`role-toggle-${catId}-${r.id}`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2 justify-end">
        <Button
          size="sm"
          className="h-6 text-[11px] bg-bloom-violet text-white px-2"
          onClick={() => onSave(catId, roles)}
          data-testid={`save-roles-${catId}`}
        >
          <Check className="w-3 h-3 mr-1" />Uložit
        </Button>
      </div>
    </div>
  );
}

export function NewsCatsCard({
  newsCatsApi,
  newNewsCat, setNewNewsCat,
  editingNewsCat, setEditingNewsCat,
  editingNewsCatName, setEditingNewsCatName,
  handleAddNewsCat, handleSaveNewsCat, handleDeleteNewsCat,
  handleUpdateNewsCatRoles,
}) {
  const [expandedRoles, setExpandedRoles] = useState(null);

  return (
    <Card className="bg-white border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-bloom-text flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-bloom-mint" />Kategorie aktualit
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-3">
          <Input
            value={newNewsCat}
            onChange={e => setNewNewsCat(e.target.value)}
            placeholder="Nová kategorie..."
            className="flex-1"
            onKeyDown={e => e.key === 'Enter' && handleAddNewsCat()}
            data-testid="new-news-cat-input"
          />
          <Button size="sm" className="bg-bloom-mint text-white" onClick={handleAddNewsCat} data-testid="add-news-cat-btn">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {newsCatsApi.map(c => (
            <div key={c.id} className="rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 p-2">
                {editingNewsCat === c.id ? (
                  <>
                    <Input value={editingNewsCatName} onChange={e => setEditingNewsCatName(e.target.value)} className="flex-1 h-7 text-xs" />
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-bloom-mint" onClick={() => handleSaveNewsCat(c.id)} data-testid={`save-news-cat-${c.id}`}><Check className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-bloom-sub" onClick={() => setEditingNewsCat(null)}><X className="w-3.5 h-3.5" /></Button>
                  </>
                ) : (
                  <>
                    <span className="text-sm text-bloom-text flex-1">{c.name}</span>
                    {/* Role badges summary */}
                    <span
                      className="text-[10px] text-bloom-violet/70 flex items-center gap-0.5 cursor-pointer hover:text-bloom-violet"
                      onClick={() => setExpandedRoles(expandedRoles === c.id ? null : c.id)}
                      data-testid={`toggle-roles-${c.id}`}
                      title="Upravit oprávnění"
                    >
                      <Shield className="w-3 h-3" />
                      {(c.allowed_roles || ['admin']).length}
                    </span>
                    <button onClick={() => { setEditingNewsCat(c.id); setEditingNewsCatName(c.name); }} className="p-1 hover:text-bloom-violet text-bloom-sub/50 text-xs" data-testid={`edit-news-cat-${c.id}`}>✎</button>
                    <button onClick={() => handleDeleteNewsCat(c.id)} className="p-1 hover:text-destructive text-bloom-sub/50" data-testid={`delete-news-cat-${c.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
                  </>
                )}
              </div>
              {/* Expandable roles editor */}
              {expandedRoles === c.id && (
                <div className="px-2 pb-2">
                  <RolesEditor
                    catId={c.id}
                    currentRoles={c.allowed_roles || ['admin']}
                    onSave={(id, roles) => {
                      handleUpdateNewsCatRoles(id, roles);
                      setExpandedRoles(null);
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
