import type { ApiResponse } from './api'
import type { IncidentSeverity, IncidentStatus, IncidentType } from './incident'
import type { OrderPriority, OrderStatus, RiskLevel } from './order'
import type { ResourceStatus, ResourceType } from './resource'

export interface DashboardSummary {
  totalOrders: number
  pendingOrders: number
  inProgressOrders: number
  atRiskOrders: number
  completedOrders: number
  openIncidents: number
  highRiskOrders: number
  criticalRiskOrders: number
}

export interface DashboardStage {
  id: number | string
  code: string
  name: string
  status: string
}

export interface DashboardOrder {
  id: number | string
  code: string
  customerName: string
  productName: string
  quantity: number
  deadline: string | null
  priority: OrderPriority | string
  status: OrderStatus | string
  riskLevel: RiskLevel | string
  progressPercent: number
  createdAt: string | null
  updatedAt: string | null
  completedAt: string | null
  processTemplate?: {
    id: number | string
    code: string
    name: string
  } | null
  currentStage: DashboardStage | null
}

export interface DashboardKanbanColumn {
  total: number
  items: DashboardOrder[]
}

export interface DashboardKanban {
  pending: DashboardKanbanColumn
  inProgress: DashboardKanbanColumn
  atRisk: DashboardKanbanColumn
  completed: DashboardKanbanColumn
}

export interface DashboardResource {
  id: number | string
  code: string
  name: string
  type: ResourceType | string
  status: ResourceStatus | string
}

export interface DashboardResourceHealth {
  total: number
  available: number
  inUse: number
  maintenance: number
  broken: number
  brokenResources: DashboardResource[]
}

export interface DashboardIncident {
  id: number | string
  code: string
  rawDescription: string
  type: IncidentType | string
  severity: IncidentSeverity | string
  status: IncidentStatus | string
  estimatedDelayMinutes: number | null
  createdAt: string | null
  resource?: DashboardResource | null
  orderStage?: DashboardStage | null
  affectedOrderCount: number
}

export interface ProductionTrendPoint {
  date: string
  label: string
  completedOrders: number
}

export interface DashboardCharts {
  productionTrend: ProductionTrendPoint[]
}

export interface DashboardData {
  summary: DashboardSummary
  kanban: DashboardKanban
  attentionOrders: DashboardOrder[]
  recentIncidents: DashboardIncident[]
  resources: DashboardResourceHealth
  charts: DashboardCharts
}

export type DashboardResponse = ApiResponse<DashboardData>
