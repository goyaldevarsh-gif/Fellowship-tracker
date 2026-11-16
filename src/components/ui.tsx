import React, { useEffect, useState } from 'react'
import { X, Inbox } from 'lucide-react'
import { STATUS_STYLE } from '../lib/util'

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ')

export const StatusBadge = ({ status, className }: { status: string; className?: string }) => (
  <span className={cx('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap', STATUS_STYLE[status] || 'bg-slate-100 text-slate-600', className)}>{status}</span>
)
export const prio = (r: { priority?: number }) => r.priority ?? 999
export const band = (p?: number) => !p ? 3 : p <= 10 ? 1 : p <= 20 ? 2 : 3
export const PriorityBadge = ({ priority }: { priority?: number }) => !priority ? null : (
  <span className={cx('inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold',
    priority <= 10 ? 'bg-teal-100 text-teal-600' : priority <= 20 ? 'bg-navy-100 text-navy-600' : 'bg-slate-100 text-slate-500')}>#{priority}</span>
)
export const Card = ({ className, children, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div className={cx('card', className)} {...p}>{children}</div>
export const H = ({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-3 mb-4">
    <div className="min-w-0"><h1 className="text-xl md:text-2xl font-bold text-navy leading-tight">{title}</h1>{sub && <p className="text-sm text-slate-500 mt-0.5">{sub}</p>}</div>
    <div className="flex items-center gap-2 shrink-0">{right}</div>
  </div>
)
export const Empty = ({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) => (
  <div className="flex flex-col items-center text-center py-12 px-4 text-slate-500">
    <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal flex items-center justify-center mb-3"><Inbox size={26} /></div>
    <div className="font-semibold text-navy">{title}</div>{sub && <div className="text-sm mt-1 max-w-sm">{sub}</div>}
    {action && <div className="mt-4">{action}</div>}
  </div>
)
export function Modal({ open, onClose, title, children, wide, footer }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean; footer?: React.ReactNode }) {
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-navy/40 backdrop-blur-[2px]" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-label={title} className={cx('bg-white w-full rounded-t-3xl md:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col', wide ? 'md:max-w-3xl' : 'md:max-w-lg')}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 className="font-semibold text-navy">{title}</h2>
          <button aria-label="Close" className="p-1.5 rounded-lg hover:bg-navy-50" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-line flex justify-end gap-2 pb-safe">{footer}</div>}
      </div>
    </div>
  )
}
export const Field = ({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) => (
  <div className={className}><label className="lbl">{label}</label>{children}</div>
)

// ---- confirm dialog (promise based, no window.confirm) ----
type CReq = { msg: string; ok: string; danger?: boolean; res: (v: boolean) => void }
let push: ((r: CReq) => void) | null = null
export const confirmDialog = (msg: string, ok = 'Confirm', danger = false) =>
  new Promise<boolean>(res => { if (push) push({ msg, ok, danger, res }); else res(true) })
export function ConfirmHost() {
  const [q, setQ] = useState<CReq | null>(null)
  useEffect(() => { push = setQ; return () => { push = null } }, [])
  if (!q) return null
  const done = (v: boolean) => { q.res(v); setQ(null) }
  return (
    <Modal open onClose={() => done(false)} title="Please confirm"
      footer={<><button className="btn btn-ghost" onClick={() => done(false)}>Cancel</button><button className={cx('btn', q.danger ? 'btn-danger' : 'btn-primary')} onClick={() => done(true)}>{q.ok}</button></>}>
      <p className="text-sm text-navy whitespace-pre-line">{q.msg}</p>
    </Modal>
  )
}
// ---- toasts ----
let toastPush: ((m: string) => void) | null = null
export const toast = (m: string) => toastPush?.(m)
export function ToastHost() {
  const [items, setItems] = useState<{ id: number; m: string }[]>([])
  useEffect(() => {
    toastPush = m => { const id = Date.now() + Math.random(); setItems(i => [...i, { id, m }]); setTimeout(() => setItems(i => i.filter(x => x.id !== id)), 3200) }
    return () => { toastPush = null }
  }, [])
  return (
    <div className="fixed z-[60] bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 flex flex-col gap-2 items-center pointer-events-none">
      {items.map(i => <div key={i.id} className="bg-navy text-white text-sm px-4 py-2 rounded-xl shadow-lg">{i.m}</div>)}
    </div>
  )
}
export const Stars = ({ v, onChange }: { v?: number; onChange?: (n: number) => void }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(n => (
      <button key={n} type="button" aria-label={`${n} star`} disabled={!onChange} onClick={() => onChange?.(n === v ? 0 : n)}
        className={cx('text-lg leading-none', (v || 0) >= n ? 'text-amber-500' : 'text-slate-300', onChange && 'hover:text-amber-400')}>★</button>
    ))}
  </div>
)
