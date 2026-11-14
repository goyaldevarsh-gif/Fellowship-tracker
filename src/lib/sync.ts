import type { AppData, SyncConfig } from '../types'
import { mergeData, normalize, canon, sortedForSave } from './merge'
import { fileGet, fileSet } from './db'

const API = 'https://api.github.com'
const b64enc = (s: string) => { const b = new TextEncoder().encode(s); let t = ''; b.forEach(c => (t += String.fromCharCode(c))); return btoa(t) }
const b64dec = (s: string) => { const t = atob(s.replace(/\n/g, '')); const b = Uint8Array.from(t, c => c.charCodeAt(0)); return new TextDecoder().decode(b) }
const blobToB64 = (b: Blob) => new Promise<string>((res, rej) => {
  const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = rej; r.readAsDataURL(b)
})
const hdr = (c: SyncConfig, extra: Record<string, string> = {}) => ({
  Authorization: `Bearer ${c.token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...extra,
})
const url = (c: SyncConfig, p: string) => `${API}/repos/${c.repo}/contents/${p.split('/').map(encodeURIComponent).join('/')}`

export async function testConnection(c: SyncConfig): Promise<string> {
  const r = await fetch(`${API}/repos/${c.repo}`, { headers: hdr(c) })
  if (!r.ok) throw new Error(r.status === 404 ? 'Repo not found / token has no access' : `GitHub ${r.status}`)
  const j = await r.json()
  if (!j.private) throw new Error('Repo is PUBLIC — use a private repo for personal data')
  if (j.permissions && !j.permissions.push) throw new Error('Token has no write access')
  return j.full_name
}

async function getRemote(c: SyncConfig): Promise<{ data: AppData | null; sha?: string }> {
  const r = await fetch(url(c, c.path) + `?ref=${encodeURIComponent(c.branch)}&t=${Date.now()}`, { headers: hdr(c) })
  if (r.status === 404) return { data: null }
  if (!r.ok) throw new Error(`Pull failed (${r.status})`)
  const j = await r.json()
  let text: string
  if (j.content) text = b64dec(j.content)
  else { // large file: fetch raw
    const rr = await fetch(url(c, c.path) + `?ref=${encodeURIComponent(c.branch)}`, { headers: hdr(c, { Accept: 'application/vnd.github.raw+json' }) })
    text = await rr.text()
  }
  return { data: normalize(JSON.parse(text)), sha: j.sha }
}

async function putRemote(c: SyncConfig, data: AppData, sha?: string) {
  const body = { message: 'FellowTrack sync', branch: c.branch, content: b64enc(JSON.stringify(sortedForSave(data), null, 2)), ...(sha ? { sha } : {}) }
  const r = await fetch(url(c, c.path), { method: 'PUT', headers: hdr(c, { 'Content-Type': 'application/json' }), body: JSON.stringify(body) })
  if (r.status === 409 || r.status === 422) throw Object.assign(new Error('conflict'), { conflict: true })
  if (!r.ok) throw new Error(`Push failed (${r.status})`)
}

async function syncFiles(c: SyncConfig, data: AppData) {
  const wanted = new Map<string, string>() // fileId -> name
  for (const d of data.docs) if (!d.deleted) for (const v of d.versions) wanted.set(v.fileId, v.name)
  if (!wanted.size) return
  let remote = new Set<string>()
  const ls = await fetch(url(c, 'files') + `?ref=${encodeURIComponent(c.branch)}&t=${Date.now()}`, { headers: hdr(c) })
  if (ls.ok) remote = new Set((await ls.json()).map((x: any) => x.name))
  for (const [fid] of wanted) {
    const local = await fileGet(fid)
    if (local && !remote.has(fid)) {
      const content = await blobToB64(local)
      const r = await fetch(url(c, 'files/' + fid), { method: 'PUT', headers: hdr(c, { 'Content-Type': 'application/json' }), body: JSON.stringify({ message: 'FellowTrack file', branch: c.branch, content }) })
      if (!r.ok && r.status !== 422) throw new Error(`File upload failed (${r.status})`)
    } else if (!local && remote.has(fid)) {
      const r = await fetch(url(c, 'files/' + fid) + `?ref=${encodeURIComponent(c.branch)}`, { headers: hdr(c, { Accept: 'application/vnd.github.raw+json' }) })
      if (r.ok) await fileSet(fid, await r.blob())
    }
  }
}

/** Pull → merge → push (if changed). Returns merged data. */
export async function syncOnce(c: SyncConfig, local: AppData): Promise<{ merged: AppData; pushed: boolean; pulledChanges: boolean }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: remote, sha } = await getRemote(c)
    const merged = remote ? mergeData(local, remote) : local
    const pulledChanges = !!remote && canon(merged) !== canon(local)
    let pushed = false
    if (!remote || canon(merged) !== canon(remote)) {
      try { await putRemote(c, merged, sha); pushed = true } catch (e: any) { if (e.conflict) continue; throw e }
    }
    if (c.syncFiles) await syncFiles(c, merged)
    return { merged, pushed, pulledChanges }
  }
  throw new Error('Sync conflict — try again')
}
