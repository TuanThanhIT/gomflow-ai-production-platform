import axios, { type InternalAxiosRequestConfig } from 'axios'
import { refreshTokenThunk } from '../redux/slices/authSlice'
import { getStore } from '../redux/storeRef'
import type { ApiErrorType } from '../types/error'
import { getStoredAccessToken } from './authTokenStorage'

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  timeout: 10000,
  withCredentials: true
})

let isRefreshing = false
let queue: ((token: string | null) => void)[] = []

const processQueue = (token: string | null) => {
  queue.forEach((callback) => callback(token))
  queue = []
}

const getAccessToken = () => getStore().getState().auth.accessToken || getStoredAccessToken()

instance.interceptors.request.use((config) => {
  const accessToken = getAccessToken()
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

instance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
    const statusCode = error.response?.status ?? 500
    const data = error.response?.data

    if (!originalRequest || !originalRequest.url) {
      return Promise.reject({
        statusCode,
        success: false,
        message: data?.message || 'Có lỗi xảy ra',
        errors: data?.errors || null,
        data: data?.data || null
      } satisfies ApiErrorType)
    }

    if (originalRequest.url.includes('/auth/refresh-token')) {
      return Promise.reject({
        statusCode,
        success: false,
        message: data?.message || 'Không thể cấp lại phiên đăng nhập.',
        errors: data?.errors || null,
        data: data?.data || null
      } satisfies ApiErrorType)
    }

    if (statusCode !== 401) {
      return Promise.reject({
        statusCode,
        success: data?.success || false,
        message: data?.message || 'Có lỗi xảy ra',
        errors: data?.errors || null,
        data: data?.data || null
      } satisfies ApiErrorType)
    }

    if (originalRequest._retry) {
      return Promise.reject({
        statusCode: 401,
        success: false,
        message: 'Phiên đăng nhập đã hết hạn.',
        errors: null,
        data: null
      } satisfies ApiErrorType)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queue.push((token) => {
          if (!token) {
            reject({
              statusCode: 401,
              success: false,
              message: 'Không thể cấp lại phiên đăng nhập.',
              errors: null,
              data: null
            } satisfies ApiErrorType)
            return
          }

          originalRequest.headers.Authorization = `Bearer ${token}`
          resolve(instance(originalRequest))
        })
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const result = await getStore().dispatch(refreshTokenThunk()).unwrap()
      const newToken = result.data.accessToken
      processQueue(newToken)
      originalRequest.headers.Authorization = `Bearer ${newToken}`
      return instance(originalRequest)
    } catch (refreshError) {
      processQueue(null)
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

export default instance
