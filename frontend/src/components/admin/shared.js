import { Star } from 'lucide-react';
import { API } from '../../lib/api';

export { API };

export const roleLabels = {
  user: 'Uživatel', admin: 'Administrátor', superadmin: 'Superadministrátor', lawyer: 'Právník',
  specialist: 'Ověřený specialista', banned: 'Zablokovaný',
};

export const roleColors = {
  user: 'bg-muted text-bloom-sub',
  admin: 'bg-bloom-violet/10 text-bloom-violet',
  superadmin: 'bg-bloom-violet/20 text-bloom-violet border border-bloom-violet/40',
  lawyer: 'bg-amber-100 text-amber-700',
  specialist: 'bg-emerald-100 text-emerald-700',
  banned: 'bg-destructive/10 text-destructive',
};

export const StarRating = ({ rating }) => (
  <div className="flex">
    {[...Array(5)].map((_, i) => (
      <Star key={i} className={`w-3.5 h-3.5 ${i < rating ? 'text-bloom-pride-pink fill-bloom-pride-pink' : 'text-border'}`} />
    ))}
  </div>
);
