import React, { useState, useMemo } from 'react';
import { Plus, X, Trash2, Edit, Save } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Stethoscope } from 'lucide-react';
import { StarRating } from './shared';
import { AdminSortControl, NAME_SORT_OPTIONS, sortByName } from './AdminSortControl';

export function AdminSpecialistsTab({
  specialists, locations,
  showSpecialistForm, setShowSpecialistForm,
  specForm, setSpecForm,
  specLoading, handleCreateSpecialist, handleDeleteSpecialist, handleEditSpecialist,
}) {
  const [editDialog, setEditDialog] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [sortOrder, setSortOrder] = useState('name-asc');
  const sortedSpecs = useMemo(() => sortByName(specialists, sortOrder, 'name'), [specialists, sortOrder]);

  const openEdit = (s) => {
    setEditForm({
      id: s.id, name: s.name, specialty: s.specialty || 'Psychologie, psychiatrie a sexuologie',
      description: s.description || '', subcategory: s.subcategory || '',
      address: s.address || '', city: s.city || '', region: s.region || '',
      country: s.country || 'CZ', phone: s.phone || '', email: s.email || '',
      website: s.website || '', lat: s.lat || '', lng: s.lng || '',
      assigned_locations: s.assigned_locations || [],
    });
    setEditDialog(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    await handleEditSpecialist(editForm);
    setEditDialog(false);
  };
  return (
    <>
      <div className="mb-4">
        <Button
          onClick={() => setShowSpecialistForm(!showSpecialistForm)}
          className="bg-bloom-violet text-white"
          data-testid="add-specialist-btn"
        >
          {showSpecialistForm ? <><X className="w-4 h-4 mr-1.5" />Zrušit</> : <><Plus className="w-4 h-4 mr-1.5" />Přidat odborníka</>}
        </Button>
      </div>

      {showSpecialistForm && (
        <Card className="bg-white border-bloom-violet/20 mb-5">
          <div className="h-1 bg-gradient-to-r from-[#5BCEFA] via-[#F5A9B8] to-[#5BCEFA] rounded-t-lg" />
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-lg text-bloom-text">Nový odborník</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSpecialist} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-bloom-text">Jméno / Název *</Label>
                  <Input value={specForm.name} onChange={e => setSpecForm(p => ({ ...p, name: e.target.value }))} placeholder="MUDr. Jana Nováková" required data-testid="spec-name-input" />
                </div>
                <div className="space-y-2">
                  <Label className="text-bloom-text">Kategorie *</Label>
                  <Select value={specForm.specialty} onValueChange={v => setSpecForm(p => ({ ...p, specialty: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Psychologie, psychiatrie a sexuologie">Psychologie, psychiatrie a sexuologie</SelectItem>
                      <SelectItem value="Plastická chirurgie obličeje">Plastická chirurgie obličeje</SelectItem>
                      <SelectItem value="Plastická chirurgie těla">Plastická chirurgie těla</SelectItem>
                      <SelectItem value="Méně invazivní zákroky">Méně invazivní zákroky</SelectItem>
                      <SelectItem value="Fitness, kadeřnice, kosmetiky">Fitness, kadeřnice, kosmetiky</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-bloom-text">Adresa *</Label>
                  <Input value={specForm.address} onChange={e => setSpecForm(p => ({ ...p, address: e.target.value }))} placeholder="Ulice 123" required data-testid="spec-address-input" />
                </div>
                <div className="space-y-2">
                  <Label className="text-bloom-text">Město *</Label>
                  <Input value={specForm.city} onChange={e => setSpecForm(p => ({ ...p, city: e.target.value }))} placeholder="Praha" required data-testid="spec-city-input" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-bloom-text">Region</Label>
                  <Input value={specForm.region} onChange={e => setSpecForm(p => ({ ...p, region: e.target.value }))} placeholder="Hlavní město Praha" />
                </div>
                <div className="space-y-2">
                  <Label className="text-bloom-text">Stát</Label>
                  <Select value={specForm.country} onValueChange={v => setSpecForm(p => ({ ...p, country: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CZ">Česká republika</SelectItem>
                      <SelectItem value="SK">Slovensko</SelectItem>
                      <SelectItem value="DE">Německo</SelectItem>
                      <SelectItem value="AT">Rakousko</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-bloom-text">Podkategorie</Label>
                  <Input value={specForm.subcategory} onChange={e => setSpecForm(p => ({ ...p, subcategory: e.target.value }))} placeholder="Např. HRT, logopédie..." />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-bloom-text">Popis <span className="text-bloom-sub text-xs">(co přesně dělá)</span></Label>
                <Textarea
                  value={specForm.description || ''}
                  onChange={e => setSpecForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Např. Specializuje se na HRT, psychologická podpora trans osob..."
                  rows={2}
                  data-testid="spec-description-input"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-bloom-text">Telefon</Label>
                  <Input value={specForm.phone} onChange={e => setSpecForm(p => ({ ...p, phone: e.target.value }))} placeholder="+420 xxx xxx xxx" />
                </div>
                <div className="space-y-2">
                  <Label className="text-bloom-text">E-mail</Label>
                  <Input type="email" value={specForm.email} onChange={e => setSpecForm(p => ({ ...p, email: e.target.value }))} placeholder="doktor@email.cz" />
                </div>
                <div className="space-y-2">
                  <Label className="text-bloom-text">Web</Label>
                  <Input value={specForm.website} onChange={e => setSpecForm(p => ({ ...p, website: e.target.value }))} placeholder="https://..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-bloom-text">Zeměpisná šířka <span className="text-bloom-sub text-xs">(GPS)</span></Label>
                  <Input type="number" step="any" value={specForm.lat} onChange={e => setSpecForm(p => ({ ...p, lat: e.target.value }))} placeholder="50.0755" />
                </div>
                <div className="space-y-2">
                  <Label className="text-bloom-text">Zeměpisná délka <span className="text-bloom-sub text-xs">(GPS)</span></Label>
                  <Input type="number" step="any" value={specForm.lng} onChange={e => setSpecForm(p => ({ ...p, lng: e.target.value }))} placeholder="14.4378" />
                </div>
              </div>
              {locations.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-bloom-text">Lokality <span className="text-bloom-sub text-xs">(lze vybrat více)</span></Label>
                  <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg max-h-36 overflow-y-auto">
                    {locations.map(loc => (
                      <label key={loc.id} className="flex items-center gap-1.5 cursor-pointer group" data-testid={`spec-loc-${loc.id}`}>
                        <input
                          type="checkbox"
                          checked={specForm.assigned_locations.includes(loc.name)}
                          onChange={e => {
                            setSpecForm(p => ({
                              ...p,
                              assigned_locations: e.target.checked
                                ? [...p.assigned_locations, loc.name]
                                : p.assigned_locations.filter(l => l !== loc.name)
                            }));
                          }}
                          className="rounded border-border accent-bloom-violet"
                        />
                        <span className="text-xs text-bloom-text group-hover:text-bloom-violet transition-colors">{loc.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <Button type="submit" className="bg-bloom-violet text-white" disabled={specLoading} data-testid="spec-submit-btn">
                  {specLoading ? 'Ukládám...' : 'Přidat odborníka'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowSpecialistForm(false)}>Zrušit</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between mb-2">
        <AdminSortControl value={sortOrder} onChange={setSortOrder} options={NAME_SORT_OPTIONS} testId="specialists-sort" />
      </div>
      <div className="space-y-2">
        {sortedSpecs.length === 0
          ? <p className="text-sm text-bloom-sub text-center py-8">Žádní odborníci. Přidejte prvního!</p>
          : sortedSpecs.map(s => (
            <Card key={s.id} className="bg-white border-border/50" data-testid={`admin-specialist-${s.id}`}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-bloom-pride-blue/10 flex items-center justify-center shrink-0">
                  <Stethoscope className="w-4 h-4 text-bloom-pride-blue" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-bloom-text">{s.name}</p>
                  <p className="text-xs text-bloom-sub truncate">
                    {s.specialty} · {s.city}{s.country ? ` · ${s.country}` : ''} · {s.review_count} recenzí
                  </p>
                  {s.avg_rating > 0 && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <StarRating rating={Math.round(s.avg_rating)} />
                      <span className="text-xs text-bloom-sub">{s.avg_rating}</span>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost" size="icon"
                  className="text-bloom-violet hover:bg-bloom-violet/10 h-8 w-8 shrink-0"
                  onClick={() => openEdit(s)}
                  data-testid={`edit-specialist-${s.id}`}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost" size="icon"
                  className="text-destructive hover:bg-destructive/10 h-8 w-8 shrink-0"
                  onClick={() => handleDeleteSpecialist(s.id)}
                  data-testid={`delete-specialist-${s.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Edit Specialist Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-serif text-lg text-bloom-text">Upravit odborníka</DialogTitle></DialogHeader>
          {editForm && (
            <form onSubmit={saveEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Jméno / Název *</Label><Input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} required data-testid="edit-spec-name" /></div>
                <div className="space-y-2"><Label>Kategorie *</Label>
                  <Select value={editForm.specialty} onValueChange={v => setEditForm(p => ({ ...p, specialty: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['Psychologie, psychiatrie a sexuologie','Plastická chirurgie obličeje','Plastická chirurgie těla','Méně invazivní zákroky','Fitness, kadeřnice, kosmetiky'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Adresa *</Label><Input value={editForm.address} onChange={e => setEditForm(p => ({ ...p, address: e.target.value }))} required /></div>
                <div className="space-y-2"><Label>Město *</Label><Input value={editForm.city} onChange={e => setEditForm(p => ({ ...p, city: e.target.value }))} required /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Region</Label><Input value={editForm.region} onChange={e => setEditForm(p => ({ ...p, region: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Stát</Label>
                  <Select value={editForm.country} onValueChange={v => setEditForm(p => ({ ...p, country: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{[['CZ','ČR'],['SK','SK'],['DE','DE'],['AT','AT']].map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Podkategorie</Label><Input value={editForm.subcategory} onChange={e => setEditForm(p => ({ ...p, subcategory: e.target.value }))} /></div>
              </div>
              <div className="space-y-2"><Label>Popis</Label><Textarea value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Telefon</Label><Input value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} /></div>
                <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Web</Label><Input value={editForm.website} onChange={e => setEditForm(p => ({ ...p, website: e.target.value }))} /></div>
              </div>
              {locations.length > 0 && (
                <div className="space-y-2">
                  <Label>Lokality</Label>
                  <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg max-h-32 overflow-y-auto">
                    {locations.map(loc => (
                      <label key={loc.id} className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={editForm.assigned_locations.includes(loc.name)}
                          onChange={e => setEditForm(p => ({ ...p, assigned_locations: e.target.checked ? [...p.assigned_locations, loc.name] : p.assigned_locations.filter(l => l !== loc.name) }))}
                          className="rounded accent-bloom-violet" />
                        <span className="text-xs">{loc.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <Button type="submit" className="bg-bloom-violet text-white flex-1" data-testid="edit-spec-save"><Save className="w-4 h-4 mr-1.5" />Uložit změny</Button>
                <Button type="button" variant="outline" onClick={() => setEditDialog(false)}>Zrušit</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
