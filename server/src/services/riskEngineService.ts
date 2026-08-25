import type { Model, Transaction } from 'sequelize'
import { Op } from 'sequelize'
import { ACTIVITY_EVENT_TYPE } from '../constants/activityConstants.js'
import { INCIDENT_STATUS, type INCIDENT_SEVERITY } from '../constants/incidentConstants.js'
import { ORDER_STATUS, RISK_LEVEL } from '../constants/orderConstants.js'
import { SOCKET_EVENTS } from '../constants/socketEvents.js'
import { ActivityLog, Incident, IncidentAffectedOrder, Order } from '../models/index.js'
import {
  createMissingRiskAlertNotificationsForActiveOrder,
  createRiskAlertNotificationsForTransition
} from './notificationService.js'
import type { RealtimeEvent } from './socketService.js'

type IncidentSeverity = (typeof INCIDENT_SEVERITY)[keyof typeof INCIDENT_SEVERITY]
type RiskLevel = (typeof RISK_LEVEL)[keyof typeof RISK_LEVEL]

type PlainAffectedIncident = {
  orderId: string | number
  incident?: {
    severity: IncidentSeverity
  } | null
}

type PlainOrderRisk = {
  id: string | number
  code: string
  status: string
  riskLevel: RiskLevel
  startedAt: Date | string | null
  completedAt: Date | string | null
  progressPercent: string | number
}

export type RecalculateOrderRisksInput = {
  actorUserId: string | number | null
  incidentCode?: string
  incidentId?: string | number
  orderIds: Array<string | number>
  transaction: Transaction
}

export const INCIDENT_RISK_MAP: Record<IncidentSeverity, RiskLevel> = {
  LOW: RISK_LEVEL.LOW,
  MEDIUM: RISK_LEVEL.MEDIUM,
  HIGH: RISK_LEVEL.HIGH,
  CRITICAL: RISK_LEVEL.CRITICAL
}

const RISK_WEIGHT: Record<RiskLevel, number> = {
  NONE: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4
}

const getPlain = <T>(model: Model): T => model.get({ plain: true }) as T

const pickHigherRisk = (firstRisk: RiskLevel, secondRisk: RiskLevel) =>
  RISK_WEIGHT[firstRisk] >= RISK_WEIGHT[secondRisk] ? firstRisk : secondRisk

const shouldMoveOrderToAtRisk = (riskLevel: RiskLevel) =>
  riskLevel === RISK_LEVEL.HIGH || riskLevel === RISK_LEVEL.CRITICAL

const deriveOrderStatusAfterRiskRecalculation = (order: PlainOrderRisk, nextRiskLevel: RiskLevel) => {
  if (order.status === ORDER_STATUS.COMPLETED || order.status === ORDER_STATUS.CANCELLED) return order.status
  if (!order.startedAt) return ORDER_STATUS.PENDING
  if (shouldMoveOrderToAtRisk(nextRiskLevel)) return ORDER_STATUS.AT_RISK
  if (order.status !== ORDER_STATUS.AT_RISK) return order.status
  if (!order.completedAt) return ORDER_STATUS.IN_PROGRESS
  return order.status
}

export const recalculateRisksForOrders = async ({
  actorUserId,
  incidentCode,
  incidentId,
  orderIds,
  transaction
}: RecalculateOrderRisksInput) => {
  const uniqueAffectedOrderIds = [...new Set(orderIds.map((orderId) => String(orderId)))]
  if (uniqueAffectedOrderIds.length === 0) {
    return {
      changedOrders: [],
      notificationLogIds: [],
      realtimeEvents: []
    }
  }

  const orders = await Order.findAll({
    where: {
      id: {
        [Op.in]: uniqueAffectedOrderIds
      }
    },
    attributes: ['id', 'code', 'status', 'riskLevel', 'startedAt', 'completedAt', 'progressPercent'],
    transaction,
    lock: transaction.LOCK.UPDATE
  })

  const openAffectedRows = await IncidentAffectedOrder.findAll({
    where: {
      orderId: {
        [Op.in]: uniqueAffectedOrderIds
      }
    },
    attributes: ['orderId'],
    include: [
      {
        model: Incident,
        as: 'incident',
        where: { status: INCIDENT_STATUS.OPEN },
        attributes: ['severity']
      }
    ],
    transaction
  })

  const highestOpenRiskByOrderId = new Map<string, RiskLevel>()
  openAffectedRows.forEach((row) => {
    const affectedIncident = getPlain<PlainAffectedIncident>(row)
    const severity = affectedIncident.incident?.severity
    if (!severity) return

    const nextRisk = INCIDENT_RISK_MAP[severity]
    const orderId = String(affectedIncident.orderId)
    const currentRisk = highestOpenRiskByOrderId.get(orderId) ?? RISK_LEVEL.NONE
    highestOpenRiskByOrderId.set(orderId, pickHigherRisk(currentRisk, nextRisk))
  })

  const activityLogs: Array<Record<string, unknown>> = []
  const changedOrders: Array<Record<string, unknown>> = []
  const notificationLogIds: Array<string | number> = []
  const realtimeEvents: RealtimeEvent[] = []

  for (const order of orders) {
    const plainOrder = getPlain<PlainOrderRisk>(order)
    const orderId = String(plainOrder.id)
    const highestOpenRisk = highestOpenRiskByOrderId.get(orderId) ?? RISK_LEVEL.NONE
    const nextRiskLevel = highestOpenRisk
    const nextStatus = deriveOrderStatusAfterRiskRecalculation(plainOrder, nextRiskLevel)

    if (incidentId) {
      await IncidentAffectedOrder.update(
        {
          previousRiskLevel: plainOrder.riskLevel,
          calculatedRiskLevel: nextRiskLevel
        },
        {
          where: { incidentId, orderId: plainOrder.id },
          transaction
        }
      )
    }

    if (plainOrder.riskLevel === nextRiskLevel && plainOrder.status === nextStatus) {
      notificationLogIds.push(
        ...(await createMissingRiskAlertNotificationsForActiveOrder({
          orderId: plainOrder.id,
          incidentId: incidentId ?? null,
          status: nextStatus,
          riskLevel: nextRiskLevel,
          transaction
        }))
      )
      continue
    }

    await order.update(
      {
        riskLevel: nextRiskLevel,
        status: nextStatus
      },
      { transaction }
    )

    if (plainOrder.riskLevel !== nextRiskLevel) {
      activityLogs.push({
        actorUserId,
        orderId: plainOrder.id,
        orderStageId: null,
        incidentId: incidentId ?? null,
        eventType: ACTIVITY_EVENT_TYPE.ORDER_RISK_CHANGED,
        message: incidentCode
          ? `Order ${plainOrder.code} risk recalculated after incident ${incidentCode}`
          : `Order ${plainOrder.code} risk recalculated`,
        metadata: {
          oldRiskLevel: plainOrder.riskLevel,
          newRiskLevel: nextRiskLevel,
          incidentId: incidentId ?? null
        }
      })
    }

    notificationLogIds.push(
      ...(await createRiskAlertNotificationsForTransition({
        orderId: plainOrder.id,
        incidentId: incidentId ?? null,
        previousStatus: plainOrder.status,
        newStatus: nextStatus,
        previousRiskLevel: plainOrder.riskLevel,
        newRiskLevel: nextRiskLevel,
        transaction
      }))
    )

    changedOrders.push({
      id: plainOrder.id,
      code: plainOrder.code,
      previousStatus: plainOrder.status,
      newStatus: nextStatus,
      previousRiskLevel: plainOrder.riskLevel,
      newRiskLevel: nextRiskLevel,
      progressPercent: Number(plainOrder.progressPercent)
    })

    realtimeEvents.push({
      event: SOCKET_EVENTS.ORDER_RISK_CHANGED,
      payload: {
        orderId: plainOrder.id,
        orderCode: plainOrder.code,
        oldRiskLevel: plainOrder.riskLevel,
        riskLevel: nextRiskLevel,
        oldStatus: plainOrder.status,
        status: nextStatus,
        progress: Number(plainOrder.progressPercent)
      }
    })
  }

  if (activityLogs.length > 0) {
    await ActivityLog.bulkCreate(activityLogs, { transaction })
  }

  return {
    changedOrders,
    notificationLogIds,
    realtimeEvents
  }
}

export default {
  recalculateRisksForOrders
}
