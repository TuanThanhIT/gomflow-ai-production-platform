import { X } from 'lucide-react'
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Footer from '../commons/Footer'
import Header from '../commons/Header'
import Sidebar from '../commons/Sidebar'

const AppLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className='h-screen overflow-hidden bg-slate-100 text-slate-900'>
      <aside className='fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-slate-200 bg-white shadow-sm lg:block'>
        <Sidebar />
      </aside>

      {mobileOpen ? (
        <div className='fixed inset-0 z-50 lg:hidden'>
          <button
            type='button'
            aria-label='Đóng menu'
            className='absolute inset-0 cursor-default bg-slate-950/50'
            onClick={() => setMobileOpen(false)}
          />
          <aside className='relative h-full w-72 bg-white shadow-2xl'>
            <button
              type='button'
              aria-label='Đóng menu'
              onClick={() => setMobileOpen(false)}
              className='absolute right-3 top-3 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500'
            >
              <X className='h-4 w-4' />
            </button>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className='flex h-screen min-h-0 flex-col lg:pl-72'>
        <Header onOpenSidebar={() => setMobileOpen(true)} />

        <main className='min-h-0 flex-1 overflow-y-auto overflow-x-hidden'>
          <Outlet />
        </main>

        <Footer />
      </div>
    </div>
  )
}

export default AppLayout
