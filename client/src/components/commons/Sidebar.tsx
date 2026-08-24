import { AlertTriangle, Boxes, ClipboardList, Factory, Home } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const navItems = [
  { icon: Home, label: 'Tổng quan', to: '/' },
  { icon: ClipboardList, label: 'Đơn hàng', to: '/orders' },
  { icon: Boxes, label: 'Tài nguyên', to: '/resources' },
  { icon: AlertTriangle, label: 'Sự cố', to: '/incidents' },
  { icon: Factory, label: 'Quy trình', to: '/process-templates' }
]

const Sidebar = ({ onNavigate }: { onNavigate?: () => void }) => (
  <div className='flex h-full flex-col'>
    <div className='flex h-20 items-center gap-3 border-b border-slate-200 px-5'>
      <div className='flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500 text-white shadow-sm shadow-cyan-100'>
        <Factory className='h-6 w-6' />
      </div>
      <div>
        <p className='text-base font-extrabold tracking-tight text-slate-800'>GỐM THỦ ĐỨC</p>
        <p className='text-xs font-medium text-slate-500'>Production AI</p>
      </div>
    </div>

    <nav className='flex-1 space-y-1 px-3 py-4'>
      {navItems.map((item) => {
        const Icon = item.icon

        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition ${
                isActive
                  ? 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
              }`
            }
          >
            <Icon className='h-4 w-4' />
            <span>{item.label}</span>
          </NavLink>
        )
      })}
    </nav>

    <div className='border-t border-slate-200 p-4'>
      <div className='rounded-lg bg-slate-50 p-3'>
        <p className='text-xs font-semibold uppercase tracking-wide text-slate-400'>Xưởng gốm</p>
        <p className='mt-1 text-sm font-semibold text-slate-700'>Ca sản xuất chính</p>
        <p className='mt-1 text-xs text-slate-500'>Theo dõi đơn, tài nguyên và sự cố trong cùng một hệ thống.</p>
      </div>
    </div>
  </div>
)

export default Sidebar
