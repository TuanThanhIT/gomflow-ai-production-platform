import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { USER_ROLE } from '../constants/userConstants.js'
import ForbiddenError from '../errors/ForbiddenError.js'
import UnauthorizedError from '../errors/UnauthorizedError.js'
import type { UserRole } from '../types/auth.js'

const authorize = (...allowedRoles: Array<UserRole | string>): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Vui lòng đăng nhập để tiếp tục.'))
    }

    if (req.user.role === USER_ROLE.ADMIN) {
      return next()
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError('Bạn không có quyền truy cập chức năng này.'))
    }

    return next()
  }
}

export default authorize
