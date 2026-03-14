import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../config/api';

export const useContactEmail = (): string => {
  const [email, setEmail] = useState('podpora@bloom.cz');

  useEffect(() => {
    axios
      .get(`${API}/settings/contact-email`)
      .then((r) => setEmail(r.data?.email || 'podpora@bloom.cz'))
      .catch(() => {});
  }, []);

  return email;
};
