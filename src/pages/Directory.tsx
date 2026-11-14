import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, SlidersHorizontal } from 'lucide-react'
import type { Kind, Rec } from '../types'
import { STATUSES } from '../types'
import { useRecs, useStore } from '../lib/store'
import { Card, Empty, H, cx } from '../components/ui'
import { RecCard, RecForm, newRec } from '../components/RecParts'
import { SPECIALTY_KEYS, recTitle } from '../lib/util'

const TITLES: Record<Kind, [string, string]> = {
  fellowship: ['Fellowships', 'Sports medicine & arthroscopy programmes you are tracking'],
  observership: ['Observerships', 'Short observerships — kept separate from fellowship applications'],
  footankle: ['Foot & Ankle', 'Foot & ankle programmes, surgeons and IFAS centres'],
}
const windowOf = (r: Rec) => {
  const t = [r.howToApply, r.remarks, r.notes, r.nextStep].join(' ').toLowerCase()
  if (/\b(closed|ho chuka|ended)\b/.test(t)) return 'closed'
  if (/\b(portal open|applications? open|open now|apply (now|online))\b/.test(t)) return 'open'
  return 'unknown'
}
const hasStipend = (r: Rec) => !!r.stipend.trim() && !/not (stated|published|available)|none|^nil|^no\b/i.test(r.stipend)
const months = (d: string) => { const m = d.match(/(\d+)(?:\s*[-–to]+\s*(\d+))?\s*(?:months?|mo)/i); return m ? Number(m[2] || m[1]) : null }

export default function Directory({ kind }: { kind: Kind }) {
  const recs = useRecs(kind); const { upsertRec, data } = useStore()
  const [sp, setSp] = useSearchParams(); const nav = useNavigate()
  const [adding, setAdding] = useState<Rec | null>(null)
  const [showF, setShowF] = useState(false)
  const q = sp.get('q') || '', status = sp.get('status') || '', tier = sp.get('tier') || '', area = sp.get('area') || ''
  const spec = sp.get('spec') || '', dur = sp.get('dur') || '', stip = sp.get('stip') || '', win = sp.get('win') || '', sort = sp.get('sort') || 'default', ftype = sp.get('type') || ''
  const set = (k: string, v: string) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); setSp(n, { replace: true }) }
  const areas = useMemo(() => Array.from(new Set(recs.map(r => r.area).filter(Boolean))).sort(), [recs])
  const types = useMemo(() => Array.from(new Set(recs.map(r => r.type || '').filter(Boolean))).sort(), [recs])

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    let l = recs.filter(r => {
      if (s && ![r.doctor, r.hospital, r.location, r.type, r.duration, r.notes, r.remarks, r.howToApply, r.eligibility, r.tags.join(' ')].join(' ').toLowerCase().includes(s)) return false
      if (status && r.status !== status) return false
      if (tier && String(r.tier) !== tier) return false
      if (area && r.area !== area) return false
      if (ftype && r.type !== ftype) return false
      if (spec && !r.tags.includes(spec)) return false
      if (stip === 'yes' && !hasStipend(r)) return false
      if (win && windowOf(r) !== win) return false
      if (dur) { const m = months(r.duration); if (m === null) return false; if (dur === 'le6' ? m > 6 : dur === '7-12' ? m < 7 || m > 12 : m <= 12) return false }
      return true
    })
    const key: Record<string, (a: Rec, b: Rec) => number> = {
      default: (a, b) => (a.tier || 9) - (b.tier || 9) || Number(a.sno) - Number(b.sno),
      tier: (a, b) => (a.tier || 9) - (b.tier || 9) || recTitle(a).localeCompare(recTitle(b)),
      city: (a, b) => a.location.localeCompare(b.location),
      status: (a, b) => STATUSES.indexOf(a.status as any) - STATUSES.indexOf(b.status as any),
      follow: (a, b) => (a.followUp || '9999').localeCompare(b.followUp || '9999'),
      institute: (a, b) => recTitle(a).localeCompare(recTitle(b)),
    }
    return [...l].sort(key[sort] || key.default)
  }, [recs, q, status, tier, area, spec, dur, stip, win, sort, ftype])

  const nFilters = [status, tier, area, spec, dur, stip, win, ftype].filter(Boolean).length
  const [t, sub] = TITLES[kind]
  return (
    <div>
      <H title={t} sub={`${recs.length} records · ${sub}`} right={<button className="btn btn-primary" onClick={() => setAdding(newRec(kind, data.recs))}><Plus size={16} /> Add</button>} />
      <div className="flex gap-2 mb-3">
        <input className="inp flex-1" placeholder="Search doctor, hospital, location, type, notes…" value={q} onChange={e => set('q', e.target.value)} aria-label="Search programmes" />
        <button className={cx('btn btn-ghost', nFilters > 0 && '!border-teal !text-teal')} onClick={() => setShowF(s => !s)}><SlidersHorizontal size={15} /> Filters{nFilters ? ` (${nFilters})` : ''}</button>
        <select className="inp !w-auto" value={sort} onChange={e => set('sort', e.target.value === 'default' ? '' : e.target.value)} aria-label="Sort">
          <option value="default">Sort: Default</option><option value="tier">Tier</option><option value="city">City</option><option value="status">Status</option><option value="follow">Follow-up date</option><option value="institute">Institute</option>
        </select>
      </div>
      {showF && (
        <Card className="p-3 mb-3 grid grid-cols-2 md:grid-cols-4 gap-2">
          {kind === 'fellowship' && <select className="inp" value={tier} onChange={e => set('tier', e.target.value)} aria-label="Tier"><option value="">All tiers</option><option value="1">Tier 1</option><option value="2">Tier 2</option><option value="3">Tier 3</option></select>}
          <select className="inp" value={status} onChange={e => set('status', e.target.value)} aria-label="Status"><option value="">All statuses</option>{STATUSES.map(s => <option key={s}>{s}</option>)}</select>
          <select className="inp" value={area} onChange={e => set('area', e.target.value)} aria-label="City / state"><option value="">All cities / regions</option>{areas.map(a => <option key={a}>{a}</option>)}</select>
          {kind === 'footankle' && <select className="inp" value={ftype} onChange={e => set('type', e.target.value)} aria-label="Type"><option value="">All types</option>{types.map(a => <option key={a}>{a}</option>)}</select>}
          <select className="inp" value={dur} onChange={e => set('dur', e.target.value)} aria-label="Duration"><option value="">Any duration</option><option value="le6">≤ 6 months</option><option value="7-12">7–12 months</option><option value="gt12">&gt; 12 months</option></select>
          <select className="inp" value={stip} onChange={e => set('stip', e.target.value)} aria-label="Stipend"><option value="">Stipend: any</option><option value="yes">Stipend available</option></select>
          <select className="inp" value={win} onChange={e => set('win', e.target.value)} aria-label="Application window"><option value="">Application: any</option><option value="open">Open</option><option value="closed">Closed</option><option value="unknown">Unknown</option></select>
          <button className="btn btn-ghost" onClick={() => setSp(q ? { q } : {})}>Clear filters</button>
          <p className="col-span-full text-[11px] text-slate-400">Duration, stipend and application-open/closed filters read the text in your records; "Unknown" means the sheet doesn't say.</p>
        </Card>)}
      <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
        <button className={cx('chip', !spec && 'chip-on')} onClick={() => set('spec', '')}>All ({recs.length})</button>
        {SPECIALTY_KEYS.map(([k]) => <button key={k} className={cx('chip whitespace-nowrap', spec === k && 'chip-on')} onClick={() => set('spec', spec === k ? '' : k)}>{k} ({recs.filter(r => r.tags.includes(k)).length})</button>)}
      </div>
      <div className="text-xs text-slate-500 my-2">{list.length} shown</div>
      {list.length === 0 ? <Card><Empty title={recs.length ? 'No programmes match' : 'Nothing here yet'} sub={recs.length ? 'Try clearing a filter.' : 'Add one, or import your Excel in Settings.'} /></Card> :
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{list.map(r => <RecCard key={r.id} r={r} />)}</div>}
      {adding && <RecForm open initial={adding} onClose={() => setAdding(null)} onSave={r => { upsertRec(r); setAdding(null); nav(`/r/${r.id}`) }} />}
    </div>
  )
}
