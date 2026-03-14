import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Turnstile from 'react-turnstile';
import { useAuth } from '../../context/AuthContext';
import { useContactEmail } from '../../hooks/useContactEmail';
import { useTextSettings } from '../../hooks/useTextSettings';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, User, Mail, Lock, KeyRound } from 'lucide-react';
import { API, getGoogleAuthUrl } from '../../lib/api';

const GOOGLE_SVG = (
  <svg className="w-4 h-4" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

function validatePassword(password) {
  if (password.length < 8) return 'Heslo musí mít alespoň 8 znaků';
  if (!/[a-z]/.test(password)) return 'Heslo musí obsahovat alespoň jedno malé písmeno';
  if (!/[A-Z]/.test(password)) return 'Heslo musí obsahovat alespoň jedno velké písmeno';
  if (!/[0-9]/.test(password)) return 'Heslo musí obsahovat alespoň jedno číslo';
  if (!/[^a-zA-Z0-9]/.test(password)) return 'Heslo musí obsahovat alespoň jeden speciální znak (!@#$%...)';
  return null;
}

export function RegisterForm({ loading, setLoading }) {
  const { register } = useAuth();
  const navigate = useNavigate();
  const contactEmail = useContactEmail();
  const texts = useTextSettings();
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordHelp, setShowPasswordHelp] = useState(false);
  const [entryPasswordRequired, setEntryPasswordRequired] = useState(true);
  const [turnstileToken, setTurnstileToken] = useState(null);
  const [reg, setReg] = useState({
    email: '', password: '', passwordConfirm: '', username: '', secretCode: '', website: '',
  });

  useEffect(() => {
    axios.get(`${API}/settings/entry-password-status`)
      .then(r => setEntryPasswordRequired(r.data.enabled))
      .catch(() => setEntryPasswordRequired(true));
  }, []);

  const updateReg = (field, value) => setReg(prev => ({ ...prev, [field]: value }));

  const handleRegister = async (e) => {
    e.preventDefault();
    const pwErr = validatePassword(reg.password);
    if (pwErr) { toast.error(pwErr); return; }
    if (reg.password !== reg.passwordConfirm) { toast.error('Hesla se neshodují'); return; }
    if (reg.username.length < 3) { toast.error('Přezdívka musí mít alespoň 3 znaky'); return; }
    if (entryPasswordRequired && !reg.secretCode) { toast.error('Komunitní heslo je povinné'); return; }
    const siteKey = process.env.REACT_APP_TURNSTILE_SITE_KEY;
    if (siteKey && !turnstileToken) { toast.error('Prosím dokončete ověření proti robotům'); return; }
    setLoading(true);
    try {
      await register({
        email: reg.email, password: reg.password, username: reg.username,
        pronouns: 'ona/její', avatar: 'fem-pink',
        location: '', district: '', phone: '', bio: '',
        secret_code: reg.secretCode, website: reg.website || '',
        turnstile_token: turnstileToken
      });
      toast.success('Registrace úspěšná! Zkontrolujte svůj e-mail pro ověření účtu.');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registrace selhala');
    } finally { setLoading(false); }
  };

  return (
    <>
      <form onSubmit={handleRegister} className="space-y-4">
        {entryPasswordRequired && (
          <div className="space-y-2">
            <Label className="text-bloom-violet font-semibold">Komunitní heslo</Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bloom-violet/50" />
              <Input type="password" placeholder="Zadejte komunitní heslo..." value={reg.secretCode} onChange={(e) => updateReg('secretCode', e.target.value)} className="pl-10 border-bloom-violet/30 bg-bloom-violet/5" required data-testid="register-secret-input" />
            </div>
            <div className="bg-bloom-violet/5 border border-bloom-violet/15 rounded-lg p-3 space-y-1.5">
              <p className="text-xs text-bloom-sub leading-relaxed">
                {texts.help_text || 'Bloom je soukromý prostor pro trans komunitu. Komunitní heslo ti může předat někdo z komunity.'}
              </p>
              <p className="text-xs text-bloom-sub leading-relaxed">
                Pokud nikoho neznáš, napiš adminovi na{' '}
                {contactEmail && <a href={`mailto:${contactEmail}`} className="text-bloom-violet hover:underline font-medium">{contactEmail}</a>}.
              </p>
              <button type="button" onClick={() => setShowPasswordHelp(p => !p)} className="text-xs text-bloom-violet/70 hover:text-bloom-violet underline underline-offset-2" data-testid="unknown-password-help-btn">
                Nevím komunitní heslo
              </button>
              {showPasswordHelp && (
                <div className="mt-1 p-2 bg-white rounded border border-bloom-violet/20 text-xs text-bloom-sub space-y-1" data-testid="password-help-text">
                  <p>Komunitní heslo slouží k ochraně soukromého prostoru. Jak ho získat:</p>
                  <p>1. Napište email na {contactEmail && <a href={`mailto:${contactEmail}`} className="text-bloom-violet font-medium">{contactEmail}</a>}</p>
                  <p>2. Krátce se představte a řekněte, jak jste se o Bloom dozvěděli</p>
                  <p>3. Administrátorka vám odpoví co nejdříve</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-bloom-text">Přezdívka (unikátní)</Label>
          <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bloom-sub/50" /><Input placeholder="Minimálně 3 znaky" value={reg.username} onChange={(e) => updateReg('username', e.target.value)} className="pl-10" required minLength={3} data-testid="register-username-input" /></div>
        </div>
        <div className="space-y-2">
          <Label className="text-bloom-text">E-mail</Label>
          <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bloom-sub/50" /><Input type="email" placeholder="váš@email.cz" value={reg.email} onChange={(e) => updateReg('email', e.target.value)} className="pl-10" required data-testid="register-email-input" /></div>
        </div>
        <div className="space-y-2">
          <Label className="text-bloom-text">Heslo</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bloom-sub/50" />
            <Input type={showPassword ? 'text' : 'password'} placeholder="Zadejte heslo" value={reg.password} onChange={(e) => updateReg('password', e.target.value)} className="pl-10 pr-10" required minLength={8} data-testid="register-password-input" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-bloom-sub/50 hover:text-bloom-violet">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {reg.password.length > 0 && (
            <div className="space-y-0.5 mt-1" data-testid="reg-password-rules">
              {[
                { test: reg.password.length >= 8, label: 'Alespoň 8 znaků' },
                { test: /[A-Z]/.test(reg.password), label: 'Velké písmeno' },
                { test: /[0-9]/.test(reg.password), label: 'Číslo' },
                { test: /[^a-zA-Z0-9]/.test(reg.password), label: 'Speciální znak (!@#$%)' },
              ].map((r, i) => (
                <div key={i} className={`flex items-center gap-1 text-[11px] ${r.test ? 'text-bloom-mint' : 'text-bloom-sub/50'}`}>
                  {r.test ? <span>&#10003;</span> : <span>&#9675;</span>} {r.label}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-bloom-text">Potvrdit heslo</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bloom-sub/50" />
            <Input type={showPassword ? 'text' : 'password'} placeholder="Zopakujte heslo" value={reg.passwordConfirm} onChange={(e) => updateReg('passwordConfirm', e.target.value)} className={`pl-10 ${reg.passwordConfirm && reg.password !== reg.passwordConfirm ? 'border-destructive' : ''}`} required data-testid="register-password-confirm-input" />
          </div>
          {reg.passwordConfirm && reg.password !== reg.passwordConfirm && <p className="text-xs text-destructive">Hesla se neshodují</p>}
        </div>
        {process.env.REACT_APP_TURNSTILE_SITE_KEY && (
          <div className="flex justify-center">
            <Turnstile
              sitekey={process.env.REACT_APP_TURNSTILE_SITE_KEY}
              onVerify={setTurnstileToken}
              onExpire={() => setTurnstileToken(null)}
              onError={() => setTurnstileToken(null)}
              theme="light"
            />
          </div>
        )}
        {/* Honeypot */}
        <div className="absolute -left-[9999px]" aria-hidden="true" tabIndex={-1}>
          <input type="text" name="website" autoComplete="off" value={reg.website || ''} onChange={e => updateReg('website', e.target.value)} tabIndex={-1} />
        </div>
        <Button type="submit" className="w-full bg-bloom-violet text-white hover:bg-bloom-violet/90 font-semibold" disabled={loading} data-testid="register-submit-btn">
          {loading ? 'Registrace...' : 'Zaregistrovat se'}
        </Button>
      </form>
      <div className="mt-4 pt-4 border-t border-border/50 space-y-2">
        <button type="button" onClick={() => {
            localStorage.setItem('bloom_google_mode', 'register');
            window.location.href = getGoogleAuthUrl();
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-lg hover:bg-muted/50 transition-colors"
          data-testid="google-register-btn">
          {GOOGLE_SVG}
          <span className="text-sm font-medium text-bloom-text">Registrovat přes Google</span>
        </button>
      </div>
    </>
  );
}
