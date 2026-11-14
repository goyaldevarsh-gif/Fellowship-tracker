import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Building2, Send, CalendarCheck, CheckCircle2, ChevronRight, LayoutGrid } from 'lucide-react'
import { useRecs, useStore } from '../lib/store'
import { Card, Empty, cx } from '../components/ui'
import NextUp from '../components/NextUp'
import { fmtShort, recTitle, relDays, todayISO, daysFromToday } from '../lib/util'

export default function Dashboard() {
  const { data } = useStore(); const nav = useNavigate()
  const recs = useRecs('fellowship')
  const h = new Date().getHours()
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  const cnt = (s: string[]) => recs.filter(r => s.includes(String(r.status))).length

  const stats = [
    { label: 'Fellowships', v: recs.length, icon: Building2, to: '/fellowships', tone: 'bg-teal-50 text-teal' },
    { label: 'Contacted', v: cnt(['Enquiry sent', 'CV mailed', 'Reply awaited', 'Replied', 'Spoke on call', 'Applied', 'Exam / Interview', 'Offer']), icon: Send, to: '/applications', tone: 'bg-sky-50 text-sky-600' },
    { label: 'Interviews', v: cnt(['Exam / Interview']), icon: CalendarCheck, to: '/fellowships?status=Exam / Interview', tone: 'bg-violet-50 text-violet-600' },
    { label: 'Selected', v: cnt(['Offer']), icon: CheckCircle2, to: '/fellowships?status=Offer', tone: 'bg-green-50 text-green-700' },
  ]
  const agenda = useMemo(() => {
    const items: { date: string; title: string; sub: string; to: string }[] = []
    for (const r of data.recs) if (!r.deleted && r.followUp && !['Rejected', 'Dropped'].includes(String(r.status)))
      items.push({ date: r.followUp, title: recTitle(r), sub: r.status === 'Exam / Interview' ? `Interview · ${r.nextStep || ''}` : r.nextStep || String(r.status), to: `/r/${r.id}` })
    for (const t of data.tasks) if (!t.deleted && !t.done) items.push({ date: t.date, title: t.title, sub: t.type, to: t.recId ? `/r/${t.recId}` : '/calendar' })
    return items.filter(a => (daysFromToday(a.date) ?? 99) <= 21).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 7)
  }, [data])

  if (!recs.length) return (
    <Card><Empty title="No fellowship data yet" sub="Connect your private data repo in Settings (or import your Excel there)."
      action={<button className="btn btn-primary" onClick={() => nav('/settings')}>Go to Settings</button>} /></Card>)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">{greet}, Dr. Devarsh <span className="text-xl">👋</span></h1>
        <p className="text-sm text-slate-500">Your fellowship journey at a glance.</p>
      </div>
      <NextUp />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(s => (
          <Link key={s.label} to={s.to} className="card p-3.5 flex items-center gap-3 hover:shadow-md transition">
            <div className={cx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', s.tone)}><s.icon size={19} /></div>
            <div><div className="text-2xl font-bold leading-none">{s.v}</div><div className="text-[11px] text-slate-500 mt-1">{s.label}</div></div>
          </Link>))}
      </div>
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2"><h2 className="font-semibold">Coming up</h2>
          <div className="flex gap-3 text-xs"><Link to="/applications" className="text-teal inline-flex items-center gap-1"><LayoutGrid size={13} />Board</Link><Link to="/calendar" className="text-teal inline-flex items-center">Calendar <ChevronRight size={13} /></Link></div></div>
        {agenda.length === 0 ? <div className="text-sm text-slate-400 py-2">Nothing scheduled in the next 3 weeks.</div> : agenda.map((a, i) => {
          const od = a.date < todayISO(), td = a.date === todayISO()
          return (
            <Link key={i} to={a.to} className="flex items-center gap-3 px-1 py-2 rounded-xl hover:bg-navy-50">
              <div className={cx('w-14 shrink-0 text-center rounded-lg py-1 text-xs font-semibold', od ? 'bg-red-50 text-red-600' : td ? 'bg-amber-50 text-amber-700' : 'bg-navy-50 text-navy')}>{fmtShort(a.date)}</div>
              <div className="min-w-0 flex-1"><div className="text-sm font-medium truncate">{a.title}</div><div className="text-xs text-slate-500 truncate">{a.sub} · {relDays(a.date)}</div></div>
            </Link>) })}
      </Card>
    </div>
  )
}
