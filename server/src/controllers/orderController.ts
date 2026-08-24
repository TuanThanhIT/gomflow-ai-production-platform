import type { Request, Response } from 'express'
import SuccessResponse from '../helpers/SuccessReponse.js'
import { asyncHandler } from '../middlewares/asyncHandler.js'
import orderService, { type CreateOrderInput, type GetOrdersQuery } from '../services/orderService.js'

export const getOrdersController = asyncHandler(
  async (req: Request<unknown, unknown, unknown, GetOrdersQuery>, res: Response) => {
    const data = await orderService.getOrdersService(req.query)

    return res.status(200).json(new SuccessResponse('Lấy danh sách đơn hàng thành công.', data))
  }
)

export const getOrderDetailController = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const order = await orderService.getOrderByIdService(req.params.id)

  return res.status(200).json(new SuccessResponse('Lấy chi tiết đơn hàng thành công.', order))
})

export const startOrderController = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const order = await orderService.startOrderService(req.params.id, req.user!)

  return res.status(200).json(new SuccessResponse('Order started successfully', order))
})
export const createOrderController = asyncHandler(
  async (req: Request<unknown, unknown, CreateOrderInput>, res: Response) => {
    const order = await orderService.createOrderService(req.body, req.user!)

    return res.status(201).json(new SuccessResponse('Order created successfully', order))
  }
)

export default {
  createOrderController,
  getOrderDetailController,
  getOrdersController,
  startOrderController
}
