import ApiError from './ApiError.js'

class TooManyRequestsError extends ApiError {
  constructor(msg = 'Quá nhiều yêu cầu, vui lòng thử lại sau') {
    super(429, msg)
  }
}

export default TooManyRequestsError
