import type { OrderDetailResponse } from '../types/order'
import instance from '../utils/axiosCustomize'

const assignResource = (stageId: number | string, resourceId: number | string) =>
  instance.patch<OrderDetailResponse>(`/api/order-stages/${stageId}/assign-resource`, { resourceId })

const completeOrderStage = (stageId: number | string) =>
  instance.patch<OrderDetailResponse>(`/api/order-stages/${stageId}/complete`)

const resumeOrderStage = (stageId: number | string) =>
  instance.patch<OrderDetailResponse>(`/api/order-stages/${stageId}/resume`)

const orderStageService = {
  assignResource,
  completeOrderStage,
  resumeOrderStage
}

export default orderStageService
