import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, Users, Newspaper, Stethoscope, Heart, Scale, HelpCircle, Star, ChevronRight, Loader2 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { API } from '../lib/api';

const SECTION_META = {
  posts:       { label: 'Příspěvky',             icon: Newspaper,    color: 'text-bloom-mint',       bg: 'bg-bloom-mint/10',       link: (r) => `/news/${r.id}` },
  users:       { label: 'Uživatelé',             icon: Users,        color: 'text-bloom-violet',      bg: 'bg-bloom-violet/10',     link: (r) => `/users/${r.id}` },
  specialists: { label: 'Trans-friendly odborníci', icon: Stethoscope, color: 'text-bloom-pride-pink', bg: 'bg-bloom-pride-pink/10', link: () => '/specialists' },
  services:    { label: 'Nabídky pomoci',        icon: Heart,        color: 'text-bloom-pride-blue',  bg: 'bg-bloom-pride-blue/10', link: () => '/support' },
  articles:    { label: 'Právní poradna – Články', icon: Scale,      color: 'text-emerald-600',       bg: 'bg-emerald-50',          link: () => '/legal' },
  questions:   { label: 'Otázky komunity',       icon: HelpCircle,   color: 'text-amber-600',         bg: 'bg-amber-50',            link: () => '/legal' },
  reviews:     { label: 'Recenze odborníků',     icon: Star,         color: 'text-yellow-600',        bg: 'bg-yellow-50',           link: (r) => `/specialists` },
};

function ResultItem({ type, result }) {
  const meta = SECTION_META[type];
  const Icon = meta.icon;
  const to = meta.link(result);
  const title = result.title || result.username || result.name || `${result.offer || ''} ↔ ${result.need || ''}`.trim();
  const subtitle = result.specialty || result.location || result.category || result.bio || result.description
    || (type === 'reviews' ? result.content : '')
    || (type === 'questions' && !result.title ? result.content : '');
  const ratingStars = type === 'reviews' && result.rating
    ? '★'.repeat(result.rating) + '☆'.repeat(5 - result.rating) : null;

  return (
    <Link to={to} className="block group">
      <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/40 transition-colors" data-testid={`search-result-${type}-${result.id}`}>
        <div className={`shrink-0 w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center mt-0.5`}>
          <Icon className={`w-4 h-4 ${meta.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-bloom-text group-hover:text-bloom-violet transition-colors line-clamp-1">{title}</p>
          {ratingStars && <p className={`text-xs ${meta.color} tracking-wide`}>{ratingStars}</p>}
          {subtitle && !ratingStars && <p className="text-xs text-bloom-sub mt-0.5 line-clamp-2">{subtitle}</p>}
          {result.username && type !== 'users' && <p className="text-xs text-bloom-sub/60 mt-0.5">{result.username}</p>}
        </div>
        <ChevronRight className="w-4 h-4 text-bloom-sub/40 shrink-0 mt-1 group-hover:text-bloom-violet transition-colors" />
      </div>
    </Link>
  );
}

function SectionBlock({ type, results, total, query }) {
  const meta = SECTION_META[type];
  const Icon = meta.icon;
  if (!results?.length) return null;

  return (
    <div data-testid={`search-section-${type}`}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-bloom-text flex items-center gap-2">
          <Icon className={`w-4 h-4 ${meta.color}`} />
          {meta.label}
          <span className={`text-xs font-normal px-1.5 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>{total}</span>
        </h2>
        {total > results.length && (
          <Link
            to={meta.link({})}
            className={`text-xs ${meta.color} hover:underline flex items-center gap-0.5`}
            data-testid={`search-more-${type}`}
          >
            Zobrazit více <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>
      <Card className="bg-white border-border/50 divide-y divide-border/40">
        {results.map(r => (
          <CardContent key={r.id} className="p-0">
            <ResultItem type={type} result={r} />
          </CardContent>
        ))}
      </Card>
    </div>
  );
}

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [inputVal, setInputVal] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState(null);
  const [totals, setTotals] = useState({});
  const [loading, setLoading] = useState(false);

  const doSearch = useCallback(async (q) => {
    if (!q || q.trim().length < 2) { setResults(null); return; }
    setLoading(true);
    try {
      const r = await axios.get(`${API}/search`, { params: { q: q.trim(), limit: 10 } });
      setResults(r.data.results);
      setTotals(r.data.totals || {});
      setQuery(r.data.query);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) { setInputVal(q); doSearch(q); }
  }, [searchParams, doSearch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputVal.trim().length >= 2) setSearchParams({ q: inputVal.trim() });
  };

  const totalCount = results ? Object.values(totals).reduce((s, v) => s + v, 0) : 0;
  const hasResults = results && totalCount > 0;

  return (
    <div className="min-h-screen py-6 max-w-2xl mx-auto px-4 sm:px-6" data-testid="search-page">
      <div className="pride-bar mb-6" />

      <form onSubmit={handleSubmit} className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-bloom-sub/50" />
        <input
          autoFocus
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          placeholder="Hledat v Bloom"
          className="w-full pl-10 pr-4 py-3 text-base md:text-sm bg-white border border-border rounded-xl outline-none focus:ring-2 focus:ring-bloom-violet/40 text-bloom-text placeholder:text-bloom-sub/60 shadow-sm"
          data-testid="search-page-input"
        />
        {loading && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-bloom-violet animate-spin" />}
      </form>

      {query && (
        <p className="text-sm text-bloom-sub mb-5">
          {loading
            ? <><span className="text-bloom-sub/60">Hledám: </span><span className="font-semibold text-bloom-text">„{query}"</span>…</>
            : hasResults
              ? <>Výsledky hledání pro: <span className="font-semibold text-bloom-text">„{query}"</span> <span className="text-bloom-sub/60">({totalCount} výsledků)</span></>
              : <>Nic jsme nenašli pro: <span className="font-semibold text-bloom-text">„{query}"</span></>
          }
        </p>
      )}

      {!loading && results && !hasResults && (
        <div className="text-center py-16 text-bloom-sub" data-testid="search-empty">
          <Search className="w-10 h-10 text-bloom-sub/20 mx-auto mb-3" />
          <p className="font-medium">Nic jsme nenašli. Zkuste jiné slovo.</p>
          <p className="text-xs mt-1 text-bloom-sub/60">Zkuste zkrátit hledaný výraz nebo použít jiné klíčové slovo.</p>
        </div>
      )}

      {!query && (
        <div className="text-center py-16 text-bloom-sub" data-testid="search-placeholder">
          <Search className="w-10 h-10 text-bloom-sub/20 mx-auto mb-3" />
          <p className="text-sm">Zadejte hledaný výraz a stiskněte Enter</p>
          <p className="text-xs mt-2 text-bloom-sub/60">Např.: FFS, hormony, jméno, doktor, průkaz, chirurgie...</p>
        </div>
      )}

      {hasResults && (
        <div className="space-y-6">
          {Object.keys(SECTION_META).map(type => (
            <SectionBlock
              key={type}
              type={type}
              results={results[type]}
              total={totals[type] || 0}
              query={query}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchPage;
