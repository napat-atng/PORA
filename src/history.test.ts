import { describe, expect, it } from 'vitest';
import { defaultHistoryQuery, entryHistory, moneyTotal } from './history';
import type { Entry } from './domain';
const entries: Entry[] = [
  { id: 'opening', kind: 'opening', amount: 500000, date: '2026-09-30', note: 'ยอดตั้งต้น' },
  { id: 'income', kind: 'income', amount: 100000, date: '2026-10-01', note: 'เงินเดือน' },
  { id: 'food', kind: 'expense', amount: -5050, date: '2026-10-09', note: 'อาหาร' },
  { id: 'travel', kind: 'expense', amount: -2000, date: '2026-10-08', note: 'เดินทาง' },
  { id: 'adjustment', kind: 'adjustment', amount: -1000, date: '2026-10-08', note: 'ปรับยอด' }
];
describe('รายการย้อนหลัง', () => {
  it('แยกยอดตั้งต้นออกจากผลรวมเงินเข้าออกและเรียงกลุ่มวันล่าสุดก่อน', () => {
    const result = entryHistory(entries, defaultHistoryQuery, '2026-10-09');
    expect(result).toMatchObject({ income: 100000n, expense: 7050n, adjustment: -1000n, net: 91950n });
    expect(result.groups.map(([date]) => date)).toEqual(['2026-10-09', '2026-10-08', '2026-10-01', '2026-09-30']);
  });
  it('ค้นหาและกรองชนิด/ช่วงวันรวมวันต้นและท้าย', () => {
    const result = entryHistory(entries, { ...defaultHistoryQuery, kind: 'expense', search: ' อาหาร ', period: 'custom', start: '2026-10-09', end: '2026-10-09' }, '2026-10-09');
    expect(result.items.map(entry => entry.id)).toEqual(['food']);
    expect(result.expense).toBe(5050n);
  });
  it('เดือนนี้และเจ็ดวันล่าสุดใช้วันปฏิทิน', () => {
    expect(entryHistory(entries, { ...defaultHistoryQuery, period: 'month' }, '2026-10-09').items).toHaveLength(4);
    expect(entryHistory(entries, { ...defaultHistoryQuery, period: 'week' }, '2026-10-09').items).toHaveLength(3);
  });
  it('ไม่เสียสตางค์เมื่อยอดรวมเกิน safe integer', () => {
    expect(moneyTotal(9007199254740993n)).toBe('90,071,992,547,409.93');
    expect(moneyTotal(-29n)).toBe('-0.29');
  });
});
