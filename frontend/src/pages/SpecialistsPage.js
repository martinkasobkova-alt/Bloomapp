import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { LotusLogo } from '../components/Layout';
import { SectionHeader } from '../components/SectionHeader';
import { useLocations } from '../hooks/useLocations';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Search, MapPin, Phone, Mail, Globe, Star, Plus, ExternalLink, Stethoscope, Send, HelpCircle, ChevronDown, ChevronRight, MessageSquare, Trash2, BadgeCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { QnASection } from '../components/shared/QnASection';


import { API, safeUrlForHref } from '../lib/api';

// Short label for display in cards
const catLabel = (specialty, cats) => {
  const found = cats.find(c => c.name === specialty);
  return found?.short_label || specialty?.split(',')[0] || specialty;
};

const SpecialistsPage = () => {
  const { user, isAdmin } = useAuth();
  const [specialists, setSpecialists] = useState([]);
  const [specCats, setSpecCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [country, setCountry] = useState('CZ');
  const [selected, setSelected] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rr, setRr] = useState(5);
  const [rc, setRc] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const isSpecialistOrAdmin = isAdmin || user?.role === 'specialist';
  const { allLocations } = useLocations();
  const czLocations = allLocations.filter(l => l.country === 'CZ');
  const worldLocations = allLocations.filter(l => l.country === 'WORLD');
  const currentLocations = country === 'CZ' ? czLocations : worldLocations;

  useEffect(() => {
    axios.get(`${API}/specialist-categories`)
      .then(r => setSpecCats(r.data))
      .catch(() => {});
  }, []);

  const fetchSpecialists = useCallback(async () => {
    setLoading(true);
    try {
      const p = { country };
      if (catFilter !== 'all') p.specialty = catFilter;
      if (regionFilter !== 'all') p.search = regionFilter;
      if (search) p.search = search;
      const r = await axios.get(`${API}/specialists`, { params: p });
      setSpecialists(r.data);
    } catch {} finally { setLoading(false); }
  }, [catFilter, regionFilter, country, search]);

  useEffect(() => { fetchSpecialists(); }, [fetchSpecialists]);

  const fetchReviews = async (id) => { try { const r = await axios.get(`${API}/specialists/${id}/reviews`); setReviews(r.data); } catch {} };
  const handleSelect = (s) => { setSelected(s); fetchReviews(s.id); };
  const handleSearch = (e) => { e.preventDefault(); fetchSpecialists(); };

  const handleReview = async (e) => {
    e.preventDefault(); if (!selected) return;
    try {
      await axios.post(`${API}/specialists/${selected.id}/reviews`, { specialist_id: selected.id, rating: rr, content: rc });
      toast.success('Recenze přidána!'); setReviewOpen(false); setRr(5); setRc('');
      fetchReviews(selected.id); fetchSpecialists();
    } catch { toast.error('Nepodařilo se přidat recenzi'); }
  };


  const stars = (n) => [...Array(5)].map((_, i) =>
    <Star key={i} className={`w-3.5 h-3.5 ${i < n ? 'text-bloom-pride-pink fill-bloom-pride-pink' : 'text-border'}`} />
  );

  const SpecForm = ({ isSubmit }) => {
    const firstCat = specCats[0]?.name || '';
    const [f, setF] = useState({ name: '', specialty: firstCat, description: '', subcategory: '', address: '', city: '', region: '', country: 'CZ', phone: '', email: '', website: '' });
    const formLocs = f.country === 'WORLD' ? worldLocations : czLocations;

    useEffect(() => {
      if (specCats.length > 0 && !f.specialty) setF(p => ({ ...p, specialty: specCats[0].name }));
    }, [f.specialty]);

    const submitForm = async (e) => {
      e.preventDefault();
      if (isSubmit) {
        setSubmitLoading(true);
        try { await axios.post(`${API}/specialists/submit`, f); toast.success('Odborník odeslán ke schválení!'); setSubmitDialogOpen(false); }
        catch { toast.error('Nepodařilo se odeslat odborníka'); }
        finally { setSubmitLoading(false); }
      } else {
        try { await axios.post(`${API}/specialists`, f); toast.success('Odborník přidán!'); setAddDialogOpen(false); fetchSpecialists(); }
        catch { toast.error('Nepodařilo se přidat'); }
      }
    };
    return (
      <form onSubmit={submitForm} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-bloom-text text-sm">Jméno *</Label><Input value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} required data-testid="spec-name-input" /></div>
          <div><Label className="text-bloom-text text-sm">Kategorie *</Label>
            <Select value={f.specialty} onValueChange={v => setF(p => ({ ...p, specialty: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{specCats.map(o => <SelectItem key={o.id} value={o.name}>{o.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div><Label className="text-bloom-text text-sm">Popis</Label>
          <Textarea value={f.description} onChange={e => setF(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="Specializace, zkušenosti..." data-testid="spec-desc-input" />
        </div>
        <div><Label className="text-bloom-text text-sm">Adresa *</Label><Input value={f.address} onChange={e => setF(p => ({ ...p, address: e.target.value }))} required data-testid="spec-address-input" /></div>
        <div className="grid grid-cols-3 gap-3">
          <div><Label className="text-bloom-text text-sm">Město *</Label><Input value={f.city} onChange={e => setF(p => ({ ...p, city: e.target.value }))} required data-testid="spec-city-input" /></div>
          <div><Label className="text-bloom-text text-sm">Kraj</Label>
            <Select value={f.region || 'none'} onValueChange={v => setF(p => ({ ...p, region: v === 'none' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Vyber" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {formLocs.map(o => <SelectItem key={o.id} value={o.name}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label className="text-bloom-text text-sm">Stát</Label>
            <Select value={f.country} onValueChange={v => setF(p => ({ ...p, country: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CZ">Česko</SelectItem>
                <SelectItem value="WORLD">Svět</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-bloom-text text-sm">Telefon</Label><Input value={f.phone} onChange={e => setF(p => ({ ...p, phone: e.target.value }))} data-testid="spec-phone-input" /></div>
          <div><Label className="text-bloom-text text-sm">E-mail</Label><Input type="email" value={f.email} onChange={e => setF(p => ({ ...p, email: e.target.value }))} data-testid="spec-email-input" /></div>
        </div>
        <div><Label className="text-bloom-text text-sm">Web</Label><Input value={f.website} onChange={e => setF(p => ({ ...p, website: e.target.value }))} placeholder="https://..." data-testid="spec-web-input" /></div>
        <Button type="submit" className="w-full bg-bloom-violet text-white" disabled={submitLoading} data-testid="spec-submit-btn">
          {isSubmit ? (submitLoading ? 'Odesílám...' : 'Odeslat ke schválení') : 'Přidat odborníka'}
        </Button>
      </form>
    );
  };

  // Sort state: 'default' | 'rating_desc' | 'rating_asc'
  const [sortOrder, setSortOrder] = useState('default');

  const sortedSpecialists = React.useMemo(() => {
    if (sortOrder === 'rating_desc') return [...specialists].sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));
    if (sortOrder === 'rating_asc') return [...specialists].sort((a, b) => (a.avg_rating || 0) - (b.avg_rating || 0));
    return specialists;
  }, [specialists, sortOrder]);

  const regionOpts = [
    { id: 'all', name: country === 'CZ' ? 'Celá ČR' : 'Celý svět' },
    ...currentLocations
  ];

  return (
    <div className="min-h-screen pt-0 pb-6" data-testid="specialists-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          sectionKey="specialists"
          defaultTitle="Trans-friendly odborníci"
          defaultSubtitle="Najděte ověřené odborníky, kteří vám pomohou na vaší cestě"
          defaultColor="#5BC0FF"
        />
        <div className="pride-bar mb-2" />

        <div className="space-y-3 mb-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bloom-sub/50" /><Input placeholder="Hledat podle jména nebo města..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" data-testid="specialists-search-input" /></div>
            <Button type="submit" className="bg-bloom-violet text-white hover:bg-bloom-violet/90">Hledat</Button>
          </form>

          <div className="flex gap-3 items-center flex-wrap">
            {/* Category filter — dropdown jako v sekci Vzájemná podpora */}
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className="w-48" data-testid="specialty-filter">
                <Stethoscope className="w-4 h-4 mr-1 text-bloom-violet" /><SelectValue placeholder="Všechny obory" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny obory</SelectItem>
                {specCats.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {/* Country toggle — CZ / Svět */}
            <div className="flex rounded-lg border border-border overflow-hidden">
              {[
                { value: 'CZ', label: 'Česká republika' },
                { value: 'WORLD', label: 'Svět' },
              ].map(v => (
                <button key={v.value} onClick={() => { setCountry(v.value); setRegionFilter('all'); }}
                  className={`px-4 py-1.5 text-sm font-medium transition-colors ${country === v.value ? 'bg-bloom-violet text-white' : 'bg-white text-bloom-sub hover:bg-muted'}`}
                  data-testid={`country-filter-${v.value}`}>
                  {v.label}
                </button>
              ))}
            </div>
            {/* Region filter — for CZ and WORLD, from API */}
            {currentLocations.length > 0 && (
              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger className="w-48" data-testid="region-filter"><MapPin className="w-4 h-4 mr-1 text-bloom-violet" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  {regionOpts.map(o => <SelectItem key={o.id} value={o.name || 'all'}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {/* Admin: direct add */}
            {isAdmin && (
              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild><Button className="bg-bloom-mint text-white hover:bg-bloom-mint/90" data-testid="add-specialist-btn"><Plus className="w-4 h-4 mr-1" />Přidat</Button></DialogTrigger>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-serif text-bloom-text">Přidat odborníka</DialogTitle></DialogHeader>
                  <SpecForm isSubmit={false} />
                </DialogContent>
              </Dialog>
            )}
            {/* Regular user: suggest specialist */}
            {!isAdmin && (
              <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
                <DialogTrigger asChild><Button variant="outline" className="border-bloom-violet/30 text-bloom-violet" data-testid="suggest-specialist-btn" disabled={!user?.email_verified} title={!user?.email_verified ? 'Pro přispívání musíte ověřit e-mail' : ''}><Send className="w-4 h-4 mr-1" />Navrhnout odborníka</Button></DialogTrigger>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="font-serif text-bloom-text">Navrhnout odborníka</DialogTitle></DialogHeader>
                  <div className="text-xs text-bloom-sub bg-muted/50 rounded-lg p-3 mb-3">
                    Váš návrh bude odeslán ke schválení administrátorům. Po schválení se zobrazí v seznamu.
                  </div>
                  <SpecForm isSubmit={true} />
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Sort buttons — below obor + lokalita filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-bloom-sub font-medium">Řadit:</span>
            {[
              { key: 'default', label: 'Výchozí' },
              { key: 'rating_desc', label: '★ Nejvyšší hodnocení' },
              { key: 'rating_asc', label: '★ Nejnižší hodnocení' },
            ].map(o => (
              <button key={o.key} onClick={() => setSortOrder(o.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${sortOrder === o.key ? 'bg-bloom-mint text-white border-bloom-mint shadow-sm' : 'bg-white border-border text-bloom-sub hover:border-bloom-mint/50 hover:text-bloom-mint'}`}
                data-testid={`sort-${o.key}`}
              >{o.label}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {loading ? <div className="flex justify-center py-12"><div className="spinner" /></div> :
              sortedSpecialists.length === 0 ? (
                <Card className="bg-white border-border/50"><CardContent className="p-8 text-center"><Stethoscope className="w-10 h-10 text-bloom-sub/30 mx-auto mb-3" /><p className="text-bloom-sub">Žádní odborníci nenalezeni</p><p className="text-xs text-bloom-sub mt-1">Zkuste změnit filtry</p></CardContent></Card>
              ) : sortedSpecialists.map(s => (
                <Card key={s.id} className={`bg-white border-border/50 cursor-pointer transition-all ${selected?.id === s.id ? 'ring-2 ring-bloom-violet' : 'hover:shadow-md'}`} onClick={() => handleSelect(s)} data-testid={`specialist-card-${s.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-bloom-text text-sm">{s.name}</h3>
                        <p className="text-xs text-bloom-violet mt-0.5">{catLabel(s.specialty, specCats)}</p>
                        <p className="text-xs text-bloom-sub flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" />{s.city}{s.region ? `, ${s.region}` : ''}</p>
                        {s.assigned_locations?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {s.assigned_locations.slice(0, 2).map(l => (
                              <span key={l} className="text-[10px] px-1.5 py-0.5 rounded-full bg-bloom-violet/10 text-bloom-violet">{l}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex">{stars(Math.round(s.avg_rating))}</div>
                        <p className="text-[11px] text-bloom-sub mt-0.5">{s.review_count} recenzí</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>

          <div className="lg:col-span-3 space-y-4">
            {selected ? (
              <>
                <div className="rounded-xl overflow-hidden border border-border aspect-video bg-muted">
                  <iframe title="Mapa" width="100%" height="100%" style={{ border: 0 }} loading="lazy"
                    src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(`${selected.address}, ${selected.city}`)}&zoom=15`}
                    data-testid="specialist-map" />
                </div>
                <Card className="bg-white border-border/50"><CardContent className="p-5">
                  <h2 className="font-serif text-xl font-bold text-bloom-text mb-0.5">{selected.name}</h2>
                  <p className="text-bloom-violet text-sm font-medium mb-2">{catLabel(selected.specialty, specCats)}</p>
                  {selected.description && <p className="text-sm text-bloom-sub mb-3 italic">{selected.description}</p>}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2"><MapPin className="w-4 h-4 text-bloom-violet mt-0.5" /><div><p className="text-bloom-text">{selected.address}</p><p className="text-bloom-sub">{selected.city}{selected.region ? `, ${selected.region}` : ''}</p></div></div>
                    {selected.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-bloom-violet" /><a href={`tel:${selected.phone}`} className="text-bloom-text hover:text-bloom-violet">{selected.phone}</a></div>}
                    {selected.email && <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-bloom-violet" /><a href={`mailto:${selected.email}`} className="text-bloom-text hover:text-bloom-violet">{selected.email}</a></div>}
                    {safeUrlForHref(selected.website) && <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-bloom-violet" /><a href={safeUrlForHref(selected.website)} target="_blank" rel="noopener noreferrer" className="text-bloom-text hover:text-bloom-violet flex items-center gap-1">Web<ExternalLink className="w-3 h-3" /></a></div>}
                  </div>
                  {selected.assigned_locations?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs text-bloom-sub mb-1.5">Dostupný v lokalitách:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selected.assigned_locations.map(l => (
                          <span key={l} className="px-2 py-0.5 rounded-full bg-bloom-violet/10 text-bloom-violet text-xs">{l}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                    <div className="flex">{stars(Math.round(selected.avg_rating))}</div>
                    <span className="text-xs text-bloom-sub">({selected.review_count} recenzí)</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selected.name}, ${selected.address}, ${selected.city}`)}`} target="_blank" rel="noopener noreferrer" className="flex-1">
                      <Button variant="outline" className="w-full text-bloom-violet border-bloom-violet/30"><MapPin className="w-4 h-4 mr-1" />Otevřít v mapách</Button>
                    </a>
                    <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
                      <DialogTrigger asChild><Button className="flex-1 bg-bloom-violet text-white"><Star className="w-4 h-4 mr-1" />Přidat recenzi</Button></DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle className="font-serif text-bloom-text">Přidat recenzi</DialogTitle></DialogHeader>
                        <form onSubmit={handleReview} className="space-y-4">
                          <div><Label className="text-bloom-text">Hodnocení</Label>
                            <div className="flex gap-1 mt-1">{[1,2,3,4,5].map(r => <button key={r} type="button" onClick={() => setRr(r)} className="p-0.5"><Star className={`w-7 h-7 ${r <= rr ? 'text-bloom-pride-pink fill-bloom-pride-pink' : 'text-border'}`} /></button>)}</div>
                          </div>
                          <div><Label className="text-bloom-text">Popis zkušenosti</Label>
                            <Textarea value={rc} onChange={e => setRc(e.target.value)} rows={4} required placeholder="Popište vaši zkušenost..." />
                          </div>
                          <Button type="submit" className="w-full bg-bloom-violet text-white">Odeslat recenzi</Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent></Card>
                <div className="space-y-3">
                  <h3 className="font-serif text-lg font-semibold text-bloom-text">Recenze ({reviews.length})</h3>
                  {reviews.length === 0 ? <p className="text-bloom-sub text-sm text-center py-6">Zatím žádné recenze. Buďte první!</p> :
                    reviews.map(r => (
                      <Card key={r.id} className="bg-white border-border/50"><CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2"><span className="font-medium text-bloom-text text-sm">{r.username}</span><div className="flex">{stars(r.rating)}</div></div>
                        <p className="text-sm text-bloom-sub">{r.content}</p>
                        <p className="text-[11px] text-bloom-sub mt-2">{new Date(r.created_at).toLocaleDateString('cs-CZ')}</p>
                      </CardContent></Card>
                    ))}
                </div>
              </>
            ) : (
              <div className="aspect-video bg-muted/50 rounded-xl flex items-center justify-center border border-border">
                <div className="text-center"><LotusLogo size={48} /><p className="text-bloom-sub mt-3 text-sm">Vyberte odborníka pro zobrazení detailu a mapy</p></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Specialists Q&A Section */}
      <div className="max-w-7xl mx-auto px-4 mt-12 mb-16">
        <QnASection
          section="specialists"
          canAnswer={isSpecialistOrAdmin}
          canDelete={isSpecialistOrAdmin}
          showVoteCount={false}
          accentColor="pink"
          testIdPrefix="spec-question"
          addButtonLabel="Položit otázku"
          dialogTitle="Nová otázka pro odborníky"
          dialogPlaceholder="Na co se chcete zeptat odborníků?"
          user={user}
          categories={specCats.map(c => ({ id: c.name, name: c.name }))}
          activeCategory={catFilter}
        />
      </div>
    </div>
  );
};

export default SpecialistsPage;
