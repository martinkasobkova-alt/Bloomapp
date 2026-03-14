import { useState, useEffect } from 'react';
import axios from 'axios';

import { API } from '../lib/api';
let cached = null;

export function useContactEmail() {
  const [email, setEmail] = useState(cached || '');
  useEffect(() => {
    if (cached) { setEmail(cached); return; }
    axios.get(`${API}/settings/contact-email`)
      .then(r => { cached = r.data.email || ''; setEmail(cached); })
      .catch(() => {});
  }, []);
  return email;
}
