import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../redux/hook'
import { getAccount, refreshTokenThunk, setAuthInitialized } from '../../redux/slices/authSlice'

const PrivateRoute = () => {
  const dispatch = useAppDispatch()
  const location = useLocation()
  const { accessToken, authInitialized, user } = useAppSelector((state) => state.auth)
  const getAccountLoading = useAppSelector((state) => state.ui.loadingMap['auth/getAccount'] || false)
  const refreshLoading = useAppSelector((state) => state.ui.loadingMap['auth/refreshTokenThunk'] || false)

  useEffect(() => {
    if (authInitialized) return

    if (accessToken && !user) {
      dispatch(getAccount())
      return
    }

    if (!accessToken) {
      dispatch(refreshTokenThunk())
        .unwrap()
        .then(() => {
          dispatch(getAccount())
        })
        .catch(() => {
          dispatch(setAuthInitialized(true))
        })
    }
  }, [accessToken, authInitialized, dispatch, user])

  if (!authInitialized || getAccountLoading || refreshLoading) {
    return (
      <div className='grid min-h-screen place-items-center bg-slate-950 text-slate-100'>
        <div className='flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 shadow-2xl'>
          <span className='h-4 w-4 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent' />
          <span className='text-sm font-medium'>Đang xác thực phiên đăng nhập...</span>
        </div>
      </div>
    )
  }

  if (!accessToken || !user) {
    return <Navigate to='/login' replace state={{ from: location }} />
  }

  return <Outlet />
}

export default PrivateRoute
