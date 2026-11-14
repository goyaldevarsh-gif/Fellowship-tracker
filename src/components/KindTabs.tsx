import { NavLink } from 'react-router-dom'
import { cx } from './ui'

const T = [['/fellowships', 'Fellowships'], ['/observerships', 'Observership'], ['/footankle', 'Foot & Ankle']]
export default function KindTabs({ right }: { right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
      <div className="flex gap-1 bg-white border border-line rounded-xl p-1">
        {T.map(([to, label]) => <NavLink key={to} to={to} className={({ isActive }) => cx('btn !py-1.5 !px-3', isActive ? 'btn-navy' : 'text-slate-600 hover:bg-navy-50')}>{label}</NavLink>)}
      </div>
      <div className="flex gap-2">{right}</div>
    </div>
  )
}
