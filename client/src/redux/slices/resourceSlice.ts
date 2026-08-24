import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import resourceService from '../../services/resourceService'
import type { ApiErrorType } from '../../types/error'
import type {
  AvailableResourcesForStage,
  AvailableResourcesForStageResponse,
  CreateResourcePayload,
  DeleteResourceResponse,
  GetResourcesParams,
  Resource,
  ResourceResponse,
  ResourcesResponse,
  UpdateResourcePayload
} from '../../types/resource'
import { getApiErrorMessage } from '../../utils/apiError'

type ResourceState = {
  items: Resource[]
  selectedResource?: Resource
  listError: string
  detailError: string
  mutationError: string
  availableResources?: AvailableResourcesForStage
  availableError: string
}

const initialState: ResourceState = {
  items: [],
  selectedResource: undefined,
  listError: '',
  detailError: '',
  mutationError: '',
  availableResources: undefined,
  availableError: ''
}

export const getResources = createAsyncThunk<
  ResourcesResponse,
  GetResourcesParams | undefined,
  { rejectValue: ApiErrorType }
>('resource/getResources', async (params, { rejectWithValue }) => {
  try {
    const res = await resourceService.getResources(params ?? {})
    return res.data
  } catch (error) {
    return rejectWithValue(error as ApiErrorType)
  }
})

export const getResourceById = createAsyncThunk<
  ResourceResponse,
  { resourceId: number | string },
  { rejectValue: ApiErrorType }
>('resource/getResourceById', async ({ resourceId }, { rejectWithValue }) => {
  try {
    const res = await resourceService.getResourceById(resourceId)
    return res.data
  } catch (error) {
    return rejectWithValue(error as ApiErrorType)
  }
})

export const createResource = createAsyncThunk<ResourceResponse, CreateResourcePayload, { rejectValue: ApiErrorType }>(
  'resource/createResource',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await resourceService.createResource(payload)
      return res.data
    } catch (error) {
      return rejectWithValue(error as ApiErrorType)
    }
  }
)

export const updateResource = createAsyncThunk<
  ResourceResponse,
  { resourceId: number | string; payload: UpdateResourcePayload },
  { rejectValue: ApiErrorType }
>('resource/updateResource', async ({ resourceId, payload }, { rejectWithValue }) => {
  try {
    const res = await resourceService.updateResource(resourceId, payload)
    return res.data
  } catch (error) {
    return rejectWithValue(error as ApiErrorType)
  }
})

export const deleteResource = createAsyncThunk<
  DeleteResourceResponse,
  { resourceId: number | string },
  { rejectValue: ApiErrorType }
>('resource/deleteResource', async ({ resourceId }, { rejectWithValue }) => {
  try {
    const res = await resourceService.deleteResource(resourceId)
    return res.data
  } catch (error) {
    return rejectWithValue(error as ApiErrorType)
  }
})

export const getAvailableResourcesForStage = createAsyncThunk<
  AvailableResourcesForStageResponse,
  { stageId: number | string },
  { rejectValue: ApiErrorType }
>('resource/getAvailableResourcesForStage', async ({ stageId }, { rejectWithValue }) => {
  try {
    const res = await resourceService.getAvailableResourcesForStage(stageId)
    return res.data
  } catch (error) {
    return rejectWithValue(error as ApiErrorType)
  }
})

const upsertResource = (items: Resource[], resource: Resource) => {
  const index = items.findIndex((item) => item.id === resource.id)
  if (index >= 0) {
    items[index] = resource
    return
  }

  items.unshift(resource)
}

const resourceSlice = createSlice({
  name: 'resource',
  initialState,
  reducers: {
    clearAvailableResources: (state) => {
      state.availableResources = undefined
      state.availableError = ''
    },
    clearSelectedResource: (state) => {
      state.selectedResource = undefined
      state.detailError = ''
    },
    clearResourceMutationError: (state) => {
      state.mutationError = ''
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(getResources.pending, (state) => {
        state.listError = ''
      })
      .addCase(getResources.fulfilled, (state, action: PayloadAction<ResourcesResponse>) => {
        state.items = action.payload.data
        state.listError = ''
      })
      .addCase(getResources.rejected, (state, action) => {
        state.items = []
        state.listError = getApiErrorMessage(action.payload, 'Không thể tải danh sách tài nguyên.')
      })
      .addCase(getResourceById.pending, (state) => {
        state.detailError = ''
      })
      .addCase(getResourceById.fulfilled, (state, action: PayloadAction<ResourceResponse>) => {
        state.selectedResource = action.payload.data
        state.detailError = ''
      })
      .addCase(getResourceById.rejected, (state, action) => {
        state.selectedResource = undefined
        state.detailError = getApiErrorMessage(action.payload, 'Không thể tải chi tiết tài nguyên.')
      })
      .addCase(createResource.pending, (state) => {
        state.mutationError = ''
      })
      .addCase(createResource.fulfilled, (state, action: PayloadAction<ResourceResponse>) => {
        upsertResource(state.items, action.payload.data)
        state.selectedResource = action.payload.data
        state.mutationError = ''
      })
      .addCase(createResource.rejected, (state, action) => {
        state.mutationError = getApiErrorMessage(action.payload, 'Không thể tạo tài nguyên.')
      })
      .addCase(updateResource.pending, (state) => {
        state.mutationError = ''
      })
      .addCase(updateResource.fulfilled, (state, action: PayloadAction<ResourceResponse>) => {
        upsertResource(state.items, action.payload.data)
        state.selectedResource = action.payload.data
        state.mutationError = ''
      })
      .addCase(updateResource.rejected, (state, action) => {
        state.mutationError = getApiErrorMessage(action.payload, 'Không thể cập nhật tài nguyên.')
      })
      .addCase(deleteResource.pending, (state) => {
        state.mutationError = ''
      })
      .addCase(deleteResource.fulfilled, (state, action: PayloadAction<DeleteResourceResponse>) => {
        if (action.payload.data.deleted) {
          state.items = state.items.filter((item) => item.id !== action.payload.data.id)
        }
        state.selectedResource = undefined
        state.mutationError = ''
      })
      .addCase(deleteResource.rejected, (state, action) => {
        state.mutationError = getApiErrorMessage(action.payload, 'Không thể xóa hoặc ngừng sử dụng tài nguyên.')
      })
      .addCase(getAvailableResourcesForStage.pending, (state) => {
        state.availableError = ''
      })
      .addCase(
        getAvailableResourcesForStage.fulfilled,
        (state, action: PayloadAction<AvailableResourcesForStageResponse>) => {
          state.availableResources = action.payload.data
          state.availableError = ''
        }
      )
      .addCase(getAvailableResourcesForStage.rejected, (state, action) => {
        state.availableResources = undefined
        state.availableError = getApiErrorMessage(action.payload, 'Không thể tải tài nguyên khả dụng.')
      })
  }
})

export const { clearAvailableResources, clearResourceMutationError, clearSelectedResource } = resourceSlice.actions
export default resourceSlice.reducer
