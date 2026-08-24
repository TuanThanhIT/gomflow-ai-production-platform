import type { Request, Response } from 'express'
import SuccessResponse from '../helpers/SuccessReponse.js'
import { asyncHandler } from '../middlewares/asyncHandler.js'
import dashboardService from '../services/dashboardService.js'

export const getDashboardController = asyncHandler(async (_req: Request, res: Response) => {
  const data = await dashboardService.getDashboardService()

  return res.status(200).json(new SuccessResponse('Lấy dữ liệu dashboard thành công.', data))
})

export default {
  getDashboardController
}
