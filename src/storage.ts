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
export function exportBackup(state: Snapshot): string { return JSON.stringify({ app: 'leua-use', backupVersion: 1, data: state }, null, 2); }
export function importBackup(raw: string): Snapshot {
  let value;
  try { value = JSON.parse(raw); } catch { throw new Error('ไฟล์นี้ไม่ใช่ JSON ที่ถูกต้อง ข้อมูลเดิมยังอยู่'); }
  if (!value || value.app !== 'leua-use' || value.backupVersion !== 1) throw new Error('ไฟล์นี้ไม่ใช่ไฟล์สำรองของเหลือใช้เวอร์ชันนี้');
  return validateSnapshot(value.data);
}
