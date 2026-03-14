import React from 'react';
import { Star, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';

export function FeaturedItemsCard({
  featuredItems,
  specialists,
  news,
  handleToggleFeatured,
  handleMoveFeatured,
  fetchFeaturedItems,
}) {
  const featuredSpecs = featuredItems.filter(f => f.type === 'specialist').sort((a, b) => a.order - b.order);
  const featuredNews = featuredItems.filter(f => f.type === 'news').sort((a, b) => a.order - b.order);

  return (
    <Card className="bg-white border-border/50 md:col-span-2" data-testid="featured-items-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-bloom-text flex items-center gap-2">
            <Star className="w-4 h-4 text-bloom-pride-pink" />Doporučené na homepage
          </CardTitle>
          <Button size="sm" variant="outline" onClick={fetchFeaturedItems} className="text-xs border-bloom-violet/30 text-bloom-violet" data-testid="refresh-featured-btn">Obnovit</Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-bloom-sub mb-3">Vybrané odborníky a aktuality se zobrazí na domovské stránce v sekci Doporučeno. Max 3 od každého typu.</p>
        <div className="space-y-4">

          {/* Featured specialists */}
          <div>
            <p className="text-xs font-semibold text-bloom-sub uppercase tracking-wider mb-2">
              Odborníci ({featuredSpecs.length}/3)
            </p>
            {featuredSpecs.length > 0 && (
              <div className="mb-2 space-y-1">
                <p className="text-[10px] text-bloom-sub/60 uppercase tracking-wide mb-1">Aktuální pořadí</p>
                {featuredSpecs.map((fi, idx, arr) => (
                  <div key={fi.id} className="flex items-center gap-1.5 p-1.5 bg-bloom-pride-pink/10 border border-bloom-pride-pink/20 rounded-lg" data-testid={`featured-order-spec-${fi.data?.id}`}>
                    <span className="text-xs font-bold text-bloom-pride-pink w-4">{idx + 1}.</span>
                    <span className="text-xs text-bloom-text flex-1 truncate">{fi.data?.name}</span>
                    <button onClick={() => handleMoveFeatured('specialist', idx, -1)} disabled={idx === 0} className="p-0.5 rounded hover:bg-bloom-pride-pink/20 disabled:opacity-30" data-testid={`move-up-spec-${fi.data?.id}`}><ArrowUp className="w-3 h-3 text-bloom-pride-pink" /></button>
                    <button onClick={() => handleMoveFeatured('specialist', idx, 1)} disabled={idx === arr.length - 1} className="p-0.5 rounded hover:bg-bloom-pride-pink/20 disabled:opacity-30" data-testid={`move-down-spec-${fi.data?.id}`}><ArrowDown className="w-3 h-3 text-bloom-pride-pink" /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-1.5 max-h-40 overflow-y-auto mb-2">
              {specialists.filter(s => s.status === 'approved').map(s => {
                const isFeatured = featuredItems.some(f => f.type === 'specialist' && f.data?.id === s.id);
                return (
                  <div key={s.id} className={`flex items-center gap-2 p-2 rounded-lg ${isFeatured ? 'bg-bloom-pride-pink/10 border border-bloom-pride-pink/20' : 'bg-muted/30'}`} data-testid={`featured-spec-${s.id}`}>
                    <span className="text-sm text-bloom-text flex-1 truncate">{s.name}</span>
                    <span className="text-xs text-bloom-sub">{s.city}</span>
                    <Button
                      size="sm"
                      variant={isFeatured ? "default" : "outline"}
                      className={`h-6 text-[10px] px-2 ${isFeatured ? 'bg-bloom-pride-pink text-white border-0' : 'border-bloom-pride-pink/40 text-bloom-pride-pink'}`}
                      onClick={() => handleToggleFeatured('specialist', s.id)}
                      data-testid={`toggle-featured-spec-${s.id}`}
                    >
                      {isFeatured ? '★ Doporučeno' : '☆ Doporučit'}
                    </Button>
                  </div>
                );
              })}
              {specialists.filter(s => s.status === 'approved').length === 0 && (
                <p className="text-xs text-bloom-sub/60 italic">Žádní schválení odborníci</p>
              )}
            </div>
          </div>

          {/* Featured news */}
          <div>
            <p className="text-xs font-semibold text-bloom-sub uppercase tracking-wider mb-2">
              Aktuality ({featuredNews.length}/3)
            </p>
            {featuredNews.length > 0 && (
              <div className="mb-2 space-y-1">
                <p className="text-[10px] text-bloom-sub/60 uppercase tracking-wide mb-1">Aktuální pořadí</p>
                {featuredNews.map((fi, idx, arr) => (
                  <div key={fi.id} className="flex items-center gap-1.5 p-1.5 bg-bloom-violet/10 border border-bloom-violet/20 rounded-lg" data-testid={`featured-order-news-${fi.data?.id}`}>
                    <span className="text-xs font-bold text-bloom-violet w-4">{idx + 1}.</span>
                    <span className="text-xs text-bloom-text flex-1 truncate">{fi.data?.title}</span>
                    <button onClick={() => handleMoveFeatured('news', idx, -1)} disabled={idx === 0} className="p-0.5 rounded hover:bg-bloom-violet/20 disabled:opacity-30" data-testid={`move-up-news-${fi.data?.id}`}><ArrowUp className="w-3 h-3 text-bloom-violet" /></button>
                    <button onClick={() => handleMoveFeatured('news', idx, 1)} disabled={idx === arr.length - 1} className="p-0.5 rounded hover:bg-bloom-violet/20 disabled:opacity-30" data-testid={`move-down-news-${fi.data?.id}`}><ArrowDown className="w-3 h-3 text-bloom-violet" /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {news.map(n => {
                const isFeatured = featuredItems.some(f => f.type === 'news' && f.data?.id === n.id);
                return (
                  <div key={n.id} className={`flex items-center gap-2 p-2 rounded-lg ${isFeatured ? 'bg-bloom-violet/10 border border-bloom-violet/20' : 'bg-muted/30'}`} data-testid={`featured-news-${n.id}`}>
                    <span className="text-sm text-bloom-text flex-1 truncate">{n.title}</span>
                    <Button
                      size="sm"
                      variant={isFeatured ? "default" : "outline"}
                      className={`h-6 text-[10px] px-2 ${isFeatured ? 'bg-bloom-violet text-white border-0' : 'border-bloom-violet/40 text-bloom-violet'}`}
                      onClick={() => handleToggleFeatured('news', n.id)}
                      data-testid={`toggle-featured-news-${n.id}`}
                    >
                      {isFeatured ? '★ Doporučeno' : '☆ Doporučit'}
                    </Button>
                  </div>
                );
              })}
              {news.length === 0 && <p className="text-xs text-bloom-sub/60 italic">Žádné aktuality</p>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
