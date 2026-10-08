import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowDownLeft, ArrowUpRight, ChartNoAxesCombined, ChevronRight, CircleHelp, List, Plus, Receipt, Settings, Wallet, X } from 'lucide-react';
import { budget, createSnapshot, dateLabel, money, payBill, reconcile, removeBill, removeEntry, saveBill, saveEntry, today, undoBill, type Bill, type Entry, type Mode, type Snapshot } from './domain';
import { BillForm, EntryForm, PlanForm, ReconcileForm, SetupForm } from './forms';
import { BackupControls } from './BackupControls';
import { useBudgetStorage } from './useBudgetStorage';
import { PwaStatus } from './PwaStatus';

type Page = 'overview' | 'entries' | 'bills' | 'settings';
type Editor = { kind: 'setup' } | { kind: 'entry'; entry?: Entry; initialKind?: 'expense' | 'income' } | { kind: 'bill'; bill?: Bill } | { kind: 'reconcile' } | { kind: 'plan' };
const pages = [{ id: 'overview' as const, label: 'ภาพรวม', icon: ChartNoAxesCombined }, { id: 'entries' as const, label: 'รายการเงิน', icon: List }, { id: 'bills' as const, label: 'บิล', icon: Receipt }, { id: 'settings' as const, label: 'ตั้งค่า', icon: Settings }];
const entryNames = { opening: 'ยอดตั้งต้น', income: 'รายรับ', expense: 'รายจ่าย', adjustment: 'ปรับยอด' };

function Dialog({ title, onClose, onDirty, children }: { title: string; onClose: () => void; onDirty: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current!;
    dialog.showModal();
    dialog.querySelector<HTMLInputElement>('[data-initial-focus]')?.focus();
    return () => { dialog.close(); previous?.focus(); };
  }, []);
  return <dialog ref={ref} aria-labelledby="dialog-title" onInputCapture={onDirty} onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="dialog-head"><h2 id="dialog-title">{title}</h2><button className="icon-button" onClick={onClose} aria-label="ปิดหน้าต่าง"><X size={22} /></button></div>{children}
  </dialog>;
}

export default function App() {
  const storage = useBudgetStorage();
  const { state, mode } = storage;
  const [page, setPageState] = useState<Page>('overview');
  const [editor, setEditorState] = useState<Editor | null>(null);
  const [editorDirty, setEditorDirty] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [settingsDraft, setSettingsDraftState] = useState(false);
  const settingsDirty = useRef(false);
  const [currentDate, setCurrentDate] = useState(today);
  function setSettingsDraft(value: boolean) { settingsDirty.current = value; setSettingsDraftState(value); }
  function leaveSettings() {
    if (page === 'settings' && settingsDirty.current && !window.confirm('แผนที่แก้ไขยังไม่ได้บันทึก ต้องการออกและทิ้งการแก้ไขหรือไม่?')) return false;
    setSettingsDraft(false);
    return true;
  }
  function setPage(next: Page) { if (next !== page && !leaveSettings()) return; setPageState(next); }
  function activate(next: Mode, date: string) {
    if (!leaveSettings()) return { ...storage, issue: 'ยกเลิกการเปลี่ยนโหมด' };
    return storage.activate(next, date);
  }
  function openMode(next: Mode) {
    if (!leaveSettings()) return;
    storage.activate(next, currentDate); setNotice(''); setError(''); setPageState('overview');
  }
  function setEditor(next: Editor | null) { setEditorDirty(false); setEditorState(next); }
  function closeEditor() {
    if (editorDirty && !window.confirm('รายการที่กรอกยังไม่ได้บันทึก ต้องการปิดและทิ้งข้อมูลที่กรอกหรือไม่?')) return;
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
  function commit(next: Snapshot) { storage.save(next, mode); setRevision(value => value + 1); setSettingsDraft(false); setNotice('บันทึกแล้ว'); setError(''); setEditor(null); }
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

  function renderEntries(items: Entry[]) {
    return items.length ? <ul className="item-list">{items.map(entry => <li key={entry.id}>
      <span className={`item-icon ${entry.amount < 0 ? 'out' : 'in'}`}>{entry.amount < 0 ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}</span>
      <div className="item-body"><strong>{entry.note}</strong><small>{dateLabel(entry.date)} · {entryNames[entry.kind]}{entry.billId ? ' · เชื่อมบิล' : ''}</small><div className="item-actions"><button onClick={() => setEditor({ kind: 'entry', entry })} aria-label={`แก้ไขรายการ ${entry.note}`}>แก้ไข</button>{entry.kind !== 'opening' && <button className="danger-text" onClick={() => { if (window.confirm(entry.billId ? 'ลบรายจ่ายนี้และคืนบิลเป็นค้างจ่าย ยืนยันหรือไม่?' : 'ลบรายการนี้ ยืนยันหรือไม่?')) act(() => commit(removeEntry(state!, entry.id))); }} aria-label={`ลบรายการ ${entry.note}`}>ลบ</button>}</div></div>
      <strong className={`item-amount ${entry.amount < 0 ? '' : 'positive'}`}>{entry.amount > 0 ? '+' : ''}{money(entry.amount)}</strong>
    </li>)}</ul> : <div className="empty"><List size={30} /><p>ยังไม่มีรายการเงิน</p><button onClick={() => setEditor({ kind: 'entry' })}>เพิ่มรายการแรก</button></div>;
  }
  function renderBills(items: Bill[]) {
    return items.length ? <ul className="item-list">{items.map(bill => <li key={bill.id} className="bill-item">
      <span className="item-icon"><Receipt size={20} /></span><div className="item-body"><strong>{bill.title}</strong><small>ครบกำหนด {dateLabel(bill.due)}</small>
      <span className={`badge ${!bill.paidEntryId && bill.due < currentDate ? 'warning' : ''}`}>{bill.paidEntryId ? 'จ่ายแล้ว' : bill.due < currentDate ? 'เกินกำหนด · ค้างจ่าย' : bill.due >= state!.nextIncomeDate ? 'บิลรอบถัดไป' : 'ค้างจ่าย · กันไว้รอบนี้'}</span>
      <div className="item-actions"><button onClick={() => setEditor({ kind: 'bill', bill })} aria-label={`แก้ไขบิล ${bill.title}`}>แก้ไข</button><button className="danger-text" onClick={() => { if (window.confirm(bill.paidEntryId ? 'ลบบิลนี้และรายจ่ายที่เชื่อมกัน การจ่ายจะถูกย้อนและยอดเงินเปลี่ยน ยืนยันหรือไม่?' : 'ลบบิลนี้ ยืนยันหรือไม่?')) act(() => commit(removeBill(state!, bill.id))); }} aria-label={`ลบบิล ${bill.title}`}>ลบ</button></div></div>
      <div className="bill-end"><strong>{money(bill.amount)}</strong><button className={bill.paidEntryId ? 'secondary small' : 'primary small'} onClick={() => act(() => commit(bill.paidEntryId ? undoBill(state!, bill.id) : payBill(state!, bill.id, currentDate)))} aria-label={`${bill.paidEntryId ? 'ย้อนการจ่าย' : 'จ่ายแล้ว'} ${bill.title}`}>{bill.paidEntryId ? 'ย้อนการจ่าย' : 'จ่ายแล้ว'}</button></div>
    </li>)}</ul> : <div className="empty"><Receipt size={30} /><p>ไม่มีบิลในส่วนนี้</p><button onClick={() => setEditor({ kind: 'bill' })}>เพิ่มบิล</button></div>;
  }

  return <div className="app-shell">
    <aside className="sidebar"><a className="brand" href="#" onClick={event => { event.preventDefault(); setPage('overview'); }}><img src="/icon.svg" alt="" />PORA<span>พอร่า</span></a><p className="tagline">เห็นเงินเหลือ ก่อนใช้จริง</p>
      {state && <nav aria-label="เมนูหลัก">{pages.map(({ id, label, icon: Icon }) => <button key={id} aria-current={page === id ? 'page' : undefined} onClick={() => { setPage(id); setNotice(''); }}><Icon size={21} /><span>{label}</span></button>)}</nav>}
      <p className="sidebar-note"><Wallet size={18} />ข้อมูลอยู่ในเครื่องของคุณ</p>
    </aside>
    <main onInputCapture={event => { if (page === 'settings' && (event.target as HTMLElement).closest('form')) setSettingsDraft(true); }}>
      <div className="topbar"><span>แผนเงินของคุณ</span><span>{dateLabel(currentDate)}</span></div>
      {mode === 'sample' && <div className="sample-banner"><strong>โหมดตัวอย่าง · ข้อมูลสมมติ</strong><button onClick={() => { openMode('personal'); }}>กลับไปข้อมูลของฉัน <ChevronRight size={16} /></button></div>}
      <div role="status" className={notice ? 'notice' : 'sr-only'}>{notice}</div><div role="alert" className={error ? 'error-banner' : 'sr-only'}>{error}</div>
      {(storage.issue || storage.conflict) && <div className="error-banner" role="alert"><p>{storage.issue || 'ข้อมูลเปลี่ยนในอีกแท็บ โหลดข้อมูลล่าสุดก่อนบันทึกต่อ ฟอร์มที่เปิดอยู่จะยังเก็บค่าที่กรอกไว้'}</p><button className="secondary" onClick={reload}>โหลดข้อมูลล่าสุด</button></div>}
      {!state ? <><section className="welcome"><span className="eyebrow">PORA · พอร่า</span><h1>เห็นเงินเหลือ<br />ก่อนใช้จริง<span className="dot">.</span></h1><p>หลังกันบิลและเงินที่อยากเก็บแล้ว<br />เหลือใช้เท่าไรจนถึงเงินเข้าครั้งหน้า?</p><div className="welcome-actions"><button className="primary" disabled={!!storage.issue} onClick={() => { const loaded = activate('personal', currentDate); if (!loaded.state && !loaded.issue) setEditor({ kind: 'setup' }); }}>เริ่มใช้ข้อมูลของฉัน <ChevronRight size={20} /></button><button className="secondary" onClick={() => { openMode('sample'); }}>ลองด้วยข้อมูลตัวอย่าง</button></div><p className="privacy-note">ไม่ต้องสมัครสมาชิก · ไม่มีการเชื่อมธนาคาร<br />ข้อมูลเก็บในเบราว์เซอร์นี้ ไม่ซิงก์ข้ามเครื่อง</p><div className="welcome-visual" aria-hidden="true"><Wallet size={64} /><span>รู้ยอดก่อนใช้<br /><strong>วางแผนได้ทุกวัน</strong></span></div></section>{storage.issue && <BackupControls state={null} mode={mode} onImport={commit} onClear={() => { storage.clear(); setNotice('ล้างข้อมูลโหมดนี้แล้ว'); }} onNotice={setNotice} />}</> : <>
        <header className="page-header"><div><span className="eyebrow">{page === 'overview' ? 'วันนี้ วางแผนได้' : 'จัดการแผนของคุณ'}</span><h1>{pages.find(item => item.id === page)!.label}</h1></div>{page !== 'settings' && <div className="header-actions">{page !== 'bills' && <button className="secondary" onClick={() => setEditor({ kind: 'entry', initialKind: 'income' })}>เพิ่มรายรับ</button>}<button className="primary" onClick={() => setEditor({ kind: page === 'bills' ? 'bill' : 'entry' })}><Plus size={20} />{page === 'bills' ? 'เพิ่มบิล' : 'เพิ่มรายจ่าย'}</button></div>}</header>
        {page === 'overview' && result && <>
          <section className={`hero-card ${result.available < 0 ? 'deficit' : ''}`}><div className="hero-heading"><span>{result.available < 0 ? 'เงินไม่พอสำหรับแผนนี้' : 'เงินเหลือใช้จนถึงเงินเข้าครั้งหน้า'}</span><Wallet size={24} /></div><div className="hero-money">{result.available < 0 ? 'ขาดอีก ' : ''}{money(Math.abs(result.available))}<span>บาท</span></div><div className="hero-footer"><div><small>เฉลี่ยต่อวัน</small><strong>{result.daily === null ? 'ยังคำนวณไม่ได้' : `${money(result.daily)} บาท`}</strong></div><div><small>ถึง {dateLabel(state.nextIncomeDate)}</small><strong>เหลือ {result.days} วัน</strong></div></div><p>ตัวเลขจากแผนที่บันทึก ไม่ใช่ยอดสดจากธนาคารหรือการรับประกันการใช้จ่าย</p></section>
          {result.days === 0 && <div className="warning-banner">ถึงวันเงินเข้าแล้ว บันทึกรายรับเมื่อได้รับเงินจริง และตั้งรอบใหม่ <button onClick={() => setEditor({ kind: 'plan' })}>ตั้งรอบใหม่</button></div>}
          <div className="stats-grid"><section><small>เงินปัจจุบัน</small><strong>{money(result.balance)} <span>บาท</span></strong></section><section><small>บิลที่กันไว้</small><strong>{money(result.billTotal)} <span>บาท</span></strong></section><section><small>เงินกันเพิ่มเติม</small><strong>{money(state.reserved)} <span>บาท</span></strong></section></div>
          <details className="explanation"><summary><CircleHelp size={18} />ที่มาของตัวเลข</summary><p>เงินปัจจุบัน {money(result.balance)} − บิลค้างก่อนวันเงินเข้า {money(result.billTotal)} − เงินกันเพิ่มเติม {money(state.reserved)} = เงินเหลือใช้ {money(result.available)} บาท</p><p>รวมบิลเกินกำหนด ไม่รวมบิลตรงวันเงินเข้าหรือหลังจากนั้น ค่าเฉลี่ยต่อวันปัดลงถึงสตางค์ และไม่เติมรายรับในอนาคต</p></details>
          <div className="content-grid"><section className="panel"><div className="section-head"><h2>บิลที่ต้องเตรียม</h2><button onClick={() => setPage('bills')}>ดูทั้งหมด <ChevronRight size={16} /></button></div>{renderBills(bills.filter(bill => !bill.paidEntryId && bill.due < state.nextIncomeDate).slice(0, 3))}</section><section className="panel"><div className="section-head"><h2>รายการล่าสุด</h2><button onClick={() => setPage('entries')}>ดูทั้งหมด <ChevronRight size={16} /></button></div>{renderEntries(entries.slice(0, 4))}</section></div>
        </>}
        {page === 'entries' && <><section className="panel balance-strip"><div><small>เงินปัจจุบัน</small><strong>{money(result!.balance)} บาท</strong></div><button className="secondary" onClick={() => setEditor({ kind: 'reconcile' })}>ปรับยอดให้ตรงกับเงินจริง</button></section><section className="panel">{renderEntries(entries)}</section></>}
        {page === 'bills' && <><section className="panel balance-strip"><div><small>เงินกันเพิ่มเติม</small><strong>{money(state.reserved)} บาท</strong></div><button className="secondary" onClick={() => setEditor({ kind: 'plan' })}>ปรับเงินกันไว้</button></section><section className="panel"><h2>บิลค้างรอบนี้</h2>{renderBills(bills.filter(b => !b.paidEntryId && b.due < state.nextIncomeDate))}</section><section className="panel"><h2>บิลรอบถัดไป</h2>{renderBills(bills.filter(b => !b.paidEntryId && b.due >= state.nextIncomeDate))}</section><section className="panel"><h2>บิลที่จ่ายแล้ว</h2>{renderBills(bills.filter(b => b.paidEntryId))}</section></>}
        {page === 'settings' && <div className="settings-grid"><div><section className="panel"><h2>รอบรับเงินและเงินกันไว้</h2><PlanForm key={revision} state={state} currentDate={currentDate} onSave={(nextDate, reserved) => commit({ ...state, nextIncomeDate: nextDate, reserved })} /></section><BackupControls state={state} mode={mode} onImport={commit} onClear={() => { storage.clear(); setPage('overview'); setNotice('ล้างข้อมูลโหมดนี้แล้ว'); }} onNotice={setNotice} />{mode === 'personal' && <button className="secondary" onClick={() => { openMode('sample'); }}>เปิดข้อมูลตัวอย่าง</button>}</div><section className="panel"><h2>ข้อมูลของคุณอยู่ที่ไหน?</h2><p>ข้อมูลอยู่ในเบราว์เซอร์ของอุปกรณ์นี้ ไม่ใช่บัญชีออนไลน์ และไม่ซิงก์ข้ามเครื่อง</p><p>การล้างข้อมูลเว็บไซต์ ใช้โหมดส่วนตัว หรือเปลี่ยนเบราว์เซอร์และที่อยู่เว็บ อาจทำให้ข้อมูลหายหรือไม่ปรากฏ</p><p>ใครที่เข้าถึงเบราว์เซอร์นี้ได้อาจดูข้อมูลได้ เดโมยังไม่มี PIN ล็อกแอป</p><h2>เพิ่มลงหน้าจอหลัก</h2><p>iPhone: เปิดด้วย Safari → แชร์ → เพิ่มไปยังหน้าจอโฮม</p><p>Android: เปิดด้วย Chrome → เมนู → เพิ่มลงหน้าจอหลักหรือติดตั้งแอป</p><p className="hint">ความสามารถขึ้นกับเบราว์เซอร์ สำรองข้อมูลก่อนติดตั้งหรือเปลี่ยนเครื่อง บางอุปกรณ์อาจใช้พื้นที่เก็บข้อมูลแยกจากแท็บเดิม</p></section></div>}
        <footer className="updated">อัปเดตล่าสุด {new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(state.updatedAt))} · ข้อมูล{mode === 'sample' ? 'ตัวอย่าง' : 'ส่วนตัว'}</footer>
      </>}
      <PwaStatus hasDraft={!!editor || (page === 'settings' && settingsDraft)} />
    </main>
    {editor && <Dialog title={editor.kind === 'setup' ? 'เริ่มแผนของคุณ' : editor.kind === 'entry' ? editor.entry ? 'แก้ไขรายการเงิน' : 'เพิ่มรายการเงิน' : editor.kind === 'bill' ? editor.bill ? 'แก้ไขบิล' : 'เพิ่มบิล' : editor.kind === 'reconcile' ? 'ปรับยอดเงินจริง' : 'ปรับแผนรับเงิน'} onClose={closeEditor} onDirty={() => setEditorDirty(true)}>
      {storage.conflict && <div className="error-banner" role="alert">อีกแท็บเปลี่ยนข้อมูลแล้ว โหลดข้อมูลล่าสุดก่อนบันทึก ค่าที่กรอกจะยังอยู่ หากอีกแท็บล้างแผนนี้ ฟอร์มจะถูกปิด <button onClick={reload}>โหลดข้อมูลล่าสุด</button></div>}
      {editor.kind === 'setup' && <SetupForm currentDate={currentDate} onSave={(balance, nextDate, reserved) => commit(createSnapshot(balance, nextDate, reserved, currentDate))} />}
      {editor.kind === 'entry' && <EntryForm entry={editor.entry} initialKind={editor.initialKind} currentDate={currentDate} onDraft={() => setEditorDirty(true)} onSave={entry => commit(saveEntry(state!, entry))} />}
      {editor.kind === 'bill' && <BillForm bill={editor.bill} currentDate={currentDate} onSave={bill => commit(saveBill(state!, bill))} />}
      {editor.kind === 'reconcile' && <ReconcileForm balance={result!.balance} onSave={actual => commit(reconcile(state!, actual, currentDate))} />}
      {editor.kind === 'plan' && <PlanForm state={state!} currentDate={currentDate} onSave={(nextDate, reserved) => commit({ ...state!, nextIncomeDate: nextDate, reserved })} />}
    </Dialog>}
  </div>;
}
