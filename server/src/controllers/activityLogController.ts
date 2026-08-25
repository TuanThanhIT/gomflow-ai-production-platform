import type { Request, Response } from 'express'
import SuccessResponse from '../helpers/SuccessReponse.js'
import { asyncHandler } from '../middlewares/asyncHandler.js'
import activityLogService, {
  type GetActivityLogOrdersQuery,
  type GetActivityLogsQuery
} from '../services/activityLogService.js'

export const getActivityLogOrdersController = asyncHandler(
  async (req: Request<unknown, unknown, unknown, GetActivityLogOrdersQuery>, res: Response) => {
    const data = await activityLogService.getActivityLogOrdersService(req.query)

    return res.status(200).json(new SuccessResponse('Láº¥y danh sÃ¡ch Ä‘Æ¡n hÃ ng cÃ³ nháº­t kÃ½ thÃ nh cÃ´ng.', data))
  }
)

export const getActivityLogsController = asyncHandler(
  async (req: Request<unknown, unknown, unknown, GetActivityLogsQuery>, res: Response) => {
    const data = await activityLogService.getActivityLogsService(req.query)

    return res.status(200).json(new SuccessResponse('Lấy nhật ký hoạt động thành công.', data))
  }
)

export default {
  getActivityLogOrdersController,
  getActivityLogsController
}
