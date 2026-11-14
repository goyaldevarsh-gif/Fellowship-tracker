import * as XLSX from 'xlsx'
import type { AppData, Kind, Rec } from '../types'
import { STATUSES } from '../types'
import { parseHistory, specialtyTags, todayISO } from './util'

const s = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim())
const serialToISO = (n: number) => {
  const d = new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86400000)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}
const toISO = (v: unknown): string | undefined => {
  if (v === null || v === undefined || v === '') return undefined
  if (typeof v === 'number') return serialToISO(v)
  if (v instanceof Date) return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`
  const t = String(v).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10)
  return undefined
}
const rawDateText = (v: unknown) => (typeof v === 'string' && !/^\d{4}-\d{2}-\d{2}/.test(v.trim()) ? v.trim() : '')

const blank = (kind: Kind, sno: number | string): Rec => ({
  id: `${kind}-${sno}`, kind, sno, area: '', doctor: '', hospital: '', location: '', duration: '', phone: '', email: '',
  status: 'Not started', nextStep: '', remarks: '', historyRaw: '', seats: '', stipend: '', eligibility: '', howToApply: '',
  website: '', notes: '', tags: [], comms: [], statusLog: [], docLinks: [], updatedAt: 0,
})

const SHEETS: { name: string; kind: Kind }[] = [
  { name: 'Final List', kind: 'fellowship' }, { name: 'Observership', kind: 'observership' }, { name: 'Foot & Ankle', kind: 'footankle' },
]

export function rowsToRecs(rows: any[][], kind: Kind): Rec[] {
  const hi = rows.findIndex(r => String(r[0]).trim() === 'S.No')
  if (hi < 0) return []
  const head = rows[hi].map(s)
  const out: Rec[] = []
  for (const row of rows.slice(hi + 1)) {
    const sno = row[0]
    if (typeof sno !== 'number' && !/^\d+$/.test(s(sno))) continue
    const g = (h: string) => { const i = head.indexOf(h); return i < 0 ? undefined : row[i] }
    const r = blank(kind, Number(sno))
    const original: Record<string, string> = {}
    head.forEach((h, i) => { if (h) original[h] = row[i] instanceof Date || typeof row[i] === 'number' ? s(row[i]) : s(row[i]) })
    r.original = original
    r.area = s(g('Area')); r.doctor = s(g('Doctor')); r.location = s(g('Location'))
    r.phone = s(g('Phone')); r.email = s(g('Email')); r.status = s(g('Status')) || 'Not started'
    r.lastUpdate = toISO(g('Last update')); r.nextStep = s(g('Next step')); r.followUp = toISO(g('Follow-up date'))
    r.remarks = s(g('Remarks'))
    // date cells typed as text keep their text in remarks of original only
    const ft = rawDateText(g('Follow-up date')); if (ft) r.remarks = (r.remarks ? r.remarks + '\n' : '') + `Follow-up: ${ft}`
    if (kind === 'fellowship') {
      r.tier = Number(g('Tier')) || undefined
      r.hospital = s(g('Hospital')); r.duration = s(g('Duration')); r.historyRaw = s(g('History'))
      r.seats = s(g('Seats')); r.stipend = s(g('Stipend / fee')); r.eligibility = s(g('Eligibility'))
      r.howToApply = s(g('How to apply')); r.website = s(g('Website')); r.notes = s(g('Notes'))
    } else {
      r.hospital = s(g('Hospital / Clinic')); r.website = s(g('Source'))
      r.notes = s(g('Kya karte hain (verified)')) || s(g('Kya hai (verified)'))
      if (kind === 'footankle') r.type = s(g('Type'))
    }
    r.comms = parseHistory(r.historyRaw).map((h, i) => ({ id: `${r.id}-h${i}`, date: h.date, text: h.text, channel: 'note' as const, source: 'import' as const }))
    r.tags = specialtyTags(r)
    r.importedAt = todayISO()
    out.push(r)
  }
  return out
}

export async function parseWorkbook(file: File): Promise<{ recs: Rec[]; sheets: Record<string, number>; warnings: string[] }> {
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  const recs: Rec[] = [], sheets: Record<string, number> = {}, warnings: string[] = []
  for (const sh of SHEETS) {
    const ws = wb.Sheets[sh.name]
    if (!ws) { warnings.push(`Sheet "${sh.name}" not found`); continue }
    const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, raw: true, defval: '' })
    const r = rowsToRecs(rows, sh.kind); sheets[sh.name] = r.length; recs.push(...r)
  }
  if (wb.Sheets['Summary']) sheets['Summary'] = -1 // recalculated live; not stored
  return { recs, sheets, warnings }
}

const SOURCE_FIELDS: (keyof Rec)[] = [
  'tier', 'type', 'area', 'doctor', 'hospital', 'location', 'duration', 'phone', 'email', 'status', 'lastUpdate', 'nextStep',
  'followUp', 'remarks', 'historyRaw', 'seats', 'stipend', 'eligibility', 'howToApply', 'website', 'notes',
]
export interface ImportItem { rec: Rec; action: 'new' | 'update' | 'same' | 'conflict'; changed: string[]; dupOf?: string; existing?: Rec }
export function buildPreview(incoming: Rec[], data: AppData) {
  const byId = new Map(data.recs.filter(r => !r.deleted).map(r => [r.id, r]))
  const key = (r: Rec) => (r.doctor + '|' + r.hospital).toLowerCase().replace(/[^a-z0-9|]/g, '')
  const byKey = new Map<string, Rec>()
  data.recs.filter(r => !r.deleted).forEach(r => byKey.set(r.kind + key(r), r))
  const seen = new Map<string, Rec>()
  const items: ImportItem[] = incoming.map(rec => {
    const ex = byId.get(rec.id)
    let dupOf: string | undefined
    const k = rec.kind + key(rec)
    const other = byKey.get(k) || seen.get(k)
    if (other && other.id !== rec.id && rec.doctor && rec.hospital) dupOf = `${other.kind === 'fellowship' ? 'Final List' : other.kind} #${other.sno}`
    seen.set(k, rec)
    if (!ex) return { rec, action: 'new', changed: [], dupOf }
    // exported History = original text + app-added lines, so "starts with" is not a real change
    const same = (f: keyof Rec) => f === 'historyRaw' ? String(rec[f] ?? '').startsWith(String(ex[f] ?? '')) : String(ex[f] ?? '') === String(rec[f] ?? '')
    const changed = SOURCE_FIELDS.filter(f => !same(f)).map(String)
    if (!changed.length) return { rec, action: 'same', changed, existing: ex, dupOf }
    return { rec, action: ex.userEdited ? 'conflict' : 'update', changed, existing: ex, dupOf }
  })
  const missing = data.recs.filter(r => !r.deleted && !incoming.some(i => i.id === r.id)).length
  return { items, missing }
}

export function applyImport(data: AppData, items: ImportItem[], accept: (i: ImportItem) => boolean): AppData {
  const recs = [...data.recs]
  const now = Date.now()
  for (const it of items) {
    if (it.action === 'same' || !accept(it)) continue
    if (it.action === 'new') { recs.push({ ...it.rec, updatedAt: now }); continue }
    const i = recs.findIndex(r => r.id === it.rec.id); if (i < 0) continue
    const ex = recs[i], src = it.rec
    const merged: Rec = { ...ex }
    for (const f of SOURCE_FIELDS) { if (f === 'historyRaw' && String(src.historyRaw).startsWith(ex.historyRaw)) continue; (merged as any)[f] = (src as any)[f] }
    merged.original = src.original; merged.importedAt = src.importedAt
    // keep app-made history; add imported comms not already present
    const ids = new Set(ex.comms.map(c => c.id))
    merged.comms = [...ex.comms, ...src.comms.filter(c => !ids.has(c.id) && !ex.comms.some(e => e.text === c.text && e.date === c.date))]
    merged.updatedAt = now
    recs[i] = merged
  }
  return { ...data, recs }
}

const HEAD_F = ['S.No', 'Tier', 'Area', 'Doctor', 'Hospital', 'Location', 'Duration', 'Phone', 'Email', 'Status', 'Last update', 'Next step', 'Follow-up date', 'Remarks', 'History', 'Seats', 'Stipend / fee', 'Eligibility', 'How to apply', 'Website', 'Notes']
const HEAD_O = ['S.No', 'Area', 'Doctor', 'Hospital / Clinic', 'Location', 'Kya karte hain (verified)', 'Phone', 'Email', 'Status', 'Last update', 'Next step', 'Follow-up date', 'Remarks', 'Source']
const HEAD_A = ['S.No', 'Type', 'Area', 'Doctor', 'Hospital / Clinic', 'Location', 'Kya hai (verified)', 'Phone', 'Email', 'Status', 'Last update', 'Next step', 'Follow-up date', 'Remarks', 'Source']
const D = (iso?: string) => (iso ? new Date(iso + 'T00:00:00') : '')
const historyOut = (r: Rec) => {
  const added = r.comms.filter(c => c.source !== 'import' && c.channel !== 'status').map(c => `${c.date.slice(8)}-${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+c.date.slice(5, 7) - 1]}: ${c.text}`)
  return [r.historyRaw, ...added].filter(Boolean).join('\n')
}

export function exportWorkbook(data: AppData): XLSX.WorkBook {
  const wb = XLSX.utils.book_new()
  const by = (k: Kind) => data.recs.filter(r => !r.deleted && r.kind === k).sort((a, b) => Number(a.sno) - Number(b.sno))
  const F = by('fellowship')
  // Summary
  const sumRows: any[][] = [['FellowTrack — Fellowship Application Summary'], [`Exported ${todayISO()}`], [], ['Status', 'Tier 1', 'Tier 2', 'Tier 3', 'Total']]
  const st = new Set<string>([...STATUSES, ...F.map(r => String(r.status))])
  st.forEach(x => {
    const c = (t: number) => F.filter(r => r.status === x && r.tier === t).length
    sumRows.push([x, c(1), c(2), c(3), F.filter(r => r.status === x).length])
  })
  sumRows.push(['Total', ...[1, 2, 3].map(t => F.filter(r => r.tier === t).length), F.length])
  const wsS = XLSX.utils.aoa_to_sheet(sumRows); wsS['!cols'] = [{ wch: 24 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 9 }]
  XLSX.utils.book_append_sheet(wb, wsS, 'Summary')
  const fin = F.map(r => [r.sno, r.tier, r.area, r.doctor, r.hospital, r.location, r.duration, r.phone, r.email, r.status, D(r.lastUpdate), r.nextStep, D(r.followUp), r.remarks, historyOut(r), r.seats, r.stipend, r.eligibility, r.howToApply, r.website, r.notes])
  const w1 = XLSX.utils.aoa_to_sheet([HEAD_F, ...fin], { cellDates: true })
  w1['!cols'] = HEAD_F.map((h, i) => ({ wch: [6, 5, 22, 24, 28, 20, 12, 18, 26, 14, 12, 22, 12, 30, 40, 18, 18, 26, 30, 22, 40][i] }))
  XLSX.utils.book_append_sheet(wb, w1, 'Final List')
  const O = by('observership').map(r => [r.sno, r.area, r.doctor, r.hospital, r.location, r.notes, r.phone, r.email, r.status, D(r.lastUpdate), r.nextStep, D(r.followUp), r.remarks, r.website])
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([HEAD_O, ...O], { cellDates: true }), 'Observership')
  const A = by('footankle').map(r => [r.sno, r.type || '', r.area, r.doctor, r.hospital, r.location, r.notes, r.phone, r.email, r.status, D(r.lastUpdate), r.nextStep, D(r.followUp), r.remarks, r.website])
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([HEAD_A, ...A], { cellDates: true }), 'Foot & Ankle')
  return wb
}
export const workbookBlob = (wb: XLSX.WorkBook) =>
  new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellDates: true })], { type: 'application/octet-stream' })
