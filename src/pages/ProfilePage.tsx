import { useState } from 'react'
import { Link } from 'react-router-dom'
import { UserRound, FileText } from 'lucide-react'
import { useStore } from '../lib/store'
import { Card, H, Field, toast } from '../components/ui'
import type { Profile } from '../types'

export default function ProfilePage() {
  const { data, setProfile } = useStore()
  const [p, setP] = useState<Profile>(data.profile)
  const set = (k: keyof Profile, v: string) => setP({ ...p, [k]: v })
  const ta = (k: keyof Profile, label: string, rows = 3) => <Field label={label}><textarea className="inp" rows={rows} value={String(p[k])} onChange={e => set(k, e.target.value)} placeholder="Not added yet" /></Field>
  const finals = data.docs.filter(d => !d.deleted && (d.category === 'CV' || d.category === 'LOR'))
  return (
    <div className="max-w-3xl">
      <H title="My profile" sub="Editable — nothing here is invented; add what you want on record" right={<button className="btn btn-primary" onClick={() => { setProfile(p); toast('Profile saved') }}>Save</button>} />
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-3"><div className="w-14 h-14 rounded-full bg-navy text-white flex items-center justify-center"><UserRound size={26} /></div>
          <div className="flex-1"><Field label="Name"><input className="inp" value={p.name} onChange={e => set('name', e.target.value)} /></Field></div></div>
        <div className="grid sm:grid-cols-3 gap-3"><Field label="Phone 1"><input className="inp" value={p.phone1} onChange={e => set('phone1', e.target.value)} /></Field><Field label="Phone 2"><input className="inp" value={p.phone2} onChange={e => set('phone2', e.target.value)} /></Field><Field label="Email"><input className="inp" value={p.email} onChange={e => set('email', e.target.value)} /></Field></div>
        {ta('qualifications', 'Academic qualifications')}{ta('experience', 'Professional experience')}{ta('research', 'Research & publications')}{ta('surgical', 'Surgical experience')}{ta('preferences', 'Fellowship preferences & goals')}
      </Card>
      <Card className="p-5 mt-4"><div className="font-semibold mb-2">Application document shortcuts</div>
        {finals.length === 0 ? <div className="text-sm text-slate-400">No CV / LOR in the vault yet. <Link to="/documents" className="text-teal">Upload</Link></div> : finals.map(d => <Link key={d.id} to="/documents" className="flex items-center gap-2 py-1.5 text-sm hover:text-teal"><FileText size={15} className="text-red-500" />{d.title}<span className="text-xs text-slate-400">{d.category}{d.final ? ' · final' : ''}</span></Link>)}</Card>
    </div>
  )
}
