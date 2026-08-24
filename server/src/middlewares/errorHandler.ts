import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express'
import ApiError from '../errors/ApiError.js'

type ErrorData = {
  forceLogout?: boolean
  accountStatus?: string
  suspendedUntil?: string | Date | null
  suspensionReason?: string | null
  [key: string]: unknown
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const toErrorData = (data: unknown): ErrorData | null => {
  return isRecord(data) ? data : null
}

const getStatusCode = (error: unknown): number => {
  if (error instanceof ApiError) {
    return error.statusCode
  }

  if (isRecord(error) && typeof error.statusCode === 'number') {
    return error.statusCode
  }

  return 500
}

const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : 'Unknown error'
}

const errorHandler: ErrorRequestHandler = (err: unknown, req: Request, res: Response, next: NextFunction) => {
  void next
  const isOperational = err instanceof ApiError && err.isOperational
  const statusCode = getStatusCode(err)
  const errorData = err instanceof ApiError ? toErrorData(err.data) : null

  if (isOperational) {
    console.warn('Operational error:', getErrorMessage(err))
  } else {
    console.error('System error:', {
      message: getErrorMessage(err),
      stack: err instanceof Error ? err.stack : undefined,
      body: req.body,
      params: req.params,
      query: req.query,
      user: req.user?.id
    })
  }

  return res.status(statusCode).json({
    success: false,
    message: isOperational ? getErrorMessage(err) : 'Lỗi hệ thống. Vui lòng thử lại sau.',
    errors: err instanceof ApiError ? err.errors : null,
    data: errorData,
    ...(errorData?.forceLogout !== undefined ? { forceLogout: errorData.forceLogout } : {}),
    ...(errorData?.accountStatus ? { accountStatus: errorData.accountStatus } : {}),
    ...(errorData?.suspendedUntil !== undefined ? { suspendedUntil: errorData.suspendedUntil } : {}),
    ...(errorData?.suspensionReason !== undefined ? { suspensionReason: errorData.suspensionReason } : {})
  })
}

export default errorHandler
