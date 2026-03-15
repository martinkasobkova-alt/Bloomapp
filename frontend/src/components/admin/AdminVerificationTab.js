import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { safeUrlForHref } from '../../lib/api';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { BadgeCheck, Clock, CheckCircle, XCircle } from 'lucide-react';
import { AdminSortControl, SECTION_DATE_SORT_OPTIONS, sortByDate } from './AdminSortControl';

const STATUS_LABELS = { pending: 'Čeká na vyřízení', approved: 'Schváleno', reviewed: 'Zpracováno', rejected: 'Zamítnuto' };
const ROLE_LABELS = { specialist: 'Ověřený odborník', lawyer: 'Ověřený právník' };

// Helper – handle both old (request_type/specialization) and new field names
function reqField(req, newKey, oldKey, fallback = '—') {
  return req[newKey] || req[oldKey] || fallback;
}

export function AdminVerificationTab({ requests = [], onUpdateStatus }) {
  const pending = requests.filter(r => r.status === 'pending');
  const done = requests.filter(r => r.status !== 'pending');
  const [changingRole, setChangingRole] = useState({});
  const [sortOrder, setSortOrder] = useState('date-desc');
  const sortedPending = useMemo(() => sortByDate(pending, sortOrder), [pending, sortOrder]);
  const sortedDone = useMemo(() => sortByDate(done, sortOrder), [done, sortOrder]);

  const RequestCard = ({ req }) => {
    const requestedRole = reqField(req, 'requested_role', 'request_type');
    const specText = reqField(req, 'specialization_text', 'specialization');
    const isProcessed = req.status !== 'pending';
    const selectedRole = changingRole[req.id] || requestedRole;

    return (
    <Card key={req.id} className="mb-3" data-testid={`verification-request-${req.id}`}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <BadgeCheck className="w-4 h-4 text-bloom-violet shrink-0" />
            <div>
              <Link to={`/users/${req.user_id}`} className="font-semibold text-sm text-bloom-violet hover:underline underline-offset-2" data-testid={`verification-user-link-${req.id}`}>
                @{req.username}
              </Link>
              <p className="text-xs text-bloom-sub">{req.email}</p>
            </div>
          </div>
          <Badge variant="outline" className={`shrink-0 text-xs ${req.status === 'pending' ? 'border-amber-400 text-amber-700' : (req.status === 'approved' || req.status === 'reviewed') ? 'border-emerald-400 text-emerald-700' : 'border-red-400 text-red-700'}`}>
            {STATUS_LABELS[req.status] || req.status}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-bloom-sub bg-muted/40 rounded-lg p-3">
          <span><strong>Požadovaná role:</strong> {ROLE_LABELS[requestedRole] || requestedRole}</span>
          <span><strong>Specializace:</strong> {specText}</span>
          {req.profile_link && (
            <span className="col-span-2"><strong>Profesní profil:</strong>{' '}
              {safeUrlForHref(req.profile_link) ? (
                <a href={safeUrlForHref(req.profile_link)} target="_blank" rel="noopener noreferrer" className="text-bloom-violet hover:underline">{req.profile_link}</a>
              ) : (
                <span className="text-bloom-sub">{req.profile_link}</span>
              )}
            </span>
          )}
          {(req.message || req.intro) && <span className="col-span-2"><strong>Zpráva:</strong> {req.message || req.intro}</span>}
          {(req.workplace || req.contact) && <span className="col-span-2 text-bloom-sub/70">{[req.workplace, req.contact].filter(Boolean).join(' · ')}</span>}
          <span className="col-span-2 text-bloom-sub/60">{new Date(req.created_at).toLocaleString('cs-CZ')}</span>
        </div>

        {/* Role selector + action buttons — always visible */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {/* Role selector */}
          <select
            value={selectedRole}
            onChange={e => setChangingRole(prev => ({ ...prev, [req.id]: e.target.value }))}
            className="px-2 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-bloom-violet"
            data-testid={`verification-role-select-${req.id}`}
          >
            <option value="specialist">Ověřený odborník</option>
            <option value="lawyer">Ověřený právník</option>
          </select>

          <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs"
            onClick={() => onUpdateStatus(req.id, 'approved', selectedRole)} data-testid={`verify-approve-${req.id}`}>
            <CheckCircle className="w-3.5 h-3.5 mr-1" />
            {isProcessed && req.status === 'approved' ? 'Změnit roli' : 'Schválit'}
          </Button>
          <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50 text-xs"
            onClick={() => onUpdateStatus(req.id, 'rejected')} data-testid={`verify-reject-${req.id}`}>
            <XCircle className="w-3.5 h-3.5 mr-1" />Zamítnout
          </Button>

          {isProcessed && (
            <span className="text-[10px] text-bloom-sub/60 ml-1">
              (Aktuální: {STATUS_LABELS[req.status]}{req.status === 'approved' ? ` → ${ROLE_LABELS[requestedRole] || requestedRole}` : ''})
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
  };

  return (
    <div data-testid="verification-tab">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500" />
          <h3 className="font-semibold text-bloom-text text-sm">Čekající žádosti ({pending.length})</h3>
        </div>
        <AdminSortControl value={sortOrder} onChange={setSortOrder} options={SECTION_DATE_SORT_OPTIONS} testId="verification-sort" />
      </div>
      {sortedPending.length === 0 ? (
        <p className="text-sm text-bloom-sub mb-6">Žádné čekající žádosti.</p>
      ) : (
        sortedPending.map(r => <RequestCard key={r.id} req={r} />)
      )}
      {sortedDone.length > 0 && (
        <>
          <h3 className="font-semibold text-bloom-text text-sm mb-3 mt-6">Vyřízené žádosti ({done.length})</h3>
          {sortedDone.map(r => <RequestCard key={r.id} req={r} />)}
        </>
      )}
    </div>
  );
}
