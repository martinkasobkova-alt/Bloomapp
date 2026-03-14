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
    <div className={`section-header mt-1.5 md:mt-2 mb-2 md:mb-4 text-center ${className}`}>
      <h1 className="font-serif text-[20px] leading-tight sm:text-3xl md:text-4xl md:leading-normal font-semibold text-bloom-text/80 mb-1 md:mb-2 flex items-center justify-center gap-1.5 md:gap-2">
        <span className="section-marker shrink-0" style={{ background: color }} />
        <span className="break-words text-center">{title}</span>
      </h1>
      {subtitle && <p className="section-header-subtitle text-[11px] leading-tight md:text-base md:leading-normal text-bloom-sub/80 md:text-bloom-sub mt-0 mb-0 max-w-full mx-auto overflow-hidden text-ellipsis whitespace-nowrap md:whitespace-normal md:overflow-visible">{subtitle}</p>}
    </div>
  );
};
