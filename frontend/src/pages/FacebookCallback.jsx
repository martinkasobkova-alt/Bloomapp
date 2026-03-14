import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { LotusLogo } from '../components/Layout';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function FacebookCallback() {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const hasProcessed = useRef(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const errorParam = params.get('error');

    if (errorParam === 'access_denied') {
      navigate('/auth', { replace: true });
      return;
    }

    if (!code) {
      navigate('/auth', { replace: true });
      return;
    }

    const mode = localStorage.getItem('bloom_facebook_mode') || 'login';
    localStorage.removeItem('bloom_facebook_mode');
    const redirectUri = window.location.origin + '/auth/facebook-callback';

    axios.post(`${API}/auth/facebook`, { code, mode, redirect_uri: redirectUri })
      .then(r => {
        authLogin(r.data.token, r.data.user);
        navigate('/', { replace: true });
      })
      .catch(err => {
        const detail = err.response?.data?.detail;
        if (detail === 'no_account') {
          setError('no_account');
        } else {
          toast.error(detail || 'Přihlášení přes Facebook selhalo');
          navigate('/auth', { replace: true });
        }
      });
  }, [navigate, authLogin]);

  if (error === 'no_account') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bloom-bg px-4" data-testid="facebook-no-account">
        <div className="max-w-sm w-full text-center space-y-4">
          <LotusLogo size={48} />
          <h2 className="font-serif text-xl font-bold text-bloom-text">Účet nenalezen</h2>
          <p className="text-sm text-bloom-sub">
            Pro tento Facebook účet neexistuje registrace v Bloom. Nejprve se prosím zaregistrujte.
          </p>
          <div className="space-y-2">
            <button
              onClick={() => {
                localStorage.setItem('bloom_facebook_mode', 'register');
                const appId = process.env.REACT_APP_FACEBOOK_APP_ID;
                const redirectUri = encodeURIComponent(window.location.origin + '/auth/facebook-callback');
                window.location.href = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=email,public_profile`;
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1877F2] text-white rounded-lg hover:bg-[#166fe5] transition-colors"
              data-testid="facebook-register-redirect-btn"
            >
              <FacebookIcon className="w-4 h-4" />
              Registrovat přes Facebook
            </button>
            <button
              onClick={() => navigate('/auth', { replace: true })}
              className="w-full px-4 py-2.5 border border-border rounded-lg text-sm text-bloom-sub hover:bg-muted/50 transition-colors"
            >
              Zpět na přihlášení
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bloom-bg" data-testid="facebook-callback">
      <div className="text-center">
        <LotusLogo size={48} />
        <p className="mt-4 text-bloom-sub">Přihlašování přes Facebook...</p>
        <div className="spinner mt-3" />
      </div>
    </div>
  );
}

function FacebookIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}
