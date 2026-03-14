import React from 'react';
import { Palette } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';

const COLOR_FIELDS = [
  { key: 'support', label: 'Vzájemná podpora' },
  { key: 'specialists', label: 'Odborníci' },
  { key: 'legal', label: 'Právní poradna' },
  { key: 'news', label: 'Aktuality' },
  { key: 'nearby', label: 'V mém okolí' },
  { key: 'stories', label: 'Zkušenosti komunity' },
  { key: 'community', label: 'Komunita' },
  { key: 'messages', label: 'Zprávy' },
  { key: 'profile', label: 'Můj profil' },
  { key: 'featured', label: 'Doporučujeme' },
  { key: 'default', label: 'Výchozí' },
];

export function MarkerColorsCard({
  markerColors,
  editingColors, setEditingColors,
  draftColors, setDraftColors,
  handleSaveMarkerColors,
}) {
  return (
    <Card className="bg-white border-border/50 md:col-span-2" data-testid="marker-colors-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-bloom-text flex items-center gap-2">
            <Palette className="w-4 h-4 text-bloom-violet" />Barvy nadpisových markerů
          </CardTitle>
          {!editingColors ? (
            <Button size="sm" variant="outline" onClick={() => setEditingColors(true)} className="text-xs border-bloom-violet/30 text-bloom-violet" data-testid="edit-marker-colors-btn">Upravit</Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => { setEditingColors(false); setDraftColors(markerColors); }} className="text-xs">Zrušit</Button>
              <Button size="sm" className="bg-bloom-violet text-white text-xs" onClick={handleSaveMarkerColors} data-testid="save-marker-colors-btn">Uložit</Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-bloom-sub mb-4">Nastavte barvy dekorativních markerů vedle nadpisů sekcí. Barvy jsou z Bloom palety.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {COLOR_FIELDS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg" data-testid={`marker-color-${key}`}>
              <div
                className="w-4 h-4 rounded-full shrink-0 border border-border/30"
                style={{ background: editingColors ? (draftColors[key] || '#8A7CFF') : (markerColors[key] || '#8A7CFF') }}
              />
              <span className="text-xs text-bloom-text flex-1">{label}</span>
              {editingColors && (
                <input
                  type="color"
                  value={draftColors[key] || '#8A7CFF'}
                  onChange={e => setDraftColors(p => ({ ...p, [key]: e.target.value }))}
                  className="w-7 h-7 rounded cursor-pointer border-0 p-0 bg-transparent"
                  data-testid={`color-picker-${key}`}
                />
              )}
            </div>
          ))}
        </div>
        {Object.keys(markerColors).length === 0 && !editingColors && (
          <p className="text-xs text-bloom-sub/60 italic mt-2">Barvy nejsou nastaveny — klikněte Upravit pro konfiguraci</p>
        )}
      </CardContent>
    </Card>
  );
}
