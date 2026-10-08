import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { today, type Mode, type Snapshot } from './domain';
import { exportBackup, importBackup } from './storage';
import { backupLabel, readBackupInfo, recordBackup } from './backup';

export function BackupControls({ state, mode, onImport, onClear, onNotice, onBackup }: { state: Snapshot | null; mode: Mode; onImport: (state: Snapshot) => void; onClear: () => void; onNotice: (message: string) => void; onBackup?: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  function download() {
    try {
      const url = URL.createObjectURL(new Blob([exportBackup(state!)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url; link.download = `pora-${mode}-${today()}.json`; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      const info = recordBackup(mode, state!);
      onBackup?.();
      if (!info) setError('เริ่มดาวน์โหลดแล้ว แต่บันทึกเวลาส่งออกไม่ได้ กรุณาตรวจไฟล์ในรายการดาวน์โหลด');
      else setError('');
      onNotice('เริ่มดาวน์โหลดไฟล์สำรองแล้ว ตรวจว่าไฟล์อยู่ในรายการดาวน์โหลดและเก็บไว้ในที่ปลอดภัย');
    } catch (cause) { setError((cause as Error).message); }
  }
  return <section className="panel" id="backup-controls"><h2>สำรองและจัดการข้อมูล{mode === 'sample' ? 'ตัวอย่าง' : 'ส่วนตัว'}</h2>
    <p className="backup-last" role="status">{backupLabel(readBackupInfo(mode))}</p>
    <p>ดาวน์โหลด JSON เก็บไว้ในเครื่อง ไม่มีการอัปโหลดข้อมูล การนำเข้าและล้างข้อมูลมีผลเฉพาะโหมดนี้</p>
    <p className="hint">เวลานี้คือเวลาที่สั่งส่งออก ไม่ยืนยันว่าไฟล์ถูกเก็บสำเร็จ กรุณาตรวจรายการดาวน์โหลด การติดตั้งแอปไม่ได้สำรองข้อมูลออนไลน์ให้</p>
    <div className="backup-actions"><button className="secondary" disabled={!state || busy} onClick={download}><Download size={18} />ส่งออกข้อมูล</button><button className="secondary" disabled={busy} onClick={() => input.current?.click()}><Upload size={18} />นำเข้าไฟล์สำรอง</button></div>
    <input ref={input} type="file" accept=".json,application/json" className="sr-only" aria-label="เลือกไฟล์สำรอง JSON" disabled={busy} onChange={async event => {
      const file = event.currentTarget.files?.[0];
      event.currentTarget.value = '';
      if (!file) return;
      setError(''); setBusy(true);
      try {
        if (file.size > 10 * 1024 * 1024) throw new Error('ไฟล์ใหญ่เกิน 10 MB กรุณาเลือกไฟล์สำรองของ PORA');
        const imported = importBackup(await file.text());
        if (window.confirm(`ตรวจไฟล์แล้ว พบ ${imported.entries.length} รายการเงิน และ ${imported.bills.length} บิล แทนที่ข้อมูล${mode === 'sample' ? 'ตัวอย่าง' : 'ส่วนตัว'}ทั้งหมดด้วยไฟล์นี้หรือไม่?`)) onImport(imported);
      } catch (cause) { setError((cause as Error).message); }
      finally { setBusy(false); }
    }} />
    <p className="field-error" role="alert">{error}</p>
    <button className="danger-text" disabled={busy} onClick={() => {
      setError('');
      if (!window.confirm(`ล้างข้อมูล${mode === 'sample' ? 'ตัวอย่าง' : 'ส่วนตัว'}ทั้งหมดหรือไม่? ย้อนกลับไม่ได้ ควรส่งออกไฟล์สำรองก่อน`)) return;
      try { onClear(); } catch (cause) { setError((cause as Error).message); }
    }}>ล้างข้อมูลโหมดนี้</button>
  </section>;
}
