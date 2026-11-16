import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { LayoutGrid, Table2 } from 'lucide-react'
import { STATUSES } from '../types'
import { useRecs, useStore } from '../lib/store'
import { H, Modal, StatusBadge, PriorityBadge, cx, Card, prio, band } from '../components/ui'
import { STATUS_DOT, fmtShort, recTitle, relDays } from '../lib/util'

export default function Applications() {
  const recs = useRecs('fellowship'); const { setStatus } = useStore()
  const [view, setView] = useState<'board' | 'table'>('board')
  const [tier, setTier] = useState('')
  const [pending, setPending] = useState<{ id: string; to: string } | null>(null)
  const [remark, setRemark] = useState('')
  const [dragId, setDragId] = useState<string | null>(null), [over, setOver] = useState<string | null>(null)
  const list = useMemo(() => recs.filter(r => !tier || String(band(r.priority)) === tier), [recs, tier])
  const cols = STATUSES.filter(s => list.some(r => r.status === s) || ['Not started', 'Enquiry sent', 'CV mailed', 'Reply awaited', 'Replied', 'Spoke on call', 'Applied', 'Exam / Interview', 'Offer', 'Rejected', 'On hold'].includes(s))
  const target = pending && recs.find(r => r.id === pending.id)
  const ask = (id: string, to: string) => { const r = recs.find(x => x.id === id); if (r && r.status !== to) { setPending({ id, to }); setRemark('') } }
  return (
    <div>
      <H title="Board" sub="Drag a programme to a new stage — every change is logged"
        right={<div className="flex gap-1 bg-white border border-line rounded-xl p-1">
          <button className={cx('btn !py-1 !px-2.5', view === 'board' ? 'btn-navy' : 'text-slate-600')} onClick={() => setView('board')}><LayoutGrid size={14} /> Board</button>
          <button className={cx('btn !py-1 !px-2.5', view === 'table' ? 'btn-navy' : 'text-slate-600')} onClick={() => setView('table')}><Table2 size={14} /> Table</button></div>} />
      <div className="flex gap-1.5 mb-3 items-center"><Link to="/fellowships" className="btn btn-ghost !py-1 mr-2">← List</Link>{['', '1', '2', '3'].map(t => <button key={t} className={cx('chip', tier === t && 'chip-on')} onClick={() => setTier(t)}>{t === '1' ? 'Top 10' : t === '2' ? '11–20' : t === '3' ? '21+' : 'All'}</button>)}</div>
      {view === 'board' ? (
        <div className="flex gap-3 overflow-x-auto scrollbar-thin pb-3 items-start">
          {cols.map(s => {
            const items = list.filter(r => r.status === s)
            return (
              <div key={s} data-col={s} className={cx('w-64 shrink-0 rounded-2xl p-2 border transition', over === s ? 'border-teal bg-teal-50' : 'border-line bg-white/60')}
                onDragOver={e => { e.preventDefault(); setOver(s) }} onDragLeave={() => setOver(o => (o === s ? null : o))}
                onDrop={e => { e.preventDefault(); setOver(null); const id = e.dataTransfer.getData('text/plain') || dragId; if (id) ask(id, s); setDragId(null) }}>
                <div className="flex items-center justify-between px-2 py-1.5"><span className="flex items-center gap-1.5 text-sm font-semibold"><span className="w-2 h-2 rounded-full" style={{ background: STATUS_DOT[s] }} />{s}</span><span className="text-xs text-slate-500">{items.length}</span></div>
                <div className="space-y-2 min-h-[40px]">
                  {items.map(r => (
                    <div key={r.id} draggable onDragStart={e => { e.dataTransfer.setData('text/plain', r.id); setDragId(r.id) }} onDragEnd={() => setDragId(null)}
                      className="card p-2.5 cursor-grab active:cursor-grabbing">
                      <Link to={`/r/${r.id}`} draggable={false} className="block"><div className="flex items-center gap-1.5"><PriorityBadge priority={r.priority} /><span className="text-sm font-semibold leading-tight">{recTitle(r)}</span></div>
                        <div className="text-xs text-slate-500 truncate mt-0.5">{r.doctor}</div>
                        {r.followUp && <div className="text-[11px] text-slate-500 mt-1">📅 {fmtShort(r.followUp)} · {relDays(r.followUp)}</div>}</Link>
                      <select className="mt-2 w-full text-[11px] rounded-lg border border-line bg-paper px-1.5 py-1" value="" aria-label={`Move ${recTitle(r)}`} onChange={e => e.target.value && ask(r.id, e.target.value)}>
                        <option value="">Move to…</option>{STATUSES.filter(x => x !== s).map(x => <option key={x}>{x}</option>)}</select>
                    </div>))}
                </div>
              </div>)
          })}
        </div>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-slate-500 border-b border-line">{['Priority', 'Programme', 'Doctor', 'Location', 'Status', 'Follow-up', 'Next step'].map(h => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>{[...list].sort((a, b) => prio(a) - prio(b) || Number(a.sno) - Number(b.sno)).map(r => (
              <tr key={r.id} className="border-b border-line/60 hover:bg-navy-50/50">
                <td className="px-3 py-2"><PriorityBadge priority={r.priority} /></td>
                <td className="px-3 py-2 font-medium"><Link to={`/r/${r.id}`} className="hover:text-teal">{recTitle(r)}</Link></td>
                <td className="px-3 py-2 text-slate-600">{r.doctor}</td><td className="px-3 py-2 text-slate-600">{r.location}</td>
                <td className="px-3 py-2"><select className="text-xs rounded-lg border border-line px-1.5 py-1 bg-white" value={String(r.status)} aria-label={`Status of ${recTitle(r)}`} onChange={e => ask(r.id, e.target.value)}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></td>
                <td className="px-3 py-2 whitespace-nowrap">{r.followUp ? `${fmtShort(r.followUp)} · ${relDays(r.followUp)}` : '—'}</td>
                <td className="px-3 py-2 text-slate-600 max-w-[220px] truncate">{r.nextStep}</td>
              </tr>))}</tbody>
          </table>
        </Card>)}
      <Modal open={!!pending} onClose={() => setPending(null)} title="Change status?"
        footer={<><button className="btn btn-ghost" onClick={() => setPending(null)}>Cancel</button><button className="btn btn-primary" onClick={() => { if (pending) setStatus(pending.id, pending.to, remark.trim() || undefined); setPending(null) }}>Confirm change</button></>}>
        {target && pending && <div className="space-y-3 text-sm">
          <div className="font-medium">{recTitle(target)}</div>
          <div className="flex items-center gap-2"><StatusBadge status={String(target.status)} /> → <StatusBadge status={pending.to} /></div>
          <div><label className="lbl">Remarks (optional)</label><input className="inp" value={remark} onChange={e => setRemark(e.target.value)} placeholder="e.g. Dr. asked for CV on WhatsApp" /></div>
        </div>}
      </Modal>
    </div>
  )
}
