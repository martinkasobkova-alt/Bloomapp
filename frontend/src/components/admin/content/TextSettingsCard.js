import React from 'react';
import { BookOpen } from 'lucide-react';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';

const TEXT_FIELDS = [
  { key: 'about_text', label: 'O projektu' },
  { key: 'contact_text', label: 'Kontaktní text' },
  { key: 'help_text', label: 'Nápověda ke komunitnímu heslu' },
  { key: 'footer_text', label: 'Text v patičce' },
];

export function TextSettingsCard({
  textSettings,
  editingTextKey, setEditingTextKey,
  editingTextValue, setEditingTextValue,
  handleSaveText,
}) {
  return (
    <Card className="bg-white border-border/50 md:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-bloom-text flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-bloom-violet" />Správa textového obsahu
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {TEXT_FIELDS.map(({ key, label }) => (
          <div key={key} className="space-y-1" data-testid={`text-setting-${key}`}>
            <div className="flex items-center justify-between">
              <Label className="text-sm text-bloom-text">{label}</Label>
              {editingTextKey !== key && (
                <button
                  onClick={() => { setEditingTextKey(key); setEditingTextValue(textSettings[key] ?? ''); }}
                  className="text-xs text-bloom-violet hover:underline"
                  data-testid={`edit-text-${key}`}
                >
                  Upravit
                </button>
              )}
            </div>
            {editingTextKey === key ? (
              <div className="space-y-2">
                <Textarea
                  key={`edit-${key}-${editingTextKey}`}
                  value={editingTextValue}
                  onChange={e => setEditingTextValue(e.target.value)}
                  rows={4}
                  className="text-sm"
                  placeholder="Zadejte text..."
                  data-testid={`edit-text-textarea-${key}`}
                />
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => setEditingTextKey(null)} className="text-xs">Zrušit</Button>
                  <Button size="sm" className="bg-bloom-violet text-white text-xs" onClick={() => handleSaveText(key)} data-testid={`save-text-${key}`}>Uložit</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-bloom-sub bg-muted/30 rounded-lg p-2 min-h-[40px]">
                {textSettings[key]
                  ? <span>{textSettings[key]}</span>
                  : <span className="italic text-bloom-sub/40">Prázdný — klikněte Upravit pro nastavení</span>
                }
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
