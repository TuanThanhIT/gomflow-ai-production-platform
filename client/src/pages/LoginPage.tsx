import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAppDispatch, useAppSelector } from '../redux/hook'
import { login } from '../redux/slices/authSlice'
import { FormLoginSchema, type FormLogin } from '../schemas/FormLoginSchema'
import { getApiErrorMessage } from '../utils/apiError'

type LoginLocationState = {
  from?: {
    pathname?: string
    search?: string
  }
}

const LoginPage = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const loginLoading = useAppSelector((state) => state.ui.loadingMap['auth/login'] || false)
  const { accessToken, user } = useAppSelector((state) => state.auth)
  const [localError, setLocalError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<FormLogin>({
    resolver: zodResolver(FormLoginSchema),
    mode: 'onSubmit',
    defaultValues: {
      email: localStorage.getItem('rememberEmail') || '',
      password: ''
    }
  })

  const state = location.state as LoginLocationState | null
  const redirectPath = state?.from?.pathname ? `${state.from.pathname}${state.from.search || ''}` : '/'

  if (accessToken && user) {
    return <Navigate to={redirectPath} replace />
  }

  const onSubmit = (data: FormLogin) => {
    setLocalError('')

    dispatch(login({ data }))
      .unwrap()
      .then((res) => {
        localStorage.setItem('rememberEmail', data.email)
        toast.success(res.message || 'Đăng nhập thành công.')
        navigate(redirectPath, { replace: true })
      })
      .catch((error) => {
        setLocalError(getApiErrorMessage(error, 'Đăng nhập chưa thành công.'))
      })
  }

  return (
    <main className='min-h-screen bg-slate-950 text-slate-100'>
      <div className='mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[1fr_430px]'>
        <section className='hidden lg:block'>
          <p className='text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300'>Production Control</p>
          <h1 className='mt-5 max-w-2xl text-5xl font-bold leading-tight'>
            CeramiOps AI vận hành sản xuất trong một màn hình gọn gàng.
          </h1>
          <p className='mt-5 max-w-xl text-base leading-7 text-slate-300'>
            Demo đăng nhập đã nối với backend, tự refresh access token khi hết hạn và chuyển hướng về dashboard sau khi
            xác thực.
          </p>
          <div className='mt-8 grid max-w-xl grid-cols-3 gap-3'>
            {['Orders', 'Stages', 'Incidents'].map((item) => (
              <div key={item} className='rounded-2xl border border-white/10 bg-white/5 p-4'>
                <p className='text-xs text-slate-400'>Module</p>
                <p className='mt-2 font-semibold'>{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className='rounded-3xl border border-white/10 bg-white p-6 text-slate-900 shadow-2xl shadow-cyan-950/40'>
          <div>
            <p className='text-sm font-semibold text-cyan-700'>Đăng nhập hệ thống</p>
            <h2 className='mt-2 text-3xl font-bold'>Chào mừng quay lại</h2>
            <p className='mt-2 text-sm text-slate-500'>Nhập email và mật khẩu để vào trang demo.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className='mt-7 space-y-5'>
            <label className='block'>
              <span className='text-sm font-medium text-slate-700'>Email</span>
              <input
                {...register('email', {
                  onChange: () => setLocalError('')
                })}
                type='email'
                placeholder='Nhập email'
                className='mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-100'
              />
              {errors.email?.message ? (
                <span className='mt-2 block text-xs font-medium text-rose-500'>{errors.email.message}</span>
              ) : null}
            </label>

            <label className='block'>
              <span className='text-sm font-medium text-slate-700'>Mật khẩu</span>
              <input
                {...register('password', {
                  onChange: () => setLocalError('')
                })}
                type='password'
                placeholder='Nhập mật khẩu'
                className='mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-100'
              />
              {errors.password?.message ? (
                <span className='mt-2 block text-xs font-medium text-rose-500'>{errors.password.message}</span>
              ) : null}
            </label>

            {localError ? (
              <div className='rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600'>
                {localError}
              </div>
            ) : null}

            <button
              type='submit'
              disabled={loginLoading}
              className='flex h-12 w-full items-center justify-center rounded-2xl bg-cyan-600 text-sm font-bold text-white shadow-lg shadow-cyan-600/20 transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none cursor-pointer'
            >
              {loginLoading ? (
                <span className='flex items-center gap-2'>
                  <span className='h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent' />
                  Đang đăng nhập...
                </span>
              ) : (
                'Đăng nhập'
              )}
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}

export default LoginPage
