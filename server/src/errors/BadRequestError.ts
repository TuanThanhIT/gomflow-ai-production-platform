import ApiError from './ApiError.js'

class BadRequestError extends ApiError {
  constructor(msg = 'Yêu cầu không hợp lệ', data: unknown = null) {
    super(400, msg, null, data)
  }
}

export default BadRequestError
