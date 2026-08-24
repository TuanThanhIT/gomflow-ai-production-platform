import type { Request, Response } from 'express'
import SuccessResponse from '../helpers/SuccessReponse.js'
import { asyncHandler } from '../middlewares/asyncHandler.js'
import processTemplateService, {
  type CreateProcessTemplateInput,
  type GetProcessTemplatesQuery,
  type UpdateProcessTemplateInput
} from '../services/processTemplateService.js'

export const getProcessTemplatesController = asyncHandler(
  async (req: Request<unknown, unknown, unknown, GetProcessTemplatesQuery>, res: Response) => {
    const templates = await processTemplateService.getProcessTemplatesService(req.query)

    return res.status(200).json(new SuccessResponse('Lấy danh sách quy trình sản xuất thành công.', templates))
  }
)

export const getProcessTemplateDetailController = asyncHandler(
  async (req: Request<{ processTemplateId: string }>, res: Response) => {
    const template = await processTemplateService.getProcessTemplateByIdService(req.params.processTemplateId)

    return res.status(200).json(new SuccessResponse('Lấy chi tiết quy trình sản xuất thành công.', template))
  }
)

export const createProcessTemplateController = asyncHandler(
  async (req: Request<unknown, unknown, CreateProcessTemplateInput>, res: Response) => {
    const template = await processTemplateService.createProcessTemplateService(req.body)

    return res.status(201).json(new SuccessResponse('Đã tạo quy trình sản xuất.', template))
  }
)

export const updateProcessTemplateController = asyncHandler(
  async (req: Request<{ processTemplateId: string }, unknown, UpdateProcessTemplateInput>, res: Response) => {
    const template = await processTemplateService.updateProcessTemplateService(req.params.processTemplateId, req.body)

    return res.status(200).json(new SuccessResponse('Đã cập nhật quy trình sản xuất.', template))
  }
)

export const deleteProcessTemplateController = asyncHandler(
  async (req: Request<{ processTemplateId: string }>, res: Response) => {
    const result = await processTemplateService.deleteProcessTemplateService(req.params.processTemplateId)
    const message =
      result.mode === 'deleted'
        ? 'Đã xóa quy trình sản xuất.'
        : 'Quy trình đã được sử dụng bởi đơn hàng nên hệ thống đã chuyển sang trạng thái ngừng sử dụng.'

    return res.status(200).json(new SuccessResponse(message, result))
  }
)

export default {
  createProcessTemplateController,
  deleteProcessTemplateController,
  getProcessTemplateDetailController,
  getProcessTemplatesController,
  updateProcessTemplateController
}
