import type { Request, Response } from 'express'
import dotenv from 'dotenv'
import SuccessResponse from '../helpers/SuccessReponse.js'
import authService, { type LoginInput } from '../services/authService.js'
import { asyncHandler } from '~/middlewares/asyncHandler.js'

dotenv.config()

const clientUrl = (process.env.CLIENT_URL || process.env.CORS_ORIGIN || '').split(',')[0]?.trim() || ''
const isHttpsClient = clientUrl.startsWith('https://')

const refreshTokenCookieBaseOptions = {
  httpOnly: true,
  secure: isHttpsClient,
  sameSite: isHttpsClient ? 'none' : 'lax'
} as const

const refreshTokenCookieOptions = {
  ...refreshTokenCookieBaseOptions,
  maxAge: 7 * 24 * 60 * 60 * 1000
}
export const loginController = asyncHandler(async (req: Request<unknown, unknown, LoginInput>, res: Response) => {
  const { accessToken, refreshToken, user } = await authService.loginService(req.body)

  return res.status(200).cookie('refreshToken', refreshToken, refreshTokenCookieOptions).json(
    new SuccessResponse('Đăng nhập thành công.', {
      accessToken,
      user
    })
  )
})

export const refreshTokenController = asyncHandler(async (req: Request, res: Response) => {
  const data = await authService.refreshAccessTokenService({
    refreshToken: req.cookies.refreshToken || null
  })
  const { accessToken, refreshToken } = data

  return res.status(200).cookie('refreshToken', refreshToken, refreshTokenCookieOptions).json(
    new SuccessResponse('Cấp lại access token thành công.', {
      accessToken
    })
  )
})

export const getMeController = asyncHandler(async (req: Request, res: Response) => {
  return res.status(200).json(
    new SuccessResponse('Lấy thông tin tài khoản thành công.', {
      user: req.user
    })
  )
})

export const logoutController = asyncHandler(async (req: Request, res: Response) => {
  await authService.logoutService({
    refreshToken: req.cookies.refreshToken || null
  })

  return res
    .clearCookie('refreshToken', refreshTokenCookieBaseOptions)
    .status(200)
    .json(new SuccessResponse('Đăng xuất thành công.'))
})

export default {
  loginController,
  refreshTokenController,
  getMeController,
  logoutController
}
