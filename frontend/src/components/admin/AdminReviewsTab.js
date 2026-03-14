import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Star, Trash2, Pencil, Check, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Card, CardContent } from '../ui/card';
import { StarRating } from './shared';
import { AdminSortControl, DATE_SORT_OPTIONS, sortByDate } from './AdminSortControl';

function EditReviewForm({ review, onSave, onCancel }) {
  const [content, setContent] = useState(review.content);
  const [rating, setRating] = useState(review.rating);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    onSave(review.id, { content, rating });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(r => (
          <button key={r} type="button" onClick={() => setRating(r)}>
            <Star className={`w-5 h-5 ${r <= rating ? 'text-bloom-pride-pink fill-bloom-pride-pink' : 'text-border'}`} />
          </button>
        ))}
      </div>
      <Textarea value={content} onChange={e => setContent(e.target.value)} rows={2} className="text-base md:text-sm" data-testid="edit-review-content" />
      <div className="flex gap-2">
        <Button type="submit" size="sm" className="bg-bloom-violet text-white h-7 text-xs" data-testid="save-review-btn">
          <Check className="w-3.5 h-3.5 mr-1" />Uložit
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} className="h-7 text-xs" data-testid="cancel-edit-review-btn">
          <X className="w-3.5 h-3.5 mr-1" />Zrušit
        </Button>
      </div>
    </form>
  );
}

export function AdminReviewsTab({ reviews, handleDeleteReview, handleUpdateReview }) {
  const [editingId, setEditingId] = useState(null);
  const [sortOrder, setSortOrder] = useState('date-desc');
  const sortedReviews = useMemo(() => sortByDate(reviews, sortOrder), [reviews, sortOrder]);

  const handleSave = (id, data) => {
    handleUpdateReview(id, data);
    setEditingId(null);
  };

  return reviews.length === 0 ? (
    <div className="text-center py-12">
      <Star className="w-8 h-8 text-border mx-auto mb-3" />
      <p className="text-sm text-bloom-sub">Žádné recenze k moderaci.</p>
    </div>
  ) : (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <AdminSortControl value={sortOrder} onChange={setSortOrder} options={DATE_SORT_OPTIONS} testId="reviews-sort" />
      </div>
      {sortedReviews.map(r => (
        <Card key={r.id} className="bg-white border-border/50" data-testid={`admin-review-${r.id}`}>
          <CardContent className="p-3">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Link to={`/users/${r.user_id}`} className="text-sm font-medium text-bloom-violet hover:underline" data-testid={`review-author-link-${r.id}`}>{r.username}</Link>
                  <StarRating rating={r.rating} />
                  <span className="text-xs text-bloom-sub">→</span>
                  <Link to={`/specialists`} className="text-xs text-bloom-violet hover:underline" data-testid={`review-specialist-link-${r.id}`}>{r.specialist_name}</Link>
                </div>
                {editingId === r.id ? (
                  <EditReviewForm review={r} onSave={handleSave} onCancel={() => setEditingId(null)} />
                ) : (
                  <>
                    <p className="text-xs text-bloom-sub/80 line-clamp-2">{r.content}</p>
                    <p className="text-xs text-bloom-sub mt-1">{new Date(r.created_at).toLocaleDateString('cs-CZ')}</p>
                  </>
                )}
              </div>
              {editingId !== r.id && (
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-bloom-sub hover:text-bloom-violet hover:bg-bloom-violet/10"
                    onClick={() => setEditingId(r.id)} data-testid={`edit-review-${r.id}`}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 h-8 w-8"
                    onClick={() => handleDeleteReview(r.id)} data-testid={`delete-review-${r.id}`}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
