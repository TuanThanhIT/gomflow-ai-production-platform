class ApiError extends Error {
  statusCode: number
  errors: unknown
  isOperational: boolean
  data: unknown

  constructor(statusCode: number, message: string, errors: unknown = null, data: unknown = null) {
    super(message)
    this.statusCode = statusCode
    this.errors = errors
    this.isOperational = true
    this.data = data
    Error.captureStackTrace(this, this.constructor)
  }
}

export default ApiError
