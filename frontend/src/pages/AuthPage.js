import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { LotusLogo } from '../components/LotusLogo';
import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';
import BugReportModal from '../components/BugReportModal';
import { Smartphone, Bug } from 'lucide-react';

import { API } from '../lib/api';

// Re-export for backward compat (not used elsewhere but keep safe)
export { API };

const AuthPage = () => {
  const [loading, setLoading] = useState(false);
  const [bugReportOpen, setBugReportOpen] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    axios.get(`${API}/stats`).then(r => setStats(r.data)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-8 px-4 bg-bloom-bg" data-testid="auth-page">
      <div className="pride-bar fixed top-0 left-0 right-0 z-50" />

      <Card className="w-full max-w-lg bg-white border-border/50 shadow-lg relative z-10">
        <CardHeader className="text-center pb-4">
          <div className="flex flex-col items-center gap-0">
            <LotusLogo size={72} />
            <CardTitle className="font-serif text-3xl text-bloom-violet">Bloom</CardTitle>
          </div>
          {stats && (
            <div className="flex justify-center gap-4 pt-2 pb-1" data-testid="auth-stats">
              {[
                { emoji: '🌸', value: stats.members, label: 'členů' },
                { emoji: '💬', value: stats.experiences, label: 'příspěvků' },
                { emoji: '🧠', value: stats.specialists, label: 'odborníků' },
                { emoji: '🤝', value: stats.services, label: 'nabídek' },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <div className="text-sm">{s.emoji}</div>
                  <div className="text-sm font-bold text-bloom-text">{s.value}</div>
                  <div className="text-[10px] text-bloom-sub">{s.label}</div>
                </div>
              ))}
            </div>
          )}
          <CardDescription className="text-bloom-sub">Bezpečný prostor pro trans komunitu, kde můžeš mluvit otevřeně, hledat pomoc a cítit podporu ostatních.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-5 bg-muted">
              <TabsTrigger value="login" data-testid="login-tab">Přihlášení</TabsTrigger>
              <TabsTrigger value="register" data-testid="register-tab">Registrace</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <LoginForm loading={loading} setLoading={setLoading} />
            </TabsContent>
            <TabsContent value="register">
              <RegisterForm loading={loading} setLoading={setLoading} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* PWA Install Instructions */}
      <div className="w-full max-w-lg mt-4 relative z-10">
        <details className="bg-white border border-border/50 rounded-xl shadow-sm">
          <summary className="px-4 py-3 text-sm font-medium text-bloom-sub cursor-pointer hover:text-bloom-violet transition-colors flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-bloom-violet shrink-0" />
            <span>Jak dostat aplikaci Bloom do svého mobilního zařízení</span>
          </summary>
          <div className="px-4 pb-4 space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-bloom-text mb-1.5">Android (Chrome)</h4>
              <ol className="text-xs text-bloom-sub space-y-1 list-decimal list-inside">
                <li>Otevřete tuto stránku v prohlížeči Chrome</li>
                <li>Klepněte na ikonu tří teček (⋮) v pravém horním rohu</li>
                <li>Zvolte „Přidat na plochu" nebo „Nainstalovat aplikaci"</li>
                <li>Potvrďte instalaci</li>
              </ol>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-bloom-text mb-1.5">iPhone / iPad (Safari)</h4>
              <ol className="text-xs text-bloom-sub space-y-1 list-decimal list-inside">
                <li>Otevřete tuto stránku v prohlížeči Safari</li>
                <li>Klepněte na ikonu sdílení (□↑) ve spodní liště</li>
                <li>Přejeďte dolů a zvolte „Přidat na plochu"</li>
                <li>Potvrďte klepnutím na „Přidat"</li>
              </ol>
            </div>
            <p className="text-xs text-bloom-sub/70">Bloom funguje jako aplikace i offline. Vaše data jsou vždy aktuální.</p>
          </div>
        </details>

        {/* MVP notice + feedback */}
        <div className="mt-3 bg-white border border-border/50 rounded-xl shadow-sm px-4 py-3 space-y-2">
          <p className="text-xs text-bloom-sub leading-relaxed">
            Aplikace Bloom je v první verzi a postupně ji společně s komunitou vylepšujeme.
            Pokud narazíte na chybu nebo máte nápad, budeme rádi za zpětnou vazbu.
          </p>
          <button
            onClick={() => setBugReportOpen(true)}
            className="flex items-center gap-1.5 text-xs text-bloom-violet hover:text-bloom-violet/80 transition-colors font-medium"
            data-testid="auth-bug-report-btn"
          >
            <Bug className="w-3.5 h-3.5" />Nahlásit problém
          </button>
        </div>
      </div>

      <BugReportModal open={bugReportOpen} onClose={() => setBugReportOpen(false)} />
    </div>
  );
};

export default AuthPage;
