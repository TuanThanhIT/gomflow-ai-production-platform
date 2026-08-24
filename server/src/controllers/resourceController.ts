import type { Request, Response } from 'express'
import SuccessResponse from '../helpers/SuccessReponse.js'
import { asyncHandler } from '../middlewares/asyncHandler.js'
import resourceService, {
  type CreateResourceInput,
  type GetResourcesQuery,
  type UpdateResourceInput
} from '../services/resourceService.js'

export const getResourcesController = asyncHandler(
  async (req: Request<unknown, unknown, unknown, GetResourcesQuery>, res: Response) => {
    const resources = await resourceService.getResourcesService(req.query)

    return res.status(200).json(new SuccessResponse('Lấy danh sách tài nguyên thành công.', resources))
  }
)

export const getResourceDetailController = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const resource = await resourceService.getResourceByIdService(req.params.id)

  return res.status(200).json(new SuccessResponse('Lấy chi tiết tài nguyên thành công.', resource))
})

export const createResourceController = asyncHandler(
  async (req: Request<unknown, unknown, CreateResourceInput>, res: Response) => {
    const resource = await resourceService.createResourceService(req.body)

    return res.status(201).json(new SuccessResponse('Tạo tài nguyên sản xuất thành công.', resource))
  }
)

export const updateResourceController = asyncHandler(
  async (req: Request<{ id: string }, unknown, UpdateResourceInput>, res: Response) => {
    const resource = await resourceService.updateResourceService(req.params.id, req.body)

    return res.status(200).json(new SuccessResponse('Cập nhật tài nguyên sản xuất thành công.', resource))
  }
)

export const deleteResourceController = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const result = await resourceService.deleteResourceService(req.params.id)

  return res.status(200).json(new SuccessResponse('Xóa hoặc ngừng sử dụng tài nguyên thành công.', result))
})

export default {
  createResourceController,
  deleteResourceController,
  getResourceDetailController,
  getResourcesController,
  updateResourceController
}
