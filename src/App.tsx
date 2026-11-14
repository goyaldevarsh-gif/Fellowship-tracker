import { useEffect, useState } from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import { ConfirmHost, ToastHost } from './components/ui'
import { useStore } from './lib/store'
import { kvGet, kvSet } from './lib/db'
import Dashboard from './pages/Dashboard'
import Directory from './pages/Directory'
import RecordPage from './pages/RecordPage'
import Applications from './pages/Applications'
import Documents from './pages/Documents'
import CalendarPage from './pages/CalendarPage'
import Compare from './pages/Compare'
import Notes from './pages/Notes'
import Settings from './pages/Settings'
import ProfilePage from './pages/ProfilePage'
import Lock from './components/Lock'

export default function App() {
  const { ready } = useStore()
  const [locked, setLocked] = useState<boolean | null>(null)
  useEffect(() => { kvGet<string>('pinHash').then(h => setLocked(!!h)).catch(() => setLocked(false)) }, [])
  useEffect(() => { navigator.storage?.persist?.().catch(() => {}); kvSet('lastOpen', Date.now()).catch(() => {}) }, [])
  if (!ready || locked === null) return <div className="h-full flex items-center justify-center text-slate-400 text-sm">Loading…</div>
  if (locked) return <Lock onUnlock={() => setLocked(false)} />
  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/fellowships" element={<Directory kind="fellowship" />} />
          <Route path="/observerships" element={<Directory kind="observership" />} />
          <Route path="/footankle" element={<Directory kind="footankle" />} />
          <Route path="/r/:id" element={<RecordPage />} />
          <Route path="/applications" element={<Applications />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
      <ConfirmHost /><ToastHost />
    </>
  )
}
