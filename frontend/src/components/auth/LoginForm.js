import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { API, getGoogleAuthUrl } from '../../lib/api';

const GOOGLE_SVG = (
  <svg className="w-4 h-4" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export function LoginForm({ loading, setLoading }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const forgotSubmittingRef = useRef(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(loginEmail, loginPassword);
      toast.success('Přihlášení úspěšné!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Nesprávný e-mail nebo heslo');
    } finally { setLoading(false); }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (forgotSubmittingRef.current || forgotLoading) return;
    forgotSubmittingRef.current = true;
    setForgotLoading(true);
    if (process.env.NODE_ENV === 'development') {
      console.log('[LoginForm] reset-password-request sending, email:', forgotEmail);
    }
    try {
      await axios.post(`${API}/auth/reset-password-request`, { email: forgotEmail });
      if (process.env.NODE_ENV === 'development') {
        console.log('[LoginForm] reset-password-request success');
      }
      setForgotSent(true);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[LoginForm] reset-password-request error:', err.response?.status, err.response?.data?.detail);
      }
      toast.error(err.response?.data?.detail || 'Nepodařilo se odeslat e-mail. Zkuste to znovu.', { duration: 8000 });
    } finally {
      setForgotLoading(false);
      forgotSubmittingRef.current = false;
    }
  };

  if (forgotOpen) {
    return (
      <div className="space-y-4">
        <h3 className="font-serif text-lg text-bloom-text">Obnovení hesla</h3>
        {forgotSent ? (
          <div className="text-center py-4">
            <p className="text-bloom-text mb-2">Pokud je e-mail registrován, obdržíte odkaz pro obnovení hesla.</p>
            <Button variant="outline" onClick={() => { setForgotOpen(false); setForgotSent(false); }} className="mt-2">Zpět na přihlášení</Button>
          </div>
        ) : (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-bloom-text">E-mail</Label>
              <Input type="email" placeholder="váš@email.cz" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required data-testid="forgot-email-input" />
            </div>
            <Button type="submit" className="w-full bg-bloom-violet text-white hover:bg-bloom-violet/90" disabled={forgotLoading} data-testid="forgot-submit-btn">{forgotLoading ? 'Odesílám...' : 'Odeslat odkaz pro obnovení'}</Button>
            <button type="button" onClick={() => setForgotOpen(false)} className="text-sm text-bloom-sub hover:text-bloom-violet w-full text-center">Zpět na přihlášení</button>
          </form>
        )}
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-2">
          <Label className="text-bloom-text">E-mail</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bloom-sub/50" />
            <Input type="email" placeholder="váš@email.cz" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="pl-10" required data-testid="login-email-input" />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-bloom-text">Heslo</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bloom-sub/50" />
            <Input type={showPassword ? 'text' : 'password'} placeholder="********" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="pl-10 pr-10" required data-testid="login-password-input" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-bloom-sub/50 hover:text-bloom-violet">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <Button type="submit" className="w-full bg-bloom-violet text-white hover:bg-bloom-violet/90 font-semibold" disabled={loading} data-testid="login-submit-btn">
          {loading ? 'Přihlašování...' : 'Přihlásit se'}
        </Button>
        <button type="button" onClick={() => setForgotOpen(true)} className="text-sm text-bloom-sub hover:text-bloom-violet w-full text-center" data-testid="forgot-password-link">
          Zapomněli jste heslo?
        </button>
      </form>
      <div className="mt-4 pt-4 border-t border-border/50 space-y-2">
        <button type="button" onClick={() => {
            localStorage.setItem('bloom_google_mode', 'login');
            window.location.href = getGoogleAuthUrl();
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-lg hover:bg-muted/50 transition-colors"
          data-testid="google-login-btn">
          {GOOGLE_SVG}
          <span className="text-sm font-medium text-bloom-text">Přihlásit se přes Google</span>
        </button>
      </div>
    </>
  );
}
