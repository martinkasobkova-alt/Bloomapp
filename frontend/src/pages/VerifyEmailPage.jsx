import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { Button } from '../components/ui/button';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Neplatný ověřovací odkaz.');
      return;
    }
    let cancelled = false;
    axios.get(`${API}/auth/verify-email/${token}`)
      .then(r => {
        if (!cancelled) {
          setStatus('success');
          setMessage(r.data.message || 'E-mail byl úspěšně ověřen!');
        }
      })
      .catch(e => {
        if (!cancelled) {
          setStatus('error');
          setMessage(e.response?.data?.detail || 'Ověřovací odkaz je neplatný nebo vypršel.');
        }
      });
    return () => { cancelled = true; };
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-bloom-bg flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-border/50 p-8 text-center">
        <div className="h-1 bg-gradient-to-r from-[#5BCEFA] via-[#F5A9B8] to-[#5BCEFA] rounded-full mb-8" />
        
        {status === 'loading' && (
          <div>
            <Loader className="w-12 h-12 text-bloom-violet mx-auto mb-4 animate-spin" />
            <h2 className="font-serif text-xl font-semibold text-bloom-text mb-2">Ověřuji e-mail...</h2>
            <p className="text-bloom-sub text-sm">Prosím čekejte.</p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <CheckCircle className="w-14 h-14 text-bloom-mint mx-auto mb-4" />
            <h2 className="font-serif text-2xl font-bold text-bloom-text mb-2">E-mail ověřen!</h2>
            <p className="text-bloom-sub mb-6">{message}</p>
            <p className="text-bloom-sub text-sm mb-6">Nyní máte plný přístup ke všem funkcím Bloom.</p>
            <Button
              className="bg-bloom-violet text-white hover:bg-bloom-violet/90 w-full"
              onClick={() => navigate('/')}
              data-testid="go-home-btn"
            >
              Přejít na Bloom
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div>
            <XCircle className="w-14 h-14 text-destructive mx-auto mb-4" />
            <h2 className="font-serif text-2xl font-bold text-bloom-text mb-2">Ověření selhalo</h2>
            <p className="text-bloom-sub mb-6">{message}</p>
            <Button
              variant="outline"
              className="w-full border-bloom-violet/30 text-bloom-violet"
              onClick={() => navigate('/auth')}
            >
              Zpět na přihlášení
            </Button>
          </div>
        )}

        <div className="h-1 bg-gradient-to-r from-[#5BCEFA] via-[#F5A9B8] to-[#5BCEFA] rounded-full mt-8" />
      </div>
    </div>
  );
}
