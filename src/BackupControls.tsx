import { confirmAction } from './ui';
import { Panel, Title, Text, Disclosure, Button, TextInput } from './ui';
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
      onNotice('เริ่มส่งออกแล้ว ตรวจไฟล์ใน Downloads');
    } catch (cause) { setError((cause as Error).message); }
  }
  return <Panel className="panel" id="backup-controls"><Title order={2}>สำรองข้อมูล{mode === 'sample' ? 'ตัวอย่าง' : 'ส่วนตัว'}</Title>
    <Text component="p" className="backup-last" role="status">{backupLabel(readBackupInfo(mode))}</Text>
    <Text component="p">เก็บไฟล์ JSON ไว้ในเครื่อง · ไม่สำรองออนไลน์</Text><Disclosure className="help-details"><summary>ก่อนจัดการข้อมูล</summary><Text component="p">เวลาส่งออกคือเวลาที่สั่งดาวน์โหลด ตรวจว่าไฟล์อยู่ใน Downloads ด้วย</Text><Text component="p">นำเข้าและล้างข้อมูลมีผลเฉพาะโหมดนี้ การติดตั้งแอปไม่ได้สำรองข้อมูลให้</Text></Disclosure>
    <div className="backup-actions"><Button className="secondary" disabled={!state || busy} onClick={download}><Download size={18} />ส่งออกข้อมูล</Button><Button className="secondary" disabled={busy} onClick={() => input.current?.click()}><Upload size={18} />นำเข้าไฟล์สำรอง</Button></div>
    <TextInput ref={input} type="file" accept=".json,application/json" className="sr-only" aria-label="เลือกไฟล์สำรอง JSON" disabled={busy} onChange={async event => {
      const file = event.currentTarget.files?.[0];
      event.currentTarget.value = '';
      if (!file) return;
      setError(''); setBusy(true);
      try {
        if (file.size > 10 * 1024 * 1024) throw new Error('ไฟล์ใหญ่เกิน 10 MB กรุณาเลือกไฟล์สำรองของ PORA');
        const imported = importBackup(await file.text());
        if (await confirmAction(`ตรวจไฟล์แล้ว พบ ${imported.entries.length} รายการเงิน และ ${imported.bills.length} บิล แทนที่ข้อมูล${mode === 'sample' ? 'ตัวอย่าง' : 'ส่วนตัว'}ทั้งหมดด้วยไฟล์นี้หรือไม่?`)) onImport(imported);
      } catch (cause) { setError((cause as Error).message); }
      finally { setBusy(false); }
    }} />
    <Text component="p" className="field-error" role="alert">{error}</Text>
    <Button className="danger-text" disabled={busy} onClick={async () => {
      setError('');
      if (!await confirmAction(`ล้างข้อมูล${mode === 'sample' ? 'ตัวอย่าง' : 'ส่วนตัว'}ทั้งหมดหรือไม่? ย้อนกลับไม่ได้ ควรส่งออกไฟล์สำรองก่อน`)) return;
      try { onClear(); } catch (cause) { setError((cause as Error).message); }
    }}>ล้างข้อมูลโหมดนี้</Button>
  </Panel>;
}
