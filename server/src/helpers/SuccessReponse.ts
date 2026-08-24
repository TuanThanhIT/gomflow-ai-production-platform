class SuccessResponse<TData = unknown> {
  success: boolean
  message: string
  data: TData | null

  constructor(message = 'Success', data: TData | null = null) {
    this.success = true
    this.message = message
    this.data = data
  }
}

export default SuccessResponse
