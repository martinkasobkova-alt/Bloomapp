import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

import { API } from '../lib/api';

// Barvy odpovídají mobilnímu menu (Rychlé odkazy) – jednotné na webu i mobilu
const DEFAULT_MARKER_COLORS = {
  support: '#F5A9B8', specialists: '#B8A9F5', legal: '#A9E5F5',
  news: '#A9F5B8', nearby: '#F5D4A9', stories: '#F5E6A9',
  community: '#8A7CFF', messages: '#8A7CFF', profile: '#F5A9B8',
  featured: '#F5A9B8', default: '#8A7CFF',
};

const DEFAULT_SECTIONS = {
  specialists: { title: 'Trans-friendly odborníci', subtitle: 'Najděte ověřené odborníky, kteří vám pomohou na vaší cestě', color: '#8A7CFF', visible: true, order: 3 },
  legal: { title: 'Právní poradna', subtitle: 'Odborné právní informace pro trans komunitu', color: '#5BCEFA', visible: true, order: 4 },
  news: { title: 'Aktuality', subtitle: 'Novinky ze světa trans komunity', color: '#5BCEFA', visible: true, order: 5 },
  community: { title: 'Komunita', subtitle: 'Bezpečný prostor pro sdílení', color: '#8A7CFF', visible: true, order: 7 },
  support: { title: 'Vzájemná podpora', subtitle: 'Nabídněte své dovednosti a získejte pomoc od ostatních', color: '#F5A9B8', visible: true, order: 2 },
  nearby: { title: 'V mém okolí', subtitle: 'Najděte lidi a odborníky ve svém okolí', color: '#A8E6CF', visible: true, order: 6 },
};

const AppSettingsContext = createContext({
  markerColors: DEFAULT_MARKER_COLORS,
  sections: DEFAULT_SECTIONS,
  refresh: () => {},
});

export const AppSettingsProvider = ({ children }) => {
  const [markerColors, setMarkerColors] = useState(DEFAULT_MARKER_COLORS);
  const [sections, setSections] = useState(DEFAULT_SECTIONS);

  const applyColorsToCSS = (colors) => {
    const root = document.documentElement;
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--marker-${key}`, value);
    });
  };

  const loadSettings = useCallback(async () => {
    try {
      const [colorsRes, sectionsRes] = await Promise.all([
        axios.get(`${API}/settings/marker-colors`),
        axios.get(`${API}/settings/sections`),
      ]);
      const colors = { ...DEFAULT_MARKER_COLORS, ...colorsRes.data };
      // Deep merge per section key so defaults (visible, color) are preserved if DB doesn't have them
      const secs = {};
      Object.keys(DEFAULT_SECTIONS).forEach(key => {
        secs[key] = { ...DEFAULT_SECTIONS[key], ...(sectionsRes.data[key] || {}) };
      });
      setMarkerColors(colors);
      setSections(secs);
      applyColorsToCSS(colors);
    } catch {
      applyColorsToCSS(DEFAULT_MARKER_COLORS);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  return (
    <AppSettingsContext.Provider value={{ markerColors, sections, refresh: loadSettings }}>
      {children}
    </AppSettingsContext.Provider>
  );
};

export const useAppSettings = () => useContext(AppSettingsContext);
