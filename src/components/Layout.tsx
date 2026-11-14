import { useMemo, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Building2, Layers, Footprints, FolderOpen, CalendarDays, Scale, StickyNote, Settings, Search, Bell, Stethoscope, MoreHorizontal, X, Cloud, CloudOff, RefreshCw, AlertTriangle, UserRound, PanelLeftClose, PanelLeft } from 'lucide-react'
import { Mark, Wordmark } from './Logo'
import { useStore } from '../lib/store'
import { cx } from './ui'
import { daysFromToday } from '../lib/util'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/fellowships', label: 'Fellowships', icon: Building2 },
  { to: '/applications', label: 'Applications', icon: Layers },
  { to: '/observerships', label: 'Observerships', icon: Stethoscope },
  { to: '/footankle', label: 'Foot & Ankle', icon: Footprints },
  { to: '/documents', label: 'Documents', icon: FolderOpen },
  { to: '/calendar', label: 'Calendar & Reminders', icon: CalendarDays },
  { to: '/compare', label: 'Compare Programmes', icon: Scale },
  { to: '/notes', label: 'Notes', icon: StickyNote },
  { to: '/settings', label: 'Settings', icon: Settings },
]
const MOBILE = ['/', '/fellowships', '/applications', '/documents']

function SyncPill() {
  const { sync, syncCfg, syncNow } = useStore()
  const nav = useNavigate()
  if (!syncCfg) return <button onClick={() => nav('/settings')} className="chip" title="Cloud sync is off"><CloudOff size={13} /> Local only</button>
  const map = { idle: ['Sync ready', Cloud], ok: ['Synced', Cloud], syncing: ['Syncing…', RefreshCw], error: ['Sync error', AlertTriangle], off: ['Local only', CloudOff] } as const
  const [t, I] = map[sync.status]
  return (
    <button onClick={syncNow} title={sync.error || 'Sync now'} className={cx('chip', sync.status === 'error' && 'border-red-200 text-red-600', sync.status === 'ok' && 'text-teal')}>
      <I size={13} className={sync.status === 'syncing' ? 'animate-spin' : ''} /> {t}
    </button>
  )
}

function GlobalSearch() {
  const { data } = useStore(); const nav = useNavigate()
  const [q, setQ] = useState(''), [open, setOpen] = useState(false)
  const res = useMemo(() => {
    const s = q.trim().toLowerCase(); if (s.length < 2) return []
    const out: { label: string; sub: string; to: string }[] = []
    for (const r of data.recs) if (!r.deleted && [r.doctor, r.hospital, r.location, r.notes, r.remarks].join(' ').toLowerCase().includes(s))
      out.push({ label: r.hospital || r.doctor, sub: `${r.doctor} · ${r.location}`, to: `/r/${r.id}` })
    for (const d of data.docs) if (!d.deleted && (d.title + d.category + d.description).toLowerCase().includes(s)) out.push({ label: d.title, sub: 'Document · ' + d.category, to: '/documents' })
    for (const n of data.notes) if (!n.deleted && (n.title + n.body).toLowerCase().includes(s)) out.push({ label: n.title || 'Note', sub: 'Note', to: '/notes' })
    return out.slice(0, 8)
  }, [q, data])
  return (
    <div className="relative flex-1 max-w-xl">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input className="inp pl-9 !rounded-full bg-white/80" placeholder="Search…" value={q} aria-label="Global search"
        onChange={e => { setQ(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} />
      {open && res.length > 0 && (
        <div className="absolute mt-2 w-full card p-1 z-40 max-h-80 overflow-auto">
          {res.map((r, i) => (
            <button key={i} className="w-full text-left px-3 py-2 rounded-xl hover:bg-navy-50" onMouseDown={() => { nav(r.to); setQ('') }}>
              <div className="text-sm font-medium truncate">{r.label}</div><div className="text-xs text-slate-500 truncate">{r.sub}</div>
            </button>))}
        </div>)}
    </div>
  )
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [more, setMore] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const loc = useLocation(); const nav = useNavigate()
  const { data } = useStore()
  const overdue = data.recs.filter(r => !r.deleted && r.followUp && (daysFromToday(r.followUp) ?? 1) <= 0 && !['Rejected', 'Dropped', 'Offer'].includes(String(r.status))).length
    + data.tasks.filter(t => !t.deleted && !t.done && (daysFromToday(t.date) ?? 1) <= 0).length
  const item = (n: typeof NAV[number], mobile = false) => (
    <NavLink key={n.to} to={n.to} end={n.to === '/'} onClick={() => setMore(false)}
      className={({ isActive }) => cx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
        isActive ? (mobile ? 'bg-teal-50 text-teal-600' : 'bg-navy text-white shadow-soft') : 'text-slate-600 hover:bg-navy-50')}>
      <n.icon size={18} />{(!collapsed || mobile) && <span className="truncate">{n.label}</span>}
    </NavLink>
  )
  const moreActive = !MOBILE.includes(loc.pathname) && !loc.pathname.startsWith('/r/')
  return (
    <div className="h-full flex">
      <aside className={cx('hidden md:flex flex-col border-r border-line bg-white/70 transition-all', collapsed ? 'w-[68px]' : 'w-64')}>
        <div className="flex items-center gap-2.5 px-4 h-16 shrink-0">
          <Mark size={34} />{!collapsed && <div className="leading-tight"><Wordmark size={19} /><div className="text-[9px] tracking-wider text-slate-500 uppercase">Orthopaedic Fellowship Tracker</div></div>}
        </div>
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">{NAV.map(n => item(n))}</nav>
        <div className="p-3 border-t border-line">
          {!collapsed && <div className="rounded-xl bg-teal-50 text-teal-600 text-xs p-3 mb-2 leading-snug">Plan. Apply. Track. Get Selected.</div>}
          <button className="btn btn-ghost w-full !py-1.5" onClick={() => setCollapsed(c => !c)} aria-label="Toggle sidebar">{collapsed ? <PanelLeft size={16} /> : <><PanelLeftClose size={16} /> Collapse</>}</button>
        </div>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 md:h-16 shrink-0 flex items-center gap-3 px-3 md:px-6 border-b border-line bg-paper/90 backdrop-blur pt-safe">
          <div className="md:hidden"><Mark size={32} /></div>
          <GlobalSearch />
          <div className="ml-auto flex items-center gap-2">
            <SyncPill />
            <button className="relative p-2 rounded-xl hover:bg-navy-50" aria-label="Reminders" onClick={() => nav('/calendar')}>
              <Bell size={19} />{overdue > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">{overdue}</span>}
            </button>
            <button className="p-2 rounded-xl hover:bg-navy-50" aria-label="My profile" onClick={() => nav('/profile')}><UserRound size={19} /></button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto scrollbar-thin pb-24 md:pb-8"><div className="max-w-7xl mx-auto p-3 md:p-6">{children}</div></main>
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-line grid grid-cols-5 pb-safe">
          {[NAV[0], NAV[1], NAV[2], NAV[5]].map(n => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => cx('flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium', isActive ? 'text-teal' : 'text-slate-500')}>
              <n.icon size={20} />{n.label.split(' ')[0]}</NavLink>))}
          <button className={cx('flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium', moreActive ? 'text-teal' : 'text-slate-500')} onClick={() => setMore(true)}><MoreHorizontal size={20} />More</button>
        </nav>
        {more && (
          <div className="md:hidden fixed inset-0 z-50 bg-navy/40" onClick={() => setMore(false)}>
            <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-3xl p-4 pb-safe" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-2"><span className="font-semibold">Menu</span><button aria-label="Close menu" onClick={() => setMore(false)}><X size={20} /></button></div>
              <div className="grid grid-cols-2 gap-1">{NAV.filter(n => !['/', '/fellowships', '/applications', '/documents'].includes(n.to)).map(n => item(n, true))}
                <button className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-navy-50" onClick={() => { setMore(false); nav('/profile') }}><UserRound size={18} />My Profile</button></div>
            </div>
          </div>)}
      </div>
    </div>
  )
}
