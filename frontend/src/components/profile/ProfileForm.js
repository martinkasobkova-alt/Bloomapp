import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useLocations } from '../../hooks/useLocations';
import { avatarOptions, getAvatarImage } from '../avatarSystem';
import { AvatarSelector } from '../AvatarSelector';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Switch } from '../ui/switch';
import { toast } from 'sonner';
import { User, Save, LogOut, Phone, Mail, Award, Bell, Instagram, Facebook, Linkedin, Link as LinkIcon, Trash2 } from 'lucide-react';
import { API, fixAvatarUrl } from '../../lib/api';

const pronounOptions = [
  { value: 'ona/její', label: 'ona/její' }, { value: 'on/jeho', label: 'on/jeho' },
  { value: 'oni/jejich', label: 'oni/jejich' }, { value: 'ono/jeho', label: 'ono/jeho' }, { value: 'jiné', label: 'jiné' },
];
const badgeLabels = {
  'overeny-clen': { label: 'Ověřený člen komunity', color: 'bg-bloom-mint/10 text-bloom-mint' },
  'aktivni-pomocnik': { label: 'Aktivní pomocník', color: 'bg-bloom-pride-pink/10 text-bloom-pride-pink' },
  'duveryhodny': { label: 'Důvěryhodný uživatel', color: 'bg-bloom-violet/10 text-bloom-violet' },
  'admin': { label: 'Administrátor', color: 'bg-bloom-pride-blue/10 text-bloom-pride-blue' },
  'superadmin': { label: 'Superadministrátor', color: 'bg-bloom-violet/20 text-bloom-violet border border-bloom-violet/40' },
  'pravnik': { label: 'Právník', color: 'bg-amber-100 text-amber-700' },
  'overeny-specialista': { label: 'Ověřený specialista', color: 'bg-emerald-100 text-emerald-700' },
};

export function ProfileForm({ onLogout }) {
  const { user, updateProfile, deleteAccount } = useAuth();
  const fileInputRef = useRef(null);
  const { allLocations } = useLocations();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [pronouns, setPronouns] = useState(user?.pronouns || 'ona/její');
  const [avatar, setAvatar] = useState(user?.avatar || 'fem-pink');
  const [location, setLocation] = useState(user?.location || 'none');
  const [profileCountry, setProfileCountry] = useState('CZ');
  const [phone, setPhone] = useState(user?.phone || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [customPreview, setCustomPreview] = useState(user?.custom_avatar ? fixAvatarUrl(user.custom_avatar) : null);
  const [instagram, setInstagram] = useState(user?.instagram || '');
  const [facebook, setFacebook] = useState(user?.facebook || '');
  const [linkedin, setLinkedin] = useState(user?.linkedin || '');

  const defaultPrefs = { messages: true, services: true, news: true };
  const [notifPrefs, setNotifPrefs] = useState({ ...defaultPrefs, ...(user?.notification_prefs || {}) });
  const [savingNotif, setSavingNotif] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    // Simple URL validation for social links
    const isValidUrl = (url) => !url || url.startsWith('http://') || url.startsWith('https://');
    if (!isValidUrl(instagram)) { toast.error('Instagram URL musí začínat https://'); setLoading(false); return; }
    if (!isValidUrl(facebook)) { toast.error('Facebook URL musí začínat https://'); setLoading(false); return; }
    if (!isValidUrl(linkedin)) { toast.error('LinkedIn URL musí začínat https://'); setLoading(false); return; }
    try {
      await updateProfile({ username, pronouns, avatar, location: location === 'none' ? '' : location, phone, bio, instagram, facebook, linkedin });
      toast.success('Profil aktualizován!');
    } catch (err) { toast.error(err.response?.data?.detail || 'Nepodařilo se aktualizovat profil'); }
    finally { setLoading(false); }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Obrázek je příliš velký (max 5 MB)'); return; }
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post(`${API}/users/me/upload-avatar`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setCustomPreview(fixAvatarUrl(res.data.url));
      setAvatar('custom');
      toast.success('Fotografie nahrána!');
    } catch (err) { toast.error(err.response?.data?.detail || 'Nepodařilo se nahrát obrázek'); }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Opravdu chcete zrušit svůj profil? Tato akce je nevratná a všechna vaše data budou smazána.')) return;
    try {
      await deleteAccount();
      toast.success('Profil byl zrušen');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Nepodařilo se zrušit profil');
    }
  };

  const handleSaveNotifPrefs = async () => {
    setSavingNotif(true);
    try {
      await axios.put(`${API}/auth/notification-prefs`, notifPrefs);
      toast.success('Nastavení oznámení uloženo!');
    } catch { toast.error('Nepodařilo se uložit nastavení'); }
    finally { setSavingNotif(false); }
  };

  const selectableAvatars = avatarOptions.filter(a => a.gender !== 'custom');

  return (
    <>
      <Card className="bg-white border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border-2 border-bloom-violet/20">
              <AvatarImage src={getAvatarImage(avatar, customPreview || user?.custom_avatar)} />
              <AvatarFallback className="bg-bloom-violet text-white text-xl">{username?.charAt(0)?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-serif text-xl font-semibold text-bloom-text">{username}</p>
              <p className="text-sm text-bloom-sub">{user?.email}</p>
              <p className="text-xs text-bloom-violet">{pronouns}</p>
              {user?.role && ['admin', 'superadmin', 'lawyer', 'specialist'].includes(user.role) && (
                <p className="text-xs text-bloom-sub mt-0.5" data-testid="profile-role">
                  Role: {user.role === 'admin' ? 'Administrátor' : user.role === 'superadmin' ? 'Superadministrátor' : user.role === 'lawyer' ? 'Právník' : 'Ověřený specialista'}
                </p>
              )}
            </div>
          </div>
          {user?.badges?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {user.badges.map(b => { const badge = badgeLabels[b]; return badge ? <span key={b} className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.color} flex items-center gap-1`}><Award className="w-3 h-3"/>{badge.label}</span> : null; })}
            </div>
          )}
          {['specialist', 'lawyer'].includes(user?.role) && user?.specialization_label && (
            <div className="mt-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-bloom-violet/10 text-bloom-violet border border-bloom-violet/20" data-testid="profile-form-spec-label">
                {user.specialization_label}
              </span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Přezdívka</Label>
                <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bloom-sub/50"/><Input value={username} onChange={e => setUsername(e.target.value)} className="pl-10" required data-testid="profile-username-input"/></div>
              </div>
              <div className="space-y-2">
                <Label>Zájmeno</Label>
                <Select value={pronouns} onValueChange={setPronouns}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{pronounOptions.map(o=><SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bloom-sub/50"/><Input value={user?.email || ''} disabled className="pl-10 opacity-60"/></div>
            </div>
            <div className="space-y-2">
              <Label>Telefonní číslo</Label>
              <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bloom-sub/50"/><Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="pl-10" placeholder="+420 xxx xxx xxx" data-testid="profile-phone-input"/></div>
            </div>
            <div className="space-y-2">
              <Label>Lokalita</Label>
              <div className="flex rounded-lg border border-border overflow-hidden mb-1">
                {[{ v: 'CZ', l: 'Česká republika' }, { v: 'WORLD', l: 'Svět' }].map(x => (
                  <button type="button" key={x.v} onClick={() => { setProfileCountry(x.v); setLocation('none'); }}
                    className={`flex-1 py-1.5 text-xs font-medium transition-colors ${profileCountry === x.v ? 'bg-bloom-violet text-white' : 'bg-white text-bloom-sub hover:bg-muted'}`}
                    data-testid={`profile-country-${x.v}`}>{x.l}</button>
                ))}
              </div>
              <Select value={location || 'none'} onValueChange={setLocation}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nechci uvádět</SelectItem>
                  {allLocations.filter(o => o.country === profileCountry).map(o => (
                    <SelectItem key={o.id || o.name} value={o.name}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>O mně</Label>
              <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Krátce o sobě..." rows={3} data-testid="profile-bio-input"/>
            </div>
            {/* Social media links */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><LinkIcon className="w-3.5 h-3.5 text-bloom-sub" />Sociální sítě <span className="text-bloom-sub/60 font-normal text-xs">(volitelné)</span></Label>
              <div className="relative">
                <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-500/60 pointer-events-none"/>
                <Input value={instagram} onChange={e => setInstagram(e.target.value)} className="pl-10" placeholder="https://instagram.com/..." data-testid="profile-instagram-input"/>
              </div>
              <div className="relative">
                <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500/60 pointer-events-none"/>
                <Input value={facebook} onChange={e => setFacebook(e.target.value)} className="pl-10" placeholder="https://facebook.com/..." data-testid="profile-facebook-input"/>
              </div>
              <div className="relative">
                <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-700/60 pointer-events-none"/>
                <Input value={linkedin} onChange={e => setLinkedin(e.target.value)} className="pl-10" placeholder="https://linkedin.com/in/..." data-testid="profile-linkedin-input"/>
              </div>
            </div>
            <div className="space-y-3">
              <Label>Avatar / Profilová fotka</Label>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden"/>
              <AvatarSelector
                avatars={selectableAvatars}
                value={avatar}
                onChange={(v) => { setAvatar(v); setCustomPreview(null); }}
                showCustomOption={true}
                onCustomClick={() => fileInputRef.current?.click()}
                customPreview={customPreview}
              />
            </div>
            <div className="flex gap-3 pt-3">
              <Button type="submit" className="flex-1 bg-bloom-violet text-white font-semibold" disabled={loading || !user?.email_verified} title={!user?.email_verified ? 'Pro úpravu profilu musíte ověřit e-mail' : ''} data-testid="profile-save-btn"><Save className="w-4 h-4 mr-1"/>{loading?'Ukládání...':'Uložit změny'}</Button>
              <Button type="button" variant="outline" onClick={onLogout} className="text-destructive border-destructive/30" data-testid="profile-logout-btn"><LogOut className="w-4 h-4 mr-1"/>Odhlásit se</Button>
            </div>
            <div className="mt-6 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={handleDeleteAccount} className="w-full text-destructive border-destructive/30 hover:bg-destructive/10" data-testid="profile-delete-account-btn"><Trash2 className="w-4 h-4 mr-1"/>Zrušit profil</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card className="bg-white border-border/50 mt-4" data-testid="notification-prefs-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4 text-bloom-violet" />Nastavení oznámení
          </CardTitle>
          <p className="text-xs text-bloom-sub">Vyberte, pro které události chcete dostávat push oznámení.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'messages', label: 'Přímé zprávy', desc: 'Nová zpráva od jiného uživatele', testid: 'notif-toggle-messages' },
            { key: 'services', label: 'Nabídky a poptávky', desc: 'Nový příspěvek v sekci Podpora', testid: 'notif-toggle-services' },
            { key: 'news', label: 'Aktuality', desc: 'Nová zpráva od administrátora', testid: 'notif-toggle-news' },
          ].map(({ key, label, desc, testid }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-bloom-text">{label}</p>
                <p className="text-xs text-bloom-sub">{desc}</p>
              </div>
              <Switch checked={notifPrefs[key] !== false} onCheckedChange={val => setNotifPrefs(p => ({ ...p, [key]: val }))} data-testid={testid} />
            </div>
          ))}
          <Button onClick={handleSaveNotifPrefs} disabled={savingNotif} className="w-full bg-bloom-violet text-white mt-2" data-testid="save-notif-prefs-btn">
            <Save className="w-4 h-4 mr-1" />{savingNotif ? 'Ukládám...' : 'Uložit nastavení oznámení'}
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
