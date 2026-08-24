import type { ApiResponse } from './api'
import type { ManufacturingEstimate, ManufacturingEstimateSources } from './ai'
import type { Incident } from './incident'
import type { ResourceType } from './resource'

export type OrderPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
export type OrderStatus = 'PENDING' | 'IN_PROGRESS' | 'AT_RISK' | 'COMPLETED' | 'CANCELLED'
export type RiskLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type OrderStageStatus = 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'FAILED'

export interface ExtraSpecification {
  name: string
  value: string
  unit?: string | null
}

export interface OrderSpecifications {
  glazeColor?: string
  capacityMl?: number
  heightCm?: number
  diameterCm?: number
  customization?: string
  specialRequirements?: string
  extraSpecifications?: ExtraSpecification[]
}

export interface CreateOrderPayload {
  processTemplateId: number
  customerName: string
  productName: string
  quantity: number
  specifications?: OrderSpecifications | null
  rawOrderText?: string | null
  aiAnalysis?: {
    manufacturingEstimate?: ManufacturingEstimate
    manufacturingEstimateSources?: ManufacturingEstimateSources
    warnings?: string[]
    recommendedProcessTemplate?: unknown
  } | null
  deadline: string
  priority: OrderPriority
}

export interface OrderStageUser {
  id: number
  fullName: string
  role: string
}

export interface OrderStageResource {
  id: number
  code: string
  name: string
  type: string
  status: string
}

export interface OrderStageBlockingReason {
  code:
    | 'STAGE_RESOURCE_REQUIRED'
    | 'NEXT_STAGE_RESOURCE_REQUIRED'
    | 'STAGE_AFFECTED_BY_INCIDENT'
    | 'STAGE_BLOCKED_BY_INCIDENT'
    | 'NEXT_STAGE_RESOURCE_INCIDENT'
    | 'NEXT_STAGE_RESOURCE_NOT_AVAILABLE'
    | string
  message: string
  stage?: {
    id?: number
    code: string
    name: string
  }
  nextStage?: {
    id?: number
    code: string
    name: string
    requiredResourceType?: string | null
  }
  incident?: {
    id: number
    code: string
    type?: string
    severity?: string
    status?: string
  }
  resource?: {
    id: number
    code: string
    name: string
    status?: string
  } | null
  requiredResourceType?: string | null
}

export interface OrderStage {
  id: number
  code: string
  name: string
  stepOrder: number
  status: OrderStageStatus | string
  estimatedDurationMinutes: number | null
  expectedStartAt?: string | null
  expectedEndAt?: string | null
  startedAt?: string | null
  completedAt?: string | null
  notes?: string | null
  assignedResource?: OrderStageResource | null
  templateStep?: {
    id: number
    requiredResourceType: ResourceType | string | null
  } | null
  startedBy?: OrderStageUser | null
  completedBy?: OrderStageUser | null
  incidents?: Incident[]
  canComplete?: boolean
  canResume?: boolean
  blockingIncident?: {
    id: number
    code: string
    type: string
    severity: string
    status: string
  } | null
  blockingReason?: OrderStageBlockingReason | null
}

export interface OrderProcessTemplate {
  id: number
  code: string
  name: string
  description?: string | null
}

export interface OrderCreatedBy {
  id: number
  fullName: string
  email?: string
  role: string
}

export interface Order {
  id: number
  code: string
  customerName: string
  productName: string
  quantity: number
  specifications: Record<string, unknown> | null
  aiAnalysis?: {
    manufacturingEstimate?: ManufacturingEstimate | null
    manufacturingEstimateSources?: ManufacturingEstimateSources | null
    [key: string]: unknown
  } | null
  deadline: string
  priority: OrderPriority | string
  status: OrderStatus | string
  riskLevel: RiskLevel | string
  progressPercent: number
  processTemplate: OrderProcessTemplate
  stages: OrderStage[]
}

export interface OrderListItem {
  id: number
  code: string
  customerName: string
  productName: string
  quantity: number
  deadline: string
  priority: OrderPriority | string
  status: OrderStatus | string
  riskLevel: RiskLevel | string
  progressPercent: number
  createdAt: string
  processTemplate: OrderProcessTemplate
}

export interface OrderDetail extends Order {
  rawOrderText: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  createdBy: OrderCreatedBy | null
  activeIncidents?: Array<{
    id: number
    code: string
    type: string
    severity: string
    status: string
    rawDescription?: string
    resource?: {
      id: number
      code: string
      name: string
      status: string
    } | null
  }>
}

export interface OrdersPagination {
  page: number
  limit: number
  totalItems: number
  totalPages: number
}

export interface GetOrdersParams {
  status?: OrderStatus | ''
  riskLevel?: RiskLevel | ''
  priority?: OrderPriority | ''
  search?: string
  page?: number
  limit?: number
}

export type CreateOrderResponse = ApiResponse<Order>
export type OrdersResponse = ApiResponse<{
  items: OrderListItem[]
  pagination: OrdersPagination
}>
export type OrderDetailResponse = ApiResponse<OrderDetail>
