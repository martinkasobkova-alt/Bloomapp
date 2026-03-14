import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';

/**
 * Reusable avatar selector with responsive grid, smaller icons,
 * modern selection feedback (ring, glow, scale), and touch-friendly targets.
 */
export function AvatarSelector({ avatars, value, onChange, showCustomOption = false, onCustomClick, customPreview }) {
  return (
    <div
      className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2"
      role="listbox"
      aria-label="Vyberte avatar"
    >
      {avatars.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="option"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          title={opt.label}
          className={`
            relative flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full
            transition-all duration-200 ease-out
            focus:outline-none focus-visible:ring-2 focus-visible:ring-bloom-violet focus-visible:ring-offset-2
            ${value === opt.value
              ? 'ring-2 ring-bloom-violet ring-offset-2 shadow-[0_0_0_3px_rgba(138,124,255,0.25)] scale-110'
              : 'opacity-80 hover:opacity-100 hover:scale-105 active:scale-95'
            }
          `}
          data-testid={opt.value === 'custom' ? 'avatar-custom' : `avatar-${opt.value}`}
        >
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarImage src={opt.image} alt={opt.label} />
            <AvatarFallback className="bg-bloom-violet/20 text-bloom-violet text-xs">
              {opt.label?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
        </button>
      ))}
      {showCustomOption && (
        <button
          type="button"
          role="option"
          aria-selected={value === 'custom'}
          onClick={onCustomClick}
          title="Nahrát vlastní foto"
          className={`
            relative flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full
            transition-all duration-200 ease-out
            focus:outline-none focus-visible:ring-2 focus-visible:ring-bloom-violet focus-visible:ring-offset-2
            ${value === 'custom'
              ? 'ring-2 ring-bloom-violet ring-offset-2 shadow-[0_0_0_3px_rgba(138,124,255,0.25)] scale-110'
              : 'opacity-80 hover:opacity-100 hover:scale-105 active:scale-95'
            }
          `}
          data-testid="avatar-custom"
        >
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarImage src={customPreview} alt="Vlastní" />
            <AvatarFallback className="bg-bloom-violet/20 text-bloom-violet text-xs">+</AvatarFallback>
          </Avatar>
        </button>
      )}
    </div>
  );
}
