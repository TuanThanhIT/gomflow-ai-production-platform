import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import incidentService from '../../services/incidentService'
import type { ApiErrorType } from '../../types/error'
import type {
  CreateIncidentPayload,
  GetIncidentsParams,
  Incident,
  IncidentResponse,
  IncidentsPagination,
  IncidentsResponse,
  ResolveIncidentPayload
} from '../../types/incident'
import { getApiErrorMessage } from '../../utils/apiError'

type IncidentState = {
  items: Incident[]
  pagination: IncidentsPagination
  listError: string
  selectedIncident?: Incident
  detailError: string
  createError: string
  resolveError: string
}

const initialState: IncidentState = {
  items: [],
  pagination: {
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 0
  },
  listError: '',
  selectedIncident: undefined,
  detailError: '',
  createError: '',
  resolveError: ''
}

export const getIncidents = createAsyncThunk<
  IncidentsResponse,
  GetIncidentsParams | undefined,
  { rejectValue: ApiErrorType }
>('incident/getIncidents', async (params, { rejectWithValue }) => {
  try {
    const res = await incidentService.getIncidents(params ?? {})
    return res.data
  } catch (error) {
    return rejectWithValue(error as ApiErrorType)
  }
})

export const getIncidentById = createAsyncThunk<
  IncidentResponse,
  { incidentId: number | string },
  { rejectValue: ApiErrorType }
>('incident/getIncidentById', async ({ incidentId }, { rejectWithValue }) => {
  try {
    const res = await incidentService.getIncidentById(incidentId)
    return res.data
  } catch (error) {
    return rejectWithValue(error as ApiErrorType)
  }
})

export const createIncident = createAsyncThunk<
  IncidentResponse,
  { data: CreateIncidentPayload },
  { rejectValue: ApiErrorType }
>('incident/createIncident', async ({ data }, { rejectWithValue }) => {
  try {
    const res = await incidentService.createIncident(data)
    return res.data
  } catch (error) {
    return rejectWithValue(error as ApiErrorType)
  }
})

export const resolveIncident = createAsyncThunk<
  IncidentResponse,
  { incidentId: number | string; data: ResolveIncidentPayload },
  { rejectValue: ApiErrorType }
>('incident/resolveIncident', async ({ data, incidentId }, { rejectWithValue }) => {
  try {
    const res = await incidentService.resolveIncident(incidentId, data)
    return res.data
  } catch (error) {
    return rejectWithValue(error as ApiErrorType)
  }
})

const incidentSlice = createSlice({
  name: 'incident',
  initialState,
  reducers: {
    clearIncidentDetail: (state) => {
      state.selectedIncident = undefined
      state.detailError = ''
    },
    clearIncidentErrors: (state) => {
      state.listError = ''
      state.detailError = ''
      state.createError = ''
      state.resolveError = ''
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(getIncidents.pending, (state) => {
        state.listError = ''
      })
      .addCase(getIncidents.fulfilled, (state, action: PayloadAction<IncidentsResponse>) => {
        state.items = action.payload.data.items
        state.pagination = action.payload.data.pagination
        state.listError = ''
      })
      .addCase(getIncidents.rejected, (state, action) => {
        state.items = []
        state.pagination = initialState.pagination
        state.listError = getApiErrorMessage(action.payload, 'Không thể tải danh sách sự cố.')
      })
      .addCase(getIncidentById.pending, (state) => {
        state.detailError = ''
      })
      .addCase(getIncidentById.fulfilled, (state, action: PayloadAction<IncidentResponse>) => {
        state.selectedIncident = action.payload.data
        state.detailError = ''
      })
      .addCase(getIncidentById.rejected, (state, action) => {
        state.selectedIncident = undefined
        state.detailError = getApiErrorMessage(action.payload, 'Không thể tải chi tiết sự cố.')
      })
      .addCase(createIncident.pending, (state) => {
        state.createError = ''
      })
      .addCase(createIncident.fulfilled, (state, action: PayloadAction<IncidentResponse>) => {
        state.createError = ''
        state.items = [action.payload.data, ...state.items]
      })
      .addCase(createIncident.rejected, (state, action) => {
        state.createError = getApiErrorMessage(action.payload, 'Không thể báo cáo sự cố.')
      })
      .addCase(resolveIncident.pending, (state) => {
        state.resolveError = ''
      })
      .addCase(resolveIncident.fulfilled, (state, action: PayloadAction<IncidentResponse>) => {
        state.resolveError = ''
        state.selectedIncident = action.payload.data
        state.items = state.items.map((item) => (item.id === action.payload.data.id ? action.payload.data : item))
      })
      .addCase(resolveIncident.rejected, (state, action) => {
        state.resolveError = getApiErrorMessage(action.payload, 'Không thể xử lý sự cố.')
      })
  }
})

export const { clearIncidentDetail, clearIncidentErrors } = incidentSlice.actions
export default incidentSlice.reducer
