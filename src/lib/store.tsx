import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { AppData, Rec, Doc, Task, Note, Profile, Templates, SyncConfig, Comm } from '../types'
import { kvGet, kvSet } from './db'
import { emptyData } from './defaults'
import { mergeData, normalize } from './merge'
import { syncOnce } from './sync'
import { todayISO, uid } from './util'

export type SyncState = { status: 'off' | 'idle' | 'syncing' | 'ok' | 'error'; at?: number; error?: string }
interface Ctx {
  data: AppData
  ready: boolean
  sync: SyncState
  syncCfg: SyncConfig | null
  setSyncCfg: (c: SyncConfig | null) => Promise<void>
  syncNow: () => Promise<void>
  replaceData: (d: AppData) => void
  mergeIn: (d: AppData) => void
  upsertRec: (r: Rec) => void
  patchRec: (id: string, p: Partial<Rec>) => void
  setStatus: (id: string, to: string, remarks?: string) => void
  addComm: (id: string, c: Omit<Comm, 'id'>) => void
  removeRec: (id: string) => void
  upsertDoc: (d: Doc) => void
  upsertTask: (t: Task) => void
  upsertNote: (n: Note) => void
  setProfile: (p: Partial<Profile>) => void
  setTemplates: (t: Templates) => void
  markBackup: () => void
}
const C = createContext<Ctx>(null as any)
export const useStore = () => useContext(C)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(emptyData())
  const [ready, setReady] = useState(false)
  const [sync, setSync] = useState<SyncState>({ status: 'off' })
  const [syncCfg, setCfgState] = useState<SyncConfig | null>(null)
  const dataRef = useRef(data); dataRef.current = data
  const cfgRef = useRef<SyncConfig | null>(null); cfgRef.current = syncCfg
  const busy = useRef(false), again = useRef(false), timer = useRef<number>()

  useEffect(() => {
    (async () => {
      try {
        const d = await kvGet<AppData>('data'); if (d) setData(normalize(d))
        const c = await kvGet<SyncConfig>('syncCfg'); if (c) { setCfgState(c); setSync({ status: 'idle' }) }
      } catch (e) { console.error(e) }
      setReady(true)
    })()
  }, [])

  const persistTimer = useRef<number>()
  useEffect(() => {
    if (!ready) return
    window.clearTimeout(persistTimer.current)
    persistTimer.current = window.setTimeout(() => { kvSet('data', data).catch(console.error) }, 250)
  }, [data, ready])

  const syncNow = useCallback(async () => {
    const c = cfgRef.current
    if (!c || !c.token || !c.repo) return
    if (busy.current) { again.current = true; return }
    busy.current = true; setSync(s => ({ ...s, status: 'syncing' }))
    try {
      const { merged } = await syncOnce(c, dataRef.current)
      setData(cur => mergeData(cur, merged))
      setSync({ status: 'ok', at: Date.now() })
    } catch (e: any) {
      setSync({ status: 'error', error: e?.message || String(e), at: Date.now() })
    } finally {
      busy.current = false
      if (again.current) { again.current = false; window.setTimeout(syncNow, 500) }
    }
  }, [])

  const scheduleSync = useCallback(() => {
    if (!cfgRef.current?.auto) return
    window.clearTimeout(timer.current); timer.current = window.setTimeout(syncNow, 3500)
  }, [syncNow])

  // auto pull: on ready, focus, interval
  useEffect(() => {
    if (!ready || !syncCfg?.auto) return
    syncNow()
    const iv = window.setInterval(() => { if (document.visibilityState === 'visible') syncNow() }, 60000)
    const vis = () => { if (document.visibilityState === 'visible') syncNow() }
    document.addEventListener('visibilitychange', vis)
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', vis) }
  }, [ready, syncCfg?.repo, syncCfg?.token, syncCfg?.auto, syncNow])

  const commit = useCallback((fn: (d: AppData) => AppData) => {
    setData(d => fn(d)); scheduleSync()
  }, [scheduleSync])

  const stamp = <T extends { updatedAt: number }>(x: T): T => ({ ...x, updatedAt: Date.now() })
  const upArr = <T extends { id: string }>(arr: T[], x: T) => arr.some(a => a.id === x.id) ? arr.map(a => (a.id === x.id ? x : a)) : [...arr, x]

  const api: Ctx = useMemo(() => ({
    data, ready, sync, syncCfg, syncNow,
    setSyncCfg: async (c) => { setCfgState(c); await kvSet('syncCfg', c); setSync({ status: c ? 'idle' : 'off' }) },
    replaceData: (d) => commit(() => normalize(d)),
    mergeIn: (d) => commit(cur => mergeData(cur, d)),
    upsertRec: (r) => commit(d => ({ ...d, recs: upArr(d.recs, stamp({ ...r, userEdited: true })) })),
    patchRec: (id, p) => commit(d => ({ ...d, recs: d.recs.map(r => r.id === id ? stamp({ ...r, ...p, userEdited: true }) : r) })),
    setStatus: (id, to, remarks) => commit(d => ({
      ...d, recs: d.recs.map(r => r.id !== id || r.status === to ? r : stamp({
        ...r, status: to, lastUpdate: todayISO(), userEdited: true,
        statusLog: [...r.statusLog, { id: uid(), from: String(r.status), to, date: todayISO(), remarks }],
        comms: [...r.comms, { id: uid(), date: todayISO(), text: `Status: ${r.status} → ${to}${remarks ? ' — ' + remarks : ''}`, channel: 'status', source: 'app' }],
      })),
    })),
    addComm: (id, c) => commit(d => ({
      ...d, recs: d.recs.map(r => r.id === id ? stamp({ ...r, lastUpdate: c.date, userEdited: true, comms: [...r.comms, { ...c, id: uid(), source: 'app' as const }] }) : r),
    })),
    removeRec: (id) => commit(d => ({ ...d, recs: d.recs.map(r => r.id === id ? stamp({ ...r, deleted: true }) : r) })),
    upsertDoc: (x) => commit(d => ({ ...d, docs: upArr(d.docs, stamp(x)) })),
    upsertTask: (x) => commit(d => ({ ...d, tasks: upArr(d.tasks, stamp(x)) })),
    upsertNote: (x) => commit(d => ({ ...d, notes: upArr(d.notes, stamp(x)) })),
    setProfile: (p) => commit(d => ({ ...d, profile: { ...d.profile, ...p, updatedAt: Date.now() } })),
    setTemplates: (t) => commit(d => ({ ...d, prefs: { templates: t, templatesUpdatedAt: Date.now() } })),
    markBackup: () => setData(d => ({ ...d, lastBackupAt: Date.now() })),
  }), [data, ready, sync, syncCfg, syncNow, commit]) // eslint-disable-line

  return <C.Provider value={api}>{children}</C.Provider>
}

export const useRecs = (kind?: Rec['kind']) => {
  const { data } = useStore()
  return useMemo(() => data.recs.filter(r => !r.deleted && (!kind || r.kind === kind)), [data.recs, kind])
}
