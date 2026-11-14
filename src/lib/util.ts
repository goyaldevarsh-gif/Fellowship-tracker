import type { Rec, Status } from '../types'

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4)
export const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export const addDays = (iso: string, n: number) => {
  const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export const daysFromToday = (iso?: string) => {
  if (!iso) return null
  const a = new Date(iso + 'T00:00:00').getTime(), b = new Date(todayISO() + 'T00:00:00').getTime()
  return Math.round((a - b) / 86400000)
}
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const fmtDate = (iso?: string) => {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-').map(Number)
  if (!y) return iso
  return `${d} ${MON[m - 1]} ${y}`
}
export const fmtShort = (iso?: string) => {
  if (!iso) return '—'
  const [, m, d] = iso.split('-').map(Number)
  return `${d} ${MON[m - 1]}`
}
export const relDays = (iso?: string) => {
  const n = daysFromToday(iso)
  if (n === null) return ''
  if (n === 0) return 'today'
  if (n === 1) return 'tomorrow'
  if (n === -1) return 'yesterday'
  return n > 0 ? `in ${n} days` : `${-n} days overdue`
}
export const NA = 'Not available'
export const show = (v?: string | number | null) => (v === undefined || v === null || String(v).trim() === '' ? NA : String(v))

export const STATUS_STYLE: Record<string, string> = {
  'Not started': 'bg-slate-100 text-slate-600',
  'Enquiry sent': 'bg-sky-50 text-sky-700',
  'CV mailed': 'bg-blue-50 text-blue-700',
  'Waiting for email id': 'bg-amber-50 text-amber-700',
  'Reply awaited': 'bg-amber-50 text-amber-700',
  'Replied': 'bg-emerald-50 text-emerald-700',
  'Spoke on call': 'bg-teal-50 text-teal-700',
  'Applied': 'bg-emerald-100 text-emerald-800',
  'Exam / Interview': 'bg-violet-100 text-violet-700',
  'Offer': 'bg-green-200 text-green-900',
  'Rejected': 'bg-red-50 text-red-700',
  'Dropped': 'bg-zinc-100 text-zinc-500',
  'On hold': 'bg-zinc-100 text-zinc-600',
}
export const STATUS_DOT: Record<string, string> = {
  'Not started': '#94a3b8', 'Enquiry sent': '#38bdf8', 'CV mailed': '#3b82f6', 'Waiting for email id': '#f59e0b',
  'Reply awaited': '#f59e0b', 'Replied': '#10b981', 'Spoke on call': '#14b8a6', 'Applied': '#059669',
  'Exam / Interview': '#8b5cf6', 'Offer': '#16a34a', 'Rejected': '#ef4444', 'Dropped': '#a1a1aa', 'On hold': '#a1a1aa',
}
export const isActive = (s: string) => !['Rejected', 'Dropped'].includes(s)

// ---- contacts ----
export function extractPhones(text: string): { raw: string; tel: string; mobile: boolean }[] {
  const out: { raw: string; tel: string; mobile: boolean }[] = []
  const seen = new Set<string>()
  const re = /(\+?\d[\d\s\-()]{7,}\d)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text || ''))) {
    const raw = m[1].trim()
    let digits = raw.replace(/\D/g, '')
    if (digits.length < 8) continue
    let mobile = false
    if (digits.length === 12 && digits.startsWith('91')) { digits = digits.slice(2) }
    if (digits.length === 11 && digits.startsWith('0') && /^0[6-9]/.test(digits)) digits = digits.slice(1)
    if (digits.length === 10 && /^[6-9]/.test(digits)) mobile = true
    const tel = mobile ? '+91' + digits : digits.length >= 10 && raw.startsWith('+') ? '+' + digits : digits
    if (seen.has(tel)) continue
    seen.add(tel)
    out.push({ raw, tel, mobile })
  }
  return out
}
export function extractEmails(text: string): string[] {
  return Array.from(new Set((text || '').match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) || []))
}
export const waLink = (tel: string, msg: string) => `https://wa.me/${tel.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`
export const mailLink = (to: string, subject: string, body: string) =>
  `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

export function fillTemplate(t: string, r: Pick<Rec, 'doctor' | 'hospital' | 'location'>) {
  const doc = (r.doctor || '').replace(/^Not stated$/i, '').trim()
  return t
    .replace(/\{doctor\}/g, doc || 'Sir/Madam')
    .replace(/\{hospital\}/g, r.hospital || 'your institute')
    .replace(/\{location\}/g, r.location || '')
}

export function parseHistory(raw: string): { date: string; text: string }[] {
  // "13-Nov: text" lines -> entries (year assumed current application cycle, 2026) ; kept alongside raw text
  const out: { date: string; text: string }[] = []
  const mon: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }
  for (const line of (raw || '').split('\n')) {
    const m = line.match(/^\s*(\d{1,2})[-\s]([A-Za-z]{3})[a-z]*\s*[:\-–]\s*(.*)$/)
    if (!m) { if (line.trim()) out.push({ date: '', text: line.trim() }); continue }
    const mm = mon[m[2].toLowerCase()]
    if (!mm) { out.push({ date: '', text: line.trim() }); continue }
    out.push({ date: `2026-${String(mm).padStart(2, '0')}-${m[1].padStart(2, '0')}`, text: m[3].trim() })
  }
  return out
}

export const SPECIALTY_KEYS: [string, RegExp][] = [
  ['Arthroscopy', /arthroscop/i], ['Arthroplasty', /arthroplast|replacement|TKR|THR/i],
  ['Sports Medicine', /sport/i], ['Trauma', /trauma/i], ['Foot & Ankle', /foot|ankle/i], ['Spine', /spine/i],
]
export function specialtyTags(r: Rec): string[] {
  const hay = [r.hospital, r.doctor, r.type, r.notes, r.remarks, r.howToApply, r.duration].join(' ')
  return SPECIALTY_KEYS.filter(([, re]) => re.test(hay)).map(([k]) => k)
}
export const recTitle = (r: Rec) => (r.hospital || r.doctor || 'Untitled')
export function sortByFollow(a: Rec, b: Rec) {
  return (a.followUp || '9999').localeCompare(b.followUp || '9999')
}
export function downloadBlob(blob: Blob, name: string) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}
