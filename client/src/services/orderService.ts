import type {
  CreateOrderPayload,
  CreateOrderResponse,
  GetOrdersParams,
  OrderDetailResponse,
  OrdersResponse
} from '../types/order'
import instance from '../utils/axiosCustomize'

const createOrder = (payload: CreateOrderPayload) => instance.post<CreateOrderResponse>('/api/orders', payload)

const getOrders = (params: GetOrdersParams) => instance.get<OrdersResponse>('/api/orders', { params })

const getOrderById = (orderId: number | string) => instance.get<OrderDetailResponse>(`/api/orders/${orderId}`)

const startOrder = (orderId: number | string) => instance.patch<OrderDetailResponse>(`/api/orders/${orderId}/start`)

const orderService = {
  createOrder,
  getOrderById,
  getOrders,
  startOrder
}

export default orderService
