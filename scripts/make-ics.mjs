// Builds dist/cal/<CAL_SECRET>.ics from the PRIVATE data repo (db.json). Runs in GitHub Actions only.
// Titles carry only programme names + type (no phones, emails, notes). Never logs data.
import fs from 'node:fs'

const REPO = process.env.DATA_REPO || 'goyaldevarsh-gif/fellowship-data'
const SECRET = process.env.CAL_SECRET
const OUT = process.env.OUT_DIR || 'dist/cal'
if (!SECRET || SECRET.length < 16) { console.error('CAL_SECRET missing or too short (min 16 chars)'); process.exit(1) }

async function load() {
  if (process.env.DATA_FILE) return JSON.parse(fs.readFileSync(process.env.DATA_FILE, 'utf8'))
  const r = await fetch(`https://api.github.com/repos/${REPO}/contents/db.json?ref=main`, {
    headers: { Authorization: `Bearer ${process.env.DATA_TOKEN}`, Accept: 'application/vnd.github.raw+json', 'X-GitHub-Api-Version': '2022-11-28' },
  })
  if (!r.ok) throw new Error(`db.json fetch failed: ${r.status}`)
  return JSON.parse(await r.text())
}
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()) // yyyy-mm-dd
const esc = s => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\;')
const fold = l => (l.length <= 74 ? l : l.match(/.{1,73}/g).join('\r\n '))
const nextDay = d => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + 1); return x.toISOString().slice(0, 10).replace(/-/g, '') }

const db = await load()
const ev = []
for (const r of db.recs || []) {
  if (r.deleted || !r.followUp || r.followUp < today || ['Rejected', 'Dropped', 'Offer'].includes(r.status)) continue
  const kind = r.status === 'Exam / Interview' ? 'Interview' : 'Follow-up'
  ev.push({ uid: `rec-${r.id}`, date: r.followUp, title: `${kind}: ${r.hospital || r.doctor}` })
}
for (const t of db.tasks || []) {
  if (t.deleted || t.done || !t.date || t.date < today) continue
  ev.push({ uid: `task-${t.id}`, date: t.date, time: t.time, title: t.title })
}
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//FellowTrack//Feed//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:FellowTrack', 'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H']
for (const e of ev) {
  const d = e.date.replace(/-/g, '')
  L.push('BEGIN:VEVENT', `UID:${e.uid}@fellowtrack`, `DTSTAMP:${stamp}`)
  if (e.time) {
    const [h, m] = e.time.split(':').map(Number)
    L.push(`DTSTART;TZID=Asia/Kolkata:${d}T${e.time.replace(':', '')}00`, `DTEND;TZID=Asia/Kolkata:${d}T${String(Math.min(h + 1, 23)).padStart(2, '0')}${String(m).padStart(2, '0')}00`)
  } else L.push(`DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${nextDay(e.date)}`)
  L.push(`SUMMARY:${esc(e.title)}`)
  if (e.time) L.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(e.title)}`, 'TRIGGER:-PT30M', 'END:VALARM')
  else L.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(e.title)}`, 'TRIGGER;RELATED=START:PT9H', 'END:VALARM')
  L.push('END:VEVENT')
}
L.push('END:VCALENDAR')
fs.mkdirSync(OUT, { recursive: true })
fs.writeFileSync(`${OUT}/${SECRET}.ics`, L.map(fold).join('\r\n') + '\r\n')
console.log(`calendar feed written (${ev.length} events)`) // count only
