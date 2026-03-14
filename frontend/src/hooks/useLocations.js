import { useState, useEffect } from 'react';
import axios from 'axios';

import { API } from '../lib/api';

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

export const useLocations = ({ includeNone = false, country = null } = {}) => {
  const [locations, setLocations] = useState([]);
  const [allLocations, setAllLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/locations`)
      .then(r => {
        const locs = r.data || [];
        setAllLocations(locs);
        const filtered = country ? locs.filter(l => l.country === country) : locs;
        const withNone = includeNone ? [{ id: 'none', name: 'Nechci uvádět', country: null }, ...filtered] : filtered;
        setLocations(withNone);
      })
      .catch(() => {
        const fallback = country === 'CZ' ? FALLBACK_CZ : country === 'WORLD' ? FALLBACK_WORLD : FALLBACK_ALL;
        setAllLocations(FALLBACK_ALL);
        setLocations(includeNone ? [{ id: 'none', name: 'Nechci uvádět', country: null }, ...fallback] : fallback);
      })
      .finally(() => setLoading(false));
  }, [includeNone, country]);

  return { locations, allLocations, loading };
};
