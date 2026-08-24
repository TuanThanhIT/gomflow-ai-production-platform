import type { ApiResponse } from './api'

export type ResourceType = 'KILN' | 'DRYER' | 'FORMING' | 'DECORATION' | 'GLAZING' | 'QC' | 'PACKAGING' | 'OTHER'
export type ResourceStatus = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'BROKEN'

export interface Resource {
  id: number
  code: string
  name: string
  type: ResourceType | string
  status: ResourceStatus | string
  isActive: boolean
  description: string | null
  createdAt?: string
  updatedAt?: string
  orderStageCount?: number
  incidentCount?: number
  waitingAssignmentCount?: number
  inProgressAssignmentCount?: number
  openIncidentCount?: number
  hasUsage?: boolean
  canEditIdentity?: boolean
}

export interface GetResourcesParams {
  type?: ResourceType | ''
  status?: ResourceStatus | ''
  active?: 'active' | 'inactive' | 'all'
  search?: string
}

export interface CreateResourcePayload {
  code: string
  name: string
  type: ResourceType
  description?: string | null
}

export type UpdateResourcePayload = Partial<CreateResourcePayload> & {
  isActive?: boolean
}

export interface DeleteResourceResult {
  id: number
  deleted: boolean
  deactivated: boolean
}

export interface AvailableResourcesForStage {
  stage: {
    id: number
    code: string
    name: string
    requiredResourceType: ResourceType | string | null
  }
  resources: Resource[]
}

export type ResourcesResponse = ApiResponse<Resource[]>
export type ResourceResponse = ApiResponse<Resource>
export type DeleteResourceResponse = ApiResponse<DeleteResourceResult>
export type AvailableResourcesForStageResponse = ApiResponse<AvailableResourcesForStage>
