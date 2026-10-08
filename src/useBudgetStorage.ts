import { useEffect, useRef, useState } from 'react';
import { createSample, validateSnapshot, type Mode, type Snapshot } from './domain';
import { clearSnapshot, key, replaceSnapshot } from './storage';

function read(mode: Mode) {
  let raw: string | null | undefined;
  try {
    raw = localStorage.getItem(key(mode));
    return { mode, raw, state: raw === null ? null : validateSnapshot(JSON.parse(raw)), issue: '' };
  } catch {
    return { mode, raw, state: null, issue: raw === undefined ? 'เบราว์เซอร์ไม่อนุญาตให้เข้าถึงพื้นที่เก็บข้อมูล กรุณาเปิดสิทธิ์ก่อนเริ่มใช้' : 'ข้อมูลที่เก็บไว้เสียหรือไม่รองรับ ข้อมูลเดิมยังอยู่ นำเข้าไฟล์สำรองหรือล้างข้อมูลโดยยืนยันก่อน' };
  }
}

export function useBudgetStorage() {
  const [session, setSession] = useState(() => read('personal'));
  const latest = useRef(session);
  const [conflict, setConflict] = useState(false);
  function update(next: typeof session) { latest.current = next; setSession(next); setConflict(false); }
  useEffect(() => {
    const changed = () => {
      try { if (localStorage.getItem(key(latest.current.mode)) !== latest.current.raw) setConflict(true); }
      catch { setConflict(true); }
    };
    window.addEventListener('storage', changed);
    window.addEventListener('focus', changed);
    return () => { window.removeEventListener('storage', changed); window.removeEventListener('focus', changed); };
  }, []);
  function activate(mode: Mode, currentDate: string) {
    const next = read(mode);
    if (mode === 'sample' && next.raw === null && !next.issue) {
      try {
        const state = replaceSnapshot(mode, createSample(currentDate), null);
        const saved = { ...next, state, raw: JSON.stringify(state) };
        update(saved);
        return saved;
      } catch (error) { const failed = { ...next, issue: (error as Error).message }; update(failed); return failed; }
    }
    update(next);
    return next;
  }
  function save(state: Snapshot, expectedMode: Mode = session.mode) {
    const current = latest.current;
    if (current.mode !== expectedMode) throw new Error('โหมดข้อมูลเปลี่ยนแล้ว กรุณานำเข้าใหม่ในโหมดที่ต้องการ');
    if (current.raw === undefined) throw new Error('ยังเข้าถึงพื้นที่เก็บข้อมูลไม่ได้ กรุณาเปิดสิทธิ์แล้วโหลดข้อมูลล่าสุด');
    const saved = replaceSnapshot(current.mode, state, current.raw);
    update({ ...current, state: saved, raw: JSON.stringify(saved), issue: '' });
  }
  function clear() {
    const current = latest.current;
    if (current.raw === undefined) throw new Error('ยังเข้าถึงพื้นที่เก็บข้อมูลไม่ได้');
    clearSnapshot(current.mode, current.raw);
    update({ ...current, state: null, raw: null, issue: '' });
  }
  return { ...session, conflict, activate, save, clear, reload: () => { const next = read(latest.current.mode); update(next); return next.state; } };
}
