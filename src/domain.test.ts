import { describe, expect, it } from 'vitest';
import { addDays, budget, createSnapshot, money, parseMoney, payBill, reconcile, removeBill, removeEntry, saveBill, saveEntry, today, undoBill, validateSnapshot } from './domain';
import { exportBackup, importBackup, key, load, persist, type Store } from './storage';
const date = today();
const fixture = () => {
  const state = createSnapshot(500000, addDays(date, 10), 100000, date);
  return saveBill(state, { id: 'bill', title: 'ค่าเช่า', amount: 200000, due: addDays(date, 3) });
};
describe('เงินเหลือใช้และบิล', () => {
  it('เหลือ 2,000 บาท และจ่ายบิลไม่หักซ้ำ', () => {
    const state = fixture(); const paid = payBill(state, 'bill', date);
    expect(budget(state, date)).toMatchObject({ available: 200000, daily: 20000, days: 10 });
    expect(budget(paid, date)).toMatchObject({ balance: 300000, billTotal: 0, available: 200000 });
    expect(payBill(paid, 'bill', date)).toBe(paid);
    expect(undoBill(paid, 'bill')).toEqual(state);
  });
  it('รวมบิลเลยกำหนด ไม่รวมบิลตรงวันเงินเข้า', () => {
    let state = fixture();
    state = saveBill(state, { id: 'old', title: 'บิลค้าง', amount: 50000, due: addDays(date, -3) });
    state = saveBill(state, { id: 'next', title: 'รอบหน้า', amount: 90000, due: state.nextIncomeDate });
    expect(budget(state, date).billTotal).toBe(250000);
  });
  it('คำนวณข้ามเดือนและปีตามวันปฏิทิน', () => {
    expect(budget(createSnapshot(100000, '2027-01-02', 0, '2026-12-31'), '2026-12-31').days).toBe(2);
    expect(budget(createSnapshot(100000, '2028-03-01', 0, '2028-02-28'), '2028-02-28').days).toBe(2);
    expect(today(new Date('2026-10-08T18:00:00Z'))).toBe('2026-10-09');
  });
  it('ปัดลงเป็นสตางค์ และไม่หารเมื่อถึงวันเงินเข้า', () => {
    const state = createSnapshot(10000, addDays(date, 3), 0, date);
    expect(budget(state, date).daily).toBe(3333);
    expect(budget(state, state.nextIncomeDate).daily).toBeNull();
    state.reserved = 20000;
    expect(budget(state, date)).toMatchObject({ available: -10000, daily: null });
  });
  it('แก้บิลที่จ่ายแล้วและรายจ่ายที่ผูกไว้พร้อมกัน', () => {
    const paid = payBill(fixture(), 'bill', date);
    const edited = saveBill(paid, { ...paid.bills[0], amount: 250000, title: 'ค่าเช่าใหม่' });
    expect(edited.entries[1]).toMatchObject({ amount: -250000, note: 'ค่าเช่าใหม่' });
    const viaEntry = saveEntry(edited, { ...edited.entries[1], amount: -180000, note: 'ค่าเช่าจริง' });
    expect(viaEntry.bills[0]).toMatchObject({ amount: 180000, title: 'ค่าเช่าจริง' });
    expect(validateSnapshot(viaEntry, date)).toEqual(viaEntry);
  });
  it('ลบรายจ่ายที่ผูกบิลจะกลับเป็นค้างจ่าย ลบบิลจะลบการจ่ายที่ผูกไว้', () => {
    const state = fixture(); const paid = payBill(state, 'bill', date);
    expect(removeEntry(paid, paid.bills[0].paidEntryId!)).toEqual(state);
    const removed = removeBill(paid, 'bill');
    expect(budget(removed, date)).toMatchObject({ balance: 500000, billTotal: 0, available: 400000 });
  });
  it('ปรับเงินจริงด้วยผลต่างเท่านั้น และยอดเท่าเดิมไม่สร้างรายการ', () => {
    const state = fixture(); const adjusted = reconcile(state, 420000, date);
    expect(adjusted.entries[1].amount).toBe(-80000);
    expect(budget(adjusted).balance).toBe(420000);
    expect(reconcile(adjusted, 420000, date)).toBe(adjusted);
  });
  it('ตรวจจำนวนเงินและวันที่', () => {
    expect(parseMoney('0.29')).toBe(29); expect(money(29)).toBe('0.29');
    for (const invalid of ['NaN', '1e3', '-10', '1.234', '1,000']) expect(() => parseMoney(invalid)).toThrow();
    expect(() => createSnapshot(10000, date, 0, date)).toThrow();
  });
});
describe('ข้อมูลสำรองและพื้นที่เก็บข้อมูล', () => {
  const memory = (): Store => { const data = new Map<string, string>(); return { getItem: k => data.get(k) ?? null, setItem: (k, v) => { data.set(k, v); }, removeItem: k => { data.delete(k); } }; };
  it('บันทึกแล้วโหลดกลับ และแยกตัวอย่างจากส่วนตัว', () => {
    const store = memory(); const state = persist('personal', fixture(), null, store);
    expect(load('personal', store)).toEqual(state); expect(load('sample', store)).toBeNull();
    expect(importBackup(exportBackup(state))).toEqual(state);
  });
  it('ปฏิเสธไฟล์ผิดเวอร์ชัน ผิดชนิดข้อมูล และบิลที่เชื่อมไม่ครบ', () => {
    expect(() => importBackup('not json')).toThrow();
    expect(() => importBackup('{"app":"other"}')).toThrow();
    for (const invalid of [{ ...fixture(), version: 2 }, { ...fixture(), reserved: -1 }, { ...fixture(), reserved: '0' }, { ...fixture(), nextIncomeDate: '2026-02-30' }, { ...fixture(), entries: [] }]) expect(() => validateSnapshot(invalid)).toThrow();
    const paid = payBill(fixture(), 'bill'); paid.entries.pop();
    expect(() => validateSnapshot(paid)).toThrow();
    const future = fixture(); future.entries[0].date = addDays(date, 1); expect(() => validateSnapshot(future)).toThrow();
  });
  it('ปฏิเสธรหัสซ้ำ ตัวเลขไม่ปลอดภัย และรายจ่ายชนิดผิด', () => {
    const state = fixture(); state.entries.push({ ...state.entries[0] }); expect(() => validateSnapshot(state)).toThrow();
    const wrong = fixture(); wrong.entries.push({ id: 'bad', kind: 'expense', amount: 100, date, note: 'ผิด' }); expect(() => validateSnapshot(wrong)).toThrow();
    expect(() => validateSnapshot({ ...fixture(), reserved: Number.MAX_SAFE_INTEGER + 1 })).toThrow();
  });
  it('เก็บข้อมูลเดิมเมื่อพื้นที่เต็มหรือไฟล์เสีย', () => {
    const store = memory(); const saved = persist('personal', fixture(), null, store);
    const denied = { ...store, setItem: () => { throw new Error('QuotaExceededError'); } };
    expect(() => persist('personal', reconcile(saved, 600000), saved, denied)).toThrow('บันทึกไม่สำเร็จ');
    expect(load('personal', store)).toEqual(saved);
    expect(() => importBackup('{}')).toThrow(); expect(load('personal', store)).toEqual(saved);
  });
  it('ไม่เขียนทับข้อมูลใหม่จากอีกแท็บ', () => {
    const store = memory(); const saved = persist('personal', fixture(), null, store);
    store.setItem(key('personal'), JSON.stringify(reconcile(saved, 600000)));
    expect(() => persist('personal', saved, saved, store)).toThrow('อีกแท็บ');
  });
});
