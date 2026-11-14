import type { AppData } from '../types'
import { recTitle, todayISO } from './util'

export interface IcsEvent { uid: string; date: string; time?: string; title: string; desc?: string }
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\;')
const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
const fold = (l: string) => (l.length <= 74 ? l : l.match(/.{1,73}/g)!.join('\r\n '))

export function buildIcs(events: IcsEvent[]): string {
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//FellowTrack//Fellowship Tracker//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:FellowTrack']
  for (const e of events) {
    const d = e.date.replace(/-/g, '')
    L.push('BEGIN:VEVENT', `UID:${e.uid}@fellowtrack`, `DTSTAMP:${stamp()}`)
    if (e.time) {
      const t = e.time.replace(':', '') + '00'
      const [h, m] = e.time.split(':').map(Number); const end = `${String(Math.min(h + 1, 23)).padStart(2, '0')}${String(m).padStart(2, '0')}00`
      L.push(`DTSTART:${d}T${t}`, `DTEND:${d}T${end}`)
    } else {
      const nx = new Date(e.date + 'T00:00:00'); nx.setDate(nx.getDate() + 1)
      L.push(`DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${nx.getFullYear()}${String(nx.getMonth() + 1).padStart(2, '0')}${String(nx.getDate()).padStart(2, '0')}`)
    }
    L.push(`SUMMARY:${esc(e.title)}`)
    if (e.desc) L.push(`DESCRIPTION:${esc(e.desc)}`)
    if (e.time) L.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(e.title)}`, 'TRIGGER:-PT30M', 'END:VALARM')
    else L.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(e.title)}`, 'TRIGGER;RELATED=START:PT9H', 'END:VALARM',
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:Tomorrow: ${esc(e.title)}`, 'TRIGGER;RELATED=START:-PT6H', 'END:VALARM')
    L.push('END:VEVENT')
  }
  L.push('END:VCALENDAR')
  return L.map(fold).join('\r\n')
}

/** All open follow-ups, interviews and tasks, from today onward (stable UIDs so re-importing updates, not duplicates). */
export function upcomingEvents(data: AppData): IcsEvent[] {
  const out: IcsEvent[] = []
  for (const r of data.recs) if (!r.deleted && r.followUp && r.followUp >= todayISO() && !['Rejected', 'Dropped'].includes(String(r.status)))
    out.push({ uid: 'rec-' + r.id, date: r.followUp, title: `${r.status === 'Exam / Interview' ? 'Interview' : 'Follow-up'}: ${recTitle(r)}`, desc: [r.doctor, r.nextStep, r.phone].filter(Boolean).join('\n') })
  for (const t of data.tasks) if (!t.deleted && !t.done && t.date >= todayISO()) out.push({ uid: 'task-' + t.id, date: t.date, time: t.time, title: t.title })
  return out
}
