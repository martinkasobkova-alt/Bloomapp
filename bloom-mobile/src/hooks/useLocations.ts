import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API } from '../config/api';

/** Lokality z API – změny admina se projeví při refetch (např. pull-to-refresh) */
const FALLBACK_CZ = [
  { id: 'Praha', name: 'Praha', country: 'CZ' },
  { id: 'Středočeský kraj', name: 'Středočeský kraj', country: 'CZ' },
  { id: 'Jihočeský kraj', name: 'Jihočeský kraj', country: 'CZ' },
  { id: 'Plzeňský kraj', name: 'Plzeňský kraj', country: 'CZ' },
  { id: 'Jihomoravský kraj', name: 'Jihomoravský kraj', country: 'CZ' },
  { id: 'Moravskoslezský kraj', name: 'Moravskoslezský kraj', country: 'CZ' },
];
const FALLBACK_WORLD = [{ id: 'Svět', name: 'Svět', country: 'WORLD' }];
const FALLBACK_ALL = [...FALLBACK_CZ, ...FALLBACK_WORLD];

export interface LocationItem {
  id: string;
  name: string;
  country: string;
}

export const useLocations = (options: { includeNone?: boolean; country?: string | null } = {}) => {
  const { includeNone = false, country = null } = options;
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [allLocations, setAllLocations] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    setLoading(true);
    axios
      .get(`${API}/locations`)
      .then((r) => {
        const locs = (r.data || []) as LocationItem[];
        setAllLocations(locs);
        const filtered = country ? locs.filter((l) => l.country === country) : locs;
        const withNone = includeNone
          ? [{ id: 'none', name: 'Nechci uvádět', country: '' }, ...filtered]
          : filtered;
        setLocations(withNone);
      })
      .catch(() => {
        setAllLocations(FALLBACK_ALL);
        const fallback =
          country === 'CZ' ? FALLBACK_CZ : country === 'WORLD' ? FALLBACK_WORLD : FALLBACK_ALL;
        setLocations(
          includeNone ? [{ id: 'none', name: 'Nechci uvádět', country: '' }, ...fallback] : fallback
        );
      })
      .finally(() => setLoading(false));
  }, [includeNone, country, refreshKey]);

  return { locations, allLocations, loading, refetch };
};
