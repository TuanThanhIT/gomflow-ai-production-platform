import bcrypt from 'bcryptjs'
import type { Transaction } from 'sequelize'
import sequelize from '../config/db.js'
import UnauthorizedError from '../errors/UnauthorizedError.js'
import { RefreshToken, User } from '../models/index.js'
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js'

export type LoginInput = {
  email: string
  password: string
}

export type RefreshTokenInput = {
  refreshToken?: string | null
}

type UserAuthRecord = {
  id: string | number
  fullName: string
  email: string
  passwordHash: string
  role: string
  isActive: boolean
}

type PublicUserRecord = Omit<UserAuthRecord, 'passwordHash'>

const refreshTokenMaxAgeMs = 7 * 24 * 60 * 60 * 1000

const buildTokenPayload = (user: Pick<UserAuthRecord, 'id' | 'email' | 'role'>) => ({
  id: user.id,
  email: user.email,
  role: user.role
})

const toPublicUser = (user: PublicUserRecord) => ({
  id: user.id,
  fullName: user.fullName,
  email: user.email,
  role: user.role
})

const createSavedRefreshToken = async (userId: string | number, transaction: Transaction) => {
  const refreshToken = generateRefreshToken({ id: userId })

  await RefreshToken.create(
    {
      token: refreshToken,
      userId,
      expiry: new Date(Date.now() + refreshTokenMaxAgeMs)
    },
    { transaction }
  )

  return refreshToken
}

export const loginService = async ({ email, password }: LoginInput) => {
  const userInstance = await User.findOne({
    where: { email },
    attributes: ['id', 'fullName', 'email', 'passwordHash', 'role', 'isActive']
  })

  if (!userInstance) {
    throw new UnauthorizedError('Email hoặc mật khẩu không đúng.')
  }

  const user = userInstance.get({ plain: true }) as UserAuthRecord
  const passwordMatched = await bcrypt.compare(password, user.passwordHash)

  if (!passwordMatched) {
    throw new UnauthorizedError('Email hoặc mật khẩu không đúng.')
  }

  if (!user.isActive) {
    throw new UnauthorizedError('Tài khoản hiện không thể sử dụng.')
  }

  return sequelize.transaction(async (transaction) => {
    await userInstance.update({ lastLoginAt: new Date() }, { transaction })

    const tokenPayload = buildTokenPayload(user)
    const refreshToken = await createSavedRefreshToken(user.id, transaction)

    return {
      user: toPublicUser(user),
      accessToken: generateAccessToken(tokenPayload),
      refreshToken
    }
  })
}

export const refreshAccessTokenService = async ({ refreshToken }: RefreshTokenInput) => {
  if (!refreshToken) {
    throw new UnauthorizedError('Refresh token không tồn tại.')
  }

  return sequelize.transaction(async (transaction) => {
    const saved = await RefreshToken.findOne({
      where: { token: refreshToken },
      transaction,
      lock: transaction.LOCK.UPDATE
    })

    if (!saved) {
      throw new UnauthorizedError('Refresh token không tồn tại.')
    }

    let decoded
    try {
      decoded = verifyRefreshToken(refreshToken)
    } catch {
      await saved.destroy({ transaction })
      throw new UnauthorizedError('Refresh token không hợp lệ hoặc đã hết hạn.')
    }

    const savedToken = saved.get({ plain: true }) as { expiry: string | Date }
    if (new Date(savedToken.expiry).getTime() <= Date.now()) {
      await saved.destroy({ transaction })
      throw new UnauthorizedError('Refresh token đã hết hạn.')
    }

    await saved.destroy({ transaction })

    const userInstance = await User.findByPk(decoded.id, {
      attributes: ['id', 'fullName', 'email', 'role', 'isActive'],
      transaction
    })

    if (!userInstance) {
      throw new UnauthorizedError('Tài khoản không tồn tại.')
    }

    const user = userInstance.get({ plain: true }) as PublicUserRecord

    if (!user.isActive) {
      throw new UnauthorizedError('Tài khoản hiện không thể sử dụng.')
    }

    const newRefreshToken = await createSavedRefreshToken(user.id, transaction)

    return {
      accessToken: generateAccessToken(buildTokenPayload(user)),
      refreshToken: newRefreshToken
    }
  })
}

export const logoutService = async ({ refreshToken }: RefreshTokenInput) => {
  if (!refreshToken) return

  await RefreshToken.destroy({
    where: { token: refreshToken }
  })
}

export default {
  loginService,
  refreshAccessTokenService,
  logoutService
}
