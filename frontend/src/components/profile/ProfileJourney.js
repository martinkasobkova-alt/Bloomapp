import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { getAvatarImage } from '../avatarSystem';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Switch } from '../ui/switch';
import { toast } from 'sonner';
import { Save, Lock, Globe, Users, ChevronRight, Heart } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { API } from '../../lib/api';

const STAGES = [
  { id: 'thinking', label: 'Uvažuji o tranzici', color: '#E8E8E8', desc: 'Přemýšlím, kdo jsem a jaká cesta je ta moje.' },
  { id: 'research', label: 'Hledám informace', color: '#C3AED6', desc: 'Čtu, ptám se, hledám zdroje a komunitu.' },
  { id: 'therapist', label: 'První návštěva terapeuta', color: '#A8D8EA', desc: 'Mluvím s odborníkem o své cestě.' },
  { id: 'hormones', label: 'Hormonální léčba', color: '#5BCEFA', desc: 'Začínám nebo pokračuji v hormonální terapii.' },
  { id: 'documents', label: 'Změna dokladů', color: '#8A7CFF', desc: 'Pracuji na úřední změně jména nebo pohlaví.' },
  { id: 'cosmetic', label: 'Kosmetické úpravy', color: '#F5A9B8', desc: 'Pracuji na svém vzhledu – vlasy, make-up, styl.' },
  { id: 'surgery-thinking', label: 'Zvažuji operace', color: '#F7C59F', desc: 'Přemýšlím o chirurgických možnostech.' },
  { id: 'surgery', label: 'Po operacích', color: '#A8E6CF', desc: 'Jsem po jedné nebo více operacích.' },
  { id: 'stable', label: 'Stabilní fáze', color: '#B5C99A', desc: 'Jsem na místě, kde chci být, a žiji svůj život.' },
  { id: 'individual', label: 'Individuální cesta', color: '#FFD1DC', desc: 'Moje cesta neodpovídá žádné škatulce – a to je OK.' },
];

export function ProfileJourney() {
  const [journeyStage, setJourneyStage] = useState('');
  const [journeyPublic, setJourneyPublic] = useState(false);
  const [journeyNote, setJourneyNote] = useState('');
  const [journeySaving, setJourneySaving] = useState(false);
  const [similarUsers, setSimilarUsers] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [searchStage, setSearchStage] = useState('');

  useEffect(() => {
    axios.get(`${API}/users/me`).then(r => {
      const journey = r.data?.journey;
      if (journey) {
        setJourneyStage(journey.stage || '');
        setJourneyPublic(journey.is_public || false);
        setJourneyNote(journey.note || '');
      }
    }).catch(() => {});
  }, []);

  const handleSaveJourney = async () => {
    if (!journeyStage) { toast.error('Vyberte prosím fázi cesty'); return; }
    setJourneySaving(true);
    const stageData = STAGES.find(s => s.id === journeyStage);
    const payload = {
      stage: journeyStage, stage_label: stageData?.label || journeyStage,
      is_public: journeyPublic, note: journeyNote
    };
    try {
      await axios.put(`${API}/users/me/journey`, payload);
      toast.success('Vaše cesta byla uložena!');
      if (journeyPublic) fetchSimilarUsers();
    } catch { toast.error('Nepodařilo se uložit'); }
    finally { setJourneySaving(false); }
  };

  const fetchSimilarUsers = async () => {
    setLoadingSimilar(true);
    try {
      const url = searchStage ? `${API}/journey/similar?stage=${encodeURIComponent(searchStage)}` : `${API}/journey/similar`;
      const r = await axios.get(url);
      setSimilarUsers(r.data);
    } catch {} finally { setLoadingSimilar(false); }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-white border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-bloom-text flex items-center gap-2"><Heart className="w-4 h-4 text-bloom-violet" />Kde se nacházím?</CardTitle>
          <p className="text-xs text-bloom-sub">Sdílej svou fázi tranzice, pokud chceš – nebo si ji nech jen pro sebe.</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {STAGES.map(stage => (
              <button key={stage.id} onClick={() => setJourneyStage(stage.id)}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all hover:shadow-sm ${journeyStage === stage.id ? 'border-bloom-violet/60 shadow-sm bg-bloom-violet/5' : 'border-border/50 bg-white hover:border-bloom-violet/30'}`}
                data-testid={`stage-${stage.id}`}>
                <div className="w-4 h-4 rounded-full shrink-0 ring-2 ring-white shadow-sm" style={{ background: stage.color, boxShadow: journeyStage === stage.id ? `0 0 0 3px ${stage.color}50` : undefined }} />
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold truncate ${journeyStage === stage.id ? 'text-bloom-violet' : 'text-bloom-text'}`}>{stage.label}</p>
                  {journeyStage === stage.id && <p className="text-[10px] text-bloom-sub mt-0.5 leading-relaxed line-clamp-2">{stage.desc}</p>}
                </div>
                {journeyStage === stage.id && <ChevronRight className="w-3.5 h-3.5 text-bloom-violet shrink-0" />}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-bloom-text">Osobní poznámka <span className="text-bloom-sub font-normal">(volitelná)</span></Label>
        <Textarea value={journeyNote} onChange={e => setJourneyNote(e.target.value)} placeholder="Cokoliv, co chceš sdílet nebo si zapamatovat..." rows={3} className="text-sm" data-testid="journey-note-input" />
      </div>

      <Card className="bg-white border-border/50">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {journeyPublic ? <Globe className="w-4 h-4 text-bloom-violet" /> : <Lock className="w-4 h-4 text-bloom-sub" />}
            <div>
              <p className="text-sm font-medium text-bloom-text">{journeyPublic ? 'Fáze je viditelná ostatním' : 'Fáze je soukromá'}</p>
              <p className="text-xs text-bloom-sub">{journeyPublic ? 'Ostatní tě mohou najít přes „Najít lidi"' : 'Pouze ty vidíš svou fázi'}</p>
            </div>
          </div>
          <Switch checked={journeyPublic} onCheckedChange={setJourneyPublic} data-testid="journey-public-toggle" />
        </CardContent>
      </Card>

      <Button onClick={handleSaveJourney} className="w-full bg-bloom-violet text-white" disabled={journeySaving || !journeyStage} data-testid="save-journey-btn">
        <Save className="w-4 h-4 mr-2" />{journeySaving ? 'Ukládám...' : 'Uložit moji cestu'}
      </Button>

      {journeyStage && (
        <Card className="bg-gradient-to-br from-bloom-violet/5 to-[#5BCEFA]/5 border-bloom-violet/20">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-bloom-text flex items-center gap-2"><Users className="w-4 h-4 text-bloom-violet" />Najít lidi</p>
              <div className="flex items-center gap-2">
                <Select value={searchStage || 'mine'} onValueChange={(v) => setSearchStage(v === 'mine' ? '' : v)}>
                  <SelectTrigger className="w-[200px] h-9 text-sm border-bloom-violet/30" data-testid="journey-search-stage-select">
                    <SelectValue placeholder="Hledat v..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mine">
                      Moje fáze{journeyStage ? ` (${STAGES.find(s => s.id === journeyStage)?.label || journeyStage})` : ''}
                    </SelectItem>
                    {STAGES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" className="border-bloom-violet/30 text-bloom-violet" onClick={fetchSimilarUsers} disabled={loadingSimilar} data-testid="find-similar-btn">
                  {loadingSimilar ? 'Hledám...' : 'Hledat'}
                </Button>
              </div>
            </div>
            {similarUsers.length > 0 && (
              <div className="space-y-2">
                {similarUsers.map(u => (
                  <Link key={u.id} to={`/users/${u.id}`} className="flex items-center gap-2.5 p-2.5 bg-white rounded-lg hover:shadow-sm transition-shadow" data-testid={`similar-user-${u.id}`}>
                    <Avatar className="w-8 h-8"><AvatarImage src={getAvatarImage(u.avatar)} /><AvatarFallback className="bg-bloom-violet text-white text-xs">{u.username?.charAt(0)}</AvatarFallback></Avatar>
                    <div><p className="text-sm font-medium text-bloom-text">{u.username}</p>{u.location && <p className="text-xs text-bloom-sub">{u.location}</p>}</div>
                    <ChevronRight className="w-3.5 h-3.5 text-bloom-sub ml-auto" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
