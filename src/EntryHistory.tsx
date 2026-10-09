import { Panel, TextInput, NativeSelect, Text, Title, Button } from './ui';
import { useState, type ReactNode } from 'react';
import { dateLabel, type Entry } from './domain';
import { defaultHistoryQuery, entryHistory, moneyTotal, type HistoryQuery } from './history';

export function EntryHistory({ entries, currentDate, renderEntries }: { entries: Entry[]; currentDate: string; renderEntries: (entries: Entry[]) => ReactNode }) {
  const [query, setQuery] = useState<HistoryQuery>(defaultHistoryQuery);
  const result = entryHistory(entries, query, currentDate);
  const invalidRange = query.period === 'custom' && !!query.start && !!query.end && query.start > query.end;
  return <Panel className="panel history-panel">
    <div className="history-filters">
      <div className="field"><label htmlFor="history-search">ค้นหารายการ</label><TextInput id="history-search" type="search" value={query.search} placeholder="เช่น อาหาร" onChange={event => setQuery({ ...query, search: event.target.value })} /></div>
      <div className="field"><label htmlFor="history-kind">ชนิดรายการที่แสดง</label><NativeSelect id="history-kind" value={query.kind} onChange={event => setQuery({ ...query, kind: event.target.value as HistoryQuery['kind'] })}><option value="all">ทุกชนิด</option><option value="income">รายรับ</option><option value="expense">รายจ่าย</option><option value="adjustment">ปรับยอด</option><option value="opening">ยอดตั้งต้น</option></NativeSelect></div>
      <div className="field"><label htmlFor="history-period">ช่วงเวลา</label><NativeSelect id="history-period" value={query.period} onChange={event => setQuery({ ...query, period: event.target.value as HistoryQuery['period'] })}><option value="all">ทั้งหมด</option><option value="month">เดือนนี้</option><option value="week">7 วันล่าสุด</option><option value="custom">เลือกช่วงวันที่</option></NativeSelect></div>
    </div>
    {query.period === 'custom' && <div className="date-range"><div className="field"><label htmlFor="history-start">ตั้งแต่วันที่</label><TextInput id="history-start" type="date" max={currentDate} value={query.start} onChange={event => setQuery({ ...query, start: event.target.value })} /></div><div className="field"><label htmlFor="history-end">ถึงวันที่</label><TextInput id="history-end" type="date" max={currentDate} value={query.end} onChange={event => setQuery({ ...query, end: event.target.value })} /></div></div>}
    {invalidRange ? <Text component="p" className="field-error" role="alert">วันเริ่มต้นต้องไม่อยู่หลังวันสิ้นสุด</Text> : <>
      <div className="stats-grid history-totals"><Panel><Text component="small" size="xs">รายรับ</Text><strong>{moneyTotal(result.income)} <span>บาท</span></strong></Panel><Panel><Text component="small" size="xs">รายจ่าย</Text><strong>{moneyTotal(result.expense)} <span>บาท</span></strong></Panel><Panel><Text component="small" size="xs">ปรับยอด</Text><strong>{moneyTotal(result.adjustment)} <span>บาท</span></strong></Panel></div>
      <Text component="p" className="hint" role="status">{result.items.length} รายการ · สุทธิ {moneyTotal(result.net)} บาท<br />ตามตัวกรอง · ไม่รวมยอดตั้งต้น</Text>
      {result.groups.length ? result.groups.map(([date, items]) => <Panel key={date} className="history-day"><Title order={2}>{dateLabel(date)} <span>{items.length} รายการ</span></Title>{renderEntries(items)}</Panel>) : <div className="empty"><Text component="p">ไม่พบรายการตามตัวกรองนี้</Text><Button onClick={() => setQuery(defaultHistoryQuery)}>ล้างตัวกรอง</Button></div>}
    </>}
  </Panel>;
}
