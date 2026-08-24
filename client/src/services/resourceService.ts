import type {
  AvailableResourcesForStageResponse,
  CreateResourcePayload,
  DeleteResourceResponse,
  GetResourcesParams,
  ResourceResponse,
  ResourcesResponse,
  UpdateResourcePayload
} from '../types/resource'
import instance from '../utils/axiosCustomize'

const getResources = (params: GetResourcesParams) => instance.get<ResourcesResponse>('/api/resources', { params })

const getResourceById = (resourceId: number | string) => instance.get<ResourceResponse>(`/api/resources/${resourceId}`)

const createResource = (payload: CreateResourcePayload) => instance.post<ResourceResponse>('/api/resources', payload)

const updateResource = (resourceId: number | string, payload: UpdateResourcePayload) =>
  instance.patch<ResourceResponse>(`/api/resources/${resourceId}`, payload)

const deleteResource = (resourceId: number | string) =>
  instance.delete<DeleteResourceResponse>(`/api/resources/${resourceId}`)

const getAvailableResourcesForStage = (stageId: number | string) =>
  instance.get<AvailableResourcesForStageResponse>(`/api/order-stages/${stageId}/available-resources`)

const resourceService = {
  createResource,
  deleteResource,
  getAvailableResourcesForStage,
  getResourceById,
  getResources,
  updateResource
}

export default resourceService
