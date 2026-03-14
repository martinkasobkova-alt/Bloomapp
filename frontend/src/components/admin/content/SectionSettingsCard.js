import React, { useState, useRef } from 'react';
import { BookOpen, Eye, EyeOff, GripVertical } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Switch } from '../../ui/switch';

const SECTION_FIELDS = [
  { key: 'specialists', label: 'Odborníci' },
  { key: 'legal', label: 'Právní poradna' },
  { key: 'news', label: 'Aktuality' },
  { key: 'stories', label: 'Zkušenosti komunity' },
  { key: 'support', label: 'Vzájemná podpora' },
  { key: 'nearby', label: 'V mém okolí' },
  { key: 'community', label: 'Komunita' },
];

export function SectionSettingsCard({
  sectionSettings,
  editingSections, setEditingSections,
  draftSections, setDraftSections,
  handleSaveSectionSettings, fetchSectionSettings,
}) {
  const dragKeyRef = useRef(null);
  const [dragOverKey, setDragOverKey] = useState(null);

  // Sort section fields by order (from draft when editing, from settings when not)
  const source = editingSections ? draftSections : sectionSettings;
  const sortedFields = [...SECTION_FIELDS].sort((a, b) => {
    const oa = source[a.key]?.order ?? 99;
    const ob = source[b.key]?.order ?? 99;
    return oa - ob;
  });

  const handleDragStart = (key) => { dragKeyRef.current = key; };
  const handleDragOver = (e, key) => { e.preventDefault(); setDragOverKey(key); };
  const handleDragEnd = () => { dragKeyRef.current = null; setDragOverKey(null); };

  const handleDrop = (e, targetKey) => {
    e.preventDefault();
    const sourceKey = dragKeyRef.current;
    if (!sourceKey || sourceKey === targetKey || !editingSections) return;
    // Swap order values between source and target
    setDraftSections(prev => {
      const sourceOrder = prev[sourceKey]?.order ?? 99;
      const targetOrder = prev[targetKey]?.order ?? 99;
      return {
        ...prev,
        [sourceKey]: { ...prev[sourceKey], order: targetOrder },
        [targetKey]: { ...prev[targetKey], order: sourceOrder },
      };
    });
    setDragOverKey(null);
  };

  return (
    <Card className="bg-white border-border/50 md:col-span-2" data-testid="section-settings-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-bloom-text flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-bloom-violet" />Sekce — pořadí, nadpisy a viditelnost
          </CardTitle>
          {!editingSections ? (
            <Button size="sm" variant="outline" onClick={() => { fetchSectionSettings(); setEditingSections(true); }} className="text-xs border-bloom-violet/30 text-bloom-violet" data-testid="edit-sections-btn">Upravit</Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => { setEditingSections(false); setDraftSections(JSON.parse(JSON.stringify(sectionSettings))); }} className="text-xs">Zrušit</Button>
              <Button size="sm" className="bg-bloom-violet text-white text-xs" onClick={handleSaveSectionSettings} data-testid="save-sections-btn">Uložit</Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-bloom-sub mb-4">
          {editingSections
            ? 'Přetažením řádků změňte pořadí sekcí v navigaci. Přepínačem nastavte viditelnost.'
            : 'Pořadí, nadpisy a viditelnost sekcí aplikace. Klikněte Upravit pro změny.'}
        </p>
        <div className="space-y-2">
          {sortedFields.map(({ key, label }) => {
            const sec = source[key] || {};
            const isVisible = sec.visible !== false;
            const isDragOver = dragOverKey === key;
            return (
              <div
                key={key}
                draggable={editingSections}
                onDragStart={() => handleDragStart(key)}
                onDragOver={e => handleDragOver(e, key)}
                onDrop={e => handleDrop(e, key)}
                onDragEnd={handleDragEnd}
                className={`p-3 rounded-lg transition-all ${
                  isVisible ? 'bg-muted/30' : 'bg-muted/10 border border-border/50 opacity-60'
                } ${isDragOver ? 'ring-2 ring-bloom-violet bg-bloom-violet/5' : ''}
                  ${editingSections ? 'cursor-grab active:cursor-grabbing' : ''}`}
                data-testid={`section-setting-${key}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {editingSections && (
                    <GripVertical className="w-4 h-4 text-bloom-sub/40 shrink-0" />
                  )}
                  <span className="text-xs font-semibold text-bloom-violet uppercase tracking-wider flex-1">
                    {label}
                  </span>
                  <div className="flex items-center gap-2">
                    {isVisible
                      ? <Eye className="w-3.5 h-3.5 text-bloom-mint" />
                      : <EyeOff className="w-3.5 h-3.5 text-bloom-sub/50" />}
                    <span className="text-xs text-bloom-sub">{isVisible ? 'Viditelná' : 'Skrytá'}</span>
                    {editingSections && (
                      <Switch
                        checked={isVisible}
                        onCheckedChange={val => setDraftSections(p => ({ ...p, [key]: { ...p[key], visible: val } }))}
                        data-testid={`section-visible-${key}`}
                      />
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-bloom-sub">Nadpis v navigaci</Label>
                    {editingSections ? (
                      <Input
                        value={draftSections[key]?.title || ''}
                        onChange={e => setDraftSections(p => ({ ...p, [key]: { ...p[key], title: e.target.value } }))}
                        className="h-7 text-xs mt-1"
                        placeholder={label}
                        data-testid={`section-title-${key}`}
                      />
                    ) : (
                      <p className="text-sm text-bloom-text mt-0.5">{sec.title || '—'}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-bloom-sub">Popis (podnadpis)</Label>
                    {editingSections ? (
                      <Input
                        value={draftSections[key]?.subtitle || ''}
                        onChange={e => setDraftSections(p => ({ ...p, [key]: { ...p[key], subtitle: e.target.value } }))}
                        className="h-7 text-xs mt-1"
                        data-testid={`section-subtitle-${key}`}
                      />
                    ) : (
                      <p className="text-sm text-bloom-sub mt-0.5 italic">{sec.subtitle || '—'}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {editingSections && (
          <p className="text-xs text-bloom-sub/60 mt-3 text-center">
            Přetáhněte sekce pro změnu pořadí v navigaci
          </p>
        )}
      </CardContent>
    </Card>
  );
}
