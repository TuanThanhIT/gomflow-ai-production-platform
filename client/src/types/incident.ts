import type { ApiResponse } from './api'
import type { Resource } from './resource'

export type IncidentType =
  'EQUIPMENT_FAILURE' | 'MATERIAL_SHORTAGE' | 'QUALITY_ISSUE' | 'PROCESS_DELAY' | 'ORDER_CHANGE' | 'OTHER'

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type IncidentStatus = 'OPEN' | 'RESOLVED'

export interface IncidentUser {
  id: number
  fullName: string
  email?: string
  role: string
}

export interface IncidentOrderStage {
  id: number
  code: string
  name: string
  status: string
  orderId?: number
  order?: {
    id: number
    code: string
    customerName: string
    productName: string
    status: string
  } | null
}

export interface IncidentAffectedStage {
  id: number
  orderId: number
  code: string
  name: string
  status: string
}

export interface IncidentAffectedOrder {
  id: number
  code: string
  customerName: string
  productName: string
  status: string
  riskLevel?: string
  progressPercent: number
  deadline?: string
  affectedStages: IncidentAffectedStage[]
}

export interface Incident {
  id: number
  code: string
  resourceId: number | null
  orderStageId: number | null
  rawDescription: string
  type: IncidentType | string
  severity: IncidentSeverity | string
  estimatedDelayMinutes: number | null
  status: IncidentStatus | string
  aiAnalysis?: Record<string, unknown> | null
  resolutionNote?: string | null
  resolvedAt?: string | null
  createdAt: string
  updatedAt?: string
  resource?: Resource | null
  orderStage?: IncidentOrderStage | null
  reportedBy?: IncidentUser | null
  resolvedBy?: IncidentUser | null
  affectedOrderCount?: number
  affectedOrders?: IncidentAffectedOrder[]
}

export interface GetIncidentsParams {
  status?: IncidentStatus | ''
  severity?: IncidentSeverity | ''
  type?: IncidentType | ''
  resourceId?: number | ''
  search?: string
  page?: number
  limit?: number
}

export interface CreateIncidentPayload {
  orderStageId?: number | null
  resourceId?: number | null
  rawDescription: string
  type: IncidentType
  severity: IncidentSeverity
  estimatedDelayMinutes?: number | null
}

export interface ResolveIncidentPayload {
  resolutionNote: string
}

export interface IncidentsPagination {
  page: number
  limit: number
  totalItems: number
  totalPages: number
}

export type IncidentsResponse = ApiResponse<{
  items: Incident[]
  pagination: IncidentsPagination
}>

export type IncidentResponse = ApiResponse<Incident>
