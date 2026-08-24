import type { ApiResponse } from './api'
import type { ResourceType } from './resource'

export interface ProcessTemplate {
  id: number
  code: string
  name: string
  description: string | null
  isActive: boolean
  stepCount?: number
  orderCount?: number
  updatedAt?: string
  createdAt?: string
}

export interface ProcessTemplateStep {
  id: number
  processTemplateId?: number
  code: string
  name: string
  stepOrder: number
  estimatedDurationMinutes: number | null
  requiredResourceType: ResourceType | string | null
  description: string | null
}

export interface ProcessTemplateDetail extends ProcessTemplate {
  steps: ProcessTemplateStep[]
}

export interface ProcessTemplateStagePayload {
  id?: number
  code: string
  name: string
  estimatedDurationMinutes?: number | null
  requiredResourceType?: ResourceType | null
  description?: string | null
}

export interface CreateProcessTemplatePayload {
  code: string
  name: string
  description?: string | null
  isActive?: boolean
  stages: ProcessTemplateStagePayload[]
}

export interface UpdateProcessTemplatePayload {
  code?: string
  name?: string
  description?: string | null
  isActive?: boolean
  stages?: ProcessTemplateStagePayload[]
}

export interface GetProcessTemplatesParams {
  status?: 'active' | 'inactive' | 'all'
  search?: string
}

export type DeleteProcessTemplateResponse = ApiResponse<{
  mode: 'deleted' | 'deactivated'
  orderCount: number
}>

export type ProcessTemplatesResponse = ApiResponse<ProcessTemplate[]>
export type ProcessTemplateDetailResponse = ApiResponse<ProcessTemplateDetail>
