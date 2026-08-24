import type { AccountResponse, LoginRequest, LoginResponse, LogoutResponse, RefreshTokenResponse } from '../types/auth'
import instance from '../utils/axiosCustomize'

const loginService = (data: LoginRequest) => instance.post<LoginResponse>('/auth/login', data)

const refreshTokenService = () => instance.post<RefreshTokenResponse>('/auth/refresh-token')

const getAccountService = () => instance.get<AccountResponse>('/auth/me')

const logoutService = () => instance.post<LogoutResponse>('/auth/logout')

const authService = {
  loginService,
  refreshTokenService,
  getAccountService,
  logoutService
}

export default authService
