import type { JwtPayload } from 'jsonwebtoken'
import type { USER_ROLE } from '../constants/userConstants.js'

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE]

export type AuthTokenPayload = JwtPayload & {
  id: string | number
  email?: string
  role?: UserRole | string
}

export type AuthenticatedUser = {
  id: string | number
  fullName: string
  email: string
  role: UserRole | string
  source?: 'WEB' | 'TELEGRAM'
}
