import { isRejectedWithValue, type Middleware } from '@reduxjs/toolkit'
import { toast } from 'react-toastify'
import { getApiErrorMessage } from '../../utils/apiError'
import { logoutLocal } from '../slices/authSlice'

export const authMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action)

  if (!isRejectedWithValue(action)) {
    return result
  }

  const payload = action.payload as { statusCode?: number } | undefined
  const statusCode = payload?.statusCode
  const message = getApiErrorMessage(action.payload)

  if (statusCode === 401 && action.type === 'auth/refreshTokenThunk/rejected') {
    toast.error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.', {
      toastId: 'session-expired'
    })
    store.dispatch(logoutLocal())
    return result
  }

  if (statusCode === 401 && action.type === 'auth/getAccount/rejected') {
    return result
  }

  toast.error(message, { toastId: message })
  return result
}
