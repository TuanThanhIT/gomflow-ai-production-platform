import type { ApiResponse } from './api'

export interface ActivityLog {
  id: number
  eventType: string
  message: string
  metadata: Record<string, unknown> | null
  createdAt: string
  actor: {
    id: number
    fullName: string
    role: string
  } | null
  order: {
    id: number
    code: string
    customerName: string
    productName: string
  } | null
  orderStage: {
    id: number
    code: string
    name: string
    stepOrder: number
    status: string
  } | null
  incident: {
    id: number
    code: string
    type: string
    severity: string
    status: string
  } | null
}

export interface ActivityLogsPagination {
  page: number
  limit: number
  totalItems: number
  totalPages: number
}

export interface ActivityLogOrderGroup {
  order: {
    id: number
    code: string
    customerName: string
    productName: string
  }
  activityCount: number
  latestActivityAt: string
}

export interface GetActivityLogsParams {
  search?: string
  eventType?: string
  orderId?: number | string
  actorUserId?: number | string
  incidentId?: number | string
  from?: string
  to?: string
  page?: number
  limit?: number
}

export type GetActivityLogOrderGroupsParams = Pick<GetActivityLogsParams, 'search' | 'eventType' | 'from' | 'to' | 'page' | 'limit'>

export type ActivityLogsResponse = ApiResponse<{
  items: ActivityLog[]
  pagination: ActivityLogsPagination
}>

export type ActivityLogOrderGroupsResponse = ApiResponse<{
  items: ActivityLogOrderGroup[]
  pagination: ActivityLogsPagination
}>
