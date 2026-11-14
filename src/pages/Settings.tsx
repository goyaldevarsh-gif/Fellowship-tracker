import { useMemo, useRef, useState } from 'react'
import { Cloud, FileSpreadsheet, Download, Upload, ShieldCheck, Lock, RefreshCw, AlertTriangle, CheckCircle2, MessageSquare, Smartphone, Trash2 } from 'lucide-react'
import { useStore } from '../lib/store'
import { Card, Field, H, Modal, confirmDialog, toast, cx } from '../components/ui'
import { applyImport, buildPreview, exportWorkbook, parseWorkbook, workbookBlob, type ImportItem } from '../lib/excel'
import { testConnection } from '../lib/sync'
import { fileGet, fileSet, kvGet, kvSet, wipeAll, fileKeys } from '../lib/db'
import { downloadBlob, todayISO } from '../lib/util'
import { normalize } from '../lib/merge'
import { hashPin } from '../components/Lock'
import type { AppData, Rec, SyncConfig, Templates } from '../types'

const blobToB64 = (b: Blob) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = rej; r.readAsDataURL(b) })
const b64ToBlob = (s: string, mime: string) => { const t = atob(s); const u = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) u[i] = t.charCodeAt(i); return new Blob([u], { type: mime }) }

const S = ({ icon: I, title, children }: { icon: any; title: string; children: React.ReactNode }) => (
  <Card className="p-5"><h2 className="font-semibold flex items-center gap-2 mb-3"><I size={18} className="text-teal" />{title}</h2>{children}</Card>)

export default function Settings() {
  const { data, syncCfg, setSyncCfg, syncNow, sync, mergeIn, replaceData, setTemplates, markBackup } = useStore()
  const [cfg, setCfg] = useState<SyncConfig>(syncCfg || { repo: 'goyaldevarsh-gif/fellowship-data', branch: 'main', path: 'db.json', token: '', syncFiles: true, auto: true })
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)
  const [imp, setImp] = useState<{ items: ImportItem[]; missing: number; sheets: Record<string, number>; warnings: string[]; accept: Record<string, boolean> } | null>(null)
  const [tpl, setTpl] = useState<Templates>(data.prefs.templates)
  const [pin, setPin] = useState('')
  const [restore, setRestore] = useState<{ d: AppData; files: { id: string; mime: string; b64: string }[]; name: string } | null>(null)
  const xlRef = useRef<HTMLInputElement>(null), jsonRef = useRef<HTMLInputElement>(null)

  const checks = useMemo(() => {
    const out: string[] = []
    const ids = new Set<string>()
    for (const r of data.recs) { if (ids.has(r.id)) out.push(`Duplicate id ${r.id}`); ids.add(r.id); if (!r.deleted && !r.hospital && !r.doctor) out.push(`Record ${r.id} has no name`) }
    const docIds = new Set(data.docs.filter(d => !d.deleted).map(d => d.id))
    for (const r of data.recs) for (const l of r.docLinks) if (!docIds.has(l.docId)) out.push(`${r.hospital || r.id}: linked document missing`)
    return out
  }, [data])

  const testSave = async () => {
    setMsg(null)
    try { const n = await testConnection(cfg); await setSyncCfg(cfg); setMsg({ ok: true, t: `Connected to ${n} (private ✓). Saved.` }); syncNow() }
    catch (e: any) { setMsg({ ok: false, t: e.message }) }
  }
  const pickExcel = async (f: File) => {
    try {
      const p = await parseWorkbook(f); const pv = buildPreview(p.recs, data)
      const accept: Record<string, boolean> = {}; pv.items.forEach(i => (accept[i.rec.id] = i.action === 'new' || i.action === 'update'))
      setImp({ ...pv, sheets: p.sheets, warnings: p.warnings, accept })
    } catch (e: any) { toast('Could not read file: ' + e.message) }
  }
  const confirmImport = () => {
    if (!imp) return
    const next = applyImport(data, imp.items, i => !!imp.accept[i.rec.id]); replaceData(next)
    toast(`Imported: ${imp.items.filter(i => imp.accept[i.rec.id] && i.action !== 'same').length} records`); setImp(null)
  }
  const exportXlsx = () => { downloadBlob(workbookBlob(exportWorkbook(data)), `Fellowship_Tracker_${todayISO()}.xlsx`); toast('Excel exported') }
  const backup = async (withFiles: boolean) => {
    const files: any[] = []
    if (withFiles) for (const d of data.docs) for (const v of d.versions) { const b = await fileGet(v.fileId); if (b) files.push({ id: v.fileId, mime: v.mime, b64: await blobToB64(b) }) }
    const now = Date.now()
    downloadBlob(new Blob([JSON.stringify({ app: 'FellowTrack', exportedAt: new Date(now).toISOString(), data: { ...data, lastBackupAt: now }, files })], { type: 'application/json' }), `FellowTrack_backup_${todayISO()}${withFiles ? '_with-documents' : ''}.json`)
    markBackup(); toast('Backup downloaded')
  }
  const pickBackup = async (f: File) => {
    try {
      const j = JSON.parse(await f.text())
      if (j.app !== 'FellowTrack' || !j.data) throw new Error('Not a FellowTrack backup')
      setRestore({ d: normalize(j.data), files: j.files || [], name: f.name })
    } catch (e: any) { toast(e.message || 'Invalid backup file') }
  }
  const doRestore = async () => {
    if (!restore) return
    for (const f of restore.files) await fileSet(f.id, b64ToBlob(f.b64, f.mime))
    replaceData({ ...restore.d, recs: restore.d.recs, version: 1 }); setRestore(null); toast('Backup restored')
  }
  const setPinLock = async () => { if (pin.length < 4) return toast('PIN must be at least 4 digits'); await kvSet('pinHash', await hashPin(pin)); setPin(''); toast('PIN lock enabled') }
  const removePin = async () => { await kvSet('pinHash', ''); toast('PIN lock removed') }
  const wipe = async () => {
    if (!(await confirmDialog('Erase ALL local data and documents on this device? If cloud sync is on, data in your private repo is not touched.', 'Erase everything', true))) return
    await wipeAll(); location.reload()
  }
  const lastBackup = data.lastBackupAt ? new Date(data.lastBackupAt).toLocaleString() : 'Never'
  const counts = { f: data.recs.filter(r => !r.deleted && r.kind === 'fellowship').length, o: data.recs.filter(r => !r.deleted && r.kind === 'observership').length, a: data.recs.filter(r => !r.deleted && r.kind === 'footankle').length }

  return (
    <div className="space-y-4 max-w-3xl">
      <H title="Settings" sub="Cloud sync, Excel import/export, backup, message templates and security" />

      <S icon={Cloud} title="Cloud sync (private GitHub repo)">
        <p className="text-sm text-slate-600 mb-3">Your data is stored in a <b>private</b> repo as <code>db.json</code>. This app and Claude both read/write that file, so changes made in chat show up here and vice-versa. The token is saved only in this browser.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Data repo (owner/name)"><input className="inp" value={cfg.repo} onChange={e => setCfg({ ...cfg, repo: e.target.value.trim() })} /></Field>
          <Field label="Branch"><input className="inp" value={cfg.branch} onChange={e => setCfg({ ...cfg, branch: e.target.value.trim() })} /></Field>
          <Field label="Fine-grained token (Contents: read & write, only this repo)" className="sm:col-span-2"><input className="inp" type="password" autoComplete="off" value={cfg.token} onChange={e => setCfg({ ...cfg, token: e.target.value.trim() })} placeholder="github_pat_…" /></Field>
        </div>
        <div className="flex flex-wrap gap-4 mt-3 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={cfg.auto} onChange={e => setCfg({ ...cfg, auto: e.target.checked })} />Auto-sync</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={cfg.syncFiles} onChange={e => setCfg({ ...cfg, syncFiles: e.target.checked })} />Also sync documents (CV / LOR files)</label>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <button className="btn btn-primary" onClick={testSave} disabled={!cfg.token || !cfg.repo}>Test & save</button>
          <button className="btn btn-ghost" onClick={syncNow} disabled={!syncCfg}><RefreshCw size={15} className={sync.status === 'syncing' ? 'animate-spin' : ''} /> Sync now</button>
          {syncCfg && <button className="btn btn-ghost" onClick={async () => { await setSyncCfg(null); setMsg(null) }}>Disconnect</button>}
        </div>
        {msg && <div className={cx('mt-3 text-sm flex items-start gap-2', msg.ok ? 'text-green-700' : 'text-red-600')}>{msg.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}{msg.t}</div>}
        {syncCfg && <div className="mt-2 text-xs text-slate-500">Status: {sync.status}{sync.at ? ` · ${new Date(sync.at).toLocaleTimeString()}` : ''}{sync.error ? ` · ${sync.error}` : ''}</div>}
      </S>

      <S icon={FileSpreadsheet} title="Excel import / export">
        <p className="text-sm text-slate-600 mb-3">Import reads Final List, Observership and Foot & Ankle. You always get a preview first; records you've edited in the app are never overwritten unless you tick them.</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={() => xlRef.current?.click()}><Upload size={15} /> Import Excel</button>
          <button className="btn btn-ghost" onClick={exportXlsx}><Download size={15} /> Export Excel</button>
        </div>
        <input ref={xlRef} type="file" hidden accept=".xlsx,.xls" aria-label="Import Excel file" onChange={e => { const f = e.target.files?.[0]; if (f) pickExcel(f); e.target.value = '' }} />
        <div className="text-xs text-slate-500 mt-3">In the app now: {counts.f} fellowships · {counts.o} observerships · {counts.a} foot & ankle</div>
      </S>

      <S icon={ShieldCheck} title="Backup & restore">
        <p className="text-sm text-slate-600 mb-3">Clearing browser data or switching device can lose local data if there's no backup or cloud sync. Last backup: <b>{lastBackup}</b></p>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={() => backup(false)}><Download size={15} /> Backup (data)</button>
          <button className="btn btn-ghost" onClick={() => backup(true)}><Download size={15} /> Backup incl. documents</button>
          <button className="btn btn-ghost" onClick={() => jsonRef.current?.click()}><Upload size={15} /> Restore backup</button>
        </div>
        <input ref={jsonRef} type="file" hidden accept=".json,application/json" aria-label="Restore backup file" onChange={e => { const f = e.target.files?.[0]; if (f) pickBackup(f); e.target.value = '' }} />
        <div className="mt-4 text-sm"><div className="font-medium mb-1">Data integrity</div>{checks.length === 0 ? <div className="text-green-700 flex items-center gap-1"><CheckCircle2 size={14} /> No problems found</div> : checks.slice(0, 8).map((c, i) => <div key={i} className="text-amber-700 text-xs">• {c}</div>)}</div>
      </S>

      <S icon={MessageSquare} title="Message templates">
        <p className="text-sm text-slate-600 mb-3">Used by the Contact buttons. Placeholders: <code>{'{doctor}'}</code> <code>{'{hospital}'}</code> <code>{'{location}'}</code></p>
        <Field label="WhatsApp message"><textarea className="inp" rows={5} value={tpl.whatsapp} onChange={e => setTpl({ ...tpl, whatsapp: e.target.value })} /></Field>
        <Field label="Email subject" className="mt-3"><input className="inp" value={tpl.emailSubject} onChange={e => setTpl({ ...tpl, emailSubject: e.target.value })} /></Field>
        <Field label="Email body" className="mt-3"><textarea className="inp" rows={8} value={tpl.emailBody} onChange={e => setTpl({ ...tpl, emailBody: e.target.value })} /></Field>
        <button className="btn btn-primary mt-3" onClick={() => { setTemplates(tpl); toast('Templates saved') }}>Save templates</button>
      </S>

      <S icon={Lock} title="App lock">
        <p className="text-sm text-slate-600 mb-3">Optional PIN asks on open. It's a convenience lock on this device — your real protection is the private data repo.</p>
        <div className="flex gap-2"><input className="inp !w-40" type="password" inputMode="numeric" placeholder="New PIN" value={pin} onChange={e => setPin(e.target.value)} aria-label="New PIN" /><button className="btn btn-primary" onClick={setPinLock}>Set PIN</button><button className="btn btn-ghost" onClick={removePin}>Remove</button></div>
      </S>

      <S icon={Smartphone} title="Install & calendar">
        <ul className="text-sm text-slate-600 space-y-1 list-disc pl-5">
          <li><b>iPhone:</b> Safari → Share → Add to Home Screen. <b>Android / desktop:</b> browser menu → Install FellowTrack.</li>
          <li>Reminders: Calendar page → "iPhone calendar (.ics)" adds all follow-ups/interviews/tasks with alerts to Apple Calendar. Re-import after changes — events update instead of duplicating.</li>
          <li>Hosting note: this site's code is public; your data never is (private repo / local only).</li>
        </ul>
      </S>

      <Card className="p-5 border-red-200"><button className="btn btn-danger" onClick={wipe}><Trash2 size={15} /> Erase local data on this device</button></Card>

      <Modal open={!!imp} onClose={() => setImp(null)} wide title="Import preview"
        footer={<><button className="btn btn-ghost" onClick={() => setImp(null)}>Cancel</button><button className="btn btn-primary" onClick={confirmImport}>Import selected</button></>}>
        {imp && <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(imp.sheets).map(([k, v]) => <span key={k} className="chip">{k}: {v < 0 ? 'recalculated live' : v + ' rows'}</span>)}
            <span className="chip">New {imp.items.filter(i => i.action === 'new').length}</span><span className="chip">Updated {imp.items.filter(i => i.action === 'update').length}</span>
            <span className="chip">Unchanged {imp.items.filter(i => i.action === 'same').length}</span><span className="chip !border-amber-300">Edited in app {imp.items.filter(i => i.action === 'conflict').length}</span>
          </div>
          {imp.missing > 0 && <div className="text-xs text-slate-500">{imp.missing} records in the app are not in this file — they are kept.</div>}
          {imp.warnings.map(w => <div key={w} className="text-xs text-amber-700">{w}</div>)}
          <div className="max-h-72 overflow-y-auto border border-line rounded-xl divide-y divide-line">
            {imp.items.filter(i => i.action !== 'same').map(i => (
              <label key={i.rec.id} className="flex items-start gap-2 p-2.5">
                <input type="checkbox" className="mt-1" checked={!!imp.accept[i.rec.id]} onChange={e => setImp({ ...imp, accept: { ...imp.accept, [i.rec.id]: e.target.checked } })} />
                <div className="min-w-0"><div className="font-medium">{i.rec.hospital || i.rec.doctor} <span className="text-xs text-slate-400">({i.rec.kind} #{i.rec.sno})</span></div>
                  <div className="text-xs text-slate-500">{i.action === 'new' ? 'New record' : i.action === 'conflict' ? `You edited this in the app — overwrite? Changes: ${i.changed.join(', ')}` : `Changed: ${i.changed.join(', ')}`}{i.dupOf ? ` · possible duplicate of ${i.dupOf}` : ''}</div></div>
              </label>))}
            {imp.items.every(i => i.action === 'same') && <div className="p-4 text-slate-500">Everything in the file already matches the app.</div>}
          </div>
        </div>}
      </Modal>
      <Modal open={!!restore} onClose={() => setRestore(null)} title="Restore backup?"
        footer={<><button className="btn btn-ghost" onClick={() => setRestore(null)}>Cancel</button><button className="btn btn-danger" onClick={doRestore}>Replace my data</button></>}>
        {restore && <p className="text-sm">"{restore.name}" has {restore.d.recs.length} records, {restore.d.docs.length} documents, {restore.d.notes.length} notes ({restore.files.length} files). This <b>replaces</b> the data currently in the app.</p>}
      </Modal>
    </div>
  )
}
