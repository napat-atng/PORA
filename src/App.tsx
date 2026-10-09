import { Modal } from '@mantine/core';
import { useModals } from '@mantine/modals';
import { Alert, Badge, ThemeIcon, RowActions, confirmAction, Title, Button, Text, Panel, Disclosure } from './ui';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowDownLeft, ArrowUpRight, ChartNoAxesCombined, ChevronRight, CircleHelp, List, Plus, Receipt, Settings, Wallet, Pencil, Trash2, ShieldCheck, CalendarDays, Download } from 'lucide-react';
import { addDays, budget, createSnapshot, dateLabel, money, payBill, reconcile, removeBill, removeEntry, saveBill, saveEntry, today, undoBill, type Bill, type Entry, type Mode, type Snapshot } from './domain';
import { BillForm, EntryForm, PayBillForm, PlanForm, ReconcileForm, SetupForm } from './forms';
import { BackupControls } from './BackupControls';
import { useBudgetStorage } from './useBudgetStorage';
import { PwaStatus } from './PwaStatus';
import { EntryHistory } from './EntryHistory';
import { backupDue, backupKey, backupLabel, readBackupInfo } from './backup';

type Page = 'overview' | 'entries' | 'bills' | 'settings';
type Editor = { kind: 'setup' } | { kind: 'entry'; entry?: Entry; initialKind?: 'expense' | 'income' } | { kind: 'bill'; bill?: Bill } | { kind: 'payment'; bill: Bill } | { kind: 'reconcile' } | { kind: 'plan' };
const pages = [{ id: 'overview' as const, label: 'ภาพรวม', icon: ChartNoAxesCombined }, { id: 'entries' as const, label: 'รายการเงิน', icon: List }, { id: 'bills' as const, label: 'บิล', icon: Receipt }, { id: 'settings' as const, label: 'ตั้งค่า', icon: Settings }];
const entryNames = { opening: 'ยอดตั้งต้น', income: 'รายรับ', expense: 'รายจ่าย', adjustment: 'ปรับยอด' };

function Dialog({ title, onClose, onDirty, children }: { title: string; onClose: () => void; onDirty: () => void; children: ReactNode }) {
  const confirmations = useModals();
  const active = document.activeElement as HTMLElement | null;
  const trigger = useRef(active?.dataset.returnTo ? [...document.querySelectorAll<HTMLElement>('[data-row-trigger]')].find(element => element.dataset.rowTrigger === active.dataset.returnTo) : active);
  useEffect(() => () => {
    const element = trigger.current;
    window.setTimeout(() => { if (element?.isConnected) element.focus({ preventScroll: true }); }, 0);
  }, []);
  return <Modal opened title={title} onClose={onClose} trapFocus={!confirmations.modals.length} closeOnEscape={!confirmations.modals.length} closeOnClickOutside={false} transitionProps={{ duration: 0 }}><div onInputCapture={onDirty}>{children}</div></Modal>;
}

export default function App() {
  const confirmations = useModals();
  const storage = useBudgetStorage();
  const { state, mode } = storage;
  const [page, setPageState] = useState<Page>('overview');
  const [editor, setEditorState] = useState<Editor | null>(null);
  const [editorDirty, setEditorDirty] = useState(false);
  const [notice, setNotice] = useState('');
  const [undoPayment, setUndoPayment] = useState<{ mode: Mode; billId: string; entryId: string } | null>(null);
  const [, refreshBackup] = useState(0);
  const backupInfo = readBackupInfo(mode);
  useEffect(() => {
    const changed = (event: StorageEvent) => { if (event.key === backupKey(mode) || event.key === null) refreshBackup(value => value + 1); };
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, [mode]);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [settingsDraft, setSettingsDraftState] = useState(false);
  const settingsDirty = useRef(false);
  const [currentDate, setCurrentDate] = useState(today);
  function setSettingsDraft(value: boolean) { settingsDirty.current = value; setSettingsDraftState(value); }
  async function leaveSettings() {
    if (page === 'settings' && settingsDirty.current && !await confirmAction('แผนที่แก้ไขยังไม่ได้บันทึก ต้องการออกและทิ้งการแก้ไขหรือไม่?')) return false;
    setSettingsDraft(false);
    return true;
  }
  async function setPage(next: Page) { if (next !== page && !await leaveSettings()) return; setPageState(next); }
  async function activate(next: Mode, date: string) {
    if (!await leaveSettings()) return { ...storage, issue: 'ยกเลิกการเปลี่ยนโหมด' };
    return storage.activate(next, date);
  }
  async function openMode(next: Mode) {
    if (!await leaveSettings()) return;
    storage.activate(next, currentDate); setNotice(''); setError(''); setPageState('overview');
  }
  function setEditor(next: Editor | null) { setEditorDirty(false); setEditorState(next); }
  async function closeEditor() {
    if (editorDirty && !await confirmAction('รายการที่กรอกยังไม่ได้บันทึก ต้องการปิดและทิ้งข้อมูลที่กรอกหรือไม่?')) return;
    setEditor(null);
  }
  useEffect(() => {
    if (!editorDirty && !(page === 'settings' && settingsDraft)) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [editorDirty, page, settingsDraft]);
  useEffect(() => {
    const refresh = () => setCurrentDate(today());
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  function commit(next: Snapshot, message = 'บันทึกแล้ว') { storage.save(next, mode); setUndoPayment(null); setRevision(value => value + 1); setSettingsDraft(false); setNotice(message); setError(''); setEditor(null); }
  function reload() {
    const latest = storage.reload();
    setError('');
    if (!latest && editor) { setEditor(null); setNotice('ข้อมูลล่าสุดไม่มีแผนที่ใช้งานได้ จึงปิดฟอร์มเดิม กรุณาตั้งค่าใหม่หรือนำเข้าไฟล์สำรอง'); }
    else setNotice('โหลดข้อมูลล่าสุดแล้ว ฟอร์มที่เปิดอยู่ยังเก็บค่าที่กรอกไว้');
  }
  function act(action: () => void) { try { action(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'ทำรายการไม่สำเร็จ'); } }
  const result = state ? budget(state, currentDate) : null;
  const entries = state ? state.entries.map((entry, index) => ({ entry, index })).sort((a, b) => b.entry.date.localeCompare(a.entry.date) || b.index - a.index).map(item => item.entry) : [];
  const bills = state ? [...state.bills].sort((a, b) => a.due.localeCompare(b.due)) : [];
  const canUndoPayment = !!undoPayment && mode === undoPayment.mode && state?.bills.some(bill => bill.id === undoPayment.billId && bill.paidEntryId === undoPayment.entryId);

  function renderEntries(items: Entry[]) {
    return items.length ? <ul className="item-list">{items.map(entry => <li key={entry.id}>
      <ThemeIcon variant="light" size={40} radius="md" className={`item-icon ${entry.amount < 0 ? 'out' : 'in'}`}>{entry.amount < 0 ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}</ThemeIcon>
      <div className="item-body"><strong>{entry.note}</strong><Text component="small" size="xs">{dateLabel(entry.date)} · {entryNames[entry.kind]}{entry.billId ? ' · เชื่อมบิล' : ''}</Text><RowActions id={entry.id} label={entry.note}><Button onClick={() => setEditor({ kind: 'entry', entry })} aria-label={`แก้ไขรายการ ${entry.note}`}><Pencil size={14} aria-hidden="true" />แก้ไข</Button>{entry.kind !== 'opening' && <Button className="danger-text" onClick={async () => { if (await confirmAction(entry.billId ? 'ลบรายจ่ายนี้และคืนบิลเป็นค้างจ่าย ยืนยันหรือไม่?' : 'ลบรายการนี้ ยืนยันหรือไม่?')) act(() => commit(removeEntry(state!, entry.id))); }} aria-label={`ลบรายการ ${entry.note}`}><Trash2 size={14} aria-hidden="true" />ลบ</Button>}</RowActions></div>
      <strong className={`item-amount ${entry.amount < 0 ? '' : 'positive'}`}>{entry.amount > 0 ? '+' : ''}{money(entry.amount)}</strong>
    </li>)}</ul> : <div className="empty"><List size={30} /><Text component="p">ยังไม่มีรายการเงิน</Text><Button onClick={() => setEditor({ kind: 'entry' })}>เพิ่มรายการแรก</Button></div>;
  }
  function renderBills(items: Bill[]) {
    return items.length ? <ul className="item-list">{items.map(bill => <li key={bill.id} className="bill-item">
      <ThemeIcon variant="light" size={40} radius="md" className="item-icon"><Receipt size={20} /></ThemeIcon><div className="item-body"><strong>{bill.title}</strong><Text component="small" size="xs">ครบกำหนด {dateLabel(bill.due)}</Text>
      <Badge variant="light" className={`badge ${!bill.paidEntryId && bill.due < currentDate ? 'warning' : ''}`}>{bill.paidEntryId ? 'จ่ายแล้ว' : bill.due < currentDate ? 'เกินกำหนด · ค้างจ่าย' : bill.due >= state!.nextIncomeDate ? 'บิลรอบถัดไป' : 'ค้างจ่าย · กันไว้รอบนี้'}</Badge>
      <RowActions id={bill.id} label={bill.title}><Button onClick={() => setEditor({ kind: 'bill', bill })} aria-label={`แก้ไขบิล ${bill.title}`}><Pencil size={14} aria-hidden="true" />แก้ไข</Button><Button className="danger-text" onClick={async () => { if (await confirmAction(bill.paidEntryId ? 'ลบบิลนี้และรายจ่ายที่เชื่อมกัน การจ่ายจะถูกย้อนและยอดเงินเปลี่ยน ยืนยันหรือไม่?' : 'ลบบิลนี้ ยืนยันหรือไม่?')) act(() => commit(removeBill(state!, bill.id))); }} aria-label={`ลบบิล ${bill.title}`}><Trash2 size={14} aria-hidden="true" />ลบ</Button></RowActions></div>
      <div className="bill-end"><strong>{money(bill.amount)}</strong><Button className={bill.paidEntryId ? 'secondary small' : 'primary small'} onClick={() => bill.paidEntryId ? act(() => commit(undoBill(state!, bill.id), 'ย้อนการจ่ายบิลแล้ว')) : setEditor({ kind: 'payment', bill })} aria-label={`${bill.paidEntryId ? 'ย้อนการจ่าย' : 'จ่ายแล้ว'} ${bill.title}`}>{bill.paidEntryId ? 'ย้อนการจ่าย' : 'จ่ายแล้ว'}</Button></div>
    </li>)}</ul> : <div className="empty"><Receipt size={30} /><Text component="p">ไม่มีบิลในส่วนนี้</Text><Button onClick={() => setEditor({ kind: 'bill' })}>เพิ่มบิล</Button></div>;
  }

  return <div className="app-shell">
    <aside className="sidebar"><a className="brand" href="#" onClick={event => { event.preventDefault(); setPage('overview'); }}><img src="/icon.svg" alt="" />PORA<span>พอร่า</span></a><Text component="p" className="tagline">เห็นเงินเหลือ ก่อนใช้จริง</Text>
      {state && <nav aria-label="เมนูหลัก">{pages.map(({ id, label, icon: Icon }) => <Button key={id} aria-current={page === id ? 'page' : undefined} onClick={() => { setPage(id); setNotice(''); }}><Icon size={21} /><span>{label}</span></Button>)}</nav>}
      <Text component="p" className="sidebar-note"><ShieldCheck size={18} />เก็บในเครื่องของคุณ</Text>
    </aside>
    <main onInputCapture={event => { if (page === 'settings' && (event.target as HTMLElement).closest('form')) setSettingsDraft(true); }}>
      <div className="topbar"><span>แผนเงินของคุณ</span><span className="today-chip"><CalendarDays size={15} aria-hidden="true" />{dateLabel(currentDate)}</span></div>
      {mode === 'sample' && <div className="sample-banner"><strong>โหมดตัวอย่าง · ข้อมูลสมมติ</strong><Button onClick={() => { openMode('personal'); }}>กลับไปข้อมูลของฉัน <ChevronRight size={16} /></Button></div>}
      <Alert role="status" className={notice || canUndoPayment ? 'notice' : 'sr-only'}>{notice || (canUndoPayment ? 'บันทึกจ่ายบิลแล้ว' : '')}{canUndoPayment && <Button onClick={() => act(() => commit(undoBill(state!, undoPayment!.billId), 'ย้อนการจ่ายบิลแล้ว'))}>ย้อนกลับ</Button>}</Alert><Alert role="alert" className={error ? 'error-banner' : 'sr-only'}>{error}</Alert>
      {(storage.issue || storage.conflict) && <Alert className="error-banner" role="alert"><Text component="p">{storage.issue || 'ข้อมูลเปลี่ยนในอีกแท็บ โหลดข้อมูลล่าสุดก่อนบันทึกต่อ ฟอร์มที่เปิดอยู่จะยังเก็บค่าที่กรอกไว้'}</Text><Button className="secondary" onClick={reload}>โหลดข้อมูลล่าสุด</Button></Alert>}
      {!state ? <><Panel className="welcome"><span className="eyebrow">PORA · พอร่า</span><Title order={1}>เห็นเงินเหลือ<br />ก่อนใช้จริง<span className="dot">.</span></Title><Text component="p">กันบิลไว้ เห็นงบใช้ได้ทุกวัน</Text><div className="welcome-actions"><Button className="primary" disabled={!!storage.issue} onClick={async () => { const loaded = await activate('personal', currentDate); if (!loaded.state && !loaded.issue) setEditor({ kind: 'setup' }); }}>เริ่มใช้ข้อมูลของฉัน <ChevronRight size={20} /></Button><Button className="secondary" onClick={() => { openMode('sample'); }}>ลองด้วยข้อมูลตัวอย่าง</Button></div><Text component="p" className="privacy-note">ไม่ต้องสมัคร · เก็บในเครื่อง · ไม่ซิงก์ออนไลน์</Text><div className="welcome-visual" aria-hidden="true"><span className="welcome-wallet"><Wallet size={46} /></span><Text component="small" size="xs">เงินเหลือใช้</Text><strong>พร้อมสำหรับ<br />ทุกวันของคุณ</strong><span className="welcome-pill">บิลพร้อม · ใจพร้อม</span></div></Panel>{storage.issue && <BackupControls state={null} mode={mode} onImport={commit} onClear={() => { storage.clear(); setNotice('ล้างข้อมูลโหมดนี้แล้ว'); }} onNotice={setNotice} onBackup={() => refreshBackup(value => value + 1)} />}</> : <>
        <header className="page-header"><div><span className="eyebrow">{page === 'overview' ? 'เงินของคุณ วันนี้' : 'แผนของคุณ'}</span><Title order={1}>{pages.find(item => item.id === page)!.label}</Title></div>{page !== 'settings' && <div className="header-actions">{page !== 'bills' && <Button className="secondary" onClick={() => setEditor({ kind: 'entry', initialKind: 'income' })}><ArrowDownLeft size={18} aria-hidden="true" />เพิ่มรายรับ</Button>}<Button className="primary" onClick={() => setEditor({ kind: page === 'bills' ? 'bill' : 'entry' })}><Plus size={20} />{page === 'bills' ? 'เพิ่มบิล' : 'เพิ่มรายจ่าย'}</Button></div>}</header>
        {page === 'overview' && result && <>
          <Panel className={`hero-card ${result.available < 0 ? 'deficit' : ''}`}><div className="hero-heading"><span>{result.available < 0 ? 'เงินยังไม่พอในรอบนี้' : 'กระเป๋าของคุณ'}</span><Wallet size={24} /></div><div className="daily-lead"><Text size="sm">งบใช้ต่อวัน</Text><strong>{result.daily === null ? 'ตั้งรอบใหม่' : money(result.daily)}<span>{result.daily === null ? '' : 'บาท / วัน'}</span></strong></div><div className="hero-money">{result.available < 0 ? 'ขาดอีก ' : ''}{money(Math.abs(result.available))}<span>บาท เหลือทั้งรอบ</span></div><div className="hero-footer"><div><Text component="small" size="xs">{result.days > 0 ? 'ใช้ถึง ' + dateLabel(addDays(state.nextIncomeDate, -1)) : 'ถึงวันตั้งรอบใหม่แล้ว'}</Text><strong>เหลือ {result.days} วัน</strong><Text component="small" size="xs">เงินเข้า {dateLabel(state.nextIncomeDate)}</Text></div></div><Text component="p">ตามแผนที่บันทึก · ไม่ใช่ยอดธนาคาร</Text></Panel>
          {mode === 'personal' && <Panel className={`backup-reminder ${backupDue(backupInfo, state, currentDate) ? 'backup-due' : ''}`}><Download size={20} aria-hidden="true" /><div><strong>{backupLabel(backupInfo)}</strong><Text component="p">{backupDue(backupInfo, state, currentDate) ? 'สำรองไว้ก่อนเปลี่ยนเครื่อง · ไม่มีสำรองออนไลน์' : 'สำรองอีกครั้งเมื่อมีข้อมูลใหม่'}</Text></div><Button className="secondary" onClick={() => { setPage('settings'); requestAnimationFrame(() => document.getElementById('backup-controls')?.scrollIntoView({ block: 'center' })); }}>สำรองข้อมูล</Button></Panel>}
          {result.days === 0 && <div className="warning-banner">ถึงรอบใหม่แล้ว บันทึกรายรับจริงก่อนตั้งรอบ <Button onClick={() => setEditor({ kind: 'plan' })}>ตั้งรอบใหม่</Button></div>}
          <div className="stats-grid"><Panel><ThemeIcon variant="light" size={40} radius="md" className="stat-icon"><Wallet size={18} aria-hidden="true" /></ThemeIcon><Text component="small" size="xs">เงินปัจจุบัน</Text><strong>{money(result.balance)} <span>บาท</span></strong></Panel><Panel><ThemeIcon variant="light" size={40} radius="md" className="stat-icon sky"><Receipt size={18} aria-hidden="true" /></ThemeIcon><Text component="small" size="xs">บิลที่กันไว้</Text><strong>{money(result.billTotal)} <span>บาท</span></strong></Panel><Panel><ThemeIcon variant="light" size={40} radius="md" className="stat-icon stone"><ShieldCheck size={18} aria-hidden="true" /></ThemeIcon><Text component="small" size="xs">เงินกันเพิ่มเติม</Text><strong>{money(state.reserved)} <span>บาท</span></strong></Panel></div>
          <Disclosure className="explanation"><summary><CircleHelp size={18} />ที่มาของตัวเลข</summary><Text component="p">เงินปัจจุบัน {money(result.balance)} − บิลค้างก่อนวันเงินเข้า {money(result.billTotal)} − เงินกันเพิ่มเติม {money(state.reserved)} = เงินเหลือใช้ {money(result.available)} บาท</Text><Text component="p">เงินกันเพิ่มเติม = เงินที่ตั้งใจเก็บ ไม่รวมบิลและรายจ่าย</Text><Text component="p">กันบิลค้างก่อนวันเงินเข้า รวมบิลเกินกำหนด งบต่อวันปัดลงถึงสตางค์ ไม่เติมรายรับล่วงหน้า</Text></Disclosure>
          <div className="content-grid"><Panel className="panel"><div className="section-head"><Title order={2}>บิลที่ต้องเตรียม</Title><Button onClick={() => setPage('bills')}>ดูทั้งหมด <ChevronRight size={16} /></Button></div>{renderBills(bills.filter(bill => !bill.paidEntryId && bill.due < state.nextIncomeDate).slice(0, 3))}</Panel><Panel className="panel"><div className="section-head"><Title order={2}>รายการล่าสุด</Title><Button onClick={() => setPage('entries')}>ดูทั้งหมด <ChevronRight size={16} /></Button></div>{renderEntries(entries.slice(0, 4))}</Panel></div>
        </>}
        {page === 'entries' && <><Panel className="panel balance-strip"><div><Text component="small" size="xs">เงินปัจจุบัน</Text><strong>{money(result!.balance)} บาท</strong></div><Button className="secondary" onClick={() => setEditor({ kind: 'reconcile' })}>ปรับยอดให้ตรงกับเงินจริง</Button></Panel><EntryHistory entries={entries} currentDate={currentDate} renderEntries={renderEntries} /></>}
        {page === 'bills' && <><Panel className="panel balance-strip"><div><Text component="small" size="xs">เงินกันเพิ่มเติม</Text><strong>{money(state.reserved)} บาท</strong></div><Button className="secondary" onClick={() => setEditor({ kind: 'plan' })}>ปรับเงินกันไว้</Button></Panel><Panel className="panel"><Title order={2}>บิลค้างรอบนี้</Title>{renderBills(bills.filter(b => !b.paidEntryId && b.due < state.nextIncomeDate))}</Panel><Panel className="panel"><Title order={2}>บิลรอบถัดไป</Title>{renderBills(bills.filter(b => !b.paidEntryId && b.due >= state.nextIncomeDate))}</Panel><Panel className="panel"><Title order={2}>บิลที่จ่ายแล้ว</Title>{renderBills(bills.filter(b => b.paidEntryId))}</Panel></>}
        {page === 'settings' && <div className="settings-grid"><div><Panel className="panel"><Title order={2}>รอบรับเงินและเงินกันไว้</Title><PlanForm key={revision} state={state} currentDate={currentDate} onSave={(nextDate, reserved) => commit({ ...state, nextIncomeDate: nextDate, reserved })} /></Panel><BackupControls state={state} mode={mode} onImport={commit} onClear={() => { storage.clear(); setPage('overview'); setNotice('ล้างข้อมูลโหมดนี้แล้ว'); }} onNotice={setNotice} onBackup={() => refreshBackup(value => value + 1)} />{mode === 'personal' && <Button className="secondary" onClick={() => { openMode('sample'); }}>เปิดข้อมูลตัวอย่าง</Button>}</div><Panel className="panel help-panel"><ThemeIcon variant="light" size={40} radius="md" className="help-icon"><ShieldCheck size={28} aria-hidden="true" /></ThemeIcon><Title order={2}>ข้อมูลอยู่กับคุณ</Title><Text component="p">เก็บในเบราว์เซอร์นี้ · ไม่ซิงก์ออนไลน์</Text><Disclosure className="help-details"><summary>การเก็บข้อมูล</summary><Text component="p">สำรองก่อนล้างเว็บไซต์ เปลี่ยนเครื่อง เบราว์เซอร์ หรือที่อยู่เว็บ ข้อมูลอาจหายหรือไม่ปรากฏในโหมดส่วนตัว</Text><Text component="p">ผู้ที่เข้าถึงเบราว์เซอร์นี้ดูข้อมูลได้ ยังไม่มี PIN ล็อกแอป</Text></Disclosure><Disclosure className="help-details"><summary>เพิ่มลงหน้าจอหลัก</summary><Text component="p">iPhone: Safari → แชร์ → เพิ่มไปยังหน้าจอโฮม</Text><Text component="p">Android: Chrome → เมนู → เพิ่มลงหน้าจอหลัก / ติดตั้งแอป</Text><Text component="p" className="hint">สำรองก่อนติดตั้ง บางอุปกรณ์แยกข้อมูลจากแท็บเดิม ความสามารถขึ้นกับเบราว์เซอร์</Text></Disclosure></Panel></div>}
        <footer className="updated">อัปเดตล่าสุด {new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(state.updatedAt))} · ข้อมูล{mode === 'sample' ? 'ตัวอย่าง' : 'ส่วนตัว'}</footer>
      </>}
      <PwaStatus hasDraft={!!editor || !!confirmations.modals.length || (page === 'settings' && settingsDraft)} />
    </main>
    {editor && <Dialog title={editor.kind === 'setup' ? 'เริ่มแผนของคุณ' : editor.kind === 'entry' ? editor.entry ? 'แก้ไขรายการเงิน' : 'เพิ่มรายการเงิน' : editor.kind === 'bill' ? editor.bill ? 'แก้ไขบิล' : 'เพิ่มบิล' : editor.kind === 'payment' ? 'บันทึกจ่ายบิล' : editor.kind === 'reconcile' ? 'ปรับยอดเงินจริง' : 'ปรับแผนรับเงิน'} onClose={closeEditor} onDirty={() => setEditorDirty(true)}>
      {storage.conflict && <Alert className="error-banner" role="alert">อีกแท็บเปลี่ยนข้อมูลแล้ว โหลดข้อมูลล่าสุดก่อนบันทึก ค่าที่กรอกจะยังอยู่ หากอีกแท็บล้างแผนนี้ ฟอร์มจะถูกปิด <Button onClick={reload}>โหลดข้อมูลล่าสุด</Button></Alert>}
      {editor.kind === 'setup' && <SetupForm currentDate={currentDate} onSave={(balance, nextDate, reserved) => commit(createSnapshot(balance, nextDate, reserved, currentDate))} />}
      {editor.kind === 'entry' && <EntryForm entry={editor.entry} initialKind={editor.initialKind} currentDate={currentDate} onDraft={() => setEditorDirty(true)} onSave={entry => commit(saveEntry(state!, entry))} />}
      {editor.kind === 'bill' && <BillForm bill={editor.bill} currentDate={currentDate} onSave={bill => commit(saveBill(state!, bill))} />}
      {editor.kind === 'payment' && <PayBillForm bill={editor.bill} currentDate={currentDate} onSave={paidDate => {
        const next = payBill(state!, editor.bill.id, paidDate);
        const paid = next.bills.find(bill => bill.id === editor.bill.id)!;
        commit(next, `บันทึกจ่ายบิล ${paid.title} ${money(paid.amount)} บาท · วันที่ ${dateLabel(paidDate)}`);
        setUndoPayment({ mode, billId: paid.id, entryId: paid.paidEntryId! });
      }} />}
      {editor.kind === 'reconcile' && <ReconcileForm balance={result!.balance} onSave={actual => commit(reconcile(state!, actual, currentDate))} />}
      {editor.kind === 'plan' && <PlanForm state={state!} currentDate={currentDate} onSave={(nextDate, reserved) => commit({ ...state!, nextIncomeDate: nextDate, reserved })} />}
    </Dialog>}
  </div>;
}
