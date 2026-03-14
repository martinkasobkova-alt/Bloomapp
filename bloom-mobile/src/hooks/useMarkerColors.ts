import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../config/api';

/** Barvy odpovídají mobilnímu menu (Rychlé odkazy) – jednotné na webu i mobilu */
const DEFAULT_MARKER_COLORS: Record<string, string> = {
  support: '#F5A9B8',
  specialists: '#B8A9F5',
  legal: '#A9E5F5',
  news: '#A9F5B8',
  nearby: '#F5D4A9',
  stories: '#F5E6A9',
  community: '#8A7CFF',
  messages: '#8A7CFF',
  profile: '#F5A9B8',
  featured: '#F5A9B8',
  default: '#8A7CFF',
};

export const useMarkerColors = (): Record<string, string> => {
  const [markerColors, setMarkerColors] = useState<Record<string, string>>(DEFAULT_MARKER_COLORS);

  useEffect(() => {
    axios
      .get(`${API}/settings/marker-colors`)
      .then((r) => setMarkerColors({ ...DEFAULT_MARKER_COLORS, ...(r.data || {}) }))
      .catch(() => {});
  }, []);

  return markerColors;
};
