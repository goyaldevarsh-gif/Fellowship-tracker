import type { AppData, Doc } from '../types'
import { fileGet } from './db'

/** CV (final, else latest) + LORs (all final ones, else all) from the vault. */
export function packDocs(data: AppData): Doc[] {
  const docs = data.docs.filter(d => !d.deleted)
  const pick = (cat: string, all: boolean) => {
    const l = docs.filter(d => d.category === cat).sort((a, b) => b.updatedAt - a.updatedAt)
    const fin = l.filter(d => d.final)
    const use = fin.length ? fin : l
    return all ? use : use.slice(0, 1)
  }
  return [...pick('CV', false), ...pick('LOR', true)]
}
export async function loadPack(data: AppData): Promise<{ files: File[]; missing: string[] }> {
  const files: File[] = [], missing: string[] = []
  for (const d of packDocs(data)) {
    const v = d.versions[d.versions.length - 1]
    const b = await fileGet(v.fileId)
    if (b) files.push(new File([b], v.name, { type: v.mime || 'application/pdf' })); else missing.push(d.title)
  }
  return { files, missing }
}
