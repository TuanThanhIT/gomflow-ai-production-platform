import type { NextFunction, Request, Response } from 'express'
import UnauthorizedError from '../errors/UnauthorizedError.js'
import { User } from '../models/index.js'
import { verifyAccessToken } from '../utils/jwt.js'

type AuthUserRecord = {
  id: string | number
  fullName: string
  email: string
  role: string
  isActive: boolean
}

const auth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader?.startsWith('Bearer ')) {
      return next(new UnauthorizedError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'))
    }

    const token = authHeader.split(' ')[1]
    const decoded = verifyAccessToken(token)

    const userInstance = await User.findByPk(decoded.id, {
      attributes: ['id', 'fullName', 'email', 'role', 'isActive']
    })

    if (!userInstance) {
      return next(new UnauthorizedError('Tài khoản không tồn tại.'))
    }

    const user = userInstance.get({ plain: true }) as AuthUserRecord

    if (!user.isActive) {
      return next(new UnauthorizedError('Tài khoản hiện không thể sử dụng.'))
    }

    req.user = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role
    }

    return next()
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      return next(error)
    }

    return next(new UnauthorizedError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'))
  }
}

export default auth
