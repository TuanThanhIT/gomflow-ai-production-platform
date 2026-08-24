import ApiError from './ApiError.js'

class ForbiddenError extends ApiError {
  constructor(msg = 'Forbidden', data: unknown = null) {
    super(403, msg, null, data)
  }
}

export default ForbiddenError
