import { describe, expect, it } from 'vitest';
import { backupDue, backupKey, readBackupInfo, recordBackup } from './backup';
import { createSnapshot } from './domain';
import type { Store } from './storage';
const memory = (): Store => { const data = new Map<string, string>(); return { getItem: key => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); }, removeItem: key => { data.delete(key); } }; };
describe('สถานะสำรองข้อมูล', () => {
  const state = createSnapshot(10000, '2026-10-20', 0, '2026-10-09');
  it('เก็บเวลาส่งออกและแยกโหมด', () => {
    const store = memory(); const info = recordBackup('personal', state, store);
    expect(readBackupInfo('personal', store)).toEqual(info);
    expect(readBackupInfo('sample', store)).toBeNull();
  });
  it('เตือนเมื่อยังไม่มีสำรอง หรือครบเจ็ดวันและมีข้อมูลใหม่', () => {
    const info = { exportedAt: '2026-10-01T18:00:00Z', snapshotUpdatedAt: '2026-10-01T18:00:00Z' };
    expect(backupDue(null, state, '2026-10-09')).toBe(true);
    expect(backupDue(info, state, '2026-10-08')).toBe(false);
    expect(backupDue(info, state, '2026-10-09')).toBe(true);
    expect(backupDue({ ...info, snapshotUpdatedAt: state.updatedAt }, state, '2026-10-09')).toBe(false);
  });
  it('ข้อมูลสถานะเสียหรือพื้นที่เต็มไม่ทำให้แอปล้ม', () => {
    const store = memory(); store.setItem(backupKey('personal'), '{}');
    expect(readBackupInfo('personal', store)).toBeNull();
    expect(recordBackup('personal', state, { ...store, setItem: () => { throw new Error('full'); } })).toBeNull();
  });
});
