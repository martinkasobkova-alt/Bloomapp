import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  HelpCircle, MessageSquare, Plus, Send, Trash2,
  ChevronDown, ChevronRight, BadgeCheck,
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { API } from '../../lib/api';

// ─── Expert identity badge ────────────────────────────────────────────────────
const ROLE_BADGES = {
  admin:      { label: 'Správce',            color: 'text-blue-600',      bg: 'bg-blue-50' },
  lawyer:     { label: 'Ověřený právník',    color: 'text-bloom-violet',  bg: 'bg-bloom-violet/10' },
  lawyerGreen:{ label: 'Ověřený právník',    color: 'text-emerald-700',   bg: 'bg-emerald-50' },
  specialist: { label: 'Ověřený odborník',   color: 'text-teal-600',      bg: 'bg-teal-50' },
};

function ExpertIdentity({ userId, username, userRole, specLabel, legalContext = false }) {
  const badgeKey = userRole === 'lawyer' && legalContext ? 'lawyerGreen' : userRole;
  const badge = ROLE_BADGES[badgeKey];
  return (
    <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-current/10">
      <Link to={`/users/${userId}`} className="text-xs font-semibold text-bloom-violet hover:underline underline-offset-2">
        {username}
      </Link>
      {badge && (
        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${badge.color} ${badge.bg}`}>
          <BadgeCheck className="w-2.5 h-2.5" />{badge.label}
        </span>
      )}
      {specLabel && badge && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-bloom-violet/10 text-bloom-violet border border-bloom-violet/20">
          {specLabel}
        </span>
      )}
    </div>
  );
}

/**
 * QnASection — shared Q&A component for Legal, Specialists, and Stories pages.
 *
 * Props:
 *  section          - 'legal' | 'specialists' | 'stories'
 *  canAnswer        - current user can post answers
 *  allowAllReplies  - if true, any logged-in user can answer (used for stories)
 *  canDelete        - current user can delete questions
 *  showVoteCount    - show vote button (Legal only)
 *  accentColor      - 'violet' | 'pink'
 *  testIdPrefix     - prefix for data-testid attributes
 *  addButtonLabel   - label on the "add question" button
 *  dialogTitle      - dialog heading
 *  dialogPlaceholder- input placeholder inside dialog
 *  user             - current user object (null if logged out)
 *  categories       - admin-managed list [{id, name}] for topic filtering
 *  activeCategory   - currently active filter ('all' or id/name)
 *  legalContext     - if true, lawyer badge is shown in green (Právní poradna)
 */
export function QnASection({
  section,
  canAnswer = false,
  allowAllReplies = false,
  canDelete = false,
  accentColor = 'violet',
  testIdPrefix = 'question',
  addButtonLabel = 'Přidat otázku',
  dialogTitle = 'Nová otázka',
  dialogPlaceholder = 'Na co se chcete zeptat?',
  user = null,
  categories = [],
  activeCategory = 'all',
  legalContext = false,
}) {
  const [questions, setQuestions] = useState([]);
  const [expandedQ, setExpandedQ] = useState(null);
  const [answerTexts, setAnswerTexts] = useState({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [questionTitle, setQuestionTitle] = useState('');
  const [questionCategory, setQuestionCategory] = useState('all');

  // accent classes
  const accent = {
    violet: {
      btn:    'bg-bloom-violet text-white hover:bg-bloom-violet/90',
      bubble: 'bg-bloom-violet/5 border-bloom-violet/20',
      icon:   'text-bloom-violet',
      chevron:'text-bloom-violet',
    },
    pink: {
      btn:    'bg-bloom-pride-pink text-white hover:bg-bloom-pride-pink/90',
      bubble: 'bg-bloom-pride-pink/5 border-bloom-pride-pink/20',
      icon:   'text-bloom-pride-pink',
      chevron:'text-bloom-pride-pink',
    },
  }[accentColor];

  const fetchQuestions = useCallback(async (cat) => {
    const categoryParam = cat !== undefined ? cat : activeCategory;
    try {
      const r = await axios.get(`${API}/questions?section=${section}&category=${encodeURIComponent(categoryParam)}`);
      setQuestions(r.data);
    } catch { /* silently ignore */ }
  }, [section, activeCategory]);

  useEffect(() => { fetchQuestions(activeCategory); }, [section, activeCategory, fetchQuestions]);

  // Create question
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!questionTitle.trim()) return;
    try {
      await axios.post(`${API}/questions`, { title: questionTitle.trim(), section, category: questionCategory });
      setQuestionTitle('');
      setQuestionCategory('all');
      setDialogOpen(false);
      fetchQuestions();
    } catch { /* toast handled by parent or silently */ }
  };

  // Delete question
  const handleDelete = async (id) => {
    if (!window.confirm('Smazat tuto otázku?')) return;
    try {
      await axios.delete(`${API}/questions/${id}`);
      setQuestions(prev => prev.filter(q => q.id !== id));
    } catch { /* silently */ }
  };

  // Submit answer
  const handleSubmitAnswer = async (qId) => {
    const content = answerTexts[qId]?.trim();
    if (!content) return;
    try {
      const r = await axios.post(`${API}/questions/${qId}/answers`, { content });
      setQuestions(prev => prev.map(q => q.id === qId ? r.data : q));
      setAnswerTexts(prev => ({ ...prev, [qId]: '' }));
    } catch { /* silently */ }
  };

  // Thank expert for answer
  const handleThankAnswer = async (qId, answerId) => {
    try {
      await axios.post(`${API}/questions/${qId}/answers/${answerId}/thank`);
      fetchQuestions(activeCategory);
    } catch { /* silently */ }
  };

  const isExpertAnswer = (a) => ['lawyer', 'specialist', 'admin'].includes(a?.user_role || '');

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-xl font-semibold text-bloom-text flex items-center gap-2">
          <HelpCircle className={`w-5 h-5 ${accent.icon}`} />Otázky komunity
        </h2>
        {user && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className={`border-current/30 ${accent.icon}`} data-testid={`${testIdPrefix}-add-btn`} disabled={!user?.email_verified} title={!user?.email_verified ? 'Pro přispívání musíte ověřit e-mail' : ''}>
                <Plus className="w-4 h-4 mr-1" />{addButtonLabel}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-serif text-bloom-text">{dialogTitle}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <Label className="text-bloom-text">Otázka *</Label>
                  <Input
                    value={questionTitle}
                    onChange={e => setQuestionTitle(e.target.value)}
                    required
                    placeholder={dialogPlaceholder}
                    data-testid={`${testIdPrefix}-title-input`}
                  />
                </div>
                {categories.length > 0 && (
                  <div>
                    <Label className="text-bloom-text">Oblast / téma</Label>
                    <select
                      value={questionCategory}
                      onChange={e => setQuestionCategory(e.target.value)}
                      className="w-full mt-1 px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                      data-testid={`${testIdPrefix}-category-select`}
                    >
                      <option value="all">Vše (obecná otázka)</option>
                      {categories.map(c => (
                        <option key={c.id || c.name} value={c.id || c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <Button type="submit" className={`w-full ${accent.btn}`} data-testid={`${testIdPrefix}-submit-btn`}>
                  Odeslat otázku
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Questions list */}
      {questions.length === 0 ? (
        <Card className="bg-white border-border/50">
          <CardContent className="p-8 text-center">
            <HelpCircle className="w-8 h-8 text-bloom-sub/30 mx-auto mb-2" />
            <p className="text-sm text-bloom-sub">Zatím žádné otázky. Buďte první!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {questions.map(q => (
            <Card key={q.id} className="bg-white border-border/50" data-testid={`${testIdPrefix}-${q.id}`}>
              <CardContent className="p-4">
                {/* Clickable header */}
                <div className="flex items-start justify-between gap-3">
                  <div
                    className="flex-1 min-w-0 cursor-pointer flex items-start gap-3"
                    onClick={() => setExpandedQ(expandedQ === q.id ? null : q.id)}
                  >
                    <Link to={`/users/${q.user_id}`} onClick={e => e.stopPropagation()} className="shrink-0" data-testid={`question-avatar-link-${q.id}`}>
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-bloom-violet/10 text-bloom-violet text-xs font-semibold">{q.username?.charAt(0)?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-bloom-text">{q.title}</p>
                      <div className="flex items-center gap-1.5 text-xs text-bloom-sub mt-0.5">
                        <Link to={`/users/${q.user_id}`} className="font-medium text-bloom-violet hover:underline underline-offset-2 transition-colors" onClick={e => e.stopPropagation()} data-testid={`question-author-link-${q.id}`}>{q.username}</Link>
                        <span>·</span>
                        <span>{new Date(q.created_at).toLocaleDateString('cs-CZ')}</span>
                        <span>·</span>
                        <span>{q.answers?.length || 0} odpovědí</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {canDelete && (
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); handleDelete(q.id); }}
                        className="p-1.5 rounded hover:bg-destructive/10 text-destructive/40 hover:text-destructive transition-colors"
                        data-testid={`${testIdPrefix}-delete-${q.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <div
                      className="cursor-pointer p-1"
                      onClick={() => setExpandedQ(expandedQ === q.id ? null : q.id)}
                    >
                      {expandedQ === q.id
                        ? <ChevronDown className={`w-4 h-4 ${accent.chevron}`} />
                        : <ChevronRight className="w-4 h-4 text-bloom-sub/50" />}
                    </div>
                  </div>
                </div>

                {/* Expanded answers + form */}
                {expandedQ === q.id && (
                  <div className="mt-3 border-t border-border pt-3 space-y-2" onClick={e => e.stopPropagation()}>
                    {q.answers?.length > 0 ? (
                      q.answers.map(a => (
                        <div key={a.id} className={`${accent.bubble} border rounded-lg p-3`}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <MessageSquare className={`w-3 h-3 ${accent.icon}`} />
                            <span className="text-xs text-bloom-sub">· {new Date(a.created_at).toLocaleDateString('cs-CZ')}</span>
                          </div>
                          <p className="text-sm text-bloom-text">{a.content}</p>
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <ExpertIdentity userId={a.user_id} username={a.username} userRole={a.user_role} specLabel={a.specialization_label} legalContext={legalContext} />
                            {user && isExpertAnswer(a) && (
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); handleThankAnswer(q.id, a.id); }}
                                disabled={!user?.email_verified}
                                title={!user?.email_verified ? 'Pro přispívání musíte ověřit e-mail' : ''}
                                className={`flex items-center gap-1 px-2 py-1 rounded-lg border border-border hover:border-current/50 hover:bg-current/5 transition-colors text-xs ${a.thanked_by?.includes(user.id) ? 'bg-current/10 ' + accent.icon : 'text-bloom-sub hover:' + accent.icon} ${!user?.email_verified ? 'opacity-50 cursor-not-allowed' : ''}`}
                                data-testid={`${testIdPrefix}-thank-${a.id}`}
                              >
                                🙏 Děkuji{(a.thanked_by?.length || 0) > 0 ? ` (${a.thanked_by.length})` : ''}
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-bloom-sub">Zatím žádné odpovědi.</p>
                    )}
                    {(canAnswer || allowAllReplies) && (
                      <div className="flex gap-2 mt-2">
                        <Textarea
                          value={answerTexts[q.id] || ''}
                          onChange={e => setAnswerTexts(prev => ({ ...prev, [q.id]: e.target.value }))}
                          placeholder="Napište odpověď..."
                          rows={2}
                          className="flex-1 text-sm"
                          data-testid={`${testIdPrefix}-answer-input-${q.id}`}
                          onClick={e => e.stopPropagation()}
                        />
                        <Button
                          type="button"
                          className={`${accent.btn} shrink-0`}
                          onClick={e => { e.stopPropagation(); handleSubmitAnswer(q.id); }}
                          disabled={!answerTexts[q.id]?.trim() || !user?.email_verified}
                          title={!user?.email_verified ? 'Pro přispívání musíte ověřit e-mail' : ''}
                          data-testid={`${testIdPrefix}-answer-submit-${q.id}`}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
