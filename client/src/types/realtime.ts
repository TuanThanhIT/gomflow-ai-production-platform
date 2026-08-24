import type { OrderStatus, RiskLevel } from './order'

export interface OrderCreatedPayload {
  orderId: number | string
  orderCode: string
  status: OrderStatus | string
  riskLevel: RiskLevel | string
  progress: number
}

export interface OrderUpdatedPayload {
  orderId: number | string
  orderCode?: string
  status: OrderStatus | string
  riskLevel?: RiskLevel | string
  progress: number
}

export interface OrderCompletedPayload {
  orderId: number | string
  orderCode?: string
  status: 'COMPLETED' | string
  progress: number
}

export interface StageUpdatedPayload {
  orderStageId: number | string
  orderId: number | string
  stageCode?: string
  stageName: string
  status: string
  assignedResourceId?: number | string | null
}

export interface IncidentCreatedPayload {
  incidentId: number | string
  incidentCode: string
  severity: string
  status: 'OPEN' | string
  resourceId?: number | string | null
  orderStageId?: number | string | null
  affectedOrderIds: Array<number | string>
}

export interface IncidentResolvedPayload {
  incidentId: number | string
  incidentCode: string
  status: 'RESOLVED' | string
  resourceId?: number | string | null
  orderStageId?: number | string | null
  affectedOrderIds: Array<number | string>
}

export interface OrderRiskChangedPayload {
  orderId: number | string
  orderCode?: string
  oldRiskLevel: RiskLevel | string
  riskLevel: RiskLevel | string
  oldStatus: OrderStatus | string
  status: OrderStatus | string
  progress?: number
}

export interface NotificationSentPayload {
  notificationId: number | string
  orderId?: number | string | null
  channel: string
  type: string
  status: 'SENT' | string
  sentAt: string
}
