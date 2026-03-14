import { useState, useEffect } from 'react';
import axios from 'axios';
import { API } from '../config/api';

interface TextSettings {
  help_text?: string;
  [key: string]: string | undefined;
}

export const useTextSettings = (): TextSettings => {
  const [texts, setTexts] = useState<TextSettings>({});

  useEffect(() => {
    axios
      .get(`${API}/settings/texts`)
      .then((r) => setTexts(r.data || {}))
      .catch(() => {});
  }, []);

  return texts;
};
