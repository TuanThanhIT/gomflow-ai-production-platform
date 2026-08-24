import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import dashboardService from '../../services/dashboardService'
import type { DashboardData, DashboardResponse } from '../../types/dashboard'
import type { ApiErrorType } from '../../types/error'
import { getApiErrorMessage } from '../../utils/apiError'

type DashboardState = {
  data?: DashboardData
  error: string
}

const initialState: DashboardState = {
  data: undefined,
  error: ''
}

export const getDashboard = createAsyncThunk<DashboardResponse, void, { rejectValue: ApiErrorType }>(
  'dashboard/getDashboard',
  async (_, { rejectWithValue }) => {
    try {
      const res = await dashboardService.getDashboard()
      return res.data
    } catch (error) {
      return rejectWithValue(error as ApiErrorType)
    }
  }
)

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getDashboard.pending, (state) => {
        state.error = ''
      })
      .addCase(getDashboard.fulfilled, (state, action: PayloadAction<DashboardResponse>) => {
        state.data = action.payload.data
        state.error = ''
      })
      .addCase(getDashboard.rejected, (state, action) => {
        state.error = getApiErrorMessage(action.payload, 'Không thể tải dữ liệu dashboard.')
      })
  }
})

export default dashboardSlice.reducer
