import type { Request, Response } from 'express'
import SuccessResponse from '../helpers/SuccessReponse.js'
import { asyncHandler } from '../middlewares/asyncHandler.js'
import incidentService, {
  type CreateIncidentInput,
  type GetIncidentsQuery,
  type ResolveIncidentInput
} from '../services/incidentService.js'

export const getIncidentsController = asyncHandler(
  async (req: Request<unknown, unknown, unknown, GetIncidentsQuery>, res: Response) => {
    const data = await incidentService.getIncidentsService(req.query)

    return res.status(200).json(new SuccessResponse('Lấy danh sách sự cố sản xuất thành công.', data))
  }
)

export const getIncidentDetailController = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const incident = await incidentService.getIncidentByIdService(req.params.id)

  return res.status(200).json(new SuccessResponse('Lấy chi tiết sự cố sản xuất thành công.', incident))
})

export const createIncidentController = asyncHandler(
  async (req: Request<unknown, unknown, CreateIncidentInput>, res: Response) => {
    const incident = await incidentService.createIncidentService(req.body, req.user!)

    return res.status(201).json(new SuccessResponse('Báo cáo sự cố sản xuất thành công.', incident))
  }
)

export const resolveIncidentController = asyncHandler(
  async (req: Request<{ id: string }, unknown, ResolveIncidentInput>, res: Response) => {
    const incident = await incidentService.resolveIncidentService(req.params.id, req.body, req.user!)

    return res.status(200).json(new SuccessResponse('Đã xử lý sự cố sản xuất.', incident))
  }
)

export default {
  createIncidentController,
  getIncidentDetailController,
  getIncidentsController,
  resolveIncidentController
}
