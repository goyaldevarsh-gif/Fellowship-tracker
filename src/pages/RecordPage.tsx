import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2, MapPin, Clock, Wallet, GraduationCap, Users, ExternalLink, Plus, Check, Link2, FileText, ArrowRightLeft } from 'lucide-react'
import { STATUSES, type Rec } from '../types'
import { useStore } from '../lib/store'
import { Card, Empty, Field, Modal, StatusBadge, PriorityBadge, confirmDialog, cx, toast } from '../components/ui'
import { ContactMenu, RecForm } from '../components/RecParts'
import { fmtDate, relDays, show, todayISO, uid, recTitle, NA } from '../lib/util'

const TABS = ['Details', 'Updates', 'Documents'] as const
type Tab = (typeof TABS)[number]
const KIND_LABEL = { fellowship: 'Fellowships', observership: 'Observerships', footankle: 'Foot & Ankle' }
const KIND_PATH = { fellowship: '/fellowships', observership: '/observerships', footankle: '/footankle' }

const Row = ({ icon: I, label, value }: { icon?: any; label: string; value?: string }) => (
  <div className="flex gap-3 py-2.5 border-b border-line/70 last:border-0">
    {I && <I size={16} className="text-teal mt-0.5 shrink-0" />}
    <div className="min-w-0"><div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className={cx('text-sm whitespace-pre-line break-words', !value?.trim() && 'text-slate-400')}>{show(value)}</div></div>
  </div>
)

export default function RecordPage() {
  const { id } = useParams(); const nav = useNavigate()
  const { data, upsertRec, patchRec, setStatus, addComm, removeRec, upsertNote } = useStore()
  const r = data.recs.find(x => x.id === id && !x.deleted)
  const [tab, setTab] = useState<Tab>('Details')
  const [edit, setEdit] = useState(false)
  const [statusTo, setStatusTo] = useState<string | null>(null), [statusRemark, setStatusRemark] = useState('')
  const [commOpen, setCommOpen] = useState(false)
  const [c, setC] = useState({ date: todayISO(), text: '', channel: 'note' as any })
  const [noteText, setNoteText] = useState('')
  const [linkDoc, setLinkDoc] = useState('')
  const [convert, setConvert] = useState(false)

  const notes = useMemo(() => data.notes.filter(n => !n.deleted && n.recId === id), [data.notes, id])
  if (!r) return <Card><Empty title="Record not found" action={<Link className="btn btn-primary" to="/fellowships">Back to directory</Link>} /></Card>

  const docs = data.docs.filter(d => !d.deleted)
  const linked = r.docLinks.map(l => ({ l, d: docs.find(d => d.id === l.docId) })).filter(x => x.d)
  const has = (cat: string) => linked.filter(x => x.d!.category === cat)
  const timeline = [
    ...r.comms.map(x => ({ date: x.date || '', text: x.text, ch: x.channel || 'note' })),
    ...(r.followUp ? [{ date: r.followUp, text: `Follow-up scheduled${r.nextStep ? ' — ' + r.nextStep : ''}`, ch: 'follow' as const }] : []),
    ...r.docLinks.filter(l => l.sent).map(l => ({ date: l.sentOn || '', text: `Sent: ${docs.find(d => d.id === l.docId)?.title || 'document'}${l.via ? ' via ' + l.via : ''}`, ch: 'doc' as const })),
  ].sort((a, b) => (a.date || '0000').localeCompare(b.date || '0000'))

  const doConvert = () => {
    const sno = Math.max(0, ...data.recs.filter(x => x.kind === 'fellowship').map(x => Number(x.sno) || 0)) + 1
    const n: Rec = { ...r, id: `fellowship-${sno}`, kind: 'fellowship', sno, tier: undefined, priority: Math.max(0, ...data.recs.filter(x => x.kind === 'fellowship' && !x.deleted).map(x => x.priority || 0)) + 1, type: undefined, status: 'Not started', comms: [{ id: uid(), date: todayISO(), text: `Converted from observership #${r.sno}`, channel: 'note', source: 'app' }], statusLog: [], docLinks: [], original: undefined, importedAt: undefined, updatedAt: 0 }
    upsertRec(n); setConvert(false); toast('Added to Fellowships'); nav(`/r/${n.id}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link to={KIND_PATH[r.kind]} className="text-sm text-slate-500 hover:text-navy inline-flex items-center gap-1"><ArrowLeft size={15} /> {KIND_LABEL[r.kind]}</Link>
        <div className="flex gap-2">
          {r.kind === 'observership' && <button className="btn btn-ghost" onClick={() => setConvert(true)}><ArrowRightLeft size={15} /> <span className="hidden sm:inline">Convert to fellowship</span></button>}
          <button className="btn btn-ghost" onClick={() => setEdit(true)}><Pencil size={15} /> Edit</button>
          <button className="btn btn-danger" aria-label="Delete" onClick={async () => { if (await confirmDialog(`Delete "${recTitle(r)}"? It will be removed from all lists.`, 'Delete', true)) { removeRec(r.id); nav(KIND_PATH[r.kind]) } }}><Trash2 size={15} /></button>
        </div>
      </div>
      <Card className="p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1"><PriorityBadge priority={r.priority} />{r.type && <span className="text-xs font-semibold text-slate-500">{r.type}</span>}<span className="text-xs text-slate-400">S.No {r.sno}</span></div>
            <h1 className="text-xl md:text-2xl font-bold leading-tight">{recTitle(r)}</h1>
            <div className="text-slate-600">{r.doctor || 'Doctor not stated'}</div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1"><MapPin size={14} />{show(r.location)}</span><span className="inline-flex items-center gap-1"><Clock size={14} />{show(r.duration)}</span></div>
          </div>
          <div className="flex flex-col items-start md:items-end gap-2">
            <select className="inp !w-auto" value={String(r.status)} aria-label="Change status" onChange={e => { setStatusTo(e.target.value); setStatusRemark('') }}>
              {!STATUSES.includes(r.status as any) && <option>{String(r.status)}</option>}{STATUSES.map(s => <option key={s}>{s}</option>)}</select>
            <ContactMenu rec={r} />
            {r.parked && <button className="text-xs text-teal underline" onClick={() => patchRec(r.id, { parked: false })}>Parked for later — unpark</button>}
          </div>
        </div>
        <div className="flex gap-1 mt-4 overflow-x-auto scrollbar-thin -mb-1">
          {TABS.map(t => <button key={t} onClick={() => setTab(t)} className={cx('px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap', tab === t ? 'border-teal text-teal' : 'border-transparent text-slate-500 hover:text-navy')}>{t}</button>)}
        </div>
      </Card>

      {tab === 'Details' && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-4">
            <Row icon={GraduationCap} label="Fellowship specialty" value={r.tags.join(', ')} />
            <Row icon={Clock} label="Duration" value={r.duration} /><Row icon={Users} label="Seats" value={r.seats} />
            <Row icon={Wallet} label="Stipend / fees" value={r.stipend} /><Row label="Eligibility" value={r.eligibility} />
            <Row icon={MapPin} label="Location" value={r.location} />
          </Card>
          <Card className="p-4">
            <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">{r.kind === 'fellowship' ? 'Programme highlights & source notes' : 'Verified details'}</div>
            <p className="text-sm whitespace-pre-line">{show(r.notes)}</p>
            {r.remarks && <><div className="text-xs uppercase tracking-wide text-slate-400 mt-4 mb-1">Remarks</div><p className="text-sm whitespace-pre-line">{r.remarks}</p></>}
          </Card>
        </div>)}

      {tab === 'Details' && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-4">
            <Row label="Current status" value={String(r.status)} /><Row label="Last update" value={r.lastUpdate ? fmtDate(r.lastUpdate) : ''} />
            <Row label="Next step" value={r.nextStep} /><Row label="How to apply" value={r.howToApply} />
            <div className="pt-3 grid grid-cols-2 gap-2">
              <Field label="Follow-up date"><input type="date" className="inp" value={r.followUp || ''} onChange={e => patchRec(r.id, { followUp: e.target.value || undefined })} /></Field>
              <Field label="Next step"><input className="inp" value={r.nextStep} onChange={e => patchRec(r.id, { nextStep: e.target.value })} /></Field>
            </div>
            {r.followUp && <div className="text-xs text-slate-500 mt-1">{relDays(r.followUp)}</div>}
          </Card>
          <Card className="p-4">
            <Row label="Phone" value={r.phone} /><Row label="Email" value={r.email} />
            <div className="py-2.5"><div className="text-[11px] uppercase tracking-wide text-slate-400">Website / source</div>
              {r.website ? (/^https?:/.test(r.website) ? <a className="text-sm text-teal inline-flex items-center gap-1 break-all" href={r.website} target="_blank" rel="noreferrer">{r.website}<ExternalLink size={12} /></a> : <div className="text-sm break-words">{r.website}</div>) : <div className="text-sm text-slate-400">{NA}</div>}</div>
            <div className="pt-2"><ContactMenu rec={r} /></div>
          </Card>
        </div>)}

      {tab === 'Updates' && (
        <Card className="p-4">
          <div className="flex justify-between items-center mb-3"><h2 className="font-semibold">Updates</h2><button className="btn btn-primary" onClick={() => { setC({ date: todayISO(), text: '', channel: 'note' }); setCommOpen(true) }}><Plus size={15} /> Add entry</button></div>
          {timeline.length === 0 ? <Empty title="No updates yet" sub="Log calls, WhatsApp messages and emails here." /> : (
            <ol className="relative border-l border-line ml-2 space-y-4">
              {[...timeline].reverse().map((x, i) => (
                <li key={i} className="pl-4 relative"><span className={cx('absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full', x.ch === 'follow' ? 'bg-amber-400' : x.ch === 'status' ? 'bg-violet-500' : 'bg-teal')} />
                  <div className="text-xs text-slate-500">{x.date ? fmtDate(x.date) : 'Undated'} · {x.ch === 'follow' ? 'follow-up' : x.ch}</div><div className="text-sm whitespace-pre-line">{x.text}</div></li>))}
            </ol>)}
          {r.historyRaw && <details className="mt-4 text-xs text-slate-500"><summary className="cursor-pointer">Original Excel history (preserved)</summary><pre className="whitespace-pre-wrap mt-1 font-sans">{r.historyRaw}</pre></details>}
        </Card>)}

      {tab === 'Documents' && (
        <Card className="p-4 space-y-4">
          <div><h2 className="font-semibold mb-2">Document checklist</h2>
            <div className="grid sm:grid-cols-3 gap-2">{['CV', 'LOR', 'SOP'].map(cat => { const l = has(cat); const sent = l.filter(x => x.l.sent).length
              return <div key={cat} className={cx('rounded-xl border p-3 text-sm', sent ? 'border-green-200 bg-green-50' : l.length ? 'border-amber-200 bg-amber-50' : 'border-line bg-paper')}>
                <div className="font-semibold">{cat}</div><div className="text-xs text-slate-600">{sent ? `${sent} sent` : l.length ? `${l.length} linked, not marked sent` : 'Not linked'}</div></div> })}</div>
            <p className="text-[11px] text-slate-400 mt-1">A document counts as sent only when you mark it sent.</p></div>
          <div>
            {linked.length === 0 ? <div className="text-sm text-slate-400">No documents linked to this programme.</div> : linked.map(({ l, d }) => (
              <div key={l.docId} className="flex items-center gap-2 py-2 border-b border-line/60">
                <FileText size={16} className="text-red-500 shrink-0" /><div className="min-w-0 flex-1"><div className="text-sm font-medium truncate">{d!.title}</div><div className="text-xs text-slate-500">{d!.category}{l.sent ? ` · sent ${fmtDate(l.sentOn)}${l.via ? ' via ' + l.via : ''}` : ''}</div></div>
                <button className={cx('btn !py-1 text-xs', l.sent ? 'btn-ghost' : 'btn-primary')} onClick={() => {
                  const docLinks = r.docLinks.map(x => x.docId === l.docId ? (x.sent ? { ...x, sent: false, sentOn: undefined, via: undefined } : { ...x, sent: true, sentOn: todayISO(), via: 'WhatsApp / email' }) : x)
                  patchRec(r.id, { docLinks }); if (!l.sent) addComm(r.id, { date: todayISO(), text: `Sent ${d!.title}`, channel: 'note' })
                }}>{l.sent ? <><Check size={13} /> Sent</> : 'Mark sent'}</button>
                <button className="btn btn-ghost !p-1.5" aria-label="Unlink" onClick={() => patchRec(r.id, { docLinks: r.docLinks.filter(x => x.docId !== l.docId) })}><Trash2 size={14} /></button>
              </div>))}
          </div>
          <div className="flex gap-2">
            <select className="inp" value={linkDoc} onChange={e => setLinkDoc(e.target.value)} aria-label="Link document"><option value="">Link a document from vault…</option>
              {docs.filter(d => !r.docLinks.some(l => l.docId === d.id)).map(d => <option key={d.id} value={d.id}>{d.category} — {d.title}</option>)}</select>
            <button className="btn btn-primary" disabled={!linkDoc} onClick={() => { patchRec(r.id, { docLinks: [...r.docLinks, { docId: linkDoc, sent: false }] }); setLinkDoc('') }}><Link2 size={15} /> Link</button>
          </div>
          {docs.length === 0 && <div className="text-xs text-slate-400">Vault is empty — <Link className="text-teal" to="/documents">upload documents</Link> first.</div>}
        </Card>)}


      <Modal open={statusTo !== null} onClose={() => setStatusTo(null)} title="Update status"
        footer={<><button className="btn btn-ghost" onClick={() => setStatusTo(null)}>Cancel</button><button className="btn btn-primary" onClick={() => { setStatus(r.id, statusTo!, statusRemark.trim() || undefined); setStatusTo(null) }}>Save</button></>}>
        <div className="space-y-3"><div className="flex items-center gap-2 text-sm"><StatusBadge status={String(r.status)} /> → {statusTo && <StatusBadge status={statusTo} />}</div>
          <Field label="Remarks (optional)"><input className="inp" value={statusRemark} onChange={e => setStatusRemark(e.target.value)} /></Field></div>
      </Modal>
      <Modal open={commOpen} onClose={() => setCommOpen(false)} title="Add communication"
        footer={<><button className="btn btn-ghost" onClick={() => setCommOpen(false)}>Cancel</button><button className="btn btn-primary" disabled={!c.text.trim()} onClick={() => { addComm(r.id, { date: c.date, text: c.text.trim(), channel: c.channel }); setCommOpen(false) }}>Add</button></>}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3"><Field label="Date"><input type="date" className="inp" value={c.date} onChange={e => setC({ ...c, date: e.target.value })} /></Field>
            <Field label="Channel"><select className="inp" value={c.channel} onChange={e => setC({ ...c, channel: e.target.value })}>{['note', 'call', 'whatsapp', 'email', 'visit'].map(x => <option key={x}>{x}</option>)}</select></Field></div>
          <Field label="What happened"><textarea className="inp" rows={3} value={c.text} onChange={e => setC({ ...c, text: e.target.value })} placeholder="e.g. Spoke to Dr — asked to send CV on WhatsApp" /></Field>
        </div>
      </Modal>
      <Modal open={convert} onClose={() => setConvert(false)} title="Convert to fellowship application">
        <p className="text-sm text-slate-600 mb-3">Creates a new fellowship record from this observership (this observership stays as it is). It goes to the end of your priority list; change the number on the programme to move it.</p>
        <div className="flex gap-2"><button className="btn btn-ghost flex-1" onClick={() => doConvert()}>Add to Fellowships</button></div>
      </Modal>
      {edit && <RecForm open initial={r} onClose={() => setEdit(false)} onSave={n => { upsertRec(n); setEdit(false) }} />}
    </div>
  )
}
