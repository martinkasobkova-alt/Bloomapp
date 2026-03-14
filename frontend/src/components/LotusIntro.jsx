import React, { useState, useEffect } from 'react';
import { LotusLogo } from './Layout';

export default function LotusIntro() {
  // Lazy initializer runs once per mount; state preserved across React StrictMode remount
  const [phase, setPhase] = useState(() =>
    sessionStorage.getItem('bloom_intro_shown') ? 'done' : 'visible'
  );

  useEffect(() => {
    if (phase === 'done') return;
    sessionStorage.setItem('bloom_intro_shown', '1');
    if (phase === 'fadeout') {
      const t = setTimeout(() => setPhase('done'), 600);
      return () => clearTimeout(t);
    }
    const t1 = setTimeout(() => setPhase('fadeout'), 3200);
    const t2 = setTimeout(() => setPhase('done'), 3800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [phase]);

  if (phase === 'done') return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'var(--color-bloom-bg, #FCFBFF)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        animation: phase === 'fadeout' ? 'introFadeOut 0.6s ease-out forwards' : 'none',
        pointerEvents: phase === 'fadeout' ? 'none' : 'all'
      }}
      data-testid="lotus-intro"
    >
      {/* Animated lotus petals */}
      <div style={{ position: 'relative', width: 120, height: 120 }}>
        <svg
          width="120" height="120" viewBox="0 0 120 120" fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ overflow: 'visible' }}
        >
          <ellipse cx="60" cy="98" rx="32" ry="6" fill="#6FE3C1" opacity="0.3"
            style={{ animation: 'petalBloom 0.5s 2.0s ease-out both' }} />
          {/* Outer petals first, then inner, then center */}
          <path d="M28 84 C14 78, 8 88, 20 95 C23 90, 26 87, 28 84" fill="#8A7CFF" opacity="0.5"
            style={{ animation: 'petalBloom 0.45s 0.3s ease-out both', transformOrigin: '28px 88px' }} />
          <path d="M92 84 C106 78, 112 88, 100 95 C97 90, 94 87, 92 84" fill="#8A7CFF" opacity="0.5"
            style={{ animation: 'petalBloom 0.45s 0.4s ease-out both', transformOrigin: '92px 88px' }} />
          <path d="M36 28 C16 42, 10 66, 28 84 C32 65, 34 46, 36 28" fill="#5BCEFA" opacity="0.6" stroke="#5BCEFA" strokeWidth="1"
            style={{ animation: 'petalBloom 0.5s 0.7s ease-out both', transformOrigin: '28px 84px' }} />
          <path d="M84 28 C104 42, 110 66, 92 84 C88 65, 86 46, 84 28" fill="#5BCEFA" opacity="0.6" stroke="#5BCEFA" strokeWidth="1"
            style={{ animation: 'petalBloom 0.5s 0.8s ease-out both', transformOrigin: '92px 84px' }} />
          <path d="M60 88 C42 76, 30 52, 36 28 C46 48, 54 70, 60 88" fill="#F5A9B8" opacity="0.7" stroke="#E8A0BF" strokeWidth="1"
            style={{ animation: 'petalBloom 0.5s 1.1s ease-out both', transformOrigin: '48px 60px' }} />
          <path d="M60 88 C78 76, 90 52, 84 28 C74 48, 66 70, 60 88" fill="#F5A9B8" opacity="0.7" stroke="#E8A0BF" strokeWidth="1"
            style={{ animation: 'petalBloom 0.5s 1.2s ease-out both', transformOrigin: '72px 60px' }} />
          <path d="M60 20 C66 45, 66 65, 60 88 C54 65, 54 45, 60 20" fill="white" stroke="#E8A0BF" strokeWidth="1.5"
            style={{ animation: 'petalBloom 0.6s 1.5s ease-out both', transformOrigin: '60px 88px' }} />
          <circle cx="60" cy="50" r="3" fill="#8A7CFF" opacity="0.6"
            style={{ animation: 'petalBloom 0.4s 2.0s ease-out both', transformOrigin: '60px 50px' }} />
        </svg>
      </div>
      <p style={{
        fontFamily: "'Nunito', 'DM Sans', sans-serif", fontSize: '1.8rem', fontWeight: 800, color: '#8A7CFF', marginTop: '1rem',
        animation: 'introWordFade 0.8s 1.6s ease-out both', letterSpacing: '0.2em', opacity: 0
      }}>
        Bloom
      </p>
      <p style={{
        fontFamily: "'Nunito', 'DM Sans', sans-serif", fontSize: '0.75rem', color: '#9DA3AE', marginTop: '0.4rem',
        animation: 'introWordFade 0.8s 1.9s ease-out both', opacity: 0
      }}>
        bezpečný prostor pro trans komunitu
      </p>
    </div>
  );
}
