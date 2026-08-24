import type { Request, Response } from 'express'
import SuccessResponse from '../helpers/SuccessReponse.js'
import { asyncHandler } from '../middlewares/asyncHandler.js'
import orderStageService, { type AssignResourceInput } from '../services/orderStageService.js'

export const getAvailableResourcesForStageController = asyncHandler(
  async (req: Request<{ id: string }>, res: Response) => {
    const data = await orderStageService.getAvailableResourcesForStageService(req.params.id)

    return res.status(200).json(new SuccessResponse('Lấy tài nguyên khả dụng thành công.', data))
  }
)

export const assignResourceToStageController = asyncHandler(
  async (req: Request<{ id: string }, unknown, AssignResourceInput>, res: Response) => {
    const order = await orderStageService.assignResourceToStageService(req.params.id, req.body, req.user!)

    return res.status(200).json(new SuccessResponse('Gán tài nguyên thành công.', order))
  }
)

export const completeOrderStageController = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const order = await orderStageService.completeOrderStageService(req.params.id, req.user!)

  return res.status(200).json(new SuccessResponse('Hoàn thành công đoạn thành công.', order))
})

export const resumeOrderStageController = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const order = await orderStageService.resumeOrderStageService(req.params.id, req.user!)

  return res.status(200).json(new SuccessResponse('Tiếp tục công đoạn thành công.', order))
})

export default {
  assignResourceToStageController,
  completeOrderStageController,
  getAvailableResourcesForStageController,
  resumeOrderStageController
}
