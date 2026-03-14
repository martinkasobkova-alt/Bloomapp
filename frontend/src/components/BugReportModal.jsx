import React, { useState } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { Bug } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const reportTypes = [
  { value: 'app_error', label: 'Chyba v aplikaci' },
  { value: 'not_working', label: 'Něco nefunguje' },
  { value: 'suggestion', label: 'Návrh zlepšení' },
  { value: 'security', label: 'Bezpečnostní problém' },
  { value: 'other', label: 'Jiný problém' },
];

export default function BugReportModal({ open, onClose }) {
  const [reportType, setReportType] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reportType) { toast.error('Vyberte prosím typ problému'); return; }
    if (!description.trim()) { toast.error('Popište prosím problém'); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API}/bug-reports`, {
        report_type: reportType,
        description: description.trim(),
        page_url: window.location.href,
        browser_info: `${navigator.userAgent} | ${window.innerWidth}x${window.innerHeight}`,
      });
      toast.success('Hlášení odesláno, děkujeme!');
      setReportType('');
      setDescription('');
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Nepodařilo se odeslat hlášení');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-bloom-text">
            <Bug className="w-4 h-4 text-bloom-violet" />
            Nahlásit problém
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label className="text-sm text-bloom-text">Typ problému</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger data-testid="bug-type-select">
                <SelectValue placeholder="Vyberte typ..." />
              </SelectTrigger>
              <SelectContent>
                {reportTypes.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-bloom-text">Popis problému</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Popište co se stalo, co jste očekávali a co se místo toho stalo..."
              rows={4}
              className="text-sm resize-none"
              data-testid="bug-description-input"
            />
          </div>
          <p className="text-[11px] text-bloom-sub/60 leading-relaxed">
            Automaticky přiložíme: aktuální stránku, čas a informace o prohlížeči.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>Zrušit</Button>
            <Button
              size="sm"
              className="bg-bloom-violet text-white"
              onClick={handleSubmit}
              disabled={submitting}
              data-testid="submit-bug-report-btn"
            >
              {submitting ? 'Odesílám...' : 'Odeslat hlášení'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
