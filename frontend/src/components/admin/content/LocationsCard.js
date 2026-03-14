import React from 'react';
import { Plus, X, Check, Trash2, MapPin } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

export function LocationsCard({
  locations,
  newLocation, setNewLocation,
  newLocationCountry, setNewLocationCountry,
  editingLocation, setEditingLocation,
  editingLocationName, setEditingLocationName,
  editingLocationCountry, setEditingLocationCountry,
  handleAddLocation, handleSaveLocation, handleDeleteLocation,
}) {
  return (
    <Card className="bg-white border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-bloom-text flex items-center gap-2">
          <MapPin className="w-4 h-4 text-bloom-mint" />Lokality
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-3">
          <Input
            value={newLocation}
            onChange={e => setNewLocation(e.target.value)}
            placeholder="Nová lokalita..."
            className="flex-1"
            onKeyDown={e => e.key === 'Enter' && handleAddLocation()}
            data-testid="new-location-input"
          />
          <Select value={newLocationCountry || 'CZ'} onValueChange={setNewLocationCountry}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="CZ">Česká republika</SelectItem>
              <SelectItem value="WORLD">Svět</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="bg-bloom-mint text-white" onClick={handleAddLocation} data-testid="add-location-btn">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {locations.map(l => (
            <div key={l.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
              {editingLocation === l.id ? (
                <>
                  <Input value={editingLocationName} onChange={e => setEditingLocationName(e.target.value)} className="flex-1 h-7 text-xs" />
                  <Select value={editingLocationCountry || 'CZ'} onValueChange={setEditingLocationCountry}>
                    <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CZ">ČR</SelectItem>
                      <SelectItem value="WORLD">Svět</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-bloom-mint" onClick={() => handleSaveLocation(l.id)} data-testid={`save-location-${l.id}`}><Check className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-bloom-sub" onClick={() => setEditingLocation(null)}><X className="w-3.5 h-3.5" /></Button>
                </>
              ) : (
                <>
                  <span className="text-sm text-bloom-text flex-1">{l.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${l.country === 'WORLD' ? 'bg-amber-100 text-amber-700' : 'bg-bloom-violet/10 text-bloom-violet'}`}>
                    {l.country === 'WORLD' ? 'Svět' : 'ČR'}
                  </span>
                  <button onClick={() => { setEditingLocation(l.id); setEditingLocationName(l.name); setEditingLocationCountry(l.country || 'CZ'); }} className="p-1 hover:text-bloom-violet text-bloom-sub/50 text-xs" data-testid={`edit-location-${l.id}`}>✎</button>
                  <button onClick={() => handleDeleteLocation(l.id)} className="p-1 hover:text-destructive text-bloom-sub/50" data-testid={`delete-location-${l.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
                </>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
