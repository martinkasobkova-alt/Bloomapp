import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { LotusLogo, getAvatarImage } from '../components/Layout';
import { useContactEmail } from '../hooks/useContactEmail';
import { useAppSettings } from '../context/AppSettingsContext';
import { Card, CardContent } from '../components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { 
  Heart, Stethoscope, Scale, Newspaper, ArrowRight, MapPin, Calendar,
  Users, Star, MessageSquare
} from 'lucide-react';

import { API, getMediaUrl } from '../lib/api';
import { AnimatedNumber } from '../components/AnimatedNumber';

const SECTION_LABELS = { legal: 'Právní poradna', specialists: 'Trans-friendly odborníci' };
const SECTION_PATHS = { legal: '/legal', specialists: '/specialists' };
const SECTION_COLORS = { legal: 'bg-blue-100 text-blue-700', specialists: 'bg-teal-100 text-teal-700' };

const HomePage = () => {
  const { user } = useAuth();
  const [news, setNews] = useState([]);
  const [highlights, setHighlights] = useState({ new_members: [], top_specialists: [] });
  const [recentQuestions, setRecentQuestions] = useState([]);
  const [featuredItems, setFeaturedItems] = useState([]);
  const [stats, setStats] = useState(null);
  const contactEmail = useContactEmail();
  const { sections, markerColors } = useAppSettings();

  useEffect(() => { fetchNews(); fetchHighlights(); fetchFeatured(); fetchStats(); fetchRecentQuestions(); }, []);

  const fetchNews = async () => {
    try { const r = await axios.get(`${API}/news`); setNews(r.data.slice(0, 6)); } catch {}
  };
  const fetchHighlights = async () => {
    try { const r = await axios.get(`${API}/community/highlights`); setHighlights(r.data); } catch {}
  };
  const fetchFeatured = async () => {
    try { const r = await axios.get(`${API}/featured-items`); setFeaturedItems(r.data); } catch {}
  };
  const fetchStats = async () => {
    try { const r = await axios.get(`${API}/stats`); setStats(r.data); } catch {}
  };
  const fetchRecentQuestions = async () => {
    try {
      const [legal, specialists] = await Promise.all([
        axios.get(`${API}/questions?section=legal`),
        axios.get(`${API}/questions?section=specialists`),
      ]);
      const combined = [
        ...legal.data.map(q => ({ ...q, section: 'legal' })),
        ...specialists.data.map(q => ({ ...q, section: 'specialists' })),
      ];
      combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setRecentQuestions(combined.slice(0, 5));
    } catch {}
  };

  const mc = (key) => markerColors?.[key] || '#8A7CFF';

  // Feature cards — titles and descriptions from admin settings (with fallback), filtered by visibility
  const BASE_FEATURES = [
    { icon: Heart, defaultTitle: 'Vzájemná podpora', defaultDesc: 'Nabídněte své dovednosti a získejte služby od ostatních.', link: '/support', color: 'text-bloom-pride-pink bg-bloom-pride-pink/10', sectionKey: 'support' },
    { icon: Stethoscope, defaultTitle: 'Trans-friendly odborníci', defaultDesc: 'Najděte ověřené odborníky od psychologů po plastické chirurgy.', link: '/specialists', color: 'text-bloom-pride-blue bg-bloom-pride-blue/10', sectionKey: 'specialists' },
    { icon: Scale, defaultTitle: 'Právní poradna', defaultDesc: 'Právní pomoc, články a odpovědi na vaše otázky.', link: '/legal', color: 'text-bloom-violet bg-bloom-violet/10', sectionKey: 'legal' },
    { icon: MapPin, defaultTitle: 'V mém okolí', defaultDesc: 'Služby a odborníci ve vašem okolí.', link: '/nearby', color: 'text-bloom-mint bg-bloom-mint/10', sectionKey: 'nearby' },
  ];
  const features = BASE_FEATURES
    .filter(f => sections?.[f.sectionKey]?.visible !== false)
    .map(f => ({
      ...f,
      title: sections?.[f.sectionKey]?.title || f.defaultTitle,
      desc: sections?.[f.sectionKey]?.subtitle || f.defaultDesc,
    }));

  const featuredSpecialists = featuredItems.filter(f => f.type === 'specialist');
  const featuredNews = featuredItems.filter(f => f.type === 'news');

  return (
    <div className="min-h-screen" data-testid="home-page">
      {/* Hero — compact */}
      <section className="relative pt-12 pb-3 overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-2">
            <div className="p-2 rounded-xl bg-white shadow-md shadow-bloom-violet/10">
              {user?.avatar ? (
                <Avatar className="w-10 h-10 sm:w-12 sm:h-12">
                  <AvatarImage src={getAvatarImage(user.avatar)} alt={user.username} />
                  <AvatarFallback className="bg-bloom-violet/10"><LotusLogo size={28} /></AvatarFallback>
                </Avatar>
              ) : (
                <LotusLogo size={36} />
              )}
            </div>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold mb-1 text-bloom-text/75" data-testid="hero-title">
            Vítej, <span className="text-bloom-violet">{user?.username}</span>
          </h1>
        </div>
      </section>

      {/* Pride bar */}
      <div className="pride-bar" />

      {/* Quote + community stats */}
      <section className="py-5 sm:py-7">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          {/* Quote */}
          <blockquote>
            <p className="text-sm sm:text-base text-bloom-sub leading-relaxed italic">
              <span className="text-bloom-violet font-serif text-2xl sm:text-3xl mr-1 inline-block" style={{ verticalAlign: 'top', transform: 'translateY(-0.2em)' }}>&ldquo;</span>
              Bloom je prostor, kde každý může být sám sebou — kde můžete sdílet
              <br />
              své zkušenosti, ptát se a pomáhat ostatním. Bez odsuzování a bez předsudků.<span className="text-bloom-violet font-serif text-2xl sm:text-3xl ml-1 inline-block" style={{ verticalAlign: 'top', transform: 'translateY(-0.2em)' }}>&rdquo;</span>
            </p>
          </blockquote>

          {/* Bloom v číslech */}
          {stats && (
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { emoji: '🌸', value: stats.members, label: 'členů komunity' },
                  { emoji: '💬', value: stats.experiences, label: 'sdílených zkušeností' },
                  { emoji: '🧠', value: stats.specialists, label: 'ověřených odborníků' },
                  { emoji: '🤝', value: stats.services, label: 'nabídek vzájemné pomoci' },
                ].map(s => (
                  <div key={s.label} className="bg-white border border-border/50 rounded-xl py-3 px-2 shadow-sm" data-testid={`stat-${s.label.split(' ')[0]}`}>
                    <div className="text-xl mb-1">{s.emoji}</div>
                    <div className="text-2xl font-bold text-bloom-text"><AnimatedNumber value={s.value} duration={400} /></div>
                    <div className="text-[11px] text-bloom-sub leading-tight mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ===== NOVĚ V KOMUNITĚ ===== */}
      <section className="py-8 sm:py-10 bg-gradient-to-b from-bloom-violet/5 to-transparent" data-testid="onboarding-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-4">
            <p className="text-sm text-bloom-sub/70 tracking-wide uppercase font-medium mb-2">Nově v komunitě?</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center mb-4">
            {[
              { label: 'Jsem tu poprvé', link: '/news', color: '#F5A9B8' },
              { label: 'Nevím kde začít', link: '/legal', color: '#8A7CFF' },
              { label: 'Chci zůstat anonymní', link: '/profile', color: '#5BCEFA' },
              { label: 'Hledám odborníka', link: '/specialists', color: '#A8E6CF' },
              { label: 'Chci si jen číst zkušenosti', link: '/news', color: '#F7C59F' },
            ].map(entry => (
              <Link
                key={entry.label}
                to={entry.link}
                className="px-4 py-2 rounded-full text-sm font-medium border transition-all hover:shadow-sm hover:scale-[1.02]"
                style={{ borderColor: `${entry.color}60`, color: entry.color, background: `${entry.color}15` }}
                data-testid={`onboarding-entry-${entry.label.toLowerCase().replace(/\s/g, '-')}`}
              >
                {entry.label}
              </Link>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <Link key={f.title} to={f.link} data-testid={`feature-${f.link.replace('/', '')}`}>
                  <Card className="h-full bg-white border-border/50 card-hover group">
                    <CardContent className="p-5">
                      <div className={`w-10 h-10 rounded-lg ${f.color} flex items-center justify-center mb-3`}><Icon className="w-5 h-5" /></div>
                      <h3 className="font-serif text-lg font-semibold text-bloom-text mb-1 group-hover:text-bloom-violet transition-colors">{f.title}</h3>
                      <p className="text-sm text-bloom-sub">{f.desc}</p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
          <div className="text-center">
            <p className="text-xs text-bloom-sub/60 max-w-md mx-auto leading-relaxed">
              Máš otázky nebo chceš vědět více? Napiš nám na{' '}
              {contactEmail && <a href={`mailto:${contactEmail}`} className="text-bloom-violet hover:underline">{contactEmail}</a>}
            </p>
          </div>
        </div>
      </section>

      {/* Featured Items — only shown if admin has pinned items */}
      {featuredItems.length > 0 && (
        <section className="py-10 bg-gradient-to-b from-bloom-pride-pink/5 to-transparent" data-testid="featured-section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-bloom-text mb-6 flex items-center">
              <span className="section-marker" style={{ background: mc('featured') }} />
              Doporučujeme
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Featured specialists */}
              {featuredSpecialists.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-bloom-sub uppercase tracking-wider mb-3">Odborníci</h3>
                  <div className="space-y-3">
                    {featuredSpecialists.map(f => (
                      <Link key={f.data.id} to="/specialists">
                        <Card className="bg-white border-border/50 card-hover" data-testid={`featured-spec-home-${f.data.id}`}>
                          <CardContent className="p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-bloom-pride-pink/10 flex items-center justify-center shrink-0"><Stethoscope className="w-5 h-5 text-bloom-pride-pink" /></div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-bloom-text text-sm">{f.data.name}</p>
                              <p className="text-xs text-bloom-violet">{f.data.specialty}</p>
                              <p className="text-xs text-bloom-sub flex items-center gap-1"><MapPin className="w-3 h-3" />{f.data.city}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Star className="w-3.5 h-3.5 text-bloom-pride-pink fill-bloom-pride-pink" />
                              <span className="text-sm font-medium text-bloom-text">{f.data.avg_rating?.toFixed(1)}</span>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {/* Featured news */}
              {featuredNews.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-bloom-sub uppercase tracking-wider mb-3">Aktuality</h3>
                  <div className="space-y-3">
                    {featuredNews.map(f => (
                      <Link key={f.data.id} to={`/news/${f.data.id}`}>
                        <Card className="bg-white border-border/50 card-hover" data-testid={`featured-news-home-${f.data.id}`}>
                          <CardContent className="p-4 flex gap-3 items-start">
                            {f.data.image_url && (
                              <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0"><img src={getMediaUrl(f.data.image_url)} alt={f.data.title} className="w-full h-full object-cover" /></div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-bloom-text text-sm line-clamp-2">{f.data.title}</p>
                              <p className="text-xs text-bloom-sub mt-0.5 flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(f.data.created_at).toLocaleDateString('cs-CZ')}</p>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Community Highlights */}
      <section className="py-12 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-bloom-text mb-8 flex items-center"><span className="section-marker" style={{background: mc('community')}} />{sections?.community?.title || 'Komunita'}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {/* New Members */}
            <Card className="bg-white border-border/50">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-bloom-violet" />
                  <h3 className="font-semibold text-bloom-text">Noví členové komunity</h3>
                </div>
                {highlights.new_members.length === 0 ? (
                  <p className="text-sm text-bloom-sub">Zatím žádní noví členové</p>
                ) : (
                  <div className="space-y-3">
                    {highlights.new_members.map((m) => (
                      <Link key={m.id} to={`/users/${m.id}`} className="flex items-center gap-3 hover:bg-muted/50 rounded-lg p-1 -m-1 transition-colors" data-testid={`member-link-${m.id}`}>
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={getAvatarImage(m.avatar)} />
                          <AvatarFallback className="bg-bloom-violet text-white text-xs">{m.username?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-bloom-text hover:text-bloom-violet transition-colors">{m.username}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>


            {/* Recent Questions */}
            <Card className="bg-white border-border/50">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-5 h-5 text-bloom-violet" />
                  <h3 className="font-semibold text-bloom-text">Nejnovější otázky</h3>
                </div>
                {recentQuestions.length === 0 ? (
                  <p className="text-sm text-bloom-sub">Zatím žádné otázky.</p>
                ) : (
                  <div className="space-y-2.5">
                    {recentQuestions.map(q => (
                      <Link key={q.id} to={SECTION_PATHS[q.section]} className="block group" data-testid={`recent-question-${q.id}`}>
                        <div className="flex flex-col gap-1 rounded-lg p-2 -mx-2 hover:bg-muted/50 transition-colors">
                          <p className="text-sm text-bloom-text font-medium leading-snug line-clamp-2 group-hover:text-bloom-violet transition-colors">
                            {q.title}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${SECTION_COLORS[q.section]}`}>
                              {q.section === 'legal' ? 'Právní poradna' : 'Odborníci'}
                            </span>
                            <span className="text-[10px] text-bloom-sub/70">
                              {new Date(q.created_at).toLocaleDateString('cs-CZ')}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Specialists */}
            <Card className="bg-white border-border/50">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-5 h-5 text-bloom-pride-pink" />
                  <h3 className="font-semibold text-bloom-text">Nejlépe hodnocení odborníci</h3>
                </div>
                {highlights.top_specialists.length === 0 ? (
                  <p className="text-sm text-bloom-sub">Zatím žádní hodnocení odborníci</p>
                ) : (
                  <div className="space-y-3">
                    {highlights.top_specialists.map((s) => (
                      <Link key={s.id} to="/specialists" className="flex items-center gap-3 hover:bg-muted/50 rounded-lg p-1 -m-1 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-bloom-pride-pink/10 flex items-center justify-center">
                          <Stethoscope className="w-4 h-4 text-bloom-pride-pink" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-bloom-text truncate">{s.name}</p>
                          <p className="text-xs text-bloom-sub">{s.city}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-bloom-pride-pink fill-bloom-pride-pink" />
                          <span className="text-xs font-medium text-bloom-text">{s.avg_rating}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* News */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-bloom-text flex items-center">
              <span className="section-marker" style={{background: mc('news')}} />
              {sections?.news?.title || 'Aktuality'}
            </h2>
            <Link to="/news" className="text-bloom-violet hover:text-bloom-violet/80 flex items-center gap-1 text-sm font-medium" data-testid="view-all-news">
              Zobrazit vše <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {news.length === 0 ? (
            <Card className="bg-white border-border/50">
              <CardContent className="p-12 text-center">
                <Newspaper className="w-10 h-10 text-bloom-sub/30 mx-auto mb-3" />
                <p className="text-bloom-sub">Zatím nejsou žádné aktuality</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {news.map((item) => (
                <Link key={item.id} to={`/news/${item.id}`} data-testid={`news-${item.id}`}>
                  <Card className="bg-white border-border/50 card-hover h-full overflow-hidden">
                    <CardContent className="p-0">
                      {item.image_url && (
                        <div className="aspect-video overflow-hidden"><img src={getMediaUrl(item.image_url)} alt={item.title} className="w-full h-full object-cover" /></div>
                      )}
                      <div className="p-4">
                        <h3 className="font-serif text-base font-semibold text-bloom-text mb-1 line-clamp-2">{item.title}</h3>
                        <p className="text-sm text-bloom-sub line-clamp-2 mb-2">{item.content.substring(0, 100)}...</p>
                        <div className="flex items-center gap-1 text-xs text-bloom-sub">
                          <Calendar className="w-3 h-3" />{new Date(item.created_at).toLocaleDateString('cs-CZ')}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer removed – Layout provides the unified site footer */}
    </div>
  );
};

export default HomePage;
