import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { CheckCircle, XCircle, RefreshCw, BadgeCheck } from 'lucide-react';
import { ProfileForm } from '../components/profile/ProfileForm';
import { ProfileGallery } from '../components/profile/ProfileGallery';
import { ProfileJourney } from '../components/profile/ProfileJourney';
import { SectionHeader } from '../components/SectionHeader';
import { API } from '../lib/api';
import { useAppSettings } from '../context/AppSettingsContext';

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const { markerColors } = useAppSettings();
  const navigate = useNavigate();
  const [photos, setPhotos] = useState([]);
  const [resendingVerif, setResendingVerif] = useState(false);
  const [verifSent, setVerifSent] = useState(false);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [verifyForm, setVerifyForm] = useState({ requested_role: 'specialist', specialization_text: '', profile_link: '', message: '' });
  const [verifySubmitting, setVerifySubmitting] = useState(false);
  const [verifySubmitted, setVerifySubmitted] = useState(false);

  const checkExistingVerifRequest = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/verification-requests/my`);
      if (r.data?.status === 'pending') setVerifySubmitted(true);
    } catch { /* no pending request or endpoint not available */ }
  }, []);

  const fetchPhotos = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/users/${user?.id}/photos`);
      setPhotos(r.data);
    } catch {}
  }, [user?.id]);

  useEffect(() => {
    fetchPhotos();
    checkExistingVerifRequest();
  }, [fetchPhotos, checkExistingVerifRequest]);

  const handleResendVerification = async () => {
    setResendingVerif(true);
    try {
      await axios.post(`${API}/auth/resend-verification`);
      setVerifSent(true);
      toast.success('Ověřovací e-mail odeslán!');
    } catch (err) { toast.error(err.response?.data?.detail || 'Nepodařilo se odeslat e-mail'); }
    finally { setResendingVerif(false); }
  };

  const handleLogout = () => { logout(); navigate('/auth'); };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (!verifyForm.specialization_text.trim()) {
      toast.error('Vyplňte prosím specializaci'); return;
    }
    setVerifySubmitting(true);
    try {
      await axios.post(`${API}/verification-requests`, verifyForm);
      toast.success('Žádost o ověření byla odeslána!');
      setVerifySubmitted(true);
      setVerifyDialogOpen(false);
    } catch (err) { toast.error(err.response?.data?.detail || 'Chyba při odesílání žádosti'); }
    finally { setVerifySubmitting(false); }
  };

  return (
    <div className="min-h-screen pt-0 pb-6" data-testid="profile-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          sectionKey="profile"
          defaultTitle="Můj profil"
          defaultSubtitle="Upravte své údaje a nastavení"
          defaultColor={markerColors?.profile || '#F5A9B8'}
        />
      </div>
      <div className="pride-bar mb-2" />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">

        <Card className={`mb-4 ${user?.email_verified ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`} data-testid="email-verification-status">
          <CardContent className="p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {user?.email_verified
                ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                : <XCircle className="w-4 h-4 text-amber-500 shrink-0" />}
              <div>
                <p className="text-sm font-medium text-bloom-text">
                  E-mail: {user?.email_verified ? <span className="text-emerald-600">Ověřený</span> : <span className="text-amber-600">Neověřený</span>}
                </p>
                <p className="text-xs text-bloom-sub">{user?.email}</p>
                {!user?.email_verified && (
                  <p className="text-xs text-amber-700 mt-1.5">Neověření uživatelé mají omezená práva. Web mohou pouze prohlížet. Prosím ověřte svůj e-mail.</p>
                )}
              </div>
            </div>
            {!user?.email_verified && (
              <Button size="sm" variant="outline" className="shrink-0 border-amber-400 text-amber-700 hover:bg-amber-100 text-xs"
                onClick={handleResendVerification} disabled={resendingVerif || verifSent} data-testid="profile-resend-verification-btn">
                <RefreshCw className={`w-3 h-3 mr-1 ${resendingVerif ? 'animate-spin' : ''}`} />
                {verifSent ? 'Odesláno!' : 'Odeslat znovu'}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Verification request — only for regular users */}
        {!['specialist', 'lawyer', 'admin', 'superadmin'].includes(user?.role) && (
          <Card className="mb-4 bg-bloom-violet/5 border-bloom-violet/20" data-testid="verification-request-card">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <BadgeCheck className="w-5 h-5 text-bloom-violet shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-bloom-text">Ověření odborníka nebo právníka</p>
                  <p className="text-xs text-bloom-sub">Pracujete v oboru? Získejte ověřený štítek.</p>
                </div>
              </div>
              <Button size="sm" className="bg-bloom-violet text-white hover:bg-bloom-violet/90 shrink-0 text-xs"
                onClick={() => setVerifyDialogOpen(true)} disabled={verifySubmitted} data-testid="request-verification-btn">
                {verifySubmitted ? 'Žádost odeslána' : 'Požádat o ověření'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Verification Dialog */}
        <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" data-testid="verification-dialog">
            <DialogHeader>
              <DialogTitle className="font-serif">Žádost o ověření odborníka / právníka</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleVerifySubmit} className="space-y-3 pb-2">
              <div>
                <Label>Požadovaná role *</Label>
                <select value={verifyForm.requested_role} onChange={e => setVerifyForm(f => ({...f, requested_role: e.target.value}))}
                  className="w-full mt-1 px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring" data-testid="verify-role-select">
                  <option value="specialist">Odborník</option>
                  <option value="lawyer">Právník</option>
                </select>
              </div>
              <div>
                <Label>Specializace *</Label>
                <Input value={verifyForm.specialization_text} onChange={e => setVerifyForm(f => ({...f, specialization_text: e.target.value}))} placeholder="např. plastická chirurgie, rodinné právo..." required data-testid="verify-specialization" />
              </div>
              <div>
                <Label>Odkaz na profesní profil</Label>
                <Input value={verifyForm.profile_link} onChange={e => setVerifyForm(f => ({...f, profile_link: e.target.value}))} placeholder="https://..." data-testid="verify-profile-link" />
              </div>
              <div>
                <Label>Krátká zpráva pro admina</Label>
                <textarea value={verifyForm.message} onChange={e => setVerifyForm(f => ({...f, message: e.target.value}))} placeholder="Nepovinný doplňující text..." rows={3}
                  className="w-full mt-1 px-3 py-2 text-sm border border-input rounded-md bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring" data-testid="verify-message" />
              </div>
              <Button type="submit" className="w-full bg-bloom-violet text-white hover:bg-bloom-violet/90" disabled={verifySubmitting} data-testid="verify-submit-btn">
                {verifySubmitting ? 'Odesílám...' : 'Odeslat žádost o ověření'}
              </Button>
              <p className="text-xs text-bloom-sub leading-relaxed mt-2 border-t border-border pt-2">
                Chcete být na Bloom ověřený odborník nebo právník? Pošlete žádost o ověření. Profil musí odpovídat vaší skutečné identitě a specializaci. Po odeslání žádosti vás administrátor kontaktuje.
              </p>
            </form>
          </DialogContent>
        </Dialog>

        <Tabs defaultValue="profile">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="profile" data-testid="profile-tab">Profil</TabsTrigger>
            <TabsTrigger value="gallery" onClick={fetchPhotos} data-testid="gallery-tab">Galerie</TabsTrigger>
            <TabsTrigger value="journey" data-testid="journey-tab">Moje cesta</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <ProfileForm onLogout={handleLogout} />
          </TabsContent>

          <TabsContent value="gallery">
            <ProfileGallery photos={photos} setPhotos={setPhotos} />
          </TabsContent>

          <TabsContent value="journey">
            <ProfileJourney />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProfilePage;
