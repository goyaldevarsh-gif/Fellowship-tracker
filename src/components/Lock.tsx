import { useState } from 'react'
import { Lock as LockIcon } from 'lucide-react'
import { kvGet } from '../lib/db'
import { Mark, Wordmark } from './Logo'

export const hashPin = async (pin: string) => {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('fellowtrack:' + pin))
  return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('')
}
export default function Lock({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState(''), [err, setErr] = useState(false)
  const go = async () => {
    const h = await kvGet<string>('pinHash')
    if (h === (await hashPin(pin))) onUnlock(); else { setErr(true); setPin('') }
  }
  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="card p-8 w-full max-w-sm text-center">
        <div className="flex justify-center mb-3"><Mark size={52} /></div>
        <Wordmark size={26} />
        <p className="text-sm text-slate-500 mt-2 mb-5 flex items-center justify-center gap-1.5"><LockIcon size={14} /> Enter PIN to open</p>
        <input autoFocus type="password" inputMode="numeric" className="inp text-center tracking-[.5em] text-lg" value={pin}
          onChange={e => { setPin(e.target.value); setErr(false) }} onKeyDown={e => e.key === 'Enter' && go()} aria-label="PIN" />
        {err && <p className="text-red-600 text-xs mt-2">Wrong PIN</p>}
        <button className="btn btn-primary w-full mt-4" onClick={go}>Unlock</button>
      </div>
    </div>
  )
}
