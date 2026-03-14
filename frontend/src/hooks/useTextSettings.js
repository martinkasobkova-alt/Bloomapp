import { useState, useEffect } from 'react';
import axios from 'axios';

import { API } from '../lib/api';
let cached = null;

export function useTextSettings() {
  const [texts, setTexts] = useState(cached || {});
  useEffect(() => {
    if (cached) { setTexts(cached); return; }
    axios.get(`${API}/settings/texts`)
      .then(r => { cached = r.data || {}; setTexts(cached); })
      .catch(() => {});
  }, []);
  return texts;
}
