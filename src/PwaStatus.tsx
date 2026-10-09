import { Alert } from './ui';
import { Panel, Text, Button } from './ui';
import { useEffect, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export function PwaStatus({ hasDraft }: { hasDraft: boolean }) {
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState('');
  const [cached, setCached] = useState(false);
  const registration = useRef<ServiceWorkerRegistration | undefined>(undefined);
  const draft = useRef(hasDraft);
  draft.current = hasDraft;
  const { offlineReady: [offlineReady], needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    immediate: true,
    onRegisteredSW: (_url, value) => { registration.current = value; setCached(!!value?.active && !value.installing); },
    onRegisterError: () => setError('ยังเตรียมออฟไลน์ไม่สำเร็จ เปิดใช้ออนไลน์แล้วลองใหม่'),
    onNeedReload: () => {
      if (draft.current) { setError('แอปอัปเดตแล้ว บันทึกหรือปิดฟอร์มก่อนโหลดหน้าใหม่'); return; }
      window.location.reload();
    }
  });
  useEffect(() => {
    const check = () => { if (navigator.onLine) void registration.current?.update().catch(() => {}); };
    const timer = window.setInterval(check, 60000);
    window.addEventListener('focus', check);
    return () => { clearInterval(timer); window.removeEventListener('focus', check); };
  }, []);
  const ready = cached || offlineReady;
  return <Panel className="pwa-status" aria-label="สถานะแอป">
    <span role="status">{ready ? 'พร้อมใช้ออฟไลน์' : 'กำลังเตรียมออฟไลน์'}</span>
    {needRefresh && !dismissed && <Alert className="warning-banner" role="status"><strong>มี PORA เวอร์ชันใหม่</strong><Text component="p">{hasDraft ? 'บันทึกหรือปิดฟอร์มก่อนอัปเดต' : 'ข้อมูลที่บันทึกไว้ยังอยู่'}</Text><Button className="primary" disabled={hasDraft} onClick={() => { void updateServiceWorker().catch(() => setError('อัปเดตไม่สำเร็จ กรุณาลองใหม่')); }}>อัปเดตแอป</Button><Button onClick={() => setDismissed(true)}>ไว้ภายหลัง</Button></Alert>}
    {needRefresh && dismissed && <Button onClick={() => setDismissed(false)}>ดูการอัปเดตแอป</Button>}
    {error && <Text component="p" role="alert" className="field-error">{error}{!hasDraft && <Button onClick={() => window.location.reload()}>โหลดหน้าใหม่</Button>}</Text>}
  </Panel>;
}
