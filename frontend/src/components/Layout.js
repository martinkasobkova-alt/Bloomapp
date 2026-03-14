import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bell, RefreshCw, Bug, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BugReportModal from './BugReportModal';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useTextSettings } from '../hooks/useTextSettings';
import { Navigation } from './Navigation';
import { API } from '../lib/api';

// Re-export avatar system and logo for backward compatibility
export { avatarOptions, getAvatarImage, getAvatarFallback } from './avatarSystem';
export { LotusLogo } from './LotusLogo';

export const Layout = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const texts = useTextSettings();
  const [bugReportOpen, setBugReportOpen] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const { permission, supported, subscribe } = usePushNotifications();
  const [pushDismissed, setPushDismissed] = useState(() => localStorage.getItem('bloom_push_dismissed') === 'true');

  useEffect(() => {
    if (isAuthenticated && supported && permission === 'granted') {
      subscribe();
    }
  }, [isAuthenticated, supported, permission, subscribe]);

  const handleEnablePush = async () => {
    await subscribe();
    setPushDismissed(true);
    localStorage.setItem('bloom_push_dismissed', 'true');
  };

  const handleDismissPush = () => {
    setPushDismissed(true);
    localStorage.setItem('bloom_push_dismissed', 'true');
  };

  const handleResendVerification = async () => {
    setResendingVerification(true);
    try {
      await axios.post(`${API}/auth/resend-verification`);
      setTimeout(() => setResendingVerification(false), 3000);
    } catch {
      setResendingVerification(false);
    }
  };

  const showPushBanner = isAuthenticated && supported && permission === 'default' && !pushDismissed;
  const showVerificationBanner = isAuthenticated && user && user.email_verified === false;

  return (
    <div className="min-h-screen bg-bloom-bg flex flex-col">
      {showPushBanner && (
        <div className="bg-bloom-violet/5 border-b border-bloom-violet/15 px-3 sm:px-4 py-2 sm:py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2" data-testid="push-banner">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-bloom-text">
            <Bell className="w-4 h-4 shrink-0 text-bloom-violet" />
            <span>Chcete dostávat upozornění na nové zprávy?</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button onClick={handleEnablePush} className="flex-1 sm:flex-none text-xs font-semibold text-white bg-bloom-violet hover:bg-bloom-violet/90 px-3 py-1.5 rounded-lg transition-colors" data-testid="enable-push-btn">Povolit</button>
            <button onClick={handleDismissPush} className="text-xs text-bloom-sub hover:text-bloom-text px-2 py-1.5 transition-colors" data-testid="dismiss-push-btn">Teď ne</button>
          </div>
        </div>
      )}
      <Navigation />
      <main className={`flex-1 page-transition ${isAuthenticated ? "pt-[56px] md:pt-[91px]" : ""}`}>
        {showVerificationBanner && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2" data-testid="verification-banner">
            <div className="bg-amber-50 border border-amber-200 rounded-xl shadow-sm px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2 min-w-0">
                <XCircle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-bloom-text">
                    E-mail: <span className="text-amber-600">Neověřený</span>
                  </p>
                  <p className="text-xs text-bloom-sub">{user?.email}</p>
                  <p className="text-xs text-amber-700 mt-1.5">Neověření uživatelé mají omezená práva. Web mohou pouze prohlížet. Prosím ověřte svůj e-mail.</p>
                </div>
              </div>
              <button
                onClick={handleResendVerification}
                disabled={resendingVerification}
                className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-2 rounded-lg transition-colors shrink-0"
                data-testid="resend-verification-btn"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${resendingVerification ? 'animate-spin' : ''}`} />
                {resendingVerification ? 'Odesílám...' : 'Odeslat znovu'}
              </button>
            </div>
          </div>
        )}
        {children}
      </main>
      <footer className="border-t border-border/50 bg-white/60 py-5 px-4 sm:px-6 lg:px-8 mt-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <p className="text-xs text-bloom-sub/60">© 2026 Bloom – soukromý prostor pro trans komunitu</p>
            {texts.footer_text && <p className="text-xs text-bloom-sub/80 mt-0.5">{texts.footer_text}</p>}
          </div>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 justify-center">
            <a href="/community" className="text-xs text-bloom-sub hover:text-bloom-violet transition-colors">O projektu</a>
            <a href="/community#guidelines" className="text-xs text-bloom-sub hover:text-bloom-violet transition-colors">Zásady komunity</a>
            <a href="/community#contact" className="text-xs text-bloom-sub hover:text-bloom-violet transition-colors">Kontakt</a>
            {isAuthenticated && (
              <button
                onClick={() => setBugReportOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-bloom-violet/10 text-bloom-violet hover:bg-bloom-violet/20 transition-colors text-xs font-medium"
                data-testid="report-bug-btn"
              >
                <Bug className="w-3 h-3" />Nahlásit problém
              </button>
            )}
          </nav>
        </div>
      </footer>
      <BugReportModal open={bugReportOpen} onClose={() => setBugReportOpen(false)} />
    </div>
  );
};

export default Layout;
