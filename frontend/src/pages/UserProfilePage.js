import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { getAvatarImage } from '../components/Layout';
import { Card, CardContent } from '../components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { toast } from 'sonner';
import {
  MapPin, ChevronLeft, ShieldCheck, Calendar, Instagram, Facebook, Linkedin, BadgeCheck, MessageCircle
} from 'lucide-react';

const ROLE_BADGES = {
  specialist: { label: 'Ověřený odborník', color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200' },
  lawyer:     { label: 'Ověřený právník',  color: 'text-bloom-violet', bg: 'bg-bloom-violet/10 border-bloom-violet/20' },
  admin:      { label: 'Správce',          color: 'text-blue-700',  bg: 'bg-blue-50 border-blue-200' },
};
import { UserGallery } from '../components/userprofile/UserGallery';
import { UserRatings } from '../components/userprofile/UserRatings';
import { UserJourney } from '../components/userprofile/UserJourney';
import { API, safeUrlForHref } from '../lib/api';

const badgeLabels = {
  'overeny-clen': { label: 'Ověřený člen', color: 'bg-bloom-violet/10 text-bloom-violet' },
  'aktivni-pomocnik': { label: 'Aktivní pomocník', color: 'bg-bloom-mint/10 text-bloom-mint' },
  'duveryhodny': { label: 'Důvěryhodný', color: 'bg-amber-100 text-amber-700' },
  'admin': { label: 'Admin', color: 'bg-bloom-violet/20 text-bloom-violet' },
  'superadmin': { label: 'Superadministrátor', color: 'bg-bloom-violet/20 text-bloom-violet border border-bloom-violet/40' },
  'pravnik': { label: 'Právník', color: 'bg-emerald-100 text-emerald-700' },
  'overeny-specialista': { label: 'Ověřený specialista', color: 'bg-emerald-100 text-emerald-700' },
};


const UserProfilePage = () => {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const isSelf = currentUser?.id === userId;

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/users/${userId}/public-profile`);
      setProfile(r.data);
    } catch (err) {
      toast.error('Uživatel nenalezen');
      navigate('/support');
    } finally {
      setLoading(false);
    }
  }, [userId, navigate]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="spinner" />
    </div>
  );
  if (!profile) return null;

  return (
    <div className="min-h-screen py-6" data-testid="user-profile-page">
      <div className="pride-bar mb-6" />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-bloom-sub hover:text-bloom-violet text-sm mb-4 transition-colors">
          <ChevronLeft className="w-4 h-4" />Zpět
        </button>

        <div className="grid md:grid-cols-3 gap-5">
          {/* Profile card */}
          <div className="space-y-4">
            <Card className="bg-white border-border/50">
              <div className="h-1 bg-gradient-to-r from-[#5BCEFA] via-[#F5A9B8] to-[#5BCEFA] rounded-t-lg" />
              <CardContent className="p-5 text-center">
                <Avatar className="w-20 h-20 mx-auto mb-3 ring-2 ring-bloom-violet/20">
                  <AvatarImage src={getAvatarImage(profile.avatar, profile.custom_avatar)} />
                  <AvatarFallback className="bg-bloom-violet text-white text-xl">{profile.username?.charAt(0)}</AvatarFallback>
                </Avatar>
                <h1 className="font-serif text-xl font-bold text-bloom-text mb-0.5">{profile.username}</h1>
                {/* Verified specialist / lawyer badge + specialization label */}
                {ROLE_BADGES[profile.role] && (
                  <div className="flex flex-col items-center gap-0.5 mb-1" data-testid="profile-role-badge">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold ${ROLE_BADGES[profile.role].bg} ${ROLE_BADGES[profile.role].color}`}>
                      <BadgeCheck className="w-3.5 h-3.5" />
                      {ROLE_BADGES[profile.role].label}
                    </span>
                    {profile.specialization_label && (
                      <p className="text-[11px] text-bloom-sub italic mt-0.5" data-testid="profile-specialization-label">
                        {profile.specialization_label}
                      </p>
                    )}
                  </div>
                )}
                <p className="text-xs text-bloom-violet mb-2" data-testid="profile-pronouns">
                  Zájmeno: {profile.pronouns || '—'}
                </p>
                {(profile.location || profile.location_country) && (() => {
                  const countryLabel = profile.location_country === 'CZ' ? 'Česká republika' : profile.location_country === 'WORLD' ? 'Svět' : '';
                  const region = profile.location || '';
                  const place = region === 'Svět' ? 'Svět' : (countryLabel && region ? `${countryLabel}, ${region}` : countryLabel || region);
                  return (
                    <p className="text-xs text-bloom-sub flex items-center justify-center gap-1 mb-3" data-testid="profile-location">
                      <MapPin className="w-3 h-3" />
                      {place}{profile.district ? ` · ${profile.district}` : ''}
                    </p>
                  );
                })()}
                {/* Social media + WhatsApp links */}
                {(safeUrlForHref(profile.instagram) || safeUrlForHref(profile.facebook) || safeUrlForHref(profile.linkedin) || profile.phone) && (
                  <div className="flex items-center justify-center gap-2 mb-3">
                    {safeUrlForHref(profile.instagram) && (
                      <a href={safeUrlForHref(profile.instagram)} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-pink-50 text-pink-500 hover:text-pink-600 transition-colors"
                        data-testid="profile-instagram-link" title="Instagram">
                        <Instagram className="w-4 h-4" />
                      </a>
                    )}
                    {safeUrlForHref(profile.facebook) && (
                      <a href={safeUrlForHref(profile.facebook)} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 hover:text-blue-600 transition-colors"
                        data-testid="profile-facebook-link" title="Facebook">
                        <Facebook className="w-4 h-4" />
                      </a>
                    )}
                    {safeUrlForHref(profile.linkedin) && (
                      <a href={safeUrlForHref(profile.linkedin)} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-700 hover:text-blue-800 transition-colors"
                        data-testid="profile-linkedin-link" title="LinkedIn">
                        <Linkedin className="w-4 h-4" />
                      </a>
                    )}
                    {profile.phone && (
                      <a
                        href={`https://wa.me/${profile.phone.replace(/[\s\-\+]/g, '')}`}
                        target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 hover:text-green-700 transition-colors"
                        data-testid="profile-whatsapp-link" title="WhatsApp">
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                )}
                {/* Badges */}
                {profile.badges?.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1.5 mb-3">
                    {profile.badges.map(b => (
                      <span key={b} className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 ${badgeLabels[b]?.color || 'bg-muted text-bloom-sub'}`}>
                        <ShieldCheck className="w-2.5 h-2.5" />
                        {badgeLabels[b]?.label || b}
                      </span>
                    ))}
                  </div>
                )}
                {/* Actions (send message, rate, report) */}
                {!isSelf && (
                  <UserRatings
                    userId={userId}
                    username={profile.username}
                    emailVerified={currentUser?.email_verified}
                  />
                )}
              </CardContent>
            </Card>

            {/* Bio */}
            {profile.bio && (
              <Card className="bg-white border-border/50">
                <CardContent className="p-4">
                  <h3 className="text-xs font-semibold text-bloom-sub uppercase tracking-wider mb-2">O mně</h3>
                  <p className="text-sm text-bloom-text leading-relaxed">{profile.bio}</p>
                </CardContent>
              </Card>
            )}

            {/* Member since */}
            <Card className="bg-white border-border/50">
              <CardContent className="p-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-bloom-violet shrink-0" />
                <div>
                  <p className="text-xs text-bloom-sub">Člen/ka od</p>
                  <p className="text-sm text-bloom-text">{profile.created_at ? new Date(profile.created_at).toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' }) : '—'}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gallery section */}
          <UserGallery userId={userId} isSelf={isSelf} />

          {/* Services / Journey section */}
          <UserJourney services={profile.services} />
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;
