import { LogOut, Menu, Search } from 'lucide-react'
import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../redux/hook'
import { logout } from '../../redux/slices/authSlice'

const pageTitles: Array<{ match: (path: string) => boolean; title: string; subtitle: string }> = [
  {
    match: (path) => path === '/',
    title: 'Tổng quan vận hành',
    subtitle: 'Theo dõi nhanh tình trạng sản xuất hôm nay.'
  },
  {
    match: (path) => path === '/orders',
    title: 'Đơn hàng sản xuất',
    subtitle: 'Quản lý tiến độ, mức ưu tiên và rủi ro của từng đơn.'
  },
  {
    match: (path) => path === '/orders/new',
    title: 'Tạo đơn hàng',
    subtitle: 'Khởi tạo đơn sản xuất mới từ quy trình mẫu.'
  },
  {
    match: (path) => path.startsWith('/orders/'),
    title: 'Chi tiết đơn hàng',
    subtitle: 'Theo dõi pipeline, tài nguyên và sự cố liên quan.'
  },
  {
    match: (path) => path === '/resources',
    title: 'Tài nguyên sản xuất',
    subtitle: 'Kiểm soát máy móc, khu vực và trạng thái sử dụng.'
  },
  {
    match: (path) => path === '/incidents',
    title: 'Sự cố sản xuất',
    subtitle: 'Lọc, xử lý và theo dõi sự cố phát sinh.'
  },
  {
    match: (path) => path === '/process-templates',
    title: 'Quy trình sản xuất',
    subtitle: 'Quản lý các mẫu quy trình và công đoạn.'
  }
]

const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'U'

  return parts
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

const Header = ({ onOpenSidebar }: { onOpenSidebar: () => void }) => {
  const dispatch = useAppDispatch()
  const location = useLocation()
  const user = useAppSelector((state) => state.auth.user)
  const logoutLoading = useAppSelector((state) => state.ui.loadingMap['auth/logout'] || false)

  const pageMeta = useMemo(
    () =>
      pageTitles.find((item) => item.match(location.pathname)) ?? {
        title: 'GOMFLOW',
        subtitle: 'Quản lý vận hành sản xuất.'
      },
    [location.pathname]
  )

  return (
    <header className='sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur'>
      <div className='flex min-h-20 items-center justify-between gap-4 px-4 py-3 sm:px-6'>
        <div className='flex min-w-0 items-center gap-3'>
          <button
            type='button'
            aria-label='Mở menu'
            onClick={onOpenSidebar}
            className='flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 lg:hidden'
          >
            <Menu className='h-5 w-5' />
          </button>
          <div className='min-w-0'>
            <p className='truncate text-lg font-bold text-slate-800 sm:text-xl'>{pageMeta.title}</p>
            <p className='mt-1 hidden truncate text-sm text-slate-500 sm:block'>{pageMeta.subtitle}</p>
          </div>
        </div>

        <div className='hidden h-10 min-w-64 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-400 xl:flex'>
          <Search className='h-4 w-4' />
          <span>Tìm đơn hàng, sự cố, tài nguyên...</span>
        </div>

        <div className='flex shrink-0 items-center gap-3'>
          <div className='hidden text-right sm:block'>
            <p className='text-sm font-semibold text-slate-700'>{user?.fullName || 'Người dùng'}</p>
            <p className='text-xs font-medium uppercase text-slate-400'>{user?.role || '-'}</p>
          </div>
          <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500 text-sm font-bold text-white'>
            {getInitials(user?.fullName)}
          </div>
          <button
            type='button'
            disabled={logoutLoading}
            onClick={() => void dispatch(logout())}
            className='flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:text-slate-300'
            aria-label='Đăng xuất'
            title='Đăng xuất'
          >
            {logoutLoading ? (
              <span className='h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-transparent' />
            ) : (
              <LogOut className='h-4 w-4' />
            )}
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header
