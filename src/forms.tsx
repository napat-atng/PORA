import { useState, type FormEvent, type ReactNode } from 'react';
import { addDays, id, parseMoney, validDate, type Bill, type Entry, type Snapshot } from './domain';

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
  return <div className="field"><label htmlFor={name}>{label}</label>{children}{errors[name] && <p id={`${name}-error`} className="field-error" role="alert">{errors[name]}</p>}</div>;
}

function Actions({ errors, label = 'บันทึก' }: { errors: Record<string, string>; label?: string }) {
  return <><p className="field-error" role="alert">{errors.form}</p><button className="primary" type="submit">{label}</button></>;
}

const decimal = (value: number) => (value / 100).toFixed(2);

export function SetupForm({ currentDate, onSave }: { currentDate: string; onSave: (balance: number, nextDate: string, reserved: number) => void }) {
  const { errors, submit } = useForm(data => onSave(amount(data, 'balance'), date(data, 'nextDate', currentDate, true), amount(data, 'reserved')));
  return <form onSubmit={submit} noValidate>
    <p className="muted">รวมเงินที่คุณใช้จ่ายได้จริง ไม่รวมวงเงินสินเชื่อ เริ่มต้นโดยไม่ต้องสมัครสมาชิก</p>
    <Field name="balance" label="เงินที่มีตอนนี้ (บาท)" errors={errors}><input id="balance" name="balance" inputMode="decimal" defaultValue="" placeholder="เช่น 5000" aria-describedby="balance-error" /></Field>
    <Field name="nextDate" label="วันเงินเข้าครั้งหน้า" errors={errors}><input id="nextDate" name="nextDate" type="date" min={addDays(currentDate, 1)} defaultValue={addDays(currentDate, 14)} aria-describedby="nextDate-error" /></Field>
    <Field name="reserved" label="เงินกันเพิ่มเติม (บาท)" errors={errors}><input id="reserved" name="reserved" inputMode="decimal" defaultValue="0" aria-describedby="reserved-error" /></Field>
    <p className="hint">เงินกันเพิ่มเติมไม่รวมบิล คุณเพิ่มบิลได้หลังตั้งค่าเสร็จ</p>
    <Actions errors={errors} label="เริ่มวางแผนเงิน" />
  </form>;
}

export function EntryForm({ entry, currentDate, onSave }: { entry?: Entry; currentDate: string; onSave: (entry: Entry) => void }) {
  const [kind, setKind] = useState(entry?.kind ?? 'expense');
  const { errors, submit } = useForm(data => {
    const note = String(data.get('note')).trim();
    if (!note || note.length > 150) throw new FieldError('note', 'ใส่หมายเหตุไม่เกิน 150 ตัวอักษร');
    const value = amount(data, 'amount', kind === 'adjustment', kind === 'income' || kind === 'expense');
    onSave({ id: entry?.id ?? id(), kind, amount: kind === 'expense' ? -value : value, date: date(data, 'entryDate', currentDate), note, ...(entry?.billId ? { billId: entry.billId } : {}) });
  });
  return <form onSubmit={submit} noValidate>
    <Field name="kind" label="ชนิดรายการ" errors={errors}><select id="kind" value={kind} onChange={event => setKind(event.target.value as Entry['kind'])} disabled={!!entry && (entry.kind === 'opening' || entry.kind === 'adjustment' || !!entry.billId)}>
      <option value="expense">รายจ่าย</option><option value="income">รายรับ</option>{entry?.kind === 'opening' && <option value="opening">ยอดตั้งต้น</option>}{entry?.kind === 'adjustment' && <option value="adjustment">ปรับยอด</option>}
    </select></Field>
    {entry?.billId && <p className="hint">รายการนี้เชื่อมกับบิล การแก้จำนวนเงินและหมายเหตุจะอัปเดตบิลด้วย</p>}
    <Field name="amount" label="จำนวนเงิน (บาท)" errors={errors}><input id="amount" name="amount" inputMode={kind === 'adjustment' ? 'text' : 'decimal'} defaultValue={entry ? decimal(kind === 'adjustment' ? entry.amount : Math.abs(entry.amount)) : ''} aria-describedby="amount-error" /></Field>
    <Field name="entryDate" label="วันที่ได้รับหรือจ่ายเงินจริง" errors={errors}><input id="entryDate" name="entryDate" type="date" max={currentDate} defaultValue={entry?.date ?? currentDate} aria-describedby="entryDate-error" /></Field>
    <Field name="note" label="หมายเหตุ" errors={errors}><input id="note" name="note" maxLength={150} defaultValue={entry?.note ?? ''} placeholder="เช่น อาหารกลางวัน" aria-describedby="note-error" /></Field>
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
    {bill?.paidEntryId && <p className="hint">บิลนี้จ่ายแล้ว การแก้ไขจะอัปเดตรายจ่ายที่เชื่อมกันด้วย</p>}
    <Field name="title" label="ชื่อบิล" errors={errors}><input id="title" name="title" maxLength={150} defaultValue={bill?.title ?? ''} placeholder="เช่น ค่าเช่าห้อง" aria-describedby="title-error" /></Field>
    <Field name="amount" label="จำนวนเงิน (บาท)" errors={errors}><input id="amount" name="amount" inputMode="decimal" defaultValue={bill ? decimal(bill.amount) : ''} aria-describedby="amount-error" /></Field>
    <Field name="due" label="วันครบกำหนด" errors={errors}><input id="due" name="due" type="date" defaultValue={bill?.due ?? currentDate} aria-describedby="due-error" /></Field>
    <p className="hint">เพิ่มบิลแต่ละรอบเอง ไม่มีการสร้างบิลซ้ำอัตโนมัติ</p><Actions errors={errors} />
  </form>;
}

export function ReconcileForm({ balance, onSave }: { balance: number; onSave: (actual: number) => void }) {
  const { errors, submit } = useForm(data => onSave(amount(data, 'actual')));
  return <form onSubmit={submit} noValidate><p className="muted">เพิ่มเฉพาะผลต่างจากยอดเดิม ไม่เปลี่ยนสถานะบิล ถ้ายอดเท่าเดิมจะไม่เพิ่มรายการ</p>
    <Field name="actual" label="เงินที่มีจริงตอนนี้ (บาท)" errors={errors}><input id="actual" name="actual" inputMode="decimal" defaultValue={balance >= 0 ? decimal(balance) : ''} aria-describedby="actual-error" /></Field><Actions errors={errors} /></form>;
}

export function PlanForm({ state, currentDate, onSave }: { state: Snapshot; currentDate: string; onSave: (nextDate: string, reserved: number) => void }) {
  const { errors, submit } = useForm(data => onSave(date(data, 'nextDate', currentDate, true), amount(data, 'reserved')));
  return <form onSubmit={submit} noValidate>
    <Field name="nextDate" label="วันเงินเข้าครั้งหน้า" errors={errors}><input id="nextDate" name="nextDate" type="date" min={addDays(currentDate, 1)} defaultValue={state.nextIncomeDate} aria-describedby="nextDate-error" /></Field>
    <Field name="reserved" label="เงินกันเพิ่มเติม (บาท)" errors={errors}><input id="reserved" name="reserved" inputMode="decimal" defaultValue={decimal(state.reserved)} aria-describedby="reserved-error" /></Field>
    <p className="hint">การลดเงินกันไว้เป็นการเปลี่ยนแผน หากใช้เงินจริงให้บันทึกรายจ่ายด้วย</p><Actions errors={errors} label="บันทึกแผน" /></form>;
}
