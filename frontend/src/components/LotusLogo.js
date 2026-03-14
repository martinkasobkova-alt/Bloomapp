import React from 'react';

export const LotusLogo = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="lotus-logo">
    <ellipse cx="60" cy="98" rx="32" ry="6" fill="#6FE3C1" opacity="0.3"/>
    <path d="M60 20 C66 45, 66 65, 60 88 C54 65, 54 45, 60 20" fill="white" stroke="#E8A0BF" strokeWidth="1.5"/>
    <path d="M60 88 C42 76, 30 52, 36 28 C46 48, 54 70, 60 88" fill="#F5A9B8" opacity="0.7" stroke="#E8A0BF" strokeWidth="1"/>
    <path d="M60 88 C78 76, 90 52, 84 28 C74 48, 66 70, 60 88" fill="#F5A9B8" opacity="0.7" stroke="#E8A0BF" strokeWidth="1"/>
    <path d="M36 28 C16 42, 10 66, 28 84 C32 65, 34 46, 36 28" fill="#5BCEFA" opacity="0.6" stroke="#5BCEFA" strokeWidth="1"/>
    <path d="M84 28 C104 42, 110 66, 92 84 C88 65, 86 46, 84 28" fill="#5BCEFA" opacity="0.6" stroke="#5BCEFA" strokeWidth="1"/>
    <path d="M28 84 C14 78, 8 88, 20 95 C23 90, 26 87, 28 84" fill="#8A7CFF" opacity="0.5"/>
    <path d="M92 84 C106 78, 112 88, 100 95 C97 90, 94 87, 92 84" fill="#8A7CFF" opacity="0.5"/>
    <circle cx="60" cy="50" r="3" fill="#8A7CFF" opacity="0.6"/>
  </svg>
);
