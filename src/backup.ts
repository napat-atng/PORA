import { daysBetween, today, type Snapshot } from './domain';
import type { Store } from './storage';
import type { Mode } from './domain';
export interface BackupInfo { exportedAt: string; snapshotUpdatedAt: string }
export const backupKey = (mode: Mode) => `pora:backup:v1:${mode}`;
export function readBackupInfo(mode: Mode, store?: Store): BackupInfo | null {
  try {
    const raw = (store ?? localStorage).getItem(backupKey(mode));
    const info = raw ? JSON.parse(raw) : null;
    return info && typeof info.exportedAt === 'string' && Number.isFinite(Date.parse(info.exportedAt)) && typeof info.snapshotUpdatedAt === 'string' && Number.isFinite(Date.parse(info.snapshotUpdatedAt)) ? { exportedAt: info.exportedAt, snapshotUpdatedAt: info.snapshotUpdatedAt } : null;
  } catch { return null; }
}
export function recordBackup(mode: Mode, state: Snapshot, store?: Store): BackupInfo | null {
  const info = { exportedAt: new Date().toISOString(), snapshotUpdatedAt: state.updatedAt };
  try { (store ?? localStorage).setItem(backupKey(mode), JSON.stringify(info)); return info; } catch { return null; }
}
export function backupDue(info: BackupInfo | null, state: Snapshot, currentDate: string): boolean {
  return !info || (info.snapshotUpdatedAt !== state.updatedAt && daysBetween(today(new Date(info.exportedAt)), currentDate) >= 7);
}
export function backupLabel(info: BackupInfo | null) {
  return info ? `ส่งออกสำรองล่าสุด ${new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(info.exportedAt))}` : 'ยังไม่เคยส่งออกไฟล์สำรอง';
}
