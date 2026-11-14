import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Target, ArrowRight, PauseCircle, MapPin, Phone } from 'lucide-react'
import { useRecs, useStore } from '../lib/store'
import { Card, TierBadge, StatusBadge, cx, toast } from './ui'
import { ContactMenu } from './RecParts'
import { addDays, daysFromToday, recTitle, relDays, show, todayISO } from '../lib/util'
import type { Rec } from '../types'

const DONE = ['Rejected', 'Dropped', 'Offer']
export function useQueue() {
  const recs = useRecs('fellowship')
  return useMemo(() => {
    const live = recs.filter(r => !DONE.includes(String(r.status)) && !r.parked)
    const due = live.filter(r => r.followUp && (daysFromToday(r.followUp) ?? 1) <= 0).sort((a, b) => (a.followUp || '').localeCompare(b.followUp || ''))
    const fresh = (t: number) => live.filter(r => r.tier === t && r.status === 'Not started').sort((a, b) => Number(a.sno) - Number(b.sno))
    const q: { rec: Rec; why: string }[] = [
      ...due.map(rec => ({ rec, why: `Follow-up ${relDays(rec.followUp)}` })),
      ...fresh(1).map(rec => ({ rec, why: 'Tier 1 — not contacted yet' })),
      ...fresh(2).map(rec => ({ rec, why: 'Tier 2 — not contacted yet' })),
      ...fresh(3).map(rec => ({ rec, why: 'Tier 3 — start outreach' })),
    ]
    const seen = new Set<string>()
    const list = q.filter(x => (seen.has(x.rec.id) ? false : (seen.add(x.rec.id), true)))
    return { list, counts: { due: due.length, t1: fresh(1).length, t2: fresh(2).length, t3: fresh(3).length, parked: recs.filter(r => r.parked).length } }
  }, [recs])
}

export default function NextUp() {
  const { list, counts } = useQueue()
  const { setStatus, patchRec, data } = useStore()
  const cur = list[0]
  const phase = counts.due ? `${counts.due} follow-up(s) due` : counts.t1 ? 'Tier 1 outreach' : counts.t2 ? 'Tier 2 outreach' : counts.t3 ? 'Tier 3 outreach' : 'All caught up'
  const mark = (r: Rec, to: string, remark: string) => {
    setStatus(r.id, to, remark)
    // CV sent -> follow-up in 4 days (editable on the programme); a call clears a due follow-up
    if (to === 'CV mailed') patchRec(r.id, { followUp: addDays(todayISO(), 4), nextStep: 'Reply awaited' })
    else if (r.followUp && r.followUp <= todayISO()) patchRec(r.id, { followUp: undefined })
    toast(`Marked ${to}`)
  }
  const isDue = !!cur?.rec.followUp && cur.rec.followUp <= todayISO()
  return (
    <Card className="p-4 md:p-5 border-teal/30 bg-gradient-to-br from-teal-50/70 to-white">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2"><Target size={18} className="text-teal" /><h2 className="font-semibold">Next up</h2><span className="text-xs bg-teal text-white rounded-full px-2.5 py-0.5">{phase}</span></div>
        <div className="flex gap-1.5 text-[11px] text-slate-600 flex-wrap">
          <span className="chip !cursor-default">Due {counts.due}</span><span className="chip !cursor-default">T1 left {counts.t1}</span>
          <span className="chip !cursor-default">T2 left {counts.t2}</span><span className="chip !cursor-default">T3 left {counts.t3}</span>
          {counts.parked > 0 && <Link to="/fellowships?parked=1" className="chip">Parked {counts.parked}</Link>}
        </div>
      </div>
      {!cur ? <div className="text-sm text-slate-500 mt-3">Nothing pending right now. 🎉</div> : (
        <div className="mt-3 rounded-2xl bg-white border border-line p-4">
          <div className="text-[11px] uppercase tracking-wide text-teal font-semibold">{cur.why}</div>
          <div className="flex items-start justify-between gap-3 mt-1">
            <div className="min-w-0"><div className="flex items-center gap-2"><TierBadge tier={cur.rec.tier} /><Link to={`/r/${cur.rec.id}`} className="font-semibold text-lg leading-tight hover:text-teal">{recTitle(cur.rec)}</Link></div>
              <div className="text-sm text-slate-600">{show(cur.rec.doctor)}</div>
              <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3"><span className="inline-flex items-center gap-1"><MapPin size={12} />{show(cur.rec.location)}</span><span className="inline-flex items-center gap-1"><Phone size={12} />{show(cur.rec.phone).split('\n')[0]}</span></div>
              {cur.rec.nextStep && <div className="text-xs text-slate-500 mt-1">Next step: {cur.rec.nextStep}</div>}</div>
            <StatusBadge status={String(cur.rec.status)} />
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <ContactMenu rec={cur.rec} />
            <button className="btn btn-primary !py-2" onClick={() => mark(cur.rec, 'CV mailed', 'CV + LORs sent')}>CV sent ✓</button>
            <button className="btn btn-ghost !py-2" onClick={() => mark(cur.rec, 'Spoke on call', '')}>Spoke on call</button>
            {isDue && <button className="btn btn-ghost !py-2" onClick={() => { patchRec(cur.rec.id, { followUp: undefined }); toast('Follow-up cleared') }}>Follow-up done</button>}
            <button className="btn btn-ghost !py-2" onClick={() => { patchRec(cur.rec.id, { parked: true }); toast('Parked for later') }}><PauseCircle size={15} /> Park</button>
            <Link to={`/r/${cur.rec.id}`} className="btn btn-ghost !py-2 ml-auto">Open <ArrowRight size={14} /></Link>
          </div>
        </div>)}
      {list.length > 1 && <div className="mt-3"><div className="text-[11px] text-slate-400 mb-1">Then</div>
        <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1">{list.slice(1, 6).map(x => <Link key={x.rec.id} to={`/r/${x.rec.id}`} className={cx('shrink-0 max-w-[220px] rounded-xl border border-line bg-white px-3 py-2 text-xs hover:bg-navy-50')}><div className="font-medium truncate">{recTitle(x.rec)}</div><div className="text-slate-500 truncate">{x.why}</div></Link>)}</div></div>}
      <p className="text-[11px] text-slate-400 mt-3">Order: due follow-ups → Tier 1 → Tier 2 → Tier 3. "Park" sets a programme aside (e.g. check later) and it moves to the next one.</p>
    </Card>
  )
}
