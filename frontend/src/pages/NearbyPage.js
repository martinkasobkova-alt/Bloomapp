import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { getAvatarImage } from '../components/Layout';
import { SectionHeader } from '../components/SectionHeader';
import { useLocations } from '../hooks/useLocations';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { MapPin, Heart, Stethoscope, Users, Star } from 'lucide-react';

import { API } from '../lib/api';

const NearbyPage = () => {
  const { user, updateProfile } = useAuth();
  const [location, setLocation] = useState(user?.location || '');
  const [nearbyServices, setNearbyServices] = useState([]);
  const [nearbySpecialists, setNearbySpecialists] = useState([]);
  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [nearbyCountry, setNearbyCountry] = useState('CZ');

  const { allLocations } = useLocations();
  const czLocations = allLocations.filter(l => l.country === 'CZ');
  const worldLocations = allLocations.filter(l => l.country === 'WORLD');
  const currentLocations = nearbyCountry === 'CZ' ? czLocations : worldLocations;

  const fetchNearbyData = useCallback(async () => {
    setLoading(true);
    try {
      const [svc, spec, usrs] = await Promise.all([
        axios.get(`${API}/services`, { params: { location } }),
        axios.get(`${API}/specialists`, { params: { search: location } }),
        axios.get(`${API}/users/nearby`, { params: { location } })
      ]);
      setNearbyServices(svc.data.slice(0, 6));
      setNearbySpecialists(spec.data.slice(0, 6));
      setNearbyUsers(usrs.data.slice(0, 6));
    } catch {} finally { setLoading(false); }
  }, [location]);

  useEffect(() => {
    if (location && location !== 'none') fetchNearbyData();
  }, [location, fetchNearbyData]);

  const handleLocationChange = async (v) => {
    setLocation(v);
    try { await updateProfile({ location: v }); } catch {}
  };

  return (
    <div className="min-h-screen pt-0 pb-6" data-testid="nearby-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          sectionKey="nearby"
          defaultTitle="V mém okolí"
          defaultSubtitle="Najděte členy komunity, služby a odborníky ve vašem okolí"
          defaultColor="#A8E6CF"
        />
        <div className="pride-bar mb-2" />

        <Card className="bg-white border-border/50 mb-8">
          <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-lg bg-bloom-violet/10 flex items-center justify-center"><MapPin className="w-5 h-5 text-bloom-violet"/></div>
              <div><h2 className="font-semibold text-bloom-text text-sm">Vaše lokalita</h2><p className="text-xs text-bloom-sub">Nastavte si polohu pro personalizované výsledky</p></div>
            </div>
            {/* CZ / Svět toggle */}
            <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
              {[{ v: 'CZ', l: 'Česká republika' }, { v: 'WORLD', l: 'Svět' }].map(x => (
                <button key={x.v} onClick={() => { setNearbyCountry(x.v); setLocation(''); }}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${nearbyCountry === x.v ? 'bg-bloom-violet text-white' : 'bg-white text-bloom-sub hover:bg-muted'}`}
                  data-testid={`nearby-country-${x.v}`}>
                  {x.l}
                </button>
              ))}
            </div>
            <Select value={location || ''} onValueChange={handleLocationChange}>
              <SelectTrigger className="w-full md:w-56" data-testid="nearby-location-select">
                <SelectValue placeholder="Vyberte lokalitu"/>
              </SelectTrigger>
              <SelectContent>
                {currentLocations.map(o => <SelectItem key={o.id || o.name} value={o.name}>{o.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {!location ? (
          <Card className="empty-state-card bg-white border-border/50"><CardContent className="p-12 text-center">
            <MapPin className="w-12 h-12 text-bloom-violet/30 mx-auto mb-3"/>
            <h3 className="font-serif text-lg font-semibold text-bloom-text mb-1">Nastavte si svou lokalitu</h3>
            <p className="text-sm text-bloom-sub">Vyberte lokalitu výše, abyste viděli nabídky a odborníky ve svém okolí</p>
          </CardContent></Card>
        ) : loading ? (
          <div className="flex justify-center py-12"><div className="spinner"/></div>
        ) : (
          <div className="space-y-10">
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-xl font-bold text-bloom-text flex items-center gap-2">
                  <Users className="w-5 h-5 text-bloom-violet"/>Členové komunity v okolí: {location}
                </h2>
              </div>
              {nearbyUsers.length === 0 ? (
                <Card className="empty-state-card bg-white border-border/50"><CardContent className="p-8 text-center"><Users className="w-10 h-10 text-bloom-sub/30 mx-auto mb-3"/><p className="text-sm text-bloom-sub">V této lokalitě zatím nejsou žádní členové komunity</p></CardContent></Card>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {nearbyUsers.map(u => (
                    <Link key={u.id} to={`/users/${u.id}`} data-testid={`nearby-user-${u.id}`}>
                      <Card className="bg-white border-border/50 card-hover h-full">
                        <CardContent className="p-4 flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={getAvatarImage(u.avatar, u.custom_avatar)}/>
                            <AvatarFallback className="bg-bloom-violet text-white text-sm">{u.username?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-semibold text-bloom-text text-sm">{u.username}</p>
                            <p className="text-xs text-bloom-sub">{u.pronouns}</p>
                            {u.bio && <p className="text-xs text-bloom-sub/70 line-clamp-1 mt-0.5">{u.bio}</p>}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-xl font-bold text-bloom-text flex items-center gap-2"><Heart className="w-5 h-5 text-bloom-pride-pink"/>Vzájemná podpora v okolí: {location}</h2>
                <Link to="/support" className="text-sm text-bloom-violet hover:underline">Zobrazit vše</Link>
              </div>
              {nearbyServices.length===0?(
                <Card className="empty-state-card bg-white border-border/50"><CardContent className="p-8 text-center"><Users className="w-10 h-10 text-bloom-sub/30 mx-auto mb-3"/><p className="text-sm text-bloom-sub">V této lokalitě zatím nejsou žádné nabídky</p><Link to="/support"><Button className="mt-3 bg-bloom-mint text-white">Vytvořit nabídku</Button></Link></CardContent></Card>
              ):(
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {nearbyServices.map(s=>(
                    <Card key={s.id} className="bg-white border-border/50 card-hover">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar className="w-7 h-7"><AvatarImage src={getAvatarImage(s.avatar)}/><AvatarFallback className="bg-bloom-violet text-white text-xs">{s.username?.charAt(0)}</AvatarFallback></Avatar>
                          <span className="text-sm font-medium text-bloom-text">{s.username}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-1"><span className="px-2 py-0.5 rounded-full bg-bloom-pride-pink/10 text-bloom-pride-pink text-xs">{s.offer}</span>{s.need&&<span className="px-2 py-0.5 rounded-full bg-bloom-pride-blue/10 text-bloom-pride-blue text-xs">{s.need}</span>}</div>
                        <p className="text-xs text-bloom-sub line-clamp-2">{s.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-xl font-bold text-bloom-text flex items-center gap-2"><Stethoscope className="w-5 h-5 text-bloom-pride-blue"/>Odborníci v okolí: {location}</h2>
                <Link to="/specialists" className="text-sm text-bloom-violet hover:underline">Zobrazit vše</Link>
              </div>
              {nearbySpecialists.length===0?(
                <Card className="empty-state-card bg-white border-border/50"><CardContent className="p-8 text-center"><Stethoscope className="w-10 h-10 text-bloom-sub/30 mx-auto mb-3"/><p className="text-sm text-bloom-sub">V této lokalitě zatím nejsou registrovaní odborníci</p></CardContent></Card>
              ):(
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {nearbySpecialists.map(s=>(
                    <Link key={s.id} to="/specialists">
                      <Card className="bg-white border-border/50 card-hover h-full">
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-bloom-text text-sm mb-1">{s.name}</h3>
                          <p className="text-xs text-bloom-violet mb-1">{s.specialty}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-bloom-sub flex items-center gap-1"><MapPin className="w-3 h-3"/>{s.city}</span>
                            {s.avg_rating>0&&<div className="flex items-center gap-0.5"><Star className="w-3 h-3 text-bloom-pride-pink fill-bloom-pride-pink"/><span className="text-xs text-bloom-text">{s.avg_rating}</span></div>}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default NearbyPage;
