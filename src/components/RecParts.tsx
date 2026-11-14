import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Phone, MessageCircle, Mail, MapPin, Clock, CalendarClock, Copy, ChevronDown } from 'lucide-react'
import type { Rec, Kind } from '../types'
import { STATUSES } from '../types'
import { StatusBadge, TierBadge, Field, Modal, toast, cx } from './ui'
import { useStore } from '../lib/store'
import { extractEmails, extractPhones, fillTemplate, mailLink, waLink, fmtShort, relDays, daysFromToday, recTitle } from '../lib/util'

export function ContactMenu({ rec, compact }: { rec: Pick<Rec, 'phone' | 'email' | 'doctor' | 'hospital' | 'location'>; compact?: boolean }) {
  const { data } = useStore()
  const [open, setOpen] = useState(false)
  const phones = extractPhones(rec.phone), emails = extractEmails(rec.email)
  const t = data.prefs.templates
  const wa = fillTemplate(t.whatsapp, rec)
  const subj = fillTemplate(t.emailSubject, rec), body = fillTemplate(t.emailBody, rec)
  const copy = (x: string) => { navigator.clipboard?.writeText(x).then(() => toast('Copied')) }
  if (!phones.length && !emails.length) return <span className="text-xs text-slate-400">No contact available</span>
  return (
    <div className="relative inline-block">
      <button className={cx('btn btn-ghost', compact && '!py-1 !px-2.5 text-xs')} onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o) }}>
        <Phone size={14} /> Contact <ChevronDown size={13} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={e => { e.stopPropagation(); setOpen(false) }} />
          <div className="absolute z-40 right-0 mt-1 w-72 card p-2 text-sm" onClick={e => e.stopPropagation()}>
            {phones.map(p => (
              <div key={p.tel} className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-navy-50">
                <span className="flex-1 truncate font-medium">{p.raw}</span>
                <a className="btn btn-ghost !p-1.5" href={`tel:${p.tel}`} title="Call" aria-label={`Call ${p.raw}`}><Phone size={14} /></a>
                {p.mobile && <a className="btn btn-ghost !p-1.5 text-teal" href={waLink(p.tel, wa)} target="_blank" rel="noreferrer" title="WhatsApp with message" aria-label={`WhatsApp ${p.raw}`}><MessageCircle size={14} /></a>}
                <button className="btn btn-ghost !p-1.5" onClick={() => copy(p.raw)} aria-label="Copy number"><Copy size={13} /></button>
              </div>))}
            {emails.map(e => (
              <div key={e} className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-navy-50">
                <span className="flex-1 truncate font-medium">{e}</span>
                <a className="btn btn-ghost !p-1.5 text-teal" href={mailLink(e, subj, body)} title="Email with message" aria-label={`Email ${e}`}><Mail size={14} /></a>
                <button className="btn btn-ghost !p-1.5" onClick={() => copy(e)} aria-label="Copy email"><Copy size={13} /></button>
              </div>))}
            <button className="w-full text-left text-xs text-slate-500 px-2 py-1.5 hover:text-navy" onClick={() => copy(wa)}>Copy WhatsApp message</button>
          </div>
        </>)}
    </div>
  )
}

export function RecCard({ r }: { r: Rec }) {
  const d = daysFromToday(r.followUp)
  return (
    <Link to={`/r/${r.id}`} className="card p-4 block min-w-0 overflow-hidden hover:shadow-md hover:border-teal/40 transition group">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5"><TierBadge tier={r.tier} />{r.type && <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 truncate">{r.type}</span>}</div>
          <div className="font-semibold text-navy leading-snug">{recTitle(r)}</div>
          <div className="text-sm text-slate-600 truncate">{r.doctor || 'Doctor not stated'}</div>
        </div>
        <StatusBadge status={String(r.status)} />
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        {r.location && <span className="inline-flex items-center gap-1"><MapPin size={12} />{r.location}</span>}
        {r.duration && <span className="inline-flex items-center gap-1"><Clock size={12} />{r.duration}</span>}
        {r.followUp && <span className={cx('inline-flex items-center gap-1', d !== null && d <= 0 && 'text-red-600 font-medium')}><CalendarClock size={12} />{fmtShort(r.followUp)} · {relDays(r.followUp)}</span>}
      </div>
      {r.tags.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{r.tags.map(t => <span key={t} className="text-[10px] bg-teal-50 text-teal-600 rounded-full px-2 py-0.5">{t}</span>)}</div>}
    </Link>
  )
}

const EMPTY = (kind: Kind, sno: number): Rec => ({
  id: `${kind}-${sno}`, kind, sno, tier: kind === 'fellowship' ? 3 : undefined, area: '', doctor: '', hospital: '', location: '', duration: '',
  phone: '', email: '', status: 'Not started', nextStep: '', remarks: '', historyRaw: '', seats: '', stipend: '', eligibility: '',
  howToApply: '', website: '', notes: '', tags: [], comms: [], statusLog: [], docLinks: [], updatedAt: 0,
})
export const newRec = (kind: Kind, all: Rec[]) => EMPTY(kind, Math.max(0, ...all.filter(r => r.kind === kind).map(r => Number(r.sno) || 0)) + 1)

export function RecForm({ open, initial, onClose, onSave }: { open: boolean; initial: Rec; onClose: () => void; onSave: (r: Rec) => void }) {
  const [r, setR] = useState<Rec>(initial)
  const set = (k: keyof Rec, v: any) => setR(x => ({ ...x, [k]: v }))
  const inp = (k: keyof Rec, label: string, ph?: string, cls?: string) => (
    <Field label={label} className={cls}><input className="inp" value={String(r[k] ?? '')} placeholder={ph} onChange={e => set(k, e.target.value)} /></Field>)
  const ta = (k: keyof Rec, label: string, rows = 3) => (
    <Field label={label} className="md:col-span-2"><textarea className="inp" rows={rows} value={String(r[k] ?? '')} onChange={e => set(k, e.target.value)} /></Field>)
  const valid = r.hospital.trim() || r.doctor.trim()
  return (
    <Modal open={open} onClose={onClose} wide title={initial.updatedAt ? 'Edit programme' : 'Add programme'}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!valid} onClick={() => onSave({ ...r, tags: r.tags })}>Save</button></>}>
      <div className="grid md:grid-cols-2 gap-3">
        {inp('hospital', 'Hospital / Institute *')}{inp('doctor', 'Doctor / Faculty')}
        {inp('location', 'Location (City, State)')}{inp('area', 'Area / region')}
        {r.kind === 'fellowship' && <Field label="Tier"><select className="inp" value={r.tier ?? 3} onChange={e => set('tier', Number(e.target.value))}><option value={1}>Tier 1</option><option value={2}>Tier 2</option><option value={3}>Tier 3</option></select></Field>}
        {r.kind === 'footankle' && inp('type', 'Type (programme / surgeon / IFAS centre / observership)')}
        {inp('duration', 'Duration')}
        <Field label="Status"><select className="inp" value={String(r.status)} onChange={e => set('status', e.target.value)}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></Field>
        {inp('phone', 'Phone(s)')}{inp('email', 'Email(s)')}
        {inp('nextStep', 'Next step')}
        <Field label="Follow-up date"><input type="date" className="inp" value={r.followUp || ''} onChange={e => set('followUp', e.target.value || undefined)} /></Field>
        {inp('seats', 'Seats')}{inp('stipend', 'Stipend / fee')}
        {inp('eligibility', 'Eligibility', '', 'md:col-span-2')}{inp('howToApply', 'How to apply', '', 'md:col-span-2')}
        {inp('website', 'Website / source', '', 'md:col-span-2')}
        {ta('remarks', 'Remarks')}{ta('notes', r.kind === 'fellowship' ? 'Notes' : 'Verified details', 4)}
      </div>
    </Modal>
  )
}
