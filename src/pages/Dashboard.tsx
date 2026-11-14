import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Building2, Send, Clock, CalendarCheck, CheckCircle2, XCircle, ChevronRight, AlertCircle, Zap, History } from 'lucide-react'
import { useRecs, useStore } from '../lib/store'
import { Card, StatusBadge, Empty, cx, TierBadge } from '../components/ui'
import { STATUS_DOT, daysFromToday, fmtDate, fmtShort, relDays, recTitle, todayISO } from '../lib/util'
import NextUp from '../components/NextUp'

const PIPE = ['Not started', 'Enquiry sent', 'CV mailed', 'Waiting for email id', 'Reply awaited', 'Replied', 'Spoke on call', 'Applied', 'Exam / Interview', 'Offer', 'Rejected', 'Dropped', 'On hold']

export default function Dashboard() {
  const { data } = useStore(); const nav = useNavigate()
  const recs = useRecs('fellowship')
  const [stage, setStage] = useState<string | null>(null)
  const h = new Date().getHours()
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  const cnt = (s: string[]) => recs.filter(r => s.includes(String(r.status))).length
  const tier = (t: number) => recs.filter(r => r.tier === t).length

  const stats = [
    { label: 'Total fellowships', v: recs.length, icon: Building2, to: '/fellowships', tone: 'bg-teal-50 text-teal' },
    { label: 'Contacted / applied', v: cnt(['CV mailed', 'Applied', 'Exam / Interview', 'Offer', 'Replied', 'Spoke on call', 'Reply awaited']), icon: Send, to: '/applications', tone: 'bg-sky-50 text-sky-600' },
    { label: 'Awaiting response', v: cnt(['Reply awaited', 'CV mailed', 'Enquiry sent']), icon: Clock, to: '/fellowships?status=CV mailed', tone: 'bg-amber-50 text-amber-600' },
    { label: 'Interviews', v: cnt(['Exam / Interview']), icon: CalendarCheck, to: '/fellowships?status=Exam / Interview', tone: 'bg-violet-50 text-violet-600' },
    { label: 'Selected', v: cnt(['Offer']), icon: CheckCircle2, to: '/fellowships?status=Offer', tone: 'bg-green-50 text-green-700' },
    { label: 'Rejected', v: cnt(['Rejected']), icon: XCircle, to: '/fellowships?status=Rejected', tone: 'bg-red-50 text-red-600' },
  ]
  const statusRow = ['Not started', 'Enquiry sent', 'CV mailed', 'Reply awaited', 'Replied', 'Applied', 'Exam / Interview', 'Offer', 'Rejected']

  const agenda = useMemo(() => {
    const items: { date: string; title: string; sub: string; to?: string; kind: string }[] = []
    for (const r of data.recs) if (!r.deleted && r.followUp && !['Rejected', 'Dropped'].includes(String(r.status)))
      items.push({ date: r.followUp, title: recTitle(r), sub: r.status === 'Exam / Interview' ? `Interview · ${r.nextStep || ''}` : `Follow-up · ${r.nextStep || r.status}`, to: `/r/${r.id}`, kind: r.status === 'Exam / Interview' ? 'interview' : 'follow-up' })
    for (const t of data.tasks) if (!t.deleted && !t.done) items.push({ date: t.date, title: t.title, sub: t.type, to: t.recId ? `/r/${t.recId}` : '/calendar', kind: t.type })
    return items.sort((a, b) => a.date.localeCompare(b.date))
  }, [data])
  const overdue = agenda.filter(a => a.date < todayISO()), today = agenda.filter(a => a.date === todayISO())
  const upcoming = agenda.filter(a => a.date > todayISO() && (daysFromToday(a.date) ?? 99) <= 30).slice(0, 8)

  const actions = useMemo(() => {
    const a: { text: string; tag: string; tone: string; to: string }[] = []
    overdue.slice(0, 4).forEach(o => a.push({ text: `Follow up — ${o.title}`, tag: relDays(o.date), tone: 'bg-red-50 text-red-600', to: o.to || '/calendar' }))
    today.slice(0, 4).forEach(o => a.push({ text: `${o.sub.split(' · ')[0]} — ${o.title}`, tag: 'Today', tone: 'bg-amber-50 text-amber-700', to: o.to || '/calendar' }))
    recs.filter(r => r.tier === 1 && r.status === 'Not started').slice(0, 3).forEach(r => a.push({ text: `Send CV — ${recTitle(r)}`, tag: 'Tier 1', tone: 'bg-teal-50 text-teal-600', to: `/r/${r.id}` }))
    recs.filter(r => r.status === 'Waiting for email id').slice(0, 2).forEach(r => a.push({ text: `Get email id — ${recTitle(r)}`, tag: 'Pending', tone: 'bg-amber-50 text-amber-700', to: `/r/${r.id}` }))
    return a.slice(0, 8)
  }, [recs, overdue, today])

  const recent = useMemo(() => {
    const e: { date: string; text: string; rec: string; id: string; at: number }[] = []
    for (const r of data.recs) if (!r.deleted) for (const c of r.comms) if (c.date) e.push({ date: c.date, text: c.text, rec: recTitle(r), id: r.id, at: r.updatedAt })
    return e.sort((a, b) => b.date.localeCompare(a.date) || b.at - a.at).slice(0, 8)
  }, [data])

  const stageRecs = stage ? recs.filter(r => r.status === stage) : []
  if (!recs.length) return (
    <Card><Empty title="No fellowship data yet" sub="Import your Fellowship_Tracker.xlsx, or connect the private data repo in Settings to sync your records."
      action={<button className="btn btn-primary" onClick={() => nav('/settings')}>Go to Settings</button>} /></Card>)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">{greet}, Dr. Devarsh <span className="text-xl">👋</span></h1>
        <p className="text-sm text-slate-500">Your fellowship journey at a glance.</p>
      </div>
      <NextUp />
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {stats.map(s => (
          <Link key={s.label} to={s.to} className="card p-3.5 flex items-center gap-3 hover:shadow-md transition">
            <div className={cx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', s.tone)}><s.icon size={19} /></div>
            <div className="min-w-0"><div className="text-2xl font-bold leading-none">{s.v}</div><div className="text-[11px] text-slate-500 mt-1 leading-tight">{s.label}</div></div>
          </Link>))}
      </div>
      <Card className="p-4">
        <div className="flex flex-wrap gap-2 items-center text-sm">
          <span className="font-semibold mr-1">By tier</span>
          {[1, 2, 3].map(t => <Link key={t} to={`/fellowships?tier=${t}`} className="chip"><TierBadge tier={t} /> {tier(t)} programmes</Link>)}
          <span className="mx-2 text-slate-300 hidden md:inline">|</span>
          {statusRow.map(s => <Link key={s} to={`/fellowships?status=${encodeURIComponent(s)}`} className="chip"><span className="w-2 h-2 rounded-full" style={{ background: STATUS_DOT[s] }} />{s} · {cnt([s])}</Link>)}
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3"><h2 className="font-semibold">Application pipeline</h2><Link to="/applications" className="text-xs text-teal flex items-center">Open board <ChevronRight size={14} /></Link></div>
        <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-2">
          {PIPE.map(s => (
            <button key={s} onClick={() => setStage(stage === s ? null : s)} aria-label={`Stage ${s}`}
              className={cx('min-w-[108px] rounded-xl border px-3 py-2.5 text-left transition', stage === s ? 'border-teal bg-teal-50' : 'border-line bg-paper hover:bg-navy-50')}>
              <div className="text-[11px] text-slate-500 leading-tight h-7">{s}</div>
              <div className="text-xl font-bold" style={{ color: STATUS_DOT[s] }}>{cnt([s])}</div>
            </button>))}
        </div>
        {stage && (
          <div className="mt-3 border-t border-line pt-3">
            <div className="text-xs text-slate-500 mb-2">{stage} — {stageRecs.length} programme(s)</div>
            {stageRecs.length === 0 ? <div className="text-sm text-slate-400">None in this stage.</div> :
              <div className="grid md:grid-cols-2 gap-1">{stageRecs.map(r => (
                <Link key={r.id} to={`/r/${r.id}`} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-navy-50 text-sm"><TierBadge tier={r.tier} /><span className="font-medium truncate">{recTitle(r)}</span><span className="text-slate-500 truncate">{r.doctor}</span></Link>))}</div>}
          </div>)}
      </Card>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="p-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><AlertCircle size={17} className="text-red-500" />Upcoming deadlines & follow-ups</h2>
          {agenda.length === 0 ? <div className="text-sm text-slate-400">Nothing scheduled.</div> : (
            <div className="space-y-1">
              {[...overdue.map(x => ({ ...x, tone: 'overdue' })), ...today.map(x => ({ ...x, tone: 'today' })), ...upcoming.map(x => ({ ...x, tone: 'soon' }))].slice(0, 10).map((a, i) => (
                <Link key={i} to={a.to || '/calendar'} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-navy-50">
                  <div className={cx('w-12 shrink-0 text-center rounded-lg py-1 text-xs font-semibold', a.tone === 'overdue' ? 'bg-red-50 text-red-600' : a.tone === 'today' ? 'bg-amber-50 text-amber-700' : 'bg-navy-50 text-navy')}>{fmtShort(a.date)}</div>
                  <div className="min-w-0 flex-1"><div className="text-sm font-medium truncate">{a.title}</div><div className="text-xs text-slate-500 truncate">{a.sub} · {relDays(a.date)}</div></div>
                  <ChevronRight size={15} className="text-slate-300" />
                </Link>))}
            </div>)}
        </Card>
        <Card className="p-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><Zap size={17} className="text-teal" />Priority actions</h2>
          {actions.length === 0 ? <div className="text-sm text-slate-400">All caught up.</div> : actions.map((a, i) => (
            <Link key={i} to={a.to} className="flex items-center justify-between gap-2 px-2 py-2 rounded-xl hover:bg-navy-50 text-sm">
              <span className="truncate">{a.text}</span><span className={cx('text-[11px] rounded-full px-2 py-0.5 whitespace-nowrap', a.tone)}>{a.tag}</span></Link>))}
        </Card>
      </div>
      <Card className="p-4">
        <h2 className="font-semibold mb-3 flex items-center gap-2"><History size={17} className="text-navy-600" />Recent activity</h2>
        {recent.length === 0 ? <div className="text-sm text-slate-400">No communication recorded yet.</div> : recent.map((e, i) => (
          <Link key={i} to={`/r/${e.id}`} className="flex gap-3 px-2 py-2 rounded-xl hover:bg-navy-50 text-sm">
            <span className="text-xs text-slate-500 w-16 shrink-0 pt-0.5">{fmtShort(e.date)}</span>
            <span className="min-w-0"><span className="font-medium">{e.rec}</span><span className="text-slate-600"> — {e.text}</span></span>
          </Link>))}
      </Card>
    </div>
  )
}
