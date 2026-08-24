import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import orderService from '../../services/orderService'
import orderStageService from '../../services/orderStageService'
import type {
  CreateOrderPayload,
  CreateOrderResponse,
  GetOrdersParams,
  Order,
  OrderDetail,
  OrderDetailResponse,
  OrderListItem,
  OrdersPagination,
  OrdersResponse
} from '../../types/order'
import type { ApiErrorType } from '../../types/error'
import { getApiErrorMessage } from '../../utils/apiError'

type OrderState = {
  createdOrder?: Order
  createError: string
  items: OrderListItem[]
  pagination: OrdersPagination
  listError: string
  selectedOrder?: OrderDetail
  detailError: string
  actionError: string
}

const initialState: OrderState = {
  createdOrder: undefined,
  createError: '',
  items: [],
  pagination: {
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 0
  },
  listError: '',
  selectedOrder: undefined,
  detailError: '',
  actionError: ''
}

export const createOrder = createAsyncThunk<
  CreateOrderResponse,
  { data: CreateOrderPayload },
  { rejectValue: ApiErrorType }
>('order/createOrder', async ({ data }, { rejectWithValue }) => {
  try {
    const res = await orderService.createOrder(data)
    return res.data
  } catch (error) {
    return rejectWithValue(error as ApiErrorType)
  }
})

export const getOrders = createAsyncThunk<OrdersResponse, GetOrdersParams | undefined, { rejectValue: ApiErrorType }>(
  'order/getOrders',
  async (params, { rejectWithValue }) => {
    try {
      const res = await orderService.getOrders(params ?? {})
      return res.data
    } catch (error) {
      return rejectWithValue(error as ApiErrorType)
    }
  }
)

export const getOrderById = createAsyncThunk<
  OrderDetailResponse,
  { orderId: number | string },
  { rejectValue: ApiErrorType }
>('order/getOrderById', async ({ orderId }, { rejectWithValue }) => {
  try {
    const res = await orderService.getOrderById(orderId)
    return res.data
  } catch (error) {
    return rejectWithValue(error as ApiErrorType)
  }
})

export const startOrder = createAsyncThunk<
  OrderDetailResponse,
  { orderId: number | string },
  { rejectValue: ApiErrorType }
>('order/startOrder', async ({ orderId }, { rejectWithValue }) => {
  try {
    const res = await orderService.startOrder(orderId)
    return res.data
  } catch (error) {
    return rejectWithValue(error as ApiErrorType)
  }
})

export const completeOrderStage = createAsyncThunk<
  OrderDetailResponse,
  { stageId: number | string },
  { rejectValue: ApiErrorType }
>('order/completeOrderStage', async ({ stageId }, { rejectWithValue }) => {
  try {
    const res = await orderStageService.completeOrderStage(stageId)
    return res.data
  } catch (error) {
    return rejectWithValue(error as ApiErrorType)
  }
})
export const resumeOrderStage = createAsyncThunk<
  OrderDetailResponse,
  { stageId: number | string },
  { rejectValue: ApiErrorType }
>('order/resumeOrderStage', async ({ stageId }, { rejectWithValue }) => {
  try {
    const res = await orderStageService.resumeOrderStage(stageId)
    return res.data
  } catch (error) {
    return rejectWithValue(error as ApiErrorType)
  }
})
export const assignResourceToStage = createAsyncThunk<
  OrderDetailResponse,
  { stageId: number | string; resourceId: number | string },
  { rejectValue: ApiErrorType }
>('order/assignResourceToStage', async ({ resourceId, stageId }, { rejectWithValue }) => {
  try {
    const res = await orderStageService.assignResource(stageId, resourceId)
    return res.data
  } catch (error) {
    return rejectWithValue(error as ApiErrorType)
  }
})
const orderSlice = createSlice({
  name: 'order',
  initialState,
  reducers: {
    clearCreateOrderState: (state) => {
      state.createdOrder = undefined
      state.createError = ''
    },
    clearOrderDetail: (state) => {
      state.selectedOrder = undefined
      state.detailError = ''
      state.actionError = ''
    },
    clearOrderListError: (state) => {
      state.listError = ''
    },
    clearOrderActionError: (state) => {
      state.actionError = ''
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(createOrder.pending, (state) => {
        state.createError = ''
      })
      .addCase(createOrder.fulfilled, (state, action: PayloadAction<CreateOrderResponse>) => {
        state.createdOrder = action.payload.data
        state.createError = ''
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.createError = getApiErrorMessage(action.payload, 'Không thể tạo đơn hàng. Vui lòng thử lại.')
      })
      .addCase(getOrders.pending, (state) => {
        state.listError = ''
      })
      .addCase(getOrders.fulfilled, (state, action: PayloadAction<OrdersResponse>) => {
        state.items = action.payload.data.items
        state.pagination = action.payload.data.pagination
        state.listError = ''
      })
      .addCase(getOrders.rejected, (state, action) => {
        state.items = []
        state.pagination = initialState.pagination
        state.listError = getApiErrorMessage(action.payload, 'Không thể tải danh sách đơn hàng.')
      })
      .addCase(getOrderById.pending, (state) => {
        state.detailError = ''
      })
      .addCase(getOrderById.fulfilled, (state, action: PayloadAction<OrderDetailResponse>) => {
        state.selectedOrder = action.payload.data
        state.detailError = ''
      })
      .addCase(getOrderById.rejected, (state, action) => {
        state.selectedOrder = undefined
        state.detailError = getApiErrorMessage(action.payload, 'Không thể tải chi tiết đơn hàng.')
      })
      .addCase(startOrder.pending, (state) => {
        state.actionError = ''
      })
      .addCase(startOrder.fulfilled, (state, action: PayloadAction<OrderDetailResponse>) => {
        state.selectedOrder = action.payload.data
        state.actionError = ''
      })
      .addCase(startOrder.rejected, (state, action) => {
        state.actionError = getApiErrorMessage(action.payload, 'Không thể bắt đầu sản xuất đơn hàng.')
      })
      .addCase(completeOrderStage.pending, (state) => {
        state.actionError = ''
      })
      .addCase(completeOrderStage.fulfilled, (state, action: PayloadAction<OrderDetailResponse>) => {
        state.selectedOrder = action.payload.data
        state.actionError = ''
      })
      .addCase(completeOrderStage.rejected, (state, action) => {
        state.actionError = getApiErrorMessage(action.payload, 'Không thể hoàn thành công đoạn.')
      })
      .addCase(resumeOrderStage.pending, (state) => {
        state.actionError = ''
      })
      .addCase(resumeOrderStage.fulfilled, (state, action: PayloadAction<OrderDetailResponse>) => {
        state.selectedOrder = action.payload.data
        state.actionError = ''
      })
      .addCase(resumeOrderStage.rejected, (state, action) => {
        state.actionError = getApiErrorMessage(action.payload, 'Không thể tiếp tục công đoạn.')
      })
      .addCase(assignResourceToStage.pending, (state) => {
        state.actionError = ''
      })
      .addCase(assignResourceToStage.fulfilled, (state, action: PayloadAction<OrderDetailResponse>) => {
        state.selectedOrder = action.payload.data
        state.actionError = ''
      })
      .addCase(assignResourceToStage.rejected, (state, action) => {
        state.actionError = getApiErrorMessage(action.payload, 'Không thể gán tài nguyên.')
      })
  }
})

export const { clearCreateOrderState, clearOrderActionError, clearOrderDetail, clearOrderListError } =
  orderSlice.actions
export default orderSlice.reducer
