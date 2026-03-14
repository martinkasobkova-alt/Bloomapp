import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAvatarImage } from '../components/Layout';
import { SectionHeader } from '../components/SectionHeader';
import { useLocations } from '../hooks/useLocations';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { toast } from 'sonner';
import { Plus, Search, MapPin, MessageCircle, Trash2, Heart, Send, Filter, ArrowUpRight, ArrowDownLeft, Pencil } from 'lucide-react';

import { API } from '../lib/api';

const SupportPage = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [myServices, setMyServices] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [postTypeFilter, setPostTypeFilter] = useState('all');
  const [showMyServices, setShowMyServices] = useState(false);
  // CZ / WORLD toggle for the filter
  const [filterCountry, setFilterCountry] = useState('CZ');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editServiceDialogOpen, setEditServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [offer, setOffer] = useState('');
  const [need, setNeed] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('none');
  const [serviceType, setServiceType] = useState('other');
  // CZ / WORLD toggle for new offer form
  const [formCountry, setFormCountry] = useState('CZ');

  const { allLocations } = useLocations();
  const czLocations = allLocations.filter(l => l.country === 'CZ');
  const worldLocations = allLocations.filter(l => l.country === 'WORLD');
  const formLocations = formCountry === 'CZ' ? czLocations : worldLocations;

  const fetchServices = useCallback(async () => {
    try {
      const params = { search: searchQuery };
      if (locationFilter !== 'all') params.location = locationFilter;
      if (typeFilter !== 'all') params.service_type = typeFilter;
      if (filterCountry) params.country = filterCountry;
      const r = await axios.get(`${API}/services`, { params });
      setServices(r.data);
    } catch {} finally { setLoading(false); }
  }, [searchQuery, locationFilter, typeFilter, filterCountry]);

  const fetchMyServices = useCallback(async () => {
    try { const r = await axios.get(`${API}/services/my`); setMyServices(r.data); } catch {}
  }, []);

  const fetchServiceTypes = useCallback(async () => {
    try { const r = await axios.get(`${API}/service-types`); setServiceTypes(r.data); } catch {}
  }, []);

  useEffect(() => { fetchServices(); fetchMyServices(); fetchServiceTypes(); }, [fetchServices, fetchMyServices, fetchServiceTypes]);
  useEffect(() => { fetchServices(); }, [fetchServices]);
  const handleSearch = (e) => { e.preventDefault(); fetchServices(); };

  const handleCreateService = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/services`, {
        offer, need, description,
        location: location === 'none' ? '' : location,
        service_type: serviceType,
        post_type: 'offer'
      });
      toast.success('Nabídka vytvořena!');
      setDialogOpen(false); setOffer(''); setNeed(''); setDescription(''); setLocation('none'); setServiceType('other');
      fetchServices(); fetchMyServices();
    } catch { toast.error('Nepodařilo se vytvořit příspěvek'); }
  };

  const handleDeleteService = async (id) => {
    if (!window.confirm('Opravdu chcete smazat tuto nabídku?')) return;
    try { await axios.delete(`${API}/services/${id}`); toast.success('Smazáno'); fetchServices(); fetchMyServices(); }
    catch { toast.error('Nepodařilo se smazat'); }
  };

  const handleOpenServiceEdit = (svc) => {
    setEditingService(svc);
    setOffer(svc.offer || '');
    setNeed(svc.need || '');
    setDescription(svc.description || '');
    setLocation(svc.location || 'none');
    setServiceType(svc.service_type || 'other');
    setEditServiceDialogOpen(true);
  };

  const handleUpdateService = async (e) => {
    e.preventDefault();
    if (!editingService) return;
    try {
      await axios.put(`${API}/services/${editingService.id}`, {
        offer, need, description,
        location: location === 'none' ? '' : location,
        service_type: serviceType,
      });
      toast.success('Příspěvek aktualizován!');
      setEditServiceDialogOpen(false); setEditingService(null);
      setOffer(''); setNeed(''); setDescription(''); setLocation('none'); setServiceType('other');
      fetchServices(); fetchMyServices();
    } catch (err) { toast.error(err.response?.data?.detail || 'Nepodařilo se uložit'); }
  };

  const handleReply = (s) => {
    setSelectedService(s);
    setReplyMessage(`Dobrý den! Zaujala mě vaše nabídka "${s.offer}". `);
    setReplyDialogOpen(true);
  };
  const handleSendReply = async () => {
    if (!selectedService || !replyMessage.trim()) return;
    try { await axios.post(`${API}/messages`, { to_user_id: selectedService.user_id, content: replyMessage }); toast.success('Zpráva odeslána!'); setReplyDialogOpen(false); }
    catch { toast.error('Nepodařilo se odeslat zprávu'); }
  };

  const baseList = showMyServices ? myServices : services;
  const displayed = postTypeFilter === 'request' ? baseList.filter(s => s.need && s.need.trim()) : baseList;
  const isPoptavkyView = postTypeFilter === 'request';

  const filterLocations = filterCountry === 'CZ' ? czLocations : worldLocations;
  const locationOpts = [
    { id: 'all', name: filterCountry === 'CZ' ? 'Celá ČR' : 'Celý svět' },
    ...filterLocations,
  ];

  return (
    <>
    <div className="min-h-screen pt-0 pb-6" data-testid="support-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          sectionKey="support"
          defaultTitle="Vzájemná podpora"
          defaultSubtitle="Nabídněte své dovednosti a získejte pomoc od ostatních členů komunity"
          defaultColor="#F5A9B8"
        />
        <div className="pride-bar mb-2" />

        {/* Post type tabs */}
        <div className="section-filters flex items-center gap-2 mb-4">
          {[
            { value: 'all', label: 'Vše' },
            { value: 'offer', label: 'Nabídky', icon: ArrowUpRight },
            { value: 'request', label: 'Poptávky', icon: ArrowDownLeft },
          ].map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.value}
                onClick={() => setPostTypeFilter(t.value)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  postTypeFilter === t.value
                    ? 'bg-bloom-violet text-white shadow-sm'
                    : 'bg-white border border-border text-bloom-sub hover:border-bloom-violet/50 hover:text-bloom-violet'
                }`}
                data-testid={`post-type-filter-${t.value}`}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}{t.label}
              </button>
            );
          })}
        </div>

        {/* Mobile-only filters - location and category */}
        <div className="section-filters flex md:hidden gap-2 mb-4">
          <div className="flex rounded-lg border border-border overflow-hidden flex-shrink-0">
            {[{ v: 'CZ', l: 'ČR' }, { v: 'WORLD', l: 'Svět' }].map(x => (
              <button
                key={x.v}
                type="button"
                onClick={() => { setFilterCountry(x.v); setLocationFilter('all'); }}
                className={`px-2 py-1.5 text-xs font-medium transition-colors ${filterCountry === x.v ? 'bg-bloom-violet text-white' : 'bg-white text-bloom-sub hover:bg-muted'}`}
                data-testid={`filter-country-mobile-${x.v}`}
              >
                {x.l}
              </button>
            ))}
          </div>
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="flex-1 min-w-0" data-testid="location-filter-mobile">
              <MapPin className="w-3.5 h-3.5 mr-1 text-bloom-violet shrink-0" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              {locationOpts.map(o => <SelectItem key={o.id || o.name} value={o.id === 'all' ? 'all' : o.name}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="flex-1 min-w-0" data-testid="type-filter-mobile"><Filter className="w-3.5 h-3.5 mr-1 text-bloom-mint shrink-0" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všechny typy</SelectItem>
              {serviceTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <form onSubmit={handleSearch} className="section-search flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bloom-sub/50" />
              <Input placeholder="Hledat..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" data-testid="support-search-input" />
            </div>
            <Button type="submit" variant="secondary" className="bg-bloom-violet/10 text-bloom-violet hover:bg-bloom-violet/20 hidden sm:flex">Hledat</Button>
          </form>
          <div className="flex gap-2 flex-wrap">
            <div className="hidden md:flex gap-2 items-center">
              {/* CZ / WORLD country toggle */}
              <div className="flex rounded-lg border border-border overflow-hidden">
                {[{ v: 'CZ', l: 'Česká republika' }, { v: 'WORLD', l: 'Svět' }].map(x => (
                  <button
                    key={x.v}
                    type="button"
                    onClick={() => { setFilterCountry(x.v); setLocationFilter('all'); }}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${filterCountry === x.v ? 'bg-bloom-violet text-white' : 'bg-white text-bloom-sub hover:bg-muted'}`}
                    data-testid={`filter-country-${x.v}`}
                  >
                    {x.l}
                  </button>
                ))}
              </div>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-40" data-testid="location-filter">
                  <MapPin className="w-4 h-4 mr-1 text-bloom-violet" /><SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locationOpts.map(o => <SelectItem key={o.id || o.name} value={o.id === 'all' ? 'all' : o.name}>{o.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-36" data-testid="type-filter"><Filter className="w-4 h-4 mr-1 text-bloom-mint" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Všechny typy</SelectItem>
                  {serviceTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button variant={showMyServices ? "default" : "outline"} onClick={() => setShowMyServices(!showMyServices)}
              className={showMyServices ? "bg-bloom-violet text-white" : ""} data-testid="my-services-toggle">
              Moje ({myServices.length})
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-bloom-mint text-white hover:bg-bloom-mint/90" data-testid="create-service-btn"
                  disabled={!user?.email_verified} title={!user?.email_verified ? 'Pro přispívání musíte ověřit e-mail' : ''}>
                  <Plus className="w-4 h-4 mr-1" />Přidat
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader><DialogTitle className="font-serif text-bloom-text">Nová nabídka</DialogTitle></DialogHeader>
                <div className="h-1 bg-gradient-to-r from-[#5BCEFA] via-[#F5A9B8] to-[#5BCEFA] rounded mb-4" />
                <form onSubmit={handleCreateService} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-bloom-text">Co nabízím *</Label>
                    <Input value={offer} onChange={(e) => setOffer(e.target.value)} placeholder="např. vaření, účesy, překlad..." required data-testid="service-offer-input" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-bloom-text">Co hledám výměnou <span className="text-bloom-sub font-normal text-xs">(volitelné)</span></Label>
                    <Input value={need} onChange={(e) => setNeed(e.target.value)} placeholder="např. masáže, fotografie..." data-testid="service-need-input" />
                    <p className="text-[11px] text-bloom-sub/70">Pokud vyplníte, vaše nabídka se zobrazí také v sekci Poptávky.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-bloom-text">Popis</Label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} required placeholder="Podrobnější popis..." data-testid="service-description-input" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-bloom-text">Oblast</Label>
                    {/* CZ / Svět toggle */}
                    <div className="flex rounded-lg border border-border overflow-hidden mb-2">
                      {[{ v: 'CZ', l: 'Česká republika' }, { v: 'WORLD', l: 'Svět' }].map(x => (
                        <button type="button" key={x.v} onClick={() => { setFormCountry(x.v); setLocation('none'); }}
                          className={`flex-1 py-1.5 text-xs font-medium transition-colors ${formCountry === x.v ? 'bg-bloom-violet text-white' : 'bg-white text-bloom-sub hover:bg-muted'}`}
                          data-testid={`form-country-${x.v}`}>
                          {x.l}
                        </button>
                      ))}
                    </div>
                    <Select value={location} onValueChange={setLocation}>
                      <SelectTrigger data-testid="service-location-select"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nechci uvádět</SelectItem>
                        {formLocations.map(o => <SelectItem key={o.id} value={o.name}>{o.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-bloom-text">Kategorie</Label>
                    <Select value={serviceType} onValueChange={setServiceType}>
                      <SelectTrigger data-testid="service-type-select"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {serviceTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                        {!serviceTypes.some(t => t.id === 'other') && <SelectItem value="other">Ostatní</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full bg-bloom-violet text-white" data-testid="service-submit-btn">
                    Přidat nabídku
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle className="font-serif text-bloom-text">Odpovědět na příspěvek</DialogTitle></DialogHeader>
            {selectedService && (
              <div className="space-y-4">
                <div className="p-3 bg-muted/50 rounded-lg border border-border">
                  <div className="flex gap-2 mb-1 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full bg-bloom-pride-pink/10 text-bloom-pride-pink text-xs">{selectedService.offer}</span>
                    <span className="text-bloom-sub/50 text-xs">↔</span>
                    <span className="px-2 py-0.5 rounded-full bg-bloom-pride-blue/10 text-bloom-pride-blue text-xs">{selectedService.need}</span>
                  </div>
                  <p className="text-sm text-bloom-sub">Od: {selectedService.username}</p>
                </div>
                <Textarea value={replyMessage} onChange={(e) => setReplyMessage(e.target.value)} rows={4} data-testid="reply-message-input" />
                <Button onClick={handleSendReply} className="w-full bg-bloom-violet text-white" disabled={!replyMessage.trim()} data-testid="send-reply-btn">
                  <Send className="w-4 h-4 mr-1" />Odeslat zprávu
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {loading ? (
          <div className="flex justify-center py-12"><div className="spinner" /></div>
        ) : displayed.length === 0 ? (
          <Card className="bg-white border-border/50"><CardContent className="p-12 text-center">
            <Heart className="w-10 h-10 text-bloom-pride-pink/40 mx-auto mb-3" />
            <h3 className="font-serif text-lg font-semibold text-bloom-text mb-1">
              {showMyServices ? 'Nemáte žádné příspěvky' : 'Žádné příspěvky nenalezeny'}
            </h3>
            <p className="text-sm text-bloom-sub">
              {showMyServices ? 'Vytvořte svou první nabídku nebo poptávku' : 'Zkuste změnit filtry nebo přidejte nový příspěvek'}
            </p>
          </CardContent></Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayed.map((s) => {
              const isExpired = s.expires_at && new Date(s.expires_at) < new Date();
              return (
              <Card key={s.id} className={`bg-white border-border/50 card-hover ${isExpired ? 'opacity-75' : ''}`} data-testid={`service-card-${s.id}`}>
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => navigate(`/users/${s.user_id}`)}
                      className="flex items-center gap-2 hover:opacity-80 transition-opacity group"
                      data-testid={`author-link-${s.id}`}
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={getAvatarImage(s.avatar, s.custom_avatar)} />
                        <AvatarFallback className="bg-bloom-violet text-white text-xs">{s.username?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="text-left">
                        <p className="text-sm font-medium text-bloom-text group-hover:text-bloom-violet transition-colors">{s.username}</p>
                        <p className="text-xs text-bloom-sub">{new Date(s.created_at).toLocaleDateString('cs-CZ')}</p>
                      </div>
                    </button>
                    <div className="flex items-center gap-1">
                      {isExpired && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-600">Expirováno</span>
                      )}
                      {!isExpired && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${isPoptavkyView ? 'bg-bloom-pride-blue/10 text-bloom-pride-blue' : 'bg-bloom-pride-pink/10 text-bloom-pride-pink'}`}>
                          {isPoptavkyView ? 'Hledám' : 'Nabídka'}
                        </span>
                      )}
                      {(user?.id === s.user_id || isAdmin) && (
                        <>
                          <Button variant="ghost" size="icon" className="text-bloom-violet h-7 w-7" title={!user?.email_verified ? 'Pro úpravu ověřte e-mail' : 'Upravit'} disabled={!user?.email_verified}
                            onClick={() => handleOpenServiceEdit(s)} data-testid={`edit-service-${s.id}`}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive h-7 w-7" title={!user?.email_verified ? 'Pro smazání ověřte e-mail' : 'Smazat'} disabled={!user?.email_verified} onClick={() => handleDeleteService(s.id)} data-testid={`delete-service-${s.id}`}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {isPoptavkyView ? (
                      <>
                        <span className="px-2 py-0.5 rounded-full bg-bloom-pride-blue/10 text-bloom-pride-blue text-xs font-medium">Hledám: {s.need}</span>
                        <span className="px-2 py-0.5 rounded-full bg-bloom-pride-pink/10 text-bloom-pride-pink text-xs font-medium">Nabídím: {s.offer}</span>
                      </>
                    ) : (
                      <>
                        <span className="px-2 py-0.5 rounded-full bg-bloom-pride-pink/10 text-bloom-pride-pink text-xs font-medium">Nabízím: {s.offer}</span>
                        {s.need && <span className="px-2 py-0.5 rounded-full bg-bloom-pride-blue/10 text-bloom-pride-blue text-xs font-medium hidden sm:inline-flex">Hledám: {s.need}</span>}
                      </>
                    )}
                  </div>
                  <p className="text-sm text-bloom-sub line-clamp-2 md:line-clamp-3 mb-2 hidden sm:block">{s.description}</p>
                  <div className="hidden sm:flex items-center gap-2 text-xs text-bloom-sub">
                    {s.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-bloom-violet" />{s.location}</span>}
                  </div>
                  {isExpired && showMyServices && (
                    <p className="text-xs text-amber-600 mt-2">Tato nabídka expirovala. Kontaktujte administrátora pro obnovení.</p>
                  )}
                  {!isExpired && user?.id !== s.user_id && (
                    <Button variant="outline" className="w-full mt-3 text-bloom-violet border-bloom-violet/20 hover:bg-bloom-violet/5" onClick={() => handleReply(s)} disabled={!user?.email_verified} title={!user?.email_verified ? 'Pro odpověď musíte ověřit e-mail' : ''} data-testid={`reply-service-${s.id}`}>
                      <MessageCircle className="w-4 h-4 mr-1" />Odpovědět
                    </Button>
                  )}
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>

    {/* Edit service dialog */}
    <Dialog open={editServiceDialogOpen} onOpenChange={open => { setEditServiceDialogOpen(open); if (!open) { setEditingService(null); setOffer(''); setNeed(''); setDescription(''); setLocation('none'); setServiceType('other'); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-bloom-text">Upravit příspěvek</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleUpdateService} className="space-y-4 pt-2">
          <div>
            <Label>Nabízím *</Label>
            <Input value={offer} onChange={e => setOffer(e.target.value)} placeholder="Co nabízíte..." required data-testid="edit-service-offer" />
          </div>
          <div>
            <Label>Hledám / potřebuji</Label>
            <Input value={need} onChange={e => setNeed(e.target.value)} placeholder="Co hledáte..." data-testid="edit-service-need" />
          </div>
          <div>
            <Label>Popis</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Podrobnější popis..." rows={3} data-testid="edit-service-description" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Kategorie</Label>
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{serviceTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Lokalita</Label>
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Celá ČR</SelectItem>
                  {allLocations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" className="w-full bg-bloom-violet text-white" data-testid="edit-service-submit">
            Uložit změny
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  </>
  );
};

export default SupportPage;
