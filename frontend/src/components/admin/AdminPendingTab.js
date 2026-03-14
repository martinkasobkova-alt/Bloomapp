import React from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

export function AdminPendingTab({ pendingSpecialists, handleApproveSpecialist, handleRejectSpecialist }) {
  return pendingSpecialists.length === 0 ? (
    <div className="text-center py-12">
      <Check className="w-8 h-8 text-bloom-mint mx-auto mb-2" />
      <p className="text-sm text-bloom-sub">Žádní odborníci ke schválení.</p>
    </div>
  ) : (
    <div className="space-y-3">
      {pendingSpecialists.map(s => (
        <Card key={s.id} className="bg-white border-amber-200" data-testid={`pending-specialist-${s.id}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="font-semibold text-bloom-text">{s.name}</p>
                <p className="text-xs text-bloom-violet">{s.specialty}</p>
                <p className="text-xs text-bloom-sub mt-0.5">{s.address}, {s.city} · {s.country}</p>
                {s.description && <p className="text-xs text-bloom-sub mt-1 italic">{s.description}</p>}
                {s.submitted_by_name && <p className="text-xs text-bloom-sub mt-1">Navrhl/a: {s.submitted_by_name}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" className="bg-bloom-mint text-white hover:bg-bloom-mint/90" onClick={() => handleApproveSpecialist(s.id)} data-testid={`approve-specialist-${s.id}`}>
                  <Check className="w-4 h-4 mr-1" />Schválit
                </Button>
                <Button size="sm" variant="outline" className="border-destructive text-destructive hover:bg-destructive/10" onClick={() => handleRejectSpecialist(s.id)} data-testid={`reject-specialist-${s.id}`}>
                  <X className="w-4 h-4 mr-1" />Zamítnout
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
