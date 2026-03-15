import React from 'react';
import { ArrowUpDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export function AdminSortControl({ value, onChange, options, testId }) {
  return (
    <div className="flex items-center gap-2" data-testid={testId || 'admin-sort-control'}>
      <ArrowUpDown className="w-3.5 h-3.5 text-bloom-sub shrink-0" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-[160px] text-base md:text-xs border-border/60 bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export const NAME_SORT_OPTIONS = [
  { value: 'name-asc', label: 'Jméno A–Z' },
  { value: 'name-desc', label: 'Jméno Z–A' },
];

export const USER_SORT_OPTIONS = [
  { value: 'name-asc', label: 'Jméno A–Z' },
  { value: 'name-desc', label: 'Jméno Z–A' },
  { value: 'date-desc', label: 'Data registrace – nejnovější' },
  { value: 'date-asc', label: 'Data registrace – nejstarší' },
];

export const DATE_SORT_OPTIONS = [
  { value: 'date-desc', label: 'Nejnovější' },
  { value: 'date-asc', label: 'Nejstarší' },
];

/** Řazení podle data s explicitním popisem – pro všechny sekce */
export const DATE_SORT_OPTIONS_LABELLED = [
  { value: 'date-desc', label: 'Data – nejnovější' },
  { value: 'date-asc', label: 'Data – nejstarší' },
];

/** Odborníci: jméno + datum přidání */
export const SPECIALIST_SORT_OPTIONS = [
  { value: 'name-asc', label: 'Jméno A–Z' },
  { value: 'name-desc', label: 'Jméno Z–A' },
  { value: 'date-desc', label: 'Data – nejnovější' },
  { value: 'date-asc', label: 'Data – nejstarší' },
];

/** Aktuality: název + datum */
export const NEWS_SORT_OPTIONS = [
  { value: 'name-asc', label: 'Název A–Z' },
  { value: 'name-desc', label: 'Název Z–A' },
  { value: 'date-desc', label: 'Data – nejnovější' },
  { value: 'date-asc', label: 'Data – nejstarší' },
];

/** Recenze, Nabídky, Nahlášení, Bug reports, Ověření, Ke schválení: datum (s popisem) */
export const SECTION_DATE_SORT_OPTIONS = [
  { value: 'date-desc', label: 'Data – nejnovější' },
  { value: 'date-asc', label: 'Data – nejstarší' },
];

export function sortByName(items, order, nameField = 'username') {
  return [...items].sort((a, b) => {
    const nameA = (a[nameField] || '').toLowerCase();
    const nameB = (b[nameField] || '').toLowerCase();
    return order === 'name-asc' ? nameA.localeCompare(nameB, 'cs') : nameB.localeCompare(nameA, 'cs');
  });
}

export function sortByDate(items, order, dateField = 'created_at') {
  return [...items].sort((a, b) => {
    const dA = new Date(a[dateField] || 0);
    const dB = new Date(b[dateField] || 0);
    return order === 'date-asc' ? dA - dB : dB - dA;
  });
}
