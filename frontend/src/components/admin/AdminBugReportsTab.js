import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { AdminSortControl, SECTION_DATE_SORT_OPTIONS, sortByDate } from './AdminSortControl';

export function AdminBugReportsTab({ bugReports, expandedBugReport, setExpandedBugReport, handleUpdateBugStatus, handleDeleteBugReport }) {
  const [sortOrder, setSortOrder] = useState('date-desc');
  const sortedReports = useMemo(() => sortByDate(bugReports, sortOrder), [bugReports, sortOrder]);
  const statusColors = { new: 'bg-destructive/10 text-destructive', investigating: 'bg-amber-100 text-amber-700', fixed: 'bg-emerald-100 text-emerald-700' };
  const statusLabels = { new: 'Nové', investigating: 'Řeší se', fixed: 'Vyřešeno' };
  const typeLabels = { app_error: 'Chyba v aplikaci', not_working: 'Něco nefunguje', suggestion: 'Návrh zlepšení', security: 'Bezpečnostní problém', other: 'Jiný problém' };

  return (
    <div className="space-y-3">
      {bugReports.length > 0 && (
        <div className="flex items-center justify-between mb-1">
          <AdminSortControl value={sortOrder} onChange={setSortOrder} options={SECTION_DATE_SORT_OPTIONS} testId="bugs-sort" />
        </div>
      )}
      {sortedReports.length === 0 && (
        <p className="text-sm text-bloom-sub text-center py-8">Žádná hlášení.</p>
      )}
      {sortedReports.map(r => {
        const isExpanded = expandedBugReport === r.id;
        return (
          <Card key={r.id} className="bg-white border-border/50" data-testid={`bug-report-${r.id}`}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${statusColors[r.status] || 'bg-muted text-bloom-sub'}`}>{statusLabels[r.status] || r.status}</span>
                    <span className="text-xs font-medium text-bloom-text">{typeLabels[r.report_type] || r.report_type}</span>
                    <span className="text-xs text-bloom-sub">· <Link to={`/users/${r.user_id}`} className="text-bloom-violet hover:underline" data-testid={`bug-user-link-${r.id}`}>{r.username}</Link></span>
                    <span className="text-xs text-bloom-sub/60">{new Date(r.created_at).toLocaleDateString('cs-CZ')}</span>
                  </div>
                  <p className="text-sm text-bloom-text mt-1 line-clamp-2">{r.description}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost" className="text-bloom-sub text-xs" onClick={() => setExpandedBugReport(isExpanded ? null : r.id)}>
                    {isExpanded ? 'Skrýt' : 'Detail'}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 p-1.5"
                    onClick={() => handleDeleteBugReport(r.id)}
                    data-testid={`delete-bug-report-${r.id}`}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {isExpanded && (
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <p className="text-xs text-bloom-sub"><span className="font-medium">Stránka:</span> {r.page_url}</p>
                  <p className="text-xs text-bloom-sub break-all"><span className="font-medium">Prohlížeč:</span> {r.browser_info}</p>
                  <div className="flex gap-2 pt-1">
                    {['new', 'investigating', 'fixed'].map(s => (
                      <Button
                        key={s}
                        size="sm"
                        variant={r.status === s ? 'default' : 'outline'}
                        className={`text-xs h-7 ${r.status === s ? 'bg-bloom-violet text-white' : 'border-bloom-violet/30 text-bloom-violet'}`}
                        onClick={() => handleUpdateBugStatus(r.id, s)}
                        data-testid={`bug-status-${s}-${r.id}`}
                      >
                        {statusLabels[s]}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
