import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flag, Check, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { AdminSortControl, SECTION_DATE_SORT_OPTIONS, sortByDate } from './AdminSortControl';

export function AdminReportsTab({ reports, handleResolveReport, handleDeleteReport }) {
  const [sortOrder, setSortOrder] = useState('date-desc');
  const sortedReports = useMemo(() => sortByDate(reports, sortOrder), [reports, sortOrder]);
  return (
    <div className="space-y-3">
      {reports.length === 0 && (
        <Card className="bg-white border-border/50">
          <CardContent className="p-8 text-center">
            <Flag className="w-8 h-8 text-bloom-sub/30 mx-auto mb-2" />
            <p className="text-sm text-bloom-sub">Žádná nahlášení</p>
          </CardContent>
        </Card>
      )}
      {sortedReports.length > 0 && (
        <div className="flex items-center justify-between mb-1">
          <AdminSortControl value={sortOrder} onChange={setSortOrder} options={SECTION_DATE_SORT_OPTIONS} testId="reports-sort" />
        </div>
      )}
      {sortedReports.map(r => (
        <Card key={r.id} className={`bg-white border-border/50 ${r.status === 'resolved' ? 'opacity-60' : ''}`} data-testid={`report-${r.id}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${r.status === 'open' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-bloom-sub'}`}>
                    {r.status === 'open' ? 'Otevřené' : 'Vyřešeno'}
                  </span>
                  <span className="text-xs font-medium text-bloom-text">Nahlášen: <Link to={`/users/${r.reported_user_id}`} className="text-bloom-violet hover:underline font-bold" data-testid={`report-reported-link-${r.id}`}>{r.reported_user_name}</Link></span>
                  <span className="text-xs text-bloom-sub">od: <Link to={`/users/${r.reporter_id}`} className="text-bloom-violet hover:underline" data-testid={`report-reporter-link-${r.id}`}>{r.reporter_name}</Link></span>
                </div>
                <p className="text-sm text-bloom-text mb-0.5">
                  <span className="font-medium">Důvod:</span> {r.reason}
                </p>
                {r.description && <p className="text-xs text-bloom-sub italic">"{r.description}"</p>}
                <p className="text-xs text-bloom-sub mt-1">{new Date(r.created_at).toLocaleString('cs-CZ')}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {r.status === 'open' && (
                  <Button
                    size="sm"
                    className="bg-bloom-mint text-white hover:bg-bloom-mint/90"
                    onClick={() => handleResolveReport(r.id)}
                    data-testid={`resolve-report-${r.id}`}
                  >
                    <Check className="w-4 h-4 mr-1" />Vyřešit
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => handleDeleteReport(r.id)}
                  data-testid={`delete-report-${r.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
