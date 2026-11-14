import type { AppData } from '../types'
import { emptyData } from './defaults'

function mergeArr<T extends { id: string; updatedAt: number }>(a: T[], b: T[]): T[] {
  const m = new Map<string, T>()
  for (const x of a) m.set(x.id, x)
  for (const y of b) { const x = m.get(y.id); if (!x || (y.updatedAt || 0) > (x.updatedAt || 0)) m.set(y.id, y) }
  return Array.from(m.values())
}
export function normalize(d: Partial<AppData> | null | undefined): AppData {
  const e = emptyData()
  if (!d) return e
  return {
    version: 1,
    recs: d.recs || [], docs: d.docs || [], tasks: d.tasks || [], notes: d.notes || [],
    profile: d.profile || e.profile, prefs: d.prefs || e.prefs, lastBackupAt: d.lastBackupAt,
  }
}
export function mergeData(a: AppData, b: AppData): AppData {
  return {
    version: 1,
    recs: mergeArr(a.recs, b.recs), docs: mergeArr(a.docs, b.docs),
    tasks: mergeArr(a.tasks, b.tasks), notes: mergeArr(a.notes, b.notes),
    profile: (b.profile.updatedAt || 0) > (a.profile.updatedAt || 0) ? b.profile : a.profile,
    prefs: (b.prefs.templatesUpdatedAt || 0) > (a.prefs.templatesUpdatedAt || 0) ? b.prefs : a.prefs,
    lastBackupAt: Math.max(a.lastBackupAt || 0, b.lastBackupAt || 0) || undefined,
  }
}
export function canon(v: unknown): string {
  const walk = (x: any): any => Array.isArray(x) ? x.map(walk)
    : x && typeof x === 'object' ? Object.keys(x).sort().reduce((o: any, k) => { if (x[k] !== undefined) o[k] = walk(x[k]); return o }, {}) : x
  return JSON.stringify(walk(v))
}
export const sortedForSave = (d: AppData): AppData => ({
  ...d,
  recs: [...d.recs].sort((a, b) => (a.kind + String(a.sno).padStart(5, '0')).localeCompare(b.kind + String(b.sno).padStart(5, '0'))),
})
