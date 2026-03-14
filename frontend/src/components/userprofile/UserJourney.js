import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Heart, Briefcase, MapPin, Tag } from 'lucide-react';

export function UserJourney({ services }) {
  return (
    <div className="space-y-4">
      <h2 className="font-serif text-xl font-semibold text-bloom-text flex items-center gap-2">
        <Briefcase className="w-5 h-5 text-bloom-violet" />
        Nabídky a poptávky
      </h2>
      {!services || services.length === 0 ? (
        <Card className="bg-white border-border/50">
          <CardContent className="p-8 text-center">
            <Heart className="w-8 h-8 text-bloom-pride-pink/30 mx-auto mb-2" />
            <p className="text-sm text-bloom-sub">Žádné nabídky</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {services.map(s => {
            const isExpired = s.expires_at && new Date(s.expires_at) < new Date();
            return (
              <Card key={s.id} className={`bg-white border-border/50 ${isExpired ? 'opacity-70' : ''}`} data-testid={`profile-service-${s.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${s.post_type === 'request' ? 'bg-bloom-pride-blue/10 text-bloom-pride-blue' : 'bg-bloom-pride-pink/10 text-bloom-pride-pink'}`}>
                      {s.post_type === 'request' ? 'Poptávka' : 'Nabídka'}
                    </span>
                    {isExpired && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-600">Expirováno</span>
                    )}
                    {s.location && (
                      <span className="text-xs text-bloom-sub flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-bloom-violet" />{s.location}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <span className="px-2 py-0.5 rounded-full bg-bloom-pride-pink/10 text-bloom-pride-pink text-xs font-medium">
                      <Tag className="w-2.5 h-2.5 inline mr-1" />Nabízím: {s.offer}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-bloom-pride-blue/10 text-bloom-pride-blue text-xs font-medium">
                      <Tag className="w-2.5 h-2.5 inline mr-1" />Hledám: {s.need}
                    </span>
                  </div>
                  <p className="text-sm text-bloom-sub line-clamp-2">{s.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
