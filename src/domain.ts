export type Mode = 'personal' | 'sample';
export type EntryKind = 'opening' | 'income' | 'expense' | 'adjustment';
export interface Entry { id: string; kind: EntryKind; amount: number; date: string; note: string; billId?: string }
export interface Bill { id: string; title: string; amount: number; due: string; paidEntryId?: string }
export interface Snapshot { version: 1; updatedAt: string; nextIncomeDate: string; reserved: number; entries: Entry[]; bills: Bill[] }
const MAX = 1_000_000_000_000;
export const id = () => crypto.randomUUID();
export function today(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}
export function daysBetween(a: string, b: string): number { return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000); }
export function money(amount: number): string { return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount / 100); }
export function dateLabel(date: string): string { return new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Bangkok' }).format(new Date(`${date}T00:00:00+07:00`)); }
export function parseMoney(value: string, signed = false): number {
  if (!(signed ? /^-?\d+(\.\d{1,2})?$/ : /^\d+(\.\d{1,2})?$/).test(value.trim())) throw new Error('ใส่จำนวนเงินเป็นตัวเลข ทศนิยมไม่เกิน 2 ตำแหน่ง');
  const amount = Math.round(Number(value) * 100);
  if (!Number.isSafeInteger(amount) || Math.abs(amount) > MAX) throw new Error('จำนวนเงินมากเกินขอบเขตที่รองรับ');
  return amount;
}
export function budget(state: Snapshot, currentDate = today()) {
  const balance = state.entries.reduce((sum, entry) => sum + entry.amount, 0);
  const pending = state.bills.filter(b => !b.paidEntryId && b.due < state.nextIncomeDate);
  const billTotal = pending.reduce((sum, b) => sum + b.amount, 0);
  const available = balance - billTotal - state.reserved;
  const days = Math.max(0, daysBetween(currentDate, state.nextIncomeDate));
  return { balance, billTotal, available, days, daily: days > 0 && available >= 0 ? Math.floor(available / days) : null, pending };
}
export function createSnapshot(balance: number, nextIncomeDate: string, reserved: number, currentDate = today()): Snapshot {
  if (!validDate(nextIncomeDate) || nextIncomeDate <= currentDate) throw new Error('วันเงินเข้าต้องเป็นวันหลังจากวันนี้');
  return { version: 1, updatedAt: new Date().toISOString(), nextIncomeDate, reserved, entries: [{ id: id(), kind: 'opening', amount: balance, date: currentDate, note: 'ยอดตั้งต้น' }], bills: [] };
}
export function createSample(currentDate = today()): Snapshot {
  const state = createSnapshot(1850000, addDays(currentDate, 12), 300000, currentDate);
  state.entries.push({ id: id(), kind: 'expense', amount: -8500, date: currentDate, note: 'กาแฟและขนม' }, { id: id(), kind: 'expense', amount: -12000, date: addDays(currentDate, -1), note: 'มื้อกลางวัน' }, { id: id(), kind: 'income', amount: 150000, date: addDays(currentDate, -2), note: 'รายได้เสริม' });
  state.bills.push({ id: id(), title: 'ค่าเช่าห้อง', amount: 650000, due: addDays(currentDate, 5) }, { id: id(), title: 'ค่าอินเทอร์เน็ต', amount: 59900, due: addDays(currentDate, 3) }, { id: id(), title: 'ค่าโทรศัพท์', amount: 39900, due: addDays(currentDate, -1) });
  return state;
}
export function payBill(state: Snapshot, billId: string, date = today()): Snapshot {
  const bill = state.bills.find(b => b.id === billId);
  if (!bill) throw new Error('ไม่พบบิลนี้');
  if (bill.paidEntryId) return state;
  const entryId = id();
  return { ...state, bills: state.bills.map(b => b.id === billId ? { ...b, paidEntryId: entryId } : b), entries: [...state.entries, { id: entryId, kind: 'expense', amount: -bill.amount, date, note: bill.title, billId }] };
}
export function undoBill(state: Snapshot, billId: string): Snapshot {
  const bill = state.bills.find(b => b.id === billId);
  return { ...state, bills: state.bills.map(b => b.id === billId ? { ...b, paidEntryId: undefined } : b), entries: state.entries.filter(e => e.id !== bill?.paidEntryId) };
}
export function saveBill(state: Snapshot, bill: Bill): Snapshot {
  const existing = state.bills.find(b => b.id === bill.id);
  const next = { ...bill, paidEntryId: existing?.paidEntryId };
  return { ...state, bills: existing ? state.bills.map(b => b.id === bill.id ? next : b) : [...state.bills, next], entries: state.entries.map(e => e.id === existing?.paidEntryId ? { ...e, amount: -bill.amount, note: bill.title } : e) };
}
export function saveEntry(state: Snapshot, entry: Entry): Snapshot {
  const exists = state.entries.some(e => e.id === entry.id);
  return { ...state, entries: exists ? state.entries.map(e => e.id === entry.id ? entry : e) : [...state.entries, entry], bills: state.bills.map(b => b.id === entry.billId ? { ...b, amount: -entry.amount, title: entry.note } : b) };
}
export function removeEntry(state: Snapshot, entryId: string): Snapshot {
  const entry = state.entries.find(e => e.id === entryId);
  if (entry?.kind === 'opening') throw new Error('ยอดตั้งต้นลบไม่ได้ แต่แก้ไขหรือปรับยอดเงินจริงได้');
  return { ...state, entries: state.entries.filter(e => e.id !== entryId), bills: state.bills.map(b => b.paidEntryId === entryId ? { ...b, paidEntryId: undefined } : b) };
}
export function removeBill(state: Snapshot, billId: string): Snapshot {
  const bill = state.bills.find(b => b.id === billId);
  return { ...state, bills: state.bills.filter(b => b.id !== billId), entries: state.entries.filter(e => e.id !== bill?.paidEntryId) };
}
export function reconcile(state: Snapshot, actual: number, date = today()): Snapshot {
  const delta = actual - budget(state, date).balance;
  if (!delta) return state;
  return { ...state, entries: [...state.entries, { id: id(), kind: 'adjustment', amount: delta, date, note: 'ปรับยอดให้ตรงกับเงินจริง' }] };
}
function record(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function text(value: unknown, max = 150): value is string { return typeof value === 'string' && value.length > 0 && value.length <= max; }
function amount(value: unknown): value is number { return typeof value === 'number' && Number.isSafeInteger(value) && Math.abs(value) <= MAX; }
export function validateSnapshot(value: unknown, currentDate = today()): Snapshot {
  const fail = () => { throw new Error('ข้อมูลไม่ถูกต้องหรือเป็นไฟล์สำรองคนละเวอร์ชัน ข้อมูลเดิมยังอยู่'); };
  if (!record(value) || value.version !== 1 || !text(value.updatedAt, 40) || !Number.isFinite(Date.parse(value.updatedAt)) || !validDate(value.nextIncomeDate) || !amount(value.reserved) || value.reserved < 0 || !Array.isArray(value.entries) || !Array.isArray(value.bills) || value.entries.length > 20000 || value.bills.length > 5000) return fail();
  const entries: Entry[] = [];
  const bills: Bill[] = [];
  const ids = new Set<string>();
  for (const e of value.entries) {
    if (!record(e) || !text(e.id, 80) || ids.has(e.id) || !['opening', 'income', 'expense', 'adjustment'].includes(e.kind as string) || !amount(e.amount) || !validDate(e.date) || e.date > currentDate || !text(e.note) || (e.billId !== undefined && !text(e.billId, 80))) return fail();
    if ((e.kind === 'opening' && e.amount < 0) || (e.kind === 'income' && e.amount <= 0) || (e.kind === 'expense' && e.amount >= 0)) return fail();
    ids.add(e.id);
    entries.push({ id: e.id, kind: e.kind as EntryKind, amount: e.amount, date: e.date, note: e.note, ...(e.billId ? { billId: e.billId as string } : {}) });
  }
  if (entries.filter(e => e.kind === 'opening').length !== 1) return fail();
  for (const b of value.bills) {
    if (!record(b) || !text(b.id, 80) || ids.has(b.id) || !text(b.title) || !amount(b.amount) || b.amount <= 0 || !validDate(b.due) || (b.paidEntryId !== undefined && !text(b.paidEntryId, 80))) return fail();
    ids.add(b.id);
    bills.push({ id: b.id, title: b.title, amount: b.amount, due: b.due, ...(b.paidEntryId ? { paidEntryId: b.paidEntryId as string } : {}) });
  }
  for (const b of bills) {
    const linked = entries.filter(e => e.billId === b.id);
    if (b.paidEntryId ? linked.length !== 1 || linked[0].id !== b.paidEntryId || linked[0].kind !== 'expense' || linked[0].amount !== -b.amount : linked.length !== 0) return fail();
  }
  if (entries.some(e => e.billId && !bills.some(b => b.id === e.billId))) return fail();
  const state: Snapshot = { version: 1, updatedAt: value.updatedAt, nextIncomeDate: value.nextIncomeDate, reserved: value.reserved, entries, bills };
  const result = budget(state, currentDate);
  if (![result.balance, result.billTotal, result.available].every(Number.isSafeInteger)) return fail();
  return state;
}
