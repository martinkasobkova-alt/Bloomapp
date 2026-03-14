import React from 'react';
import { useAppSettings } from '../context/AppSettingsContext';

/**
 * SectionHeader — reads title, subtitle, and marker color from admin settings.
 * Color is read from markerColors (synced with "Barvy markerů" admin panel).
 * Title/subtitle are read from sections settings.
 * Falls back to provided props if admin hasn't overridden them.
 */
export const SectionHeader = ({
  sectionKey,
  defaultTitle,
  defaultSubtitle,
  defaultColor = '#8A7CFF',
  className = '',
}) => {
  const { sections, markerColors } = useAppSettings();
  const cfg = sections?.[sectionKey] || {};

  // Color priority: markerColors[sectionKey] > sections[sectionKey].color > defaultColor
  const color = markerColors?.[sectionKey] || cfg.color || defaultColor;
  // Title/subtitle from section settings (admin-editable)
  const title = cfg.title || defaultTitle;
  const subtitle = cfg.subtitle || defaultSubtitle;

  return (
    <div className={`mt-3 md:mt-2 mb-3 md:mb-4 text-center ${className}`}>
      <h1 className="font-serif text-xl leading-tight sm:text-3xl md:text-4xl md:leading-normal font-semibold text-bloom-text/80 mb-2 flex items-center justify-center gap-2">
        <span className="section-marker shrink-0" style={{ background: color }} />
        <span className="break-words text-center">{title}</span>
      </h1>
      {subtitle && <p className="text-bloom-sub text-sm md:text-base">{subtitle}</p>}
    </div>
  );
};
