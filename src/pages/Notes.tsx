import { useMemo, useState } from 'react'
import { Plus, Trash2, StickyNote } from 'lucide-react'
import type { Note } from '../types'
import { useStore } from '../lib/store'
import { Card, Empty, Field, H, Modal, cx, confirmDialog } from '../components/ui'
import { recTitle, uid } from '../lib/util'

const TYPES: Note['type'][] = ['general', 'institute', 'doctor', 'interview', 'questions', 'followup']
const LABEL: Record<string, string> = { general: 'General', institute: 'Institute', doctor: 'Doctor', interview: 'Interview prep', questions: 'Questions to ask', followup: 'Follow-up points' }
const blank = (): Note => ({ id: uid(), title: '', body: '', type: 'general', checklist: [], updatedAt: 0 })

export default function Notes() {
  const { data, upsertNote } = useStore()
  const [q, setQ] = useState(''), [type, setType] = useState('')
  const [edit, setEdit] = useState<Note | null>(null)
  const [item, setItem] = useState('')
  const list = useMemo(() => data.notes.filter(n => !n.deleted && (!type || n.type === type) && (!q || (n.title + n.body + n.checklist.map(c => c.text).join(' ')).toLowerCase().includes(q.toLowerCase()))).sort((a, b) => b.updatedAt - a.updatedAt), [data.notes, q, type])
  return (
    <div>
      <H title="Notes" sub="Research, interview preparation, questions for faculty and to-dos" right={<button className="btn btn-primary" onClick={() => setEdit(blank())}><Plus size={16} /> New note</button>} />
      <input className="inp mb-3" placeholder="Search notes…" value={q} onChange={e => setQ(e.target.value)} aria-label="Search notes" />
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2"><button className={cx('chip', !type && 'chip-on')} onClick={() => setType('')}>All</button>{TYPES.map(t => <button key={t} className={cx('chip whitespace-nowrap', type === t && 'chip-on')} onClick={() => setType(t)}>{LABEL[t]}</button>)}</div>
      {list.length === 0 ? <Card><Empty title="No notes yet" sub="Capture what a doctor said, questions to ask, interview prep." action={<button className="btn btn-primary" onClick={() => setEdit(blank())}>Add a note</button>} /></Card> : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{list.map(n => {
          const rec = n.recId ? data.recs.find(r => r.id === n.recId) : null; const done = n.checklist.filter(c => c.done).length
          return <Card key={n.id} className="p-4 cursor-pointer hover:shadow-md" onClick={() => setEdit(n)}>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-1"><StickyNote size={13} />{LABEL[n.type]}{rec && <span>· {recTitle(rec)}</span>}</div>
            <div className="font-semibold">{n.title || 'Untitled'}</div>
            <div className="text-sm text-slate-600 line-clamp-4 whitespace-pre-line mt-1">{n.body}</div>
            {n.checklist.length > 0 && <div className="text-xs text-teal mt-2">☑ {done}/{n.checklist.length} done</div>}
          </Card> })}</div>)}
      <Modal open={!!edit} onClose={() => setEdit(null)} wide title={edit && data.notes.some(n => n.id === edit.id) ? 'Edit note' : 'New note'}
        footer={<>{edit && data.notes.some(n => n.id === edit.id) && <button className="btn btn-danger mr-auto" onClick={async () => { if (edit && await confirmDialog('Delete this note?', 'Delete', true)) { upsertNote({ ...edit, deleted: true }); setEdit(null) } }}><Trash2 size={14} /> Delete</button>}
          <button className="btn btn-ghost" onClick={() => setEdit(null)}>Cancel</button><button className="btn btn-primary" disabled={!edit?.title.trim() && !edit?.body.trim()} onClick={() => { if (edit) upsertNote(edit); setEdit(null) }}>Save</button></>}>
        {edit && <div className="space-y-3">
          <Field label="Title"><input className="inp" value={edit.title} onChange={e => setEdit({ ...edit, title: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type"><select className="inp" value={edit.type} onChange={e => setEdit({ ...edit, type: e.target.value as any })}>{TYPES.map(t => <option key={t} value={t}>{LABEL[t]}</option>)}</select></Field>
            <Field label="Linked programme"><select className="inp" value={edit.recId || ''} onChange={e => setEdit({ ...edit, recId: e.target.value || undefined })}><option value="">—</option>{data.recs.filter(r => !r.deleted).sort((a, b) => recTitle(a).localeCompare(recTitle(b))).map(r => <option key={r.id} value={r.id}>{recTitle(r)}</option>)}</select></Field></div>
          <Field label="Note"><textarea className="inp" rows={6} value={edit.body} onChange={e => setEdit({ ...edit, body: e.target.value })} /></Field>
          <div><label className="lbl">Checklist</label>
            {edit.checklist.map(c => <div key={c.id} className="flex items-center gap-2 py-1"><input type="checkbox" checked={c.done} aria-label={c.text} onChange={() => setEdit({ ...edit, checklist: edit.checklist.map(x => x.id === c.id ? { ...x, done: !x.done } : x) })} />
              <span className={cx('flex-1 text-sm', c.done && 'line-through text-slate-400')}>{c.text}</span><button aria-label="Remove item" className="text-slate-400 hover:text-red-600" onClick={() => setEdit({ ...edit, checklist: edit.checklist.filter(x => x.id !== c.id) })}><Trash2 size={13} /></button></div>)}
            <div className="flex gap-2 mt-1"><input className="inp" placeholder="Add item…" value={item} onChange={e => setItem(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && item.trim()) { setEdit({ ...edit, checklist: [...edit.checklist, { id: uid(), text: item.trim(), done: false }] }); setItem('') } }} />
              <button className="btn btn-ghost" disabled={!item.trim()} onClick={() => { setEdit({ ...edit, checklist: [...edit.checklist, { id: uid(), text: item.trim(), done: false }] }); setItem('') }}>Add</button></div></div>
        </div>}
      </Modal>
    </div>
  )
}
