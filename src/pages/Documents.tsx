import { useEffect, useMemo, useRef, useState } from 'react'
import { Upload, FileText, FileImage, File as FileIcon, Eye, Download, Pencil, Trash2, CheckCircle2, History, Plus, ExternalLink } from 'lucide-react'
import { DOC_CATS, type Doc } from '../types'
import { useStore } from '../lib/store'
import { fileDel, fileGet, fileSet } from '../lib/db'
import { Card, Empty, Field, H, Modal, confirmDialog, cx, toast } from '../components/ui'
import { downloadBlob, fmtDate, uid } from '../lib/util'

const sizeFmt = (n: number) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB')
const icon = (mime: string) => mime.startsWith('image/') ? FileImage : mime === 'application/pdf' ? FileText : FileIcon
const guessCat = (n: string) => /lor|recommend/i.test(n) ? 'LOR' : /cv|resume/i.test(n) ? 'CV' : /sop|purpose/i.test(n) ? 'SOP' : 'Other Documents'

export default function Documents() {
  const { data, upsertDoc, syncCfg } = useStore()
  const docs = useMemo(() => data.docs.filter(d => !d.deleted), [data.docs])
  const [cat, setCat] = useState('All'), [q, setQ] = useState('')
  const [up, setUp] = useState<{ file: File; category: string; title: string; description: string; versionOf?: string } | null>(null)
  const [preview, setPreview] = useState<{ doc: Doc; url: string; mime: string } | null>(null)
  const [edit, setEdit] = useState<Doc | null>(null)
  const [hist, setHist] = useState<Doc | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const verRef = useRef<HTMLInputElement>(null)
  const verDoc = useRef<Doc | null>(null)
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url) }, [preview])

  const shown = docs.filter(d => (cat === 'All' || d.category === cat) && (!q || (d.title + d.description + d.category).toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => DOC_CATS.indexOf(a.category as any) - DOC_CATS.indexOf(b.category as any) || b.updatedAt - a.updatedAt)

  const saveUpload = async () => {
    if (!up) return
    const fid = uid()
    await fileSet(fid, up.file)
    const v = { fileId: fid, name: up.file.name, size: up.file.size, mime: up.file.type || 'application/octet-stream', addedAt: Date.now() }
    const ex = up.versionOf ? docs.find(d => d.id === up.versionOf) : undefined
    if (ex) upsertDoc({ ...ex, versions: [...ex.versions, v] })
    else upsertDoc({ id: uid(), category: up.category, title: up.title.trim() || up.file.name, description: up.description, final: false, versions: [v], updatedAt: 0 })
    setUp(null); toast(ex ? 'New version added' : 'Document added')
  }
  const view = async (d: Doc) => {
    const v = d.versions[d.versions.length - 1]; const b = await fileGet(v.fileId)
    if (!b) { toast(syncCfg?.syncFiles ? 'File not on this device yet — sync first' : 'File is not stored on this device'); return }
    if (preview) URL.revokeObjectURL(preview.url)
    setPreview({ doc: d, url: URL.createObjectURL(new Blob([b], { type: v.mime })), mime: v.mime })
  }
  const dl = async (d: Doc, i = d.versions.length - 1) => {
    const v = d.versions[i]; const b = await fileGet(v.fileId); if (!b) return toast('File not on this device')
    downloadBlob(b, v.name)
  }
  const del = async (d: Doc) => { if (await confirmDialog(`Delete "${d.title}" and all its versions?`, 'Delete', true)) { upsertDoc({ ...d, deleted: true }); for (const v of d.versions) fileDel(v.fileId).catch(() => {}) } }
  const counts = (c: string) => docs.filter(d => d.category === c).length

  return (
    <div>
      <H title="Document Vault" sub="CV, LORs, SOPs and certificates — stored on this device (and your private repo if sync files is on)"
        right={<button className="btn btn-primary" onClick={() => fileRef.current?.click()}><Upload size={16} /> Upload</button>} />
      <input ref={fileRef} type="file" hidden accept=".pdf,.doc,.docx,image/*" aria-label="Upload file" onChange={e => { const f = e.target.files?.[0]; if (f) setUp({ file: f, category: guessCat(f.name), title: f.name.replace(/\.[^.]+$/, ''), description: '' }); e.target.value = '' }} />
      <input ref={verRef} type="file" hidden accept=".pdf,.doc,.docx,image/*" aria-label="Upload new version" onChange={e => { const f = e.target.files?.[0]; if (f && verDoc.current) setUp({ file: f, category: verDoc.current.category, title: verDoc.current.title, description: '', versionOf: verDoc.current.id }); e.target.value = '' }} />
      <div className="flex gap-2 mb-3"><input className="inp" placeholder="Search documents…" value={q} onChange={e => setQ(e.target.value)} aria-label="Search documents" /></div>
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-thin">
        {['All', ...DOC_CATS].map(c => <button key={c} className={cx('chip whitespace-nowrap', cat === c && 'chip-on')} onClick={() => setCat(c)}>{c}{c !== 'All' && counts(c) ? ` (${counts(c)})` : ''}</button>)}
      </div>
      {shown.length === 0 ? <Card><Empty title="No documents added" sub="Upload your CV, LORs and certificates. Files stay on your device unless you turn on file sync." action={<button className="btn btn-primary" onClick={() => fileRef.current?.click()}><Plus size={15} /> Upload first document</button>} /></Card> : (
        <div className="grid md:grid-cols-2 gap-3">
          {shown.map(d => { const v = d.versions[d.versions.length - 1]; const I = icon(v.mime)
            const used = data.recs.filter(r => !r.deleted && r.docLinks.some(l => l.docId === d.id)).length
            return (
              <Card key={d.id} className="p-4">
                <div className="flex gap-3">
                  <div className="w-11 h-11 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0"><I size={20} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><span className="font-semibold truncate">{d.title}</span>{d.final && <span className="text-[10px] bg-green-100 text-green-700 rounded-full px-2 py-0.5 flex items-center gap-1"><CheckCircle2 size={11} />Final</span>}</div>
                    <div className="text-xs text-slate-500 truncate">{d.category} · {v.name}</div>
                    <div className="text-xs text-slate-400">{sizeFmt(v.size)} · Updated {fmtDate(new Date(d.updatedAt).toISOString().slice(0, 10))} · v{d.versions.length}{used ? ` · linked to ${used}` : ''}</div>
                    {d.description && <div className="text-xs text-slate-600 mt-1">{d.description}</div>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <button className="btn btn-ghost !py-1 text-xs" onClick={() => view(d)}><Eye size={13} /> Preview</button>
                  <button className="btn btn-ghost !py-1 text-xs" onClick={() => dl(d)}><Download size={13} /> Download</button>
                  <button className="btn btn-ghost !py-1 text-xs" onClick={() => setEdit(d)}><Pencil size={13} /> Rename</button>
                  <button className="btn btn-ghost !py-1 text-xs" onClick={() => upsertDoc({ ...d, final: !d.final })}><CheckCircle2 size={13} /> {d.final ? 'Unmark final' : 'Mark final'}</button>
                  <button className="btn btn-ghost !py-1 text-xs" onClick={() => setHist(d)}><History size={13} /> Versions</button>
                  <button className="btn btn-ghost !py-1 text-xs" onClick={() => { verDoc.current = d; verRef.current?.click() }}><Upload size={13} /> New version</button>
                  <button className="btn btn-danger !py-1 text-xs" aria-label={`Delete ${d.title}`} onClick={() => del(d)}><Trash2 size={13} /></button>
                </div>
              </Card>) })}
        </div>)}

      <Modal open={!!up} onClose={() => setUp(null)} title={up?.versionOf ? 'Add new version' : 'Add document'}
        footer={<><button className="btn btn-ghost" onClick={() => setUp(null)}>Cancel</button><button className="btn btn-primary" onClick={saveUpload}>Save</button></>}>
        {up && <div className="space-y-3">
          <div className="text-sm text-slate-600 break-all">{up.file.name} · {sizeFmt(up.file.size)}</div>
          {!up.versionOf && <>
            <Field label="Category"><select className="inp" value={up.category} onChange={e => setUp({ ...up, category: e.target.value })}>{DOC_CATS.map(c => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Title (e.g. LOR — Dr. Lamoria)"><input className="inp" value={up.title} onChange={e => setUp({ ...up, title: e.target.value })} /></Field>
            <Field label="Description"><input className="inp" value={up.description} onChange={e => setUp({ ...up, description: e.target.value })} /></Field></>}
        </div>}
      </Modal>
      <Modal open={!!edit} onClose={() => setEdit(null)} title="Edit document"
        footer={<><button className="btn btn-ghost" onClick={() => setEdit(null)}>Cancel</button><button className="btn btn-primary" onClick={() => { if (edit) upsertDoc(edit); setEdit(null) }}>Save</button></>}>
        {edit && <div className="space-y-3">
          <Field label="Title"><input className="inp" value={edit.title} onChange={e => setEdit({ ...edit, title: e.target.value })} /></Field>
          <Field label="Category"><select className="inp" value={edit.category} onChange={e => setEdit({ ...edit, category: e.target.value })}>{DOC_CATS.map(c => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Description"><textarea className="inp" rows={2} value={edit.description} onChange={e => setEdit({ ...edit, description: e.target.value })} /></Field></div>}
      </Modal>
      <Modal open={!!hist} onClose={() => setHist(null)} title={`Versions — ${hist?.title}`}>
        {hist && [...hist.versions].map((v, i) => ({ v, i })).reverse().map(({ v, i }) => (
          <div key={v.fileId} className="flex items-center gap-2 py-2 border-b border-line/60 text-sm"><span className="font-semibold w-8">v{i + 1}</span><span className="flex-1 min-w-0 truncate">{v.name}<span className="block text-xs text-slate-400">{sizeFmt(v.size)} · {new Date(v.addedAt).toLocaleDateString()}{i === hist.versions.length - 1 ? ' · current' : ''}</span></span>
            <button className="btn btn-ghost !py-1 text-xs" onClick={() => dl(hist, i)}><Download size={13} /></button></div>))}
      </Modal>
      <Modal open={!!preview} onClose={() => setPreview(null)} wide title={preview?.doc.title || 'Preview'}>
        {preview && (preview.mime.startsWith('image/') ? <img src={preview.url} alt={preview.doc.title} className="max-w-full mx-auto rounded-lg" />
          : preview.mime === 'application/pdf' ? <div><iframe title="PDF preview" src={preview.url} className="w-full h-[65vh] rounded-lg border border-line" />
            <a className="text-xs text-teal inline-flex items-center gap-1 mt-2" href={preview.url} target="_blank" rel="noreferrer">Open in new tab <ExternalLink size={12} /></a></div>
          : <div className="text-sm text-slate-600">Preview isn't available for this file type. <button className="text-teal underline" onClick={() => dl(preview.doc)}>Download it</button> instead.</div>)}
      </Modal>
    </div>
  )
}
