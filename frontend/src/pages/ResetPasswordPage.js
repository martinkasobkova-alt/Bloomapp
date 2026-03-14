import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { LotusLogo } from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { toast } from 'sonner';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

import { API } from '../lib/api';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const error = searchParams.get('error');

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const passwordRules = [
    { test: (p) => p.length >= 8, label: 'Alespoň 8 znaků' },
    { test: (p) => /[A-Z]/.test(p), label: 'Alespoň 1 velké písmeno' },
    { test: (p) => /[0-9]/.test(p), label: 'Alespoň 1 číslo' },
    { test: (p) => /[^a-zA-Z0-9]/.test(p), label: 'Alespoň 1 speciální znak (!@#$%)' },
  ];

  const validatePassword = (pw) => {
    if (pw.length < 8) return 'Heslo musí mít alespoň 8 znaků';
    if (!/[A-Z]/.test(pw)) return 'Heslo musí obsahovat alespoň jedno velké písmeno';
    if (!/[0-9]/.test(pw)) return 'Heslo musí obsahovat alespoň jedno číslo';
    if (!/[^a-zA-Z0-9]/.test(pw)) return 'Heslo musí obsahovat alespoň jeden speciální znak';
    return null;
  };

  useEffect(() => {
    if (error === 'reset-expired') {
      toast.error('Odkaz pro obnovení hesla vypršel nebo je neplatný. Požádejte o nový.');
      navigate('/auth');
      return;
    }
    if (!token) {
      toast.error('Neplatný odkaz pro obnovení hesla.');
      navigate('/auth');
    }
  }, [token, error, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const pwErr = validatePassword(password);
    if (pwErr) { toast.error(pwErr); return; }
    if (password !== passwordConfirm) { toast.error('Hesla se neshodují.'); return; }

    setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password`, { token, new_password: password });
      setSuccess(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Nepodařilo se obnovit heslo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-8 px-4 bg-bloom-bg" data-testid="reset-password-page">
      {/* Trans flag bar */}
      <div className="pride-bar fixed top-0 left-0 right-0 z-50" />

      <Card className="w-full max-w-md bg-white border-border/50 shadow-lg">
        <CardHeader className="text-center pb-4">
          <div className="flex flex-col items-center gap-0">
            <LotusLogo size={72} />
            <CardTitle className="font-serif text-3xl text-bloom-violet">Bloom</CardTitle>
          </div>
          <CardDescription className="text-bloom-sub">Obnovení hesla</CardDescription>
        </CardHeader>

        <CardContent>
          {success ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 rounded-full bg-bloom-mint/10 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-bloom-mint" />
              </div>
              <h3 className="font-serif text-xl font-semibold text-bloom-text">Heslo obnoveno!</h3>
              <p className="text-bloom-sub text-sm">Vaše heslo bylo úspěšně změněno. Nyní se můžete přihlásit.</p>
              <Button
                onClick={() => navigate('/auth')}
                className="w-full bg-bloom-violet text-white font-semibold"
                data-testid="goto-login-btn"
              >
                Přejít na přihlášení
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Trans flag accent */}
              <div className="rounded-lg overflow-hidden border border-border/50">
                <div className="h-1 bg-gradient-to-r from-[#5BCEFA] via-[#F5A9B8] to-[#5BCEFA]" />
                <div className="p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-bloom-violet mt-0.5 shrink-0" />
                  <p className="text-xs text-bloom-sub">Zadejte nové heslo pro váš účet Bloom.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-bloom-text">Nové heslo</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bloom-sub/50" />
                  <Input
                    type={showPass ? 'text' : 'password'}
                    placeholder="Zadejte nové heslo"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                    minLength={8}
                    data-testid="new-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-bloom-sub/50 hover:text-bloom-violet"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password.length > 0 && (
                  <div className="mt-2 space-y-1" data-testid="password-rules">
                    {passwordRules.map((rule, i) => (
                      <div key={i} className={`flex items-center gap-1.5 text-xs ${rule.test(password) ? 'text-bloom-mint' : 'text-bloom-sub/60'}`}>
                        {rule.test(password) ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current" />}
                        {rule.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-bloom-text">Potvrdit nové heslo</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bloom-sub/50" />
                  <Input
                    type={showPass ? 'text' : 'password'}
                    placeholder="Zadejte heslo znovu"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    className="pl-10"
                    required
                    data-testid="confirm-password-input"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-bloom-violet text-white font-semibold"
                disabled={loading}
                data-testid="reset-submit-btn"
              >
                {loading ? 'Ukládání...' : 'Nastavit nové heslo'}
              </Button>

              <button
                type="button"
                onClick={() => navigate('/auth')}
                className="text-sm text-bloom-sub hover:text-bloom-violet w-full text-center"
              >
                Zpět na přihlášení
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPasswordPage;
