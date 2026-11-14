import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus, Check, Trash2, CalendarPlus } from 'lucide-react'
import { buildIcs, upcomingEvents } from '../lib/ics'
import type { Task } from '../types'
import { useStore } from '../lib/store'
import { Card, Field, H, Modal, cx } from '../components/ui'
import { downloadBlob, addDays, daysFromToday, fmtDate, recTitle, relDays, todayISO, uid } from '../lib/util'

type Ev = { id: string; date: string; time?: string; title: string; kind: string; done?: boolean; recId?: string; taskId?: string }
const KINDS = ['task', 'interview', 'deadline', 'joining', 'call'] as const
const COLOR: Record<string, string> = { 'follow-up': 'bg-amber-100 text-amber-800', interview: 'bg-violet-100 text-violet-700', deadline: 'bg-red-100 text-red-700', joining: 'bg-green-100 text-green-800', call: 'bg-sky-100 text-sky-700', task: 'bg-teal-100 text-teal-700' }
const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export default function CalendarPage() {
  const { data, upsertTask, patchRec } = useStore()
  const [view, setView] = useState<'month' | 'week' | 'agenda'>('month')
  const [cursor, setCursor] = useState(todayISO())
  const [sel, setSel] = useState(todayISO())
  const [edit, setEdit] = useState<Task | null>(null)
  const [resched, setResched] = useState<Ev | null>(null), [newDate, setNewDate] = useState('')

  const events = useMemo(() => {
    const e: Ev[] = []
    for (const r of data.recs) if (!r.deleted && r.followUp && !['Rejected', 'Dropped'].includes(String(r.status)))
      e.push({ id: 'r' + r.id, date: r.followUp, title: `${recTitle(r)}${r.nextStep ? ' — ' + r.nextStep : ''}`, kind: r.status === 'Exam / Interview' ? 'interview' : 'follow-up', recId: r.id })
    for (const t of data.tasks) if (!t.deleted) e.push({ id: 't' + t.id, date: t.date, time: t.time, title: t.title, kind: t.type, done: t.done, recId: t.recId, taskId: t.id })
    return e.sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
  }, [data])
  const on = (iso: string) => events.filter(e => e.date === iso)
  const c = new Date(cursor + 'T00:00:00')
  const monthStart = new Date(c.getFullYear(), c.getMonth(), 1)
  const cells = Array.from({ length: 42 }, (_, i) => { const d = new Date(monthStart); d.setDate(1 - monthStart.getDay() + i); return d })
  const weekStart = addDays(cursor, -c.getDay())
  const shift = (n: number) => setCursor(view === 'month' ? isoOf(new Date(c.getFullYear(), c.getMonth() + n, 1)) : addDays(cursor, n * 7))

  const complete = (e: Ev) => {
    if (e.taskId) { const t = data.tasks.find(x => x.id === e.taskId)!; upsertTask({ ...t, done: !t.done }) }
    else if (e.recId) patchRec(e.recId, { followUp: undefined })
  }
  const doResched = () => {
    if (!resched || !newDate) return
    if (resched.taskId) { const t = data.tasks.find(x => x.id === resched.taskId)!; upsertTask({ ...t, date: newDate }) } else if (resched.recId) patchRec(resched.recId, { followUp: newDate })
    setResched(null)
  }
  const EvRow = ({ e }: { e: Ev }) => {
    const od = !e.done && (daysFromToday(e.date) ?? 1) < 0
    return (
      <div className={cx('flex items-start gap-2 py-2 border-b border-line/60', e.done && 'opacity-50')}>
        <button aria-label="Mark complete" onClick={() => complete(e)} className={cx('mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0', e.done ? 'bg-teal border-teal text-white' : 'border-slate-300')}>{e.done && <Check size={13} />}</button>
        <div className="min-w-0 flex-1">
          <div className={cx('text-sm font-medium', e.done && 'line-through')}>{e.recId ? <Link to={`/r/${e.recId}`} className="hover:text-teal">{e.title}</Link> : e.title}</div>
          <div className="flex flex-wrap items-center gap-2 mt-0.5"><span className={cx('text-[10px] rounded-full px-2 py-0.5 font-medium', COLOR[e.kind])}>{e.kind}</span>
            <span className={cx('text-xs', od ? 'text-red-600 font-medium' : 'text-slate-500')}>{fmtDate(e.date)}{e.time ? ' · ' + e.time : ''} · {relDays(e.date)}</span></div>
        </div>
        <button className="text-xs text-teal hover:underline" onClick={() => { setResched(e); setNewDate(e.date) }}>Reschedule</button>
        <button aria-label="Add to phone calendar" title="Add to iPhone / phone calendar" className="text-slate-400 hover:text-teal" onClick={() => downloadBlob(new Blob([buildIcs([{ uid: e.id, date: e.date, time: e.time, title: e.title }])], { type: 'text/calendar' }), 'fellowtrack-event.ics')}><CalendarPlus size={14} /></button>
        {e.taskId && <button aria-label="Delete task" className="text-slate-400 hover:text-red-600" onClick={() => { const t = data.tasks.find(x => x.id === e.taskId)!; upsertTask({ ...t, deleted: true }) }}><Trash2 size={14} /></button>}
      </div>)
  }
  const overdue = events.filter(e => !e.done && e.date < todayISO())
  return (
    <div>
      <H title="Calendar & Reminders" sub="Follow-ups from your programmes plus your own tasks, interviews and deadlines"
        right={<><button className="btn btn-ghost" onClick={() => downloadBlob(new Blob([buildIcs(upcomingEvents(data))], { type: 'text/calendar' }), 'fellowtrack-calendar.ics')}><CalendarPlus size={16} /> <span className="hidden sm:inline">iPhone calendar (.ics)</span></button><button className="btn btn-primary" onClick={() => setEdit({ id: uid(), title: '', date: sel, type: 'task', done: false, updatedAt: 0 })}><Plus size={16} /> Add</button></>} />
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="flex gap-1 bg-white border border-line rounded-xl p-1">{(['month', 'week', 'agenda'] as const).map(v => <button key={v} className={cx('btn !py-1 !px-3 capitalize', view === v ? 'btn-navy' : 'text-slate-600')} onClick={() => setView(v)}>{v}</button>)}</div>
        {view !== 'agenda' && <><button className="btn btn-ghost !p-2" aria-label="Previous" onClick={() => shift(-1)}><ChevronLeft size={16} /></button>
          <div className="font-semibold min-w-32 text-center">{view === 'month' ? c.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : `${fmtDate(weekStart)} – ${fmtDate(addDays(weekStart, 6))}`}</div>
          <button className="btn btn-ghost !p-2" aria-label="Next" onClick={() => shift(1)}><ChevronRight size={16} /></button>
          <button className="btn btn-ghost" onClick={() => { setCursor(todayISO()); setSel(todayISO()) }}>Today</button></>}
      </div>
      {overdue.length > 0 && <Card className="p-3 mb-3 border-red-200 bg-red-50/50"><div className="text-sm font-semibold text-red-700 mb-1">{overdue.length} overdue</div>{overdue.slice(0, 5).map(e => <EvRow key={e.id} e={e} />)}</Card>}
      {view === 'month' && (
        <div className="grid lg:grid-cols-[1fr_320px] gap-4">
          <Card className="p-2 md:p-3">
            <div className="grid grid-cols-7 text-center text-[11px] text-slate-400 mb-1">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}</div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map(d => { const iso = isoOf(d), ev = on(iso), cur = d.getMonth() === c.getMonth()
                return <button key={iso} aria-label={iso} onClick={() => setSel(iso)} className={cx('min-h-[54px] md:min-h-[78px] rounded-xl border p-1 text-left align-top transition', iso === sel ? 'border-teal bg-teal-50' : 'border-line/60 hover:bg-navy-50', !cur && 'opacity-40')}>
                  <div className={cx('text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full', iso === todayISO() && 'bg-teal text-white')}>{d.getDate()}</div>
                  <div className="hidden md:block space-y-0.5 mt-0.5">{ev.slice(0, 2).map(e => <div key={e.id} className={cx('text-[10px] truncate rounded px-1', COLOR[e.kind])}>{e.title}</div>)}{ev.length > 2 && <div className="text-[10px] text-slate-400">+{ev.length - 2} more</div>}</div>
                  <div className="md:hidden flex gap-0.5 mt-1 flex-wrap">{ev.slice(0, 3).map(e => <span key={e.id} className="w-1.5 h-1.5 rounded-full bg-teal" />)}</div>
                </button> })}
            </div>
          </Card>
          <Card className="p-4 h-fit"><div className="font-semibold mb-1">{fmtDate(sel)}</div>{on(sel).length === 0 ? <div className="text-sm text-slate-400 py-4">Nothing scheduled.</div> : on(sel).map(e => <EvRow key={e.id} e={e} />)}
            <button className="btn btn-ghost w-full mt-3" onClick={() => setEdit({ id: uid(), title: '', date: sel, type: 'task', done: false, updatedAt: 0 })}><Plus size={14} /> Add on this day</button></Card>
        </div>)}
      {view === 'week' && (
        <div className="grid md:grid-cols-7 gap-2">{Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map(iso => (
          <Card key={iso} className={cx('p-2.5 min-h-[120px]', iso === todayISO() && 'border-teal')}>
            <div className="text-xs font-semibold mb-1">{new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })}</div>
            {on(iso).map(e => <div key={e.id} className={cx('text-[11px] rounded-lg px-1.5 py-1 mb-1', COLOR[e.kind], e.done && 'line-through opacity-50')}>{e.recId ? <Link to={`/r/${e.recId}`}>{e.title}</Link> : e.title}</div>)}</Card>))}</div>)}
      {view === 'agenda' && <Card className="p-4">{events.filter(e => !e.done && e.date >= todayISO()).length === 0 ? <div className="text-sm text-slate-400">No upcoming items.</div> : events.filter(e => !e.done && e.date >= todayISO()).map(e => <EvRow key={e.id} e={e} />)}
        {events.some(e => e.done) && <details className="mt-3"><summary className="text-xs text-slate-500 cursor-pointer">Completed</summary>{events.filter(e => e.done).map(e => <EvRow key={e.id} e={e} />)}</details>}</Card>}

      <Modal open={!!edit} onClose={() => setEdit(null)} title="Add reminder / task"
        footer={<><button className="btn btn-ghost" onClick={() => setEdit(null)}>Cancel</button><button className="btn btn-primary" disabled={!edit?.title.trim()} onClick={() => { if (edit) upsertTask(edit); setEdit(null) }}>Save</button></>}>
        {edit && <div className="space-y-3">
          <Field label="Title"><input className="inp" autoFocus value={edit.title} onChange={e => setEdit({ ...edit, title: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Date"><input type="date" className="inp" value={edit.date} onChange={e => setEdit({ ...edit, date: e.target.value })} /></Field>
            <Field label="Time (optional)"><input type="time" className="inp" value={edit.time || ''} onChange={e => setEdit({ ...edit, time: e.target.value || undefined })} /></Field></div>
          <Field label="Type"><select className="inp" value={edit.type} onChange={e => setEdit({ ...edit, type: e.target.value as any })}>{KINDS.map(k => <option key={k}>{k}</option>)}</select></Field>
          <Field label="Link to programme (optional)"><select className="inp" value={edit.recId || ''} onChange={e => setEdit({ ...edit, recId: e.target.value || undefined })}><option value="">—</option>{data.recs.filter(r => !r.deleted).sort((a, b) => recTitle(a).localeCompare(recTitle(b))).map(r => <option key={r.id} value={r.id}>{recTitle(r)}</option>)}</select></Field>
        </div>}
      </Modal>
      <Modal open={!!resched} onClose={() => setResched(null)} title="Reschedule" footer={<><button className="btn btn-ghost" onClick={() => setResched(null)}>Cancel</button><button className="btn btn-primary" onClick={doResched}>Save</button></>}>
        <div className="space-y-2"><div className="text-sm font-medium">{resched?.title}</div><input type="date" className="inp" value={newDate} onChange={e => setNewDate(e.target.value)} aria-label="New date" /></div>
      </Modal>
    </div>
  )
}
