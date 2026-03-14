import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Trash2, RefreshCw, MapPin } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { getAvatarImage } from '../Layout';
import { AdminSortControl, DATE_SORT_OPTIONS, sortByDate } from './AdminSortControl';

export function AdminServicesTab({
  services, selectedService, setSelectedService,
  handleDeleteService, handleReactivateService,
}) {
  const navigate = useNavigate();
  const [sortOrder, setSortOrder] = useState('date-desc');
  const sortedServices = useMemo(() => sortByDate(services, sortOrder), [services, sortOrder]);

  return (
    <>
      {/* Service Detail Modal */}
      <Dialog open={!!selectedService} onOpenChange={() => setSelectedService(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-bloom-text">Detail nabídky</DialogTitle>
          </DialogHeader>
          {selectedService && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="cursor-pointer" onClick={() => { navigate(`/users/${selectedService.user_id}`); setSelectedService(null); }}>
                  <Avatar className="w-10 h-10 ring-2 ring-bloom-violet/20 hover:ring-bloom-violet transition-all">
                    <AvatarImage src={getAvatarImage(selectedService.avatar)} />
                    <AvatarFallback className="bg-bloom-violet text-white text-sm">{selectedService.username?.charAt(0)}</AvatarFallback>
                  </Avatar>
                </div>
                <div>
                  <button
                    className="text-sm font-semibold text-bloom-violet hover:underline"
                    onClick={() => { navigate(`/users/${selectedService.user_id}`); setSelectedService(null); }}
                    data-testid="service-detail-user-link"
                  >
                    {selectedService.username}
                  </button>
                  <p className="text-xs text-bloom-sub">{new Date(selectedService.created_at).toLocaleString('cs-CZ')}</p>
                </div>
                <div className="ml-auto">
                  {selectedService.location && (
                    <span className="px-2 py-1 rounded-full bg-bloom-violet/10 text-bloom-violet text-xs flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{selectedService.location}
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-bloom-pride-pink/5 border border-bloom-pride-pink/20">
                  <p className="text-xs font-medium text-bloom-pride-pink mb-1">Nabízí</p>
                  <p className="text-sm text-bloom-text">{selectedService.offer}</p>
                </div>
                <div className="p-3 rounded-lg bg-bloom-pride-blue/5 border border-bloom-pride-blue/20">
                  <p className="text-xs font-medium text-bloom-pride-blue mb-1">Hledá</p>
                  <p className="text-sm text-bloom-text">{selectedService.need}</p>
                </div>
              </div>
              {selectedService.description && (
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs font-medium text-bloom-sub mb-1">Popis</p>
                  <p className="text-sm text-bloom-text">{selectedService.description}</p>
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-bloom-sub pt-2 border-t border-border/50">
                <span>Expiruje: {selectedService.expires_at ? new Date(selectedService.expires_at).toLocaleDateString('cs-CZ') : 'Neomezeno'}</span>
                <span className={`px-2 py-0.5 rounded-full font-medium ${selectedService.service_status === 'active' ? 'bg-bloom-mint/10 text-bloom-mint' : 'bg-muted text-bloom-sub'}`}>
                  {selectedService.service_status === 'active' ? 'Aktivní' : selectedService.service_status}
                </span>
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <Button
                  variant="outline"
                  className="text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
                  onClick={() => { handleDeleteService(selectedService.id); setSelectedService(null); }}
                  data-testid="service-detail-delete-btn"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />Smazat
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {sortedServices.length === 0 ? (
        <div className="text-center py-12">
          <Briefcase className="w-8 h-8 text-border mx-auto mb-3" />
          <p className="text-sm text-bloom-sub">Žádné nabídky k moderaci.</p>
        </div>
      ) : (
        <>
        <div className="flex items-center justify-between mb-2">
          <AdminSortControl value={sortOrder} onChange={setSortOrder} options={DATE_SORT_OPTIONS} testId="services-sort" />
        </div>
        <div className="space-y-2">
          {sortedServices.map(s => {
            const isExpired = s.expires_at && new Date(s.expires_at) < new Date();
            return (
              <Card
                key={s.id}
                className={`bg-white border-border/50 cursor-pointer hover:border-bloom-violet/40 transition-colors ${isExpired ? 'opacity-70' : ''}`}
                data-testid={`admin-service-${s.id}`}
                onClick={() => setSelectedService(s)}
              >
                <CardContent className="p-3 flex items-start gap-3">
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarImage src={getAvatarImage(s.avatar)} />
                    <AvatarFallback className="bg-bloom-violet text-white text-xs">{s.username?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-sm font-medium text-bloom-text">{s.username}</p>
                      {s.location && <span className="text-xs text-bloom-violet">{s.location}</span>}
                      {isExpired ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">Expirováno</span>
                      ) : (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${s.service_status === 'active' ? 'bg-bloom-mint/10 text-bloom-mint' : 'bg-muted text-bloom-sub'}`}>
                          {s.service_status === 'active' ? 'Aktivní' : s.service_status}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-bloom-sub/80 line-clamp-1">
                      <span className="font-medium">Nabízí:</span> {s.offer} · <span className="font-medium">Hledá:</span> {s.need}
                    </p>
                    <p className="text-xs text-bloom-sub">
                      {new Date(s.created_at).toLocaleDateString('cs-CZ')}
                      {s.expires_at && (
                        <span className="ml-2 text-bloom-sub/60">
                          {isExpired ? 'Expirováno: ' : 'Expiruje: '}{new Date(s.expires_at).toLocaleDateString('cs-CZ')}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    {isExpired && (
                      <Button
                        variant="ghost" size="sm"
                        className="text-bloom-mint hover:bg-bloom-mint/10 h-8 text-xs"
                        onClick={() => handleReactivateService(s.id)}
                        data-testid={`reactivate-service-${s.id}`}
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-1" />Obnovit
                      </Button>
                    )}
                    <Button
                      variant="ghost" size="icon"
                      className="text-destructive hover:bg-destructive/10 h-8 w-8"
                      onClick={() => handleDeleteService(s.id)}
                      data-testid={`delete-service-${s.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        </>
      )}
    </>
  );
}
