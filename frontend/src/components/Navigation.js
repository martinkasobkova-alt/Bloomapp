import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAppSettings } from '../context/AppSettingsContext';
import axios from 'axios';
import {
  Home, Heart, Stethoscope, Scale, Newspaper, MessageCircle, User,
  LogOut, Menu, X, Shield, MapPin, Search, Users2, HelpCircle, Star, BookOpen
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { LotusLogo } from './LotusLogo';
import { getAvatarImage } from './avatarSystem';
import { API } from '../lib/api';

// Icons per content type for autocomplete dropdown
const TYPE_ICONS = {
  posts: Newspaper,
  users: Users2,
  specialists: Stethoscope,
  services: Heart,
  articles: Scale,
  questions: HelpCircle,
  reviews: Star,
};
const TYPE_LABELS = {
  posts: 'Příspěvek',
  users: 'Uživatel',
  specialists: 'Odborník',
  services: 'Nabídka',
  articles: 'Právní poradna',
  questions: 'Otázka komunity',
  reviews: 'Recenze odborníka',
};
function getSuggestionTitle(type, item) {
  return item.title || item.username || item.name || [item.offer, item.need].filter(Boolean).join(' ↔ ') || '';
}
function getSuggestionLink(type, item) {
  if (type === 'posts') return `/news/${item.id}`;
  if (type === 'users') return `/users/${item.id}`;
  if (type === 'specialists') return '/specialists';
  if (type === 'services') return '/support';
  if (type === 'questions') return '/legal';
  if (type === 'reviews') return '/specialists';
  return '/legal';
}

// Base nav items — labels are overridden by admin section settings
const BASE_NAV_ITEMS = [
  { path: '/', icon: Home, defaultLabel: 'Domů', sectionKey: null },
  { path: '/support', icon: Heart, defaultLabel: 'Vzájemná podpora', sectionKey: 'support' },
  { path: '/specialists', icon: Stethoscope, defaultLabel: 'Trans-friendly odborníci', sectionKey: 'specialists' },
  { path: '/legal', icon: Scale, defaultLabel: 'Právní poradna', sectionKey: 'legal' },
  { path: '/news', icon: Newspaper, defaultLabel: 'Aktuality', sectionKey: 'news' },
  { path: '/zkusenosti', icon: BookOpen, defaultLabel: 'Zkušenosti komunity', sectionKey: 'stories' },
  { path: '/nearby', icon: MapPin, defaultLabel: 'V mém okolí', sectionKey: 'nearby' },
];

export const Navigation = () => {
  const { user, logout, isAdmin, isAuthenticated } = useAuth();
  const { sections } = useAppSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const mobileToggleRef = useRef(null);

  const fetchSuggestions = useCallback(async (q) => {
    if (!q || q.trim().length < 2) { setSuggestions(null); return; }
    try {
      const r = await axios.get(`${API}/search`, { params: { q: q.trim(), limit: 3 } });
      setSuggestions(r.data.results);
    } catch { setSuggestions(null); }
  }, []);

  const handleSearchChange = useCallback((val) => {
    setSearchQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 280);
  }, [fetchSuggestions]);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    if (searchQuery.trim().length >= 2) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setMobileSearchOpen(false);
      setSearchQuery('');
      setSuggestions(null);
    }
  };

  const hasSuggestions = suggestions && Object.values(suggestions).some(a => a?.length > 0);

  // Build nav items: filter by visibility, use admin title if available, sort by order
  const navItems = BASE_NAV_ITEMS
    .filter(item => {
      if (!item.sectionKey) return true; // Home always visible
      const sec = sections?.[item.sectionKey];
      return sec?.visible !== false; // visible unless explicitly false
    })
    .map(item => ({
      ...item,
      label: item.sectionKey ? (sections?.[item.sectionKey]?.title || item.defaultLabel) : item.defaultLabel,
      order: item.sectionKey ? (sections?.[item.sectionKey]?.order ?? 99) : 0,
    }))
    .sort((a, b) => a.order - b.order);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/messages/unread-count`);
      setUnreadCount(res.data.count);
    } catch {}
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUnread();
      const interval = setInterval(fetchUnread, 15000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchUnread]);

  useEffect(() => {
    if (location.pathname === '/messages') {
      setTimeout(fetchUnread, 1000);
    }
  }, [location.pathname, fetchUnread]);

  const handleSearch = useCallback((q) => {
    handleSearchChange(q);
  }, [handleSearchChange]);

  useEffect(() => {
    const handler = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) { setSearchOpen(false); } };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close mobile menu on outside tap, scroll, or route change
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handler = (e) => {
      if (
        mobileMenuRef.current && !mobileMenuRef.current.contains(e.target) &&
        mobileToggleRef.current && !mobileToggleRef.current.contains(e.target)
      ) {
        setMobileMenuOpen(false);
      }
    };
    const scrollHandler = () => setMobileMenuOpen(false);
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler, { passive: true });
    window.addEventListener('scroll', scrollHandler, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
      window.removeEventListener('scroll', scrollHandler);
    };
  }, [mobileMenuOpen]);

  // Close mobile menu on navigation
  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  if (!isAuthenticated) return null;

  const handleLogout = () => { logout(); navigate('/auth'); };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 glass" data-testid="main-header">
      <div className="pride-bar" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-2">
          <Link to="/" className="flex items-center gap-1.5 shrink-0" data-testid="logo-link">
            <LotusLogo size={34} />
            <span className="font-heading text-base font-bold text-bloom-violet hidden sm:block">Bloom</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}
                  data-testid={`nav-${item.path.replace('/', '') || 'home'}`}
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 whitespace-nowrap
                    ${isActive ? 'bg-bloom-violet/10 text-bloom-violet' : 'text-bloom-sub hover:text-bloom-violet hover:bg-bloom-violet/5'}`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden xl:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {/* Global search — icon button (desktop + mobile) */}
            <div className="relative" ref={searchRef}>
              <button
                className="p-2 rounded-lg hover:bg-bloom-violet/5 transition-colors text-bloom-sub hover:text-bloom-violet"
                onClick={() => { setMobileMenuOpen(false); setSearchOpen(o => !o); if (!searchOpen) setTimeout(() => document.getElementById('global-search-input')?.focus(), 50); }}
                data-testid="search-icon-btn"
                aria-label="Hledat v Bloom"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Search dropdown panel */}
              {searchOpen && (
                <div className="fixed sm:absolute inset-x-2 sm:inset-x-auto sm:right-0 sm:left-auto top-[59px] sm:top-full sm:mt-1 w-auto sm:w-80 bg-white border border-border rounded-xl shadow-lg z-50 p-3 space-y-2" data-testid="search-panel">
                  <form onSubmit={handleSearchSubmit}>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bloom-sub/50 pointer-events-none" />
                      <input
                        id="global-search-input"
                        value={searchQuery}
                        onChange={e => handleSearchChange(e.target.value)}
                        placeholder="Hledat v Bloom"
                        className="w-full pl-9 pr-3 py-2 text-base md:text-sm bg-bloom-violet/5 border border-bloom-violet/20 rounded-lg outline-none focus:ring-1 focus:ring-bloom-violet/40 text-bloom-text placeholder:text-bloom-sub/60"
                        data-testid="global-search-input"
                      />
                    </div>
                  </form>

                  {/* Autocomplete suggestions */}
                  {hasSuggestions && (
                    <div className="space-y-1" data-testid="search-suggestions">
                      {Object.entries(suggestions).map(([type, items]) => {
                        if (!items?.length) return null;
                        const Icon = TYPE_ICONS[type];
                        return (
                          <div key={type}>
                            <p className="text-[10px] font-semibold text-bloom-sub/60 uppercase tracking-wider px-1 py-0.5">{TYPE_LABELS[type]}</p>
                            {items.map(item => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => { navigate(getSuggestionLink(type, item)); setSearchOpen(false); setSearchQuery(''); setSuggestions(null); }}
                                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-bloom-violet/5 transition-colors text-left"
                                data-testid={`suggestion-${type}-${item.id}`}
                              >
                                <Icon className="w-3.5 h-3.5 text-bloom-sub/60 shrink-0" />
                                <span className="text-sm text-bloom-text line-clamp-1">{getSuggestionTitle(type, item)}</span>
                              </button>
                            ))}
                          </div>
                        );
                      })}
                      <div className="border-t border-border/50 pt-1">
                        <button type="button" onClick={handleSearchSubmit} className="w-full text-xs text-bloom-violet hover:bg-bloom-violet/5 px-2 py-1.5 rounded-lg text-left flex items-center gap-1.5" data-testid="search-all-btn">
                          <Search className="w-3 h-3" />Zobrazit všechny výsledky pro „{searchQuery}"
                        </button>
                      </div>
                    </div>
                  )}

                  {searchQuery.length >= 2 && !hasSuggestions && (
                    <p className="text-xs text-bloom-sub text-center py-1">Nic nenalezeno</p>
                  )}
                </div>
              )}
            </div>

            <Link to="/messages" className="relative p-2 rounded-lg hover:bg-bloom-violet/5 transition-colors" data-testid="messages-link">
              <MessageCircle className="w-5 h-5 text-bloom-sub" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-bloom-violet text-white text-[10px] font-bold flex items-center justify-center" data-testid="unread-badge">
                  {unreadCount}
                </span>
              )}
            </Link>


            <DropdownMenu onOpenChange={(open) => { if (open) setMobileMenuOpen(false); }}>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1 rounded-lg hover:bg-bloom-violet/5 transition-colors relative" data-testid="user-menu-trigger">
                  <Avatar className="w-8 h-8 border-2 border-bloom-violet/20">
                    <AvatarImage src={getAvatarImage(user?.avatar, user?.custom_avatar)} alt={user?.username} />
                    <AvatarFallback className="bg-bloom-violet text-white text-sm">{user?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  {user?.email_verified === false && (
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-400 border-2 border-white" title="E-mail neověřen" data-testid="avatar-unverified-dot" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 [&:focus]:ring-0 [&:focus]:outline-none">
                <div className="px-3 py-2 pointer-events-none select-none" aria-hidden="true">
                  <p className="text-sm font-semibold text-bloom-text">{user?.username}</p>
                  <p className="text-xs text-bloom-sub">{user?.pronouns}</p>
                  {user?.email_verified === false && (
                    <p className="text-xs text-amber-600 font-medium mt-1 flex items-center gap-1" data-testid="menu-unverified-status">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />E-mail neověřen
                    </p>
                  )}
                  {user?.location && <p className="text-xs text-bloom-violet flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{user.location}</p>}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link to="/profile" className="flex items-center gap-2" data-testid="profile-link"><User className="w-4 h-4" />Můj profil</Link></DropdownMenuItem>
                {isAdmin && <DropdownMenuItem asChild><Link to="/admin" className="flex items-center gap-2" data-testid="admin-link"><Shield className="w-4 h-4" />Administrace</Link></DropdownMenuItem>}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive" data-testid="logout-btn"><LogOut className="w-4 h-4 mr-2" />Odhlásit se</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button ref={mobileToggleRef} className="lg:hidden p-2 rounded-lg hover:bg-bloom-violet/5" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} data-testid="mobile-menu-toggle">
              {mobileMenuOpen ? <X className="w-5 h-5 text-bloom-text" /> : <Menu className="w-5 h-5 text-bloom-text" />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div ref={mobileMenuRef} className="lg:hidden bg-white border-t border-border">
          <nav className="px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all
                    ${isActive ? 'bg-bloom-violet/10 text-bloom-violet font-medium' : 'text-bloom-sub hover:bg-bloom-violet/5'}`}>
                  <Icon className="w-5 h-5" />{item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
};
