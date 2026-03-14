import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { getAvatarImage } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { Switch } from '../components/ui/switch';
import { toast } from 'sonner';
import { MapPin, Users, Lock, Globe, ChevronRight, Save } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

import { API } from '../lib/api';

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

export default function JourneyPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStage, setCurrentStage] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [similarUsers, setSimilarUsers] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [saved, setSaved] = useState(false);
  const [searchStage, setSearchStage] = useState('');

  useEffect(() => {
    // Load current user's journey from their profile
    const fetchMyJourney = async () => {
      try {
        const r = await axios.get(`${API}/users/me`);
        const journey = r.data?.journey;
        if (journey) {
          setCurrentStage(journey.stage || '');
          setIsPublic(journey.is_public || false);
          setNote(journey.note || '');
        }
      } catch {}
    };
    fetchMyJourney();
  }, []);

  const handleSave = async () => {
    if (!currentStage) { toast.error('Vyberte prosím fázi cesty'); return; }
    setSaving(true);
    const stageData = STAGES.find(s => s.id === currentStage);
    try {
      await axios.put(`${API}/users/me/journey`, {
        stage: currentStage,
        stage_label: stageData?.label || currentStage,
        is_public: isPublic,
        note
      });
      toast.success('Vaše cesta byla uložena!');
      setSaved(true);
      if (isPublic) fetchSimilar();
    } catch { toast.error('Nepodařilo se uložit'); }
    finally { setSaving(false); }
  };

  const fetchSimilar = async () => {
    setLoadingSimilar(true);
    try {
      const r = await axios.get(`${API}/journey/similar`);
      setSimilarUsers(r.data);
    } catch {} finally { setLoadingSimilar(false); }
  };

  const selectedStage = STAGES.find(s => s.id === currentStage);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-1 w-16 rounded bg-gradient-to-r from-[#5BCEFA] to-[#F5A9B8]" />
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-bloom-text">Moje cesta</h1>
        <p className="text-bloom-sub text-sm leading-relaxed max-w-lg">
          Tato funkce je zcela volitelná. Sdílej svou fázi tranzice, pokud chceš – nebo si ji nech jen pro sebe.
          Můžeš také najít lidi v podobné životní fázi.
        </p>
      </div>

      {/* Roadmap */}
      <Card className="bg-white border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-bloom-text">Kde se nacházím?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {STAGES.map(stage => (
              <button
                key={stage.id}
                onClick={() => setCurrentStage(stage.id)}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all hover:shadow-sm ${
                  currentStage === stage.id
                    ? 'border-bloom-violet/60 shadow-sm bg-bloom-violet/5'
                    : 'border-border/50 bg-white hover:border-bloom-violet/30'
                }`}
                data-testid={`stage-${stage.id}`}
              >
                <div
                  className="w-4 h-4 rounded-full shrink-0 ring-2 ring-white shadow-sm"
                  style={{
                    background: stage.color,
                    boxShadow: currentStage === stage.id ? `0 0 0 3px ${stage.color}50` : undefined
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold truncate ${currentStage === stage.id ? 'text-bloom-violet' : 'text-bloom-text'}`}>
                    {stage.label}
                  </p>
                  {currentStage === stage.id && (
                    <p className="text-[10px] text-bloom-sub mt-0.5 leading-relaxed line-clamp-2">{stage.desc}</p>
                  )}
                </div>
                {currentStage === stage.id && <ChevronRight className="w-3.5 h-3.5 text-bloom-violet shrink-0" />}
              </button>
            ))}
          </div>

          {/* Color legend */}
          <div className="mt-4 pt-3 border-t border-border/40">
            <p className="text-[10px] text-bloom-sub/60 mb-2 font-medium uppercase tracking-wide">Legenda barev</p>
            <div className="flex flex-wrap gap-2">
              {STAGES.map(s => (
                <div key={s.id} className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                  <span className="text-[10px] text-bloom-sub/70">{s.label.split(' ').slice(0, 2).join(' ')}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Note */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-bloom-text">Osobní poznámka <span className="text-bloom-sub font-normal">(volitelná)</span></label>
        <Textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Cokoliv, co chceš sdílet nebo si zapamatovat o této fázi..."
          rows={3}
          className="text-sm"
          data-testid="journey-note-input"
        />
      </div>

      {/* Privacy toggle */}
      <Card className="bg-white border-border/50">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {isPublic ? <Globe className="w-4 h-4 text-bloom-violet" /> : <Lock className="w-4 h-4 text-bloom-sub" />}
            <div>
              <p className="text-sm font-medium text-bloom-text">
                {isPublic ? 'Fáze je viditelná ostatním' : 'Fáze je soukromá'}
              </p>
              <p className="text-xs text-bloom-sub">
                {isPublic ? 'Ostatní tě mohou najít přes „Najít lidi"' : 'Pouze ty vidíš svou fázi'}
              </p>
            </div>
          </div>
          <Switch
            checked={isPublic}
            onCheckedChange={setIsPublic}
            data-testid="journey-public-toggle"
          />
        </CardContent>
      </Card>

      {/* Save */}
      <Button
        onClick={handleSave}
        className="w-full bg-bloom-violet text-white"
        disabled={saving || !currentStage || !user?.email_verified}
        title={!user?.email_verified ? 'Pro uložení cesty musíte ověřit e-mail' : ''}
        data-testid="save-journey-btn"
      >
        <Save className="w-4 h-4 mr-2" />
        {saving ? 'Ukládám...' : 'Uložit moji cestu'}
      </Button>

      {/* Find similar */}
      {currentStage && (
        <Card className="bg-gradient-to-br from-bloom-violet/5 to-[#5BCEFA]/5 border-bloom-violet/20">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-bloom-text flex items-center gap-2">
                <Users className="w-4 h-4 text-bloom-violet" />Najít lidi
              </p>
              <div className="flex items-center gap-2">
                <Select value={searchStage || 'mine'} onValueChange={(v) => setSearchStage(v === 'mine' ? '' : v)}>
                  <SelectTrigger className="w-[200px] h-9 text-sm border-bloom-violet/30" data-testid="journey-search-stage-select">
                    <SelectValue placeholder="Hledat v..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mine">
                      Moje fáze{currentStage ? ` (${STAGES.find(s => s.id === currentStage)?.label || currentStage})` : ''}
                    </SelectItem>
                    {STAGES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-bloom-violet/30 text-bloom-violet"
                  onClick={fetchSimilar}
                  disabled={loadingSimilar}
                  data-testid="find-similar-btn"
                >
                  {loadingSimilar ? 'Hledám...' : 'Hledat'}
                </Button>
              </div>
            </div>
            {(searchStage ? STAGES.find(s => s.id === searchStage) : selectedStage) && (
              <p className="text-xs text-bloom-sub">
                Hledat lidi ve fázi: <strong>{(searchStage ? STAGES.find(s => s.id === searchStage) : selectedStage)?.label}</strong> (jen uživatelé, kteří sdílí veřejně)
              </p>
            )}
            {similarUsers.length > 0 && (
              <div className="space-y-2">
                {similarUsers.map(u => (
                  <Link
                    key={u.id}
                    to={`/users/${u.id}`}
                    className="flex items-center gap-2.5 p-2.5 bg-white rounded-lg hover:shadow-sm transition-shadow"
                    data-testid={`similar-user-${u.id}`}
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={getAvatarImage(u.avatar)} />
                      <AvatarFallback className="bg-bloom-violet text-white text-xs">{u.username?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-bloom-text">{u.username}</p>
                      {u.location && <p className="text-xs text-bloom-sub">{u.location}</p>}
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-bloom-sub ml-auto" />
                  </Link>
                ))}
              </div>
            )}
            {similarUsers.length === 0 && saved && (
              <p className="text-xs text-bloom-sub italic">Zatím nikdo jiný v komunitě nesdílí tuto fázi veřejně.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
