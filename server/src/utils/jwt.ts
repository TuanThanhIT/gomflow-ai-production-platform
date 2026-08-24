import jwt, { type SignOptions } from 'jsonwebtoken'
import dotenv from 'dotenv'
import type { AuthTokenPayload } from '../types/auth.js'

dotenv.config()

type JwtEnvKey = 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET' | 'JWT_ACCESS_EXPIRE' | 'JWT_REFRESH_EXPIRE'

const getJwtEnv = (key: JwtEnvKey): string => {
  const value = process.env[key]

  if (!value) {
    throw new Error(`${key} is not configured`)
  }

  return value
}

const signToken = (payload: AuthTokenPayload, secretKey: JwtEnvKey, expiresInKey: JwtEnvKey): string => {
  const options: SignOptions = {
    expiresIn: getJwtEnv(expiresInKey) as SignOptions['expiresIn']
  }

  return jwt.sign(payload, getJwtEnv(secretKey), options)
}

const verifyToken = (token: string, secretKey: JwtEnvKey): AuthTokenPayload => {
  const decoded = jwt.verify(token, getJwtEnv(secretKey))

  if (typeof decoded === 'string' || !decoded.id) {
    throw new Error('Invalid token payload')
  }

  return decoded as AuthTokenPayload
}

export const generateAccessToken = (payloadAccessToken: AuthTokenPayload): string => {
  return signToken(payloadAccessToken, 'JWT_ACCESS_SECRET', 'JWT_ACCESS_EXPIRE')
}

export const generateRefreshToken = (payloadRefreshToken: AuthTokenPayload): string => {
  return signToken(payloadRefreshToken, 'JWT_REFRESH_SECRET', 'JWT_REFRESH_EXPIRE')
}

export const verifyRefreshToken = (token: string): AuthTokenPayload => {
  return verifyToken(token, 'JWT_REFRESH_SECRET')
}

export const verifyAccessToken = (token: string): AuthTokenPayload => {
  return verifyToken(token, 'JWT_ACCESS_SECRET')
}
