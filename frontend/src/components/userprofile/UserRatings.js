import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { MessageCircle, Flag } from 'lucide-react';
import { API } from '../../lib/api';
import { useNavigate } from 'react-router-dom';

export function UserRatings({ userId, username, emailVerified = true }) {
  const navigate = useNavigate();
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportLoading, setReportLoading] = useState(false);

  const handleSendMessage = () => navigate('/messages', { state: { startChatWith: userId } });

  const handleReportUser = async (e) => {
    e.preventDefault();
    if (!reportReason) { toast.error('Vyberte důvod nahlášení'); return; }
    setReportLoading(true);
    try {
      await axios.post(`${API}/users/${userId}/report`, { reason: reportReason, description: reportDescription });
      toast.success('Nahlášení bylo odesláno administrátorovi');
      setReportDialogOpen(false);
      setReportReason(''); setReportDescription('');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Nepodařilo se odeslat nahlášení');
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="space-y-2 mt-2">
      <Button onClick={handleSendMessage} disabled={!emailVerified} title={!emailVerified ? 'Pro odeslání zprávy musíte ověřit e-mail' : ''} className="w-full bg-bloom-violet text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed" data-testid="send-message-btn">
        <MessageCircle className="w-4 h-4 mr-1.5" />Napsat zprávu
      </Button>

      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogTrigger asChild>
          <button className="w-full text-xs text-bloom-sub/60 hover:text-destructive/70 flex items-center justify-center gap-1 py-1 transition-colors" data-testid="report-user-btn">
            <Flag className="w-3 h-3" />Nahlásit uživatele
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-bloom-text">Nahlásit uživatele {username}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleReportUser} className="space-y-4">
            <div className="h-1 bg-gradient-to-r from-[#5BCEFA] via-[#F5A9B8] to-[#5BCEFA] rounded" />
            <p className="text-xs text-bloom-sub">Nahlášení obdrží administrátor. Vy zůstanete anonymní.</p>
            <div className="space-y-1.5">
              <p className="text-sm text-bloom-text font-medium">Důvod *</p>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger data-testid="report-reason-select"><SelectValue placeholder="Vyberte důvod..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="spam">Spam nebo reklama</SelectItem>
                  <SelectItem value="nevhodne-chovani">Nevhodné chování</SelectItem>
                  <SelectItem value="podvod">Podvod</SelectItem>
                  <SelectItem value="falesny-profil">Falešný profil</SelectItem>
                  <SelectItem value="jiny">Jiný problém</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm text-bloom-text">Popis <span className="text-bloom-sub text-xs">(volitelný)</span></p>
              <Textarea value={reportDescription} onChange={e => setReportDescription(e.target.value)} placeholder="Popište situaci podrobněji..." rows={3} data-testid="report-description-input" />
            </div>
            <Button type="submit" className="w-full bg-destructive/90 text-white hover:bg-destructive" disabled={reportLoading} data-testid="submit-report-btn">
              {reportLoading ? 'Odesílám...' : 'Odeslat nahlášení'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
