import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { useRecs, useStore } from '../lib/store'
import { Card, Empty, H, Stars, StatusBadge, PriorityBadge } from '../components/ui'
import { recTitle, show } from '../lib/util'
import type { Ratings } from '../types'

const FACTS: [string, (r: any) => string][] = [
  ['Specialty', r => r.tags.join(', ')], ['Duration', r => r.duration], ['Stipend', r => r.stipend], ['Fees / deposit', r => (/fee|deposit|₹|rs/i.test(r.stipend) ? r.stipend : '')],
  ['Seats', r => r.seats], ['Faculty', r => r.doctor], ['Eligibility', r => r.eligibility], ['Location', r => r.location],
  ['Application method', r => r.howToApply], ['Status', r => String(r.status)], ['Surgical exposure / highlights', r => r.notes],
]
const RATE: [keyof Ratings, string][] = [['hands', 'Hands-on exposure'], ['volume', 'Case volume'], ['faculty', 'Faculty reputation'], ['research', 'Research opportunities'], ['career', 'Career value'], ['overall', 'Overall preference']]

export default function Compare() {
  const all = [...useRecs('fellowship'), ...useRecs('footankle')]
  const { patchRec } = useStore()
  const [ids, setIds] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('ft-compare') || '[]') } catch { return [] } })
  const save = (n: string[]) => { setIds(n); try { localStorage.setItem('ft-compare', JSON.stringify(n)) } catch { /* ignore */ } }
  const sel = ids.map(i => all.find(r => r.id === i)).filter(Boolean) as typeof all
  const setRate = (id: string, k: keyof Ratings, v: any) => { const r = all.find(x => x.id === id)!; patchRec(id, { ratings: { ...(r.ratings || {}), [k]: v } }) }
  return (
    <div>
      <H title="Compare programmes" sub="Pick 2–4. Sourced facts and your personal ratings are kept separate." />
      <Card className="p-3 mb-4 flex gap-2 items-center flex-wrap">
        <select className="inp !w-auto min-w-64" value="" disabled={sel.length >= 4} aria-label="Add programme to compare" onChange={e => e.target.value && save([...ids, e.target.value])}>
          <option value="">{sel.length >= 4 ? 'Maximum 4 selected' : '+ Add programme…'}</option>
          {all.filter(r => !ids.includes(r.id)).sort((a, b) => recTitle(a).localeCompare(recTitle(b))).map(r => <option key={r.id} value={r.id}>{recTitle(r)} — {r.doctor}</option>)}
        </select>
        <span className="text-xs text-slate-500">{sel.length} selected</span>
      </Card>
      {sel.length < 2 ? <Card><Empty title="Select at least two programmes" sub="Use the menu above to add programmes to the comparison." /></Card> : (
        <div className="space-y-4">
          <Card className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead><tr className="border-b border-line"><th className="w-40 p-3" />{sel.map(r => (
                <th key={r.id} className="p-3 text-left align-top"><div className="flex items-start justify-between gap-2"><div><div className="flex gap-1 mb-0.5"><PriorityBadge priority={r.priority} /></div><div className="font-semibold">{recTitle(r)}</div></div>
                  <button aria-label="Remove" className="text-slate-400 hover:text-red-600" onClick={() => save(ids.filter(i => i !== r.id))}><X size={15} /></button></div></th>))}</tr></thead>
              <tbody>{FACTS.map(([label, fn]) => (
                <tr key={label} className="border-b border-line/60"><td className="p-3 text-xs font-medium text-slate-500 align-top">{label}</td>
                  {sel.map(r => <td key={r.id} className="p-3 align-top whitespace-pre-line break-words">{label === 'Status' ? <StatusBadge status={fn(r)} /> : <span className={fn(r).trim() ? '' : 'text-slate-400'}>{show(label === 'Surgical exposure / highlights' ? fn(r).slice(0, 280) : fn(r))}</span>}</td>)}</tr>))}</tbody>
            </table>
          </Card>
          <Card className="overflow-x-auto"><div className="px-3 pt-3 text-sm font-semibold">My assessment <span className="font-normal text-xs text-slate-400">(personal — not sourced)</span></div>
            <table className="w-full text-sm min-w-[600px]"><tbody>
              {RATE.map(([k, label]) => <tr key={k} className="border-b border-line/60"><td className="w-40 p-3 text-xs font-medium text-slate-500">{label}</td>{sel.map(r => <td key={r.id} className="p-3"><Stars v={(r.ratings?.[k] as number) || 0} onChange={n => setRate(r.id, k, n)} /></td>)}</tr>)}
              <tr><td className="p-3 text-xs font-medium text-slate-500 align-top">Notes</td>{sel.map(r => <td key={r.id} className="p-3"><textarea className="inp" rows={3} value={r.ratings?.assessment || ''} onChange={e => setRate(r.id, 'assessment', e.target.value)} placeholder="Your thoughts…" /></td>)}</tr>
            </tbody></table></Card>
        </div>)}
    </div>
  )
}
