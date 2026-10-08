import { validateSnapshot, type Mode, type Snapshot } from './domain';
export const key = (mode: Mode) => `leua-use:v1:${mode}`;
export interface Store { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
export function load(mode: Mode, store: Store = localStorage): Snapshot | null {
  const raw = store.getItem(key(mode));
  return raw === null ? null : validateSnapshot(JSON.parse(raw));
}
export function persist(mode: Mode, state: Snapshot, previous?: Snapshot | null, store: Store = localStorage): Snapshot {
  if (previous !== undefined) {
    const raw = store.getItem(key(mode));
    if (raw !== (previous ? JSON.stringify(previous) : null)) throw new Error('ข้อมูลเปลี่ยนในอีกแท็บ กรุณาโหลดข้อมูลล่าสุดก่อนบันทึก');
  }
  const next = validateSnapshot({ ...state, updatedAt: new Date().toISOString() });
  try { store.setItem(key(mode), JSON.stringify(next)); } catch { throw new Error('บันทึกไม่สำเร็จ พื้นที่อาจเต็มหรือเบราว์เซอร์ไม่อนุญาต ข้อมูลที่แสดงยังเป็นข้อมูลเดิม'); }
  return next;
}
export function exportBackup(state: Snapshot): string { return JSON.stringify({ app: 'pora', backupVersion: 1, data: validateSnapshot(state) }, null, 2); }
export function importBackup(raw: string): Snapshot {
  let value;
  try { value = JSON.parse(raw); } catch { throw new Error('ไฟล์นี้ไม่ใช่ JSON ที่ถูกต้อง ข้อมูลเดิมยังอยู่'); }
  if (!value || !['pora', 'leua-use'].includes(value.app) || value.backupVersion !== 1) throw new Error('ไฟล์นี้ไม่ใช่ไฟล์สำรองของ PORA เวอร์ชันนี้');
  return validateSnapshot(value.data);
}

export function replaceSnapshot(mode: Mode, state: Snapshot, expectedRaw: string | null, store: Store = localStorage): Snapshot {
  if (store.getItem(key(mode)) !== expectedRaw) throw new Error('ข้อมูลเปลี่ยนในอีกแท็บ กรุณาโหลดข้อมูลล่าสุดก่อนบันทึก');
  return persist(mode, state, undefined, store);
}

export function clearSnapshot(mode: Mode, expectedRaw: string | null, store: Store = localStorage): void {
  if (store.getItem(key(mode)) !== expectedRaw) throw new Error('ข้อมูลเปลี่ยนในอีกแท็บ กรุณาโหลดข้อมูลล่าสุดก่อนล้าง');
  try { store.removeItem(key(mode)); } catch { throw new Error('ล้างข้อมูลไม่สำเร็จ เบราว์เซอร์ไม่อนุญาต'); }
}
