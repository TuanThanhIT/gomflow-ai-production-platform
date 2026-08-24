import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import processTemplateService from '../../services/processTemplateService'
import type { ApiErrorType } from '../../types/error'
import type {
  CreateProcessTemplatePayload,
  DeleteProcessTemplateResponse,
  GetProcessTemplatesParams,
  ProcessTemplate,
  ProcessTemplateDetail,
  ProcessTemplateDetailResponse,
  ProcessTemplatesResponse,
  UpdateProcessTemplatePayload
} from '../../types/processTemplate'
import { getApiErrorMessage } from '../../utils/apiError'

type ProcessTemplateState = {
  templates: ProcessTemplate[]
  selectedTemplate?: ProcessTemplateDetail
  error: string
  detailError: string
  mutationError: string
  loadingDetailId: number | null
}

const initialState: ProcessTemplateState = {
  templates: [],
  selectedTemplate: undefined,
  error: '',
  detailError: '',
  mutationError: '',
  loadingDetailId: null
}

export const getProcessTemplates = createAsyncThunk<
  ProcessTemplatesResponse,
  GetProcessTemplatesParams | undefined,
  { rejectValue: ApiErrorType }
>('processTemplate/getProcessTemplates', async (params, { rejectWithValue }) => {
  try {
    const res = await processTemplateService.getProcessTemplates(params ?? {})
    return res.data
  } catch (error) {
    return rejectWithValue(error as ApiErrorType)
  }
})

export const getProcessTemplateById = createAsyncThunk<
  ProcessTemplateDetailResponse,
  { processTemplateId: number },
  { rejectValue: ApiErrorType }
>('processTemplate/getProcessTemplateById', async ({ processTemplateId }, { rejectWithValue }) => {
  try {
    const res = await processTemplateService.getProcessTemplateById(processTemplateId)
    return res.data
  } catch (error) {
    return rejectWithValue(error as ApiErrorType)
  }
})

export const createProcessTemplate = createAsyncThunk<
  ProcessTemplateDetailResponse,
  { data: CreateProcessTemplatePayload },
  { rejectValue: ApiErrorType }
>('processTemplate/createProcessTemplate', async ({ data }, { rejectWithValue }) => {
  try {
    const res = await processTemplateService.createProcessTemplate(data)
    return res.data
  } catch (error) {
    return rejectWithValue(error as ApiErrorType)
  }
})

export const updateProcessTemplate = createAsyncThunk<
  ProcessTemplateDetailResponse,
  { processTemplateId: number; data: UpdateProcessTemplatePayload },
  { rejectValue: ApiErrorType }
>('processTemplate/updateProcessTemplate', async ({ data, processTemplateId }, { rejectWithValue }) => {
  try {
    const res = await processTemplateService.updateProcessTemplate(processTemplateId, data)
    return res.data
  } catch (error) {
    return rejectWithValue(error as ApiErrorType)
  }
})

export const deleteProcessTemplate = createAsyncThunk<
  DeleteProcessTemplateResponse,
  { processTemplateId: number },
  { rejectValue: ApiErrorType }
>('processTemplate/deleteProcessTemplate', async ({ processTemplateId }, { rejectWithValue }) => {
  try {
    const res = await processTemplateService.deleteProcessTemplate(processTemplateId)
    return res.data
  } catch (error) {
    return rejectWithValue(error as ApiErrorType)
  }
})

const processTemplateSlice = createSlice({
  name: 'processTemplate',
  initialState,
  reducers: {
    clearProcessTemplateError: (state) => {
      state.error = ''
      state.mutationError = ''
    },
    clearProcessTemplateDetailError: (state) => {
      state.detailError = ''
    },
    clearSelectedProcessTemplate: (state) => {
      state.selectedTemplate = undefined
      state.detailError = ''
      state.loadingDetailId = null
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(getProcessTemplates.pending, (state) => {
        state.error = ''
      })
      .addCase(getProcessTemplates.fulfilled, (state, action: PayloadAction<ProcessTemplatesResponse>) => {
        state.templates = action.payload.data
        state.error = ''
      })
      .addCase(getProcessTemplates.rejected, (state, action) => {
        state.templates = []
        state.error = getApiErrorMessage(action.payload, 'Không thể tải danh sách quy trình.')
      })
      .addCase(getProcessTemplateById.pending, (state, action) => {
        state.detailError = ''
        state.loadingDetailId = action.meta.arg.processTemplateId
      })
      .addCase(getProcessTemplateById.fulfilled, (state, action: PayloadAction<ProcessTemplateDetailResponse>) => {
        state.selectedTemplate = action.payload.data
        state.detailError = ''
        state.loadingDetailId = null
      })
      .addCase(getProcessTemplateById.rejected, (state, action) => {
        state.detailError = getApiErrorMessage(action.payload, 'Không thể tải chi tiết quy trình.')
        state.loadingDetailId = null
      })
      .addCase(createProcessTemplate.pending, (state) => {
        state.mutationError = ''
      })
      .addCase(createProcessTemplate.fulfilled, (state, action: PayloadAction<ProcessTemplateDetailResponse>) => {
        state.selectedTemplate = action.payload.data
        state.mutationError = ''
      })
      .addCase(createProcessTemplate.rejected, (state, action) => {
        state.mutationError = getApiErrorMessage(action.payload, 'Không thể tạo quy trình.')
      })
      .addCase(updateProcessTemplate.pending, (state) => {
        state.mutationError = ''
      })
      .addCase(updateProcessTemplate.fulfilled, (state, action: PayloadAction<ProcessTemplateDetailResponse>) => {
        state.selectedTemplate = action.payload.data
        state.mutationError = ''
      })
      .addCase(updateProcessTemplate.rejected, (state, action) => {
        state.mutationError = getApiErrorMessage(action.payload, 'Không thể cập nhật quy trình.')
      })
      .addCase(deleteProcessTemplate.pending, (state) => {
        state.mutationError = ''
      })
      .addCase(deleteProcessTemplate.fulfilled, (state) => {
        state.selectedTemplate = undefined
        state.mutationError = ''
      })
      .addCase(deleteProcessTemplate.rejected, (state, action) => {
        state.mutationError = getApiErrorMessage(action.payload, 'Không thể xóa hoặc ngừng sử dụng quy trình.')
      })
  }
})

export const { clearProcessTemplateDetailError, clearProcessTemplateError, clearSelectedProcessTemplate } =
  processTemplateSlice.actions
export default processTemplateSlice.reducer
