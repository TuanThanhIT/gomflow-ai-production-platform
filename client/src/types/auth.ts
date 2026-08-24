import type { ApiResponse } from './api'

export type User = {
  id: string | number
  fullName: string
  email: string
  role: string
}

export type LoginRequest = {
  email: string
  password: string
}

export type LoginData = {
  user: User
  accessToken: string
}

export type LoginResponse = ApiResponse<LoginData>

export type RefreshTokenData = {
  accessToken: string
}

export type RefreshTokenResponse = ApiResponse<RefreshTokenData>

export type AccountResponse = ApiResponse<{
  user: User
}>

export type LogoutResponse = ApiResponse<null>
