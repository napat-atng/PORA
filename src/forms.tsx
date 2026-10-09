import { Text, Button, TextInput, NativeSelect } from './ui';
import { cloneElement, isValidElement, useState, type FormEvent, type ReactNode } from 'react';
import { addDays, id, money, parseMoney, validDate, type Bill, type Entry, type Snapshot } from './domain';

class FieldError extends Error {
  constructor(public field: string, message: string) { super(message); }
}

function useForm(action: (data: FormData) => void) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  return { errors, submit: (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});
    try { action(new FormData(event.currentTarget)); }
    catch (error) { setErrors({ [error instanceof FieldError ? error.field : 'form']: error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ กรุณาลองใหม่' }); }
  } };
}

function amount(data: FormData, field: string, signed = false, positive = false) {
  try {
    const value = parseMoney(String(data.get(field)), signed);
    if (positive && value <= 0) throw new Error('จำนวนเงินต้องมากกว่า 0 บาท');
    return value;
  } catch (error) { throw new FieldError(field, (error as Error).message); }
}

function date(data: FormData, field: string, currentDate: string, future = false) {
  const value = String(data.get(field));
  if (!validDate(value) || (future ? value <= currentDate : value > currentDate)) throw new FieldError(field, future ? 'เลือกวันหลังจากวันนี้' : 'เลือกวันที่จริงที่ไม่เกินวันนี้');
  return value;
}

function Field({ name, label, errors, children }: { name: string; label: string; errors: Record<string, string>; children: ReactNode }) {
  return isValidElement<Record<string, unknown>>(children) ? cloneElement(children, { label, error: errors[name], className: 'field' }) : children;
}

function Actions({ errors, label = 'บันทึก' }: { errors: Record<string, string>; label?: string }) {
  return <><Text component="p" className="field-error" role="alert">{errors.form}</Text><Button className="primary" type="submit">{label}</Button></>;
}

const decimal = (value: number) => (value / 100).toFixed(2);

export function SetupForm({ currentDate, onSave }: { currentDate: string; onSave: (balance: number, nextDate: string, reserved: number) => void }) {
  const { errors, submit } = useForm(data => onSave(amount(data, 'balance'), date(data, 'nextDate', currentDate, true), amount(data, 'reserved')));
  return <form onSubmit={submit} noValidate>
    <Text component="p" className="muted">ใส่เงินที่ใช้ได้จริง ไม่รวมวงเงินสินเชื่อ</Text>
    <Field name="balance" label="เงินที่มีตอนนี้ (บาท)" errors={errors}><TextInput id="balance" name="balance" inputMode="decimal" defaultValue="" placeholder="เช่น 5000" aria-describedby="balance-error" /></Field>
    <Field name="nextDate" label="วันเงินเข้าครั้งหน้า" errors={errors}><TextInput id="nextDate" name="nextDate" type="date" min={addDays(currentDate, 1)} defaultValue={addDays(currentDate, 14)} aria-describedby="nextDate-error" /></Field>
    <Field name="reserved" label="เงินกันเพิ่มเติม (บาท)" errors={errors}><TextInput id="reserved" name="reserved" inputMode="decimal" defaultValue="0" aria-describedby="reserved-error" /></Field>
    <Text component="p" className="hint">เงินกัน = เงินที่ตั้งใจเก็บ ไม่รวมบิล เพิ่มบิลได้ภายหลัง</Text>
    <Actions errors={errors} label="เริ่มวางแผนเงิน" />
  </form>;
}

export function EntryForm({ entry, initialKind = 'expense', currentDate, onSave, onDraft }: { entry?: Entry; initialKind?: 'expense' | 'income'; currentDate: string; onSave: (entry: Entry) => void; onDraft?: () => void }) {
  const [kind, setKind] = useState(entry?.kind ?? initialKind);
  const [note, setNote] = useState(entry?.note ?? '');
  const { errors, submit } = useForm(data => {
    const value = amount(data, 'amount', kind === 'adjustment', kind === 'income' || kind === 'expense');
    const label = note.trim() || { expense: 'รายจ่าย', income: 'รายรับ', opening: 'ยอดตั้งต้น', adjustment: 'ปรับยอด' }[kind];
    if (label.length > 150) throw new FieldError('note', 'ใส่หมายเหตุไม่เกิน 150 ตัวอักษร');
    onSave({ id: entry?.id ?? id(), kind, amount: kind === 'expense' ? -value : value, date: date(data, 'entryDate', currentDate), note: label, ...(entry?.billId ? { billId: entry.billId } : {}) });
  });
  return <form onSubmit={submit} noValidate>
    <Field name="kind" label="ชนิดรายการ" errors={errors}><NativeSelect id="kind" value={kind} onChange={event => setKind(event.target.value as Entry['kind'])} disabled={!!entry && (entry.kind === 'opening' || entry.kind === 'adjustment' || !!entry.billId)}>
      <option value="expense">รายจ่าย</option><option value="income">รายรับ</option>{entry?.kind === 'opening' && <option value="opening">ยอดตั้งต้น</option>}{entry?.kind === 'adjustment' && <option value="adjustment">ปรับยอด</option>}
    </NativeSelect></Field>
    {entry?.billId && <Text component="p" className="hint">เชื่อมบิลอยู่: แก้ยอดหรือหมายเหตุจะอัปเดตบิลด้วย</Text>}
    <Field name="amount" label="จำนวนเงิน (บาท)" errors={errors}><TextInput id="amount" name="amount" data-initial-focus data-autofocus inputMode={kind === 'adjustment' ? 'text' : 'decimal'} defaultValue={entry ? decimal(kind === 'adjustment' ? entry.amount : Math.abs(entry.amount)) : ''} aria-describedby="amount-error" /></Field>
    <Field name="entryDate" label="วันที่ได้รับหรือจ่ายเงินจริง" errors={errors}><TextInput id="entryDate" name="entryDate" type="date" max={currentDate} defaultValue={entry?.date ?? currentDate} aria-describedby="entryDate-error" /></Field>
    <Field name="note" label="หมายเหตุ (ไม่จำเป็น)" errors={errors}><TextInput id="note" name="note" maxLength={150} value={note} onChange={event => setNote(event.target.value)} placeholder="เช่น อาหารกลางวัน" aria-describedby="note-error" /></Field>
    {(kind === 'expense' || kind === 'income') && <div className="quick-notes" role="group" aria-label="หมายเหตุที่ใช้บ่อย">{(kind === 'expense' ? ['อาหาร', 'เดินทาง', 'ซื้อของ', 'ค่าใช้จ่ายอื่น'] : ['เงินเดือน', 'รายได้เสริม', 'เงินคืน']).map(label => <Button type="button" key={label} aria-pressed={note === label} onClick={() => { setNote(label); onDraft?.(); }}>{label}</Button>)}</div>}
    <Actions errors={errors} />
  </form>;
}

export function BillForm({ bill, currentDate, onSave }: { bill?: Bill; currentDate: string; onSave: (bill: Bill) => void }) {
  const { errors, submit } = useForm(data => {
    const title = String(data.get('title')).trim();
    if (!title || title.length > 150) throw new FieldError('title', 'ใส่ชื่อบิลไม่เกิน 150 ตัวอักษร');
    const due = String(data.get('due'));
    if (!validDate(due)) throw new FieldError('due', 'เลือกวันครบกำหนดที่ถูกต้อง');
    onSave({ id: bill?.id ?? id(), title, amount: amount(data, 'amount', false, true), due });
  });
  return <form onSubmit={submit} noValidate>
    {bill?.paidEntryId && <Text component="p" className="hint">จ่ายแล้ว: แก้บิลจะอัปเดตรายจ่ายด้วย</Text>}
    <Field name="title" label="ชื่อบิล" errors={errors}><TextInput id="title" name="title" maxLength={150} defaultValue={bill?.title ?? ''} placeholder="เช่น ค่าเช่าห้อง" aria-describedby="title-error" /></Field>
    <Field name="amount" label="จำนวนเงิน (บาท)" errors={errors}><TextInput id="amount" name="amount" inputMode="decimal" defaultValue={bill ? decimal(bill.amount) : ''} aria-describedby="amount-error" /></Field>
    <Field name="due" label="วันครบกำหนด" errors={errors}><TextInput id="due" name="due" type="date" defaultValue={bill?.due ?? currentDate} aria-describedby="due-error" /></Field>
    <Text component="p" className="hint">เพิ่มบิลเองในแต่ละรอบ</Text><Actions errors={errors} />
  </form>;
}

export function ReconcileForm({ balance, onSave }: { balance: number; onSave: (actual: number) => void }) {
  const { errors, submit } = useForm(data => onSave(amount(data, 'actual')));
  return <form onSubmit={submit} noValidate><Text component="p" className="muted">บันทึกเฉพาะผลต่าง บิลไม่เปลี่ยน ยอดเท่าเดิมไม่เพิ่มรายการ</Text>
    <Field name="actual" label="เงินที่มีจริงตอนนี้ (บาท)" errors={errors}><TextInput id="actual" name="actual" inputMode="decimal" defaultValue={balance >= 0 ? decimal(balance) : ''} aria-describedby="actual-error" /></Field><Actions errors={errors} /></form>;
}

export function PayBillForm({ bill, currentDate, onSave }: { bill: Bill; currentDate: string; onSave: (paidDate: string) => void }) {
  const { errors, submit } = useForm(data => onSave(date(data, 'paidDate', currentDate)));
  return <form onSubmit={submit} noValidate><Text component="p"><strong>{bill.title} · {money(bill.amount)} บาท</strong></Text>
    <Text component="p" className="hint">เลือกวันจ่ายจริง ระบบบันทึกรายจ่ายและปลดเงินกันบิล</Text>
    <Field name="paidDate" label="วันที่จ่ายเงินจริง" errors={errors}><TextInput id="paidDate" name="paidDate" type="date" data-initial-focus data-autofocus max={currentDate} defaultValue={currentDate} aria-describedby="paidDate-error" /></Field>
    <Actions errors={errors} label="ยืนยันบันทึกจ่ายบิล" /></form>;
}

export function PlanForm({ state, currentDate, onSave }: { state: Snapshot; currentDate: string; onSave: (nextDate: string, reserved: number) => void }) {
  const { errors, submit } = useForm(data => onSave(date(data, 'nextDate', currentDate, true), amount(data, 'reserved')));
  return <form onSubmit={submit} noValidate>
    <Field name="nextDate" label="วันเงินเข้าครั้งหน้า" errors={errors}><TextInput id="nextDate" name="nextDate" type="date" min={addDays(currentDate, 1)} defaultValue={state.nextIncomeDate} aria-describedby="nextDate-error" /></Field>
    <Field name="reserved" label="เงินกันเพิ่มเติม (บาท)" errors={errors}><TextInput id="reserved" name="reserved" inputMode="decimal" defaultValue={decimal(state.reserved)} aria-describedby="reserved-error" /></Field>
    <Text component="p" className="hint">เงินกัน = เงินที่ตั้งใจเก็บ ไม่รวมบิล หากใช้จริงให้บันทึกรายจ่าย</Text><Actions errors={errors} label="บันทึกแผน" /></form>;
}
