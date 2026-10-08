import { addDays, type Entry } from './domain';

export interface HistoryQuery { search: string; kind: 'all' | Entry['kind']; period: 'all' | 'month' | 'week' | 'custom'; start: string; end: string }
export const defaultHistoryQuery: HistoryQuery = { search: '', kind: 'all', period: 'all', start: '', end: '' };
export function entryHistory(entries: Entry[], query: HistoryQuery, currentDate: string) {
  const start = query.period === 'month' ? `${currentDate.slice(0, 7)}-01` : query.period === 'week' ? addDays(currentDate, -6) : query.period === 'custom' ? query.start : '';
  const end = query.period === 'custom' && query.end ? query.end : currentDate;
  const search = query.search.trim().toLocaleLowerCase('th');
  const items = entries.filter(entry => (!start || entry.date >= start) && entry.date <= end && (query.kind === 'all' || entry.kind === query.kind) && entry.note.toLocaleLowerCase('th').includes(search));
  const totals = { income: 0n, expense: 0n, adjustment: 0n };
  const groups = new Map<string, Entry[]>();
  for (const entry of items) {
    if (entry.kind === 'income') totals.income += BigInt(entry.amount);
    if (entry.kind === 'expense') totals.expense -= BigInt(entry.amount);
    if (entry.kind === 'adjustment') totals.adjustment += BigInt(entry.amount);
    const group = groups.get(entry.date) ?? [];
    group.push(entry); groups.set(entry.date, group);
  }
  return { items, groups: [...groups].sort(([a], [b]) => b.localeCompare(a)), ...totals, net: totals.income - totals.expense + totals.adjustment };
}
export function moneyTotal(value: bigint) {
  const absolute = value < 0n ? -value : value;
  return `${value < 0n ? '-' : ''}${new Intl.NumberFormat('th-TH').format(absolute / 100n)}.${String(absolute % 100n).padStart(2, '0')}`;
}
