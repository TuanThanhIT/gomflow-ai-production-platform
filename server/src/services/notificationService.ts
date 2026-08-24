import type { Model, Transaction } from 'sequelize'
import { Op } from 'sequelize'
import {
  INCIDENT_STATUS,
  NOTIFICATION_CHANNEL,
  NOTIFICATION_STATUS,
  NOTIFICATION_TYPE,
  ORDER_STATUS,
  RISK_LEVEL
} from '../constants/databaseConstants.js'
import { Incident, IncidentAffectedOrder, NotificationLog, Order, OrderStage, Resource } from '../models/index.js'
import { emitNotificationSent } from './socketService.js'
import telegramService from './telegramService.js'

type RiskLevel = (typeof RISK_LEVEL)[keyof typeof RISK_LEVEL]

type RiskAlertTransitionInput = {
  orderId: string | number
  incidentId?: string | number | null
  previousStatus: string
  newStatus: string
  previousRiskLevel: RiskLevel
  newRiskLevel: RiskLevel
  transaction: Transaction
}

type ActiveRiskAlertInput = {
  orderId: string | number
  incidentId?: string | number | null
  status: string
  riskLevel: RiskLevel
  transaction: Transaction
}

type PlainNotificationLog = {
  id: string | number
  status: string
  message: string
  channel: string
  notificationType: string
  order?: {
    id: string | number
    code: string
  } | null
}

type PlainIncidentForAlert = {
  id: string | number
  code: string
  severity: string
  resource?: {
    code: string
    name: string
  } | null
  orderStage?: {
    code: string
    name: string
  } | null
}

type PlainOrderForAlert = {
  id: string | number
  code: string
  customerName?: string | null
  productName?: string | null
  progressPercent: string | number
}

type PlainOrderForStageCompleted = PlainOrderForAlert & {
  aiAnalysis?: {
    manufacturingEstimate?: {
      estimatedFiringTemperatureC?: number | null
      estimatedFiringDurationMinutes?: number | null
    } | null
  } | null
}

type PlainAffectedIncidentRow = {
  incidentId: string | number
  incident?: PlainIncidentForAlert | null
}

const riskAlertLevels = [RISK_LEVEL.HIGH, RISK_LEVEL.CRITICAL] as string[]

const severityLabel: Record<string, string> = {
  LOW: 'THAP',
  MEDIUM: 'TRUNG BINH',
  HIGH: 'CAO',
  CRITICAL: 'NGHIEM TRONG'
}

const getPlain = <T>(model: Model): T => model.get({ plain: true }) as T

const isRiskAlertLevel = (riskLevel: string) => riskAlertLevels.includes(riskLevel)

const isEscalatingToCritical = (previousRiskLevel: string, newRiskLevel: string) =>
  previousRiskLevel !== RISK_LEVEL.CRITICAL && newRiskLevel === RISK_LEVEL.CRITICAL

const shouldCreateRiskAlertForTransition = ({
  newRiskLevel,
  newStatus,
  previousRiskLevel,
  previousStatus
}: Omit<RiskAlertTransitionInput, 'incidentId' | 'orderId' | 'transaction'>) => {
  if (newStatus !== ORDER_STATUS.AT_RISK || !isRiskAlertLevel(newRiskLevel)) return false
  if (previousStatus !== ORDER_STATUS.AT_RISK) return true
  return isEscalatingToCritical(previousRiskLevel, newRiskLevel)
}

const formatProgressPercent = (value: string | number) => {
  const progress = Number(value)
  if (Number.isNaN(progress)) return null
  return `${progress.toFixed(2).replace(/\.00$/, '')}%`
}

const compactLines = (lines: Array<string | null | undefined>) =>
  lines.filter((line): line is string => Boolean(line && !line.includes('undefined') && !line.includes('null')))

export const buildRiskAlertMessage = ({
  incident,
  order,
  riskLevel
}: {
  incident: PlainIncidentForAlert
  order: PlainOrderForAlert
  riskLevel: string
}) => {
  const isCritical = riskLevel === RISK_LEVEL.CRITICAL
  const progress = formatProgressPercent(order.progressPercent)
  const resource = incident.resource ? `${incident.resource.name} (${incident.resource.code})` : null
  const stage = incident.orderStage?.name ?? null

  const lines = compactLines([
    isCritical ? 'CẢNH BÁO RỦI RO NGHIÊM TRỌNG' : 'CẢNH BÁO RỦI RO SẢN XUẤT',
    '',
    `Đơn hàng: ${order.code}`,
    order.customerName ? `Khách hàng: ${order.customerName}` : null,
    order.productName ? `Sản phẩm: ${order.productName}` : null,
    '',
    `Mức rủi ro: ${severityLabel[riskLevel] ?? riskLevel}`,
    progress ? `Tiến đọ: ${progress}` : null,
    '',
    `Sự cố: ${incident.code}`,
    `Mức độ sự cố: ${severityLabel[incident.severity] ?? incident.severity}`,
    resource ? `Tài nguyên: ${resource}` : null,
    stage ? `Công đoạn bị ảnh hưởng: ${stage}` : null,
    '',
    isCritical ? 'Đơn hàng cần được ưu tiên kiểm tra và xử lý.' : 'Vui lòng kiểm tra trên hệ thống CeramiOps.'
  ])

  return lines.join('\n')
}

const isKilnRelatedStage = (stage?: { code?: string; name?: string; requiredResourceType?: string | null } | null) => {
  if (!stage) return false
  const text = `${stage.code ?? ''} ${stage.name ?? ''} ${stage.requiredResourceType ?? ''}`.toUpperCase()
  return text.includes('KILN') || text.includes('FIRING') || text.includes('NUNG')
}

export const buildStageCompletedMessage = ({
  completedAt,
  completedStage,
  nextStage,
  order,
  progressPercent,
  totalStages,
  completedStageCount
}: {
  order: PlainOrderForStageCompleted
  completedStage: { id: string | number; code: string; name: string; stepOrder: number }
  nextStage?: { id: string | number; code: string; name: string; requiredResourceType?: string | null } | null
  completedStageCount: number
  totalStages: number
  progressPercent: number
  completedAt: Date
}) => {
  const estimate = order.aiAnalysis?.manufacturingEstimate
  const showFiringEstimate = isKilnRelatedStage(completedStage) || isKilnRelatedStage(nextStage)
  const progress = `${completedStageCount}/${totalStages} công đoạn - ${formatProgressPercent(progressPercent) ?? `${progressPercent}%`}`
  const lines = compactLines([
    'HOÀN THÀNH CÔNG ĐOẠN',
    '',
    `Mẻ gốm: #${order.code}`,
    order.productName ? `Sản phẩm: ${order.productName}` : null,
    '',
    `Công đoạn vừa hoàn thành: ${completedStage.name}`,
    `Tiến độ: ${progress}`,
    `Hoàn thành lúc: ${completedAt.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`,
    nextStage ? '' : null,
    nextStage ? `Công đoạn tiếp theo: ${nextStage.name}` : null,
    showFiringEstimate && estimate?.estimatedFiringTemperatureC
      ? `Nhiệt độ nung dự kiến: ${estimate.estimatedFiringTemperatureC}°C`
      : null,
    showFiringEstimate && estimate?.estimatedFiringDurationMinutes
      ? `Thời gian nung dự kiến: ${estimate.estimatedFiringDurationMinutes} phút`
      : null,
    !nextStage ? '' : null,
    !nextStage ? 'Mẻ gốm đã hoàn thành toàn bộ quy trình sản xuất.' : null
  ])

  return lines.join('\n')
}

const loadOrderForRiskAlert = async (orderId: string | number, transaction: Transaction) => {
  return Order.findByPk(orderId, {
    attributes: ['id', 'code', 'customerName', 'productName', 'progressPercent'],
    transaction
  })
}

const loadIncidentsForRiskAlert = async (
  orderId: string | number,
  transaction: Transaction,
  incidentId?: string | number | null
) => {
  const rows = await IncidentAffectedOrder.findAll({
    where: {
      orderId,
      ...(incidentId ? { incidentId } : {})
    },
    attributes: ['incidentId'],
    include: [
      {
        model: Incident,
        as: 'incident',
        where: {
          status: INCIDENT_STATUS.OPEN,
          severity: {
            [Op.in]: riskAlertLevels
          }
        },
        attributes: ['id', 'code', 'severity'],
        include: [
          {
            model: Resource,
            as: 'resource',
            attributes: ['code', 'name']
          },
          {
            model: OrderStage,
            as: 'orderStage',
            attributes: ['code', 'name']
          }
        ]
      }
    ],
    transaction
  })

  return rows
    .map((row) => getPlain<PlainAffectedIncidentRow>(row).incident)
    .filter((incident): incident is PlainIncidentForAlert => Boolean(incident))
}

const createRiskAlertNotificationLogs = async ({
  incidentId,
  orderId,
  payload,
  riskLevel,
  transaction
}: {
  orderId: string | number
  incidentId?: string | number | null
  payload: Record<string, unknown>
  riskLevel: string
  transaction: Transaction
}) => {
  const [order, incidents] = await Promise.all([
    loadOrderForRiskAlert(orderId, transaction),
    loadIncidentsForRiskAlert(orderId, transaction, incidentId)
  ])

  if (!order || incidents.length === 0) return []

  const plainOrder = getPlain<PlainOrderForAlert>(order)
  const notificationLogIds: Array<string | number> = []

  for (const incident of incidents) {
    const existingNotification = await NotificationLog.findOne({
      where: {
        orderId: plainOrder.id,
        incidentId: incident.id,
        notificationType: NOTIFICATION_TYPE.RISK_ALERT
      },
      attributes: ['id'],
      transaction
    })

    if (existingNotification) continue

    const message = buildRiskAlertMessage({
      incident,
      order: plainOrder,
      riskLevel
    })

    const notification = await NotificationLog.create(
      {
        orderId: plainOrder.id,
        incidentId: incident.id,
        channel: NOTIFICATION_CHANNEL.TELEGRAM,
        notificationType: NOTIFICATION_TYPE.RISK_ALERT,
        status: NOTIFICATION_STATUS.PENDING,
        recipient: process.env.TELEGRAM_CHAT_ID ?? null,
        message,
        payload,
        errorMessage: null,
        sentAt: null
      },
      { transaction }
    )

    notificationLogIds.push(notification.get('id') as string | number)
  }

  return notificationLogIds
}

export const createRiskAlertNotificationsForTransition = async (input: RiskAlertTransitionInput) => {
  if (!shouldCreateRiskAlertForTransition(input)) return []

  return createRiskAlertNotificationLogs({
    orderId: input.orderId,
    incidentId: input.incidentId,
    riskLevel: input.newRiskLevel,
    transaction: input.transaction,
    payload: {
      trigger: 'RISK_TRANSITION',
      previousStatus: input.previousStatus,
      newStatus: input.newStatus,
      previousRiskLevel: input.previousRiskLevel,
      newRiskLevel: input.newRiskLevel
    }
  })
}

export const createMissingRiskAlertNotificationsForActiveOrder = async (input: ActiveRiskAlertInput) => {
  if (input.status !== ORDER_STATUS.AT_RISK || !isRiskAlertLevel(input.riskLevel)) return []

  return createRiskAlertNotificationLogs({
    orderId: input.orderId,
    incidentId: input.incidentId,
    riskLevel: input.riskLevel,
    transaction: input.transaction,
    payload: {
      trigger: 'ACTIVE_RISK_RECONCILIATION',
      status: input.status,
      riskLevel: input.riskLevel
    }
  })
}

export const createStageCompletedNotificationLog = async ({
  completedAt,
  completedStage,
  completedStageCount,
  nextStage,
  order,
  progressPercent,
  totalStages,
  transaction
}: {
  order: PlainOrderForStageCompleted
  completedStage: { id: string | number; code: string; name: string; stepOrder: number }
  nextStage?: { id: string | number; code: string; name: string; requiredResourceType?: string | null } | null
  completedStageCount: number
  totalStages: number
  progressPercent: number
  completedAt: Date
  transaction: Transaction
}) => {
  const existingNotifications = await NotificationLog.findAll({
    where: {
      orderId: order.id,
      notificationType: NOTIFICATION_TYPE.STAGE_COMPLETED
    },
    attributes: ['id', 'payload'],
    transaction
  })

  const existingNotification = existingNotifications.find((notification) => {
    const payload = notification.get('payload') as { orderStageId?: string | number } | null
    return String(payload?.orderStageId ?? '') === String(completedStage.id)
  })

  if (existingNotification) return []

  const payload = {
    trigger: 'ORDER_STAGE_COMPLETED',
    orderId: order.id,
    orderCode: order.code,
    orderStageId: completedStage.id,
    stageCode: completedStage.code,
    stageName: completedStage.name,
    stepOrder: completedStage.stepOrder,
    nextStageId: nextStage?.id ?? null,
    nextStageCode: nextStage?.code ?? null,
    nextStageName: nextStage?.name ?? null,
    completedStageCount,
    totalStages,
    progressPercent,
    completedAt: completedAt.toISOString()
  }

  const notification = await NotificationLog.create(
    {
      orderId: order.id,
      incidentId: null,
      channel: NOTIFICATION_CHANNEL.TELEGRAM,
      notificationType: NOTIFICATION_TYPE.STAGE_COMPLETED,
      status: NOTIFICATION_STATUS.PENDING,
      recipient: process.env.TELEGRAM_CHAT_ID ?? null,
      message: buildStageCompletedMessage({
        completedAt,
        completedStage,
        completedStageCount,
        nextStage,
        order,
        progressPercent,
        totalStages
      }),
      payload,
      errorMessage: null,
      sentAt: null
    },
    { transaction }
  )

  return [notification.get('id') as string | number]
}

const toErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message
  return String(error)
}

export const deliverPendingNotifications = async (notificationLogIds: Array<string | number>) => {
  const uniqueIds = [...new Set(notificationLogIds.map((id) => String(id)))]
  if (uniqueIds.length === 0) return

  for (const id of uniqueIds) {
    let notification: Model | null = null
    let orderCode = `notification ${id}`

    try {
      notification = await NotificationLog.findByPk(id, {
        attributes: ['id', 'status', 'message', 'channel', 'notificationType', 'sentAt'],
        include: [
          {
            model: Order,
            as: 'order',
            attributes: ['id', 'code']
          }
        ]
      })

      if (!notification) continue

      const plainNotification = getPlain<PlainNotificationLog>(notification)
      orderCode = plainNotification.order?.code ?? `notification ${plainNotification.id}`

      if (plainNotification.status !== NOTIFICATION_STATUS.PENDING) continue

      await telegramService.sendMessage(plainNotification.message)
      const sentAt = new Date()
      await notification.update({
        status: NOTIFICATION_STATUS.SENT,
        sentAt,
        errorMessage: null
      })
      emitNotificationSent({
        notificationId: plainNotification.id,
        orderId: plainNotification.order?.id ?? null,
        channel: plainNotification.channel,
        type: plainNotification.notificationType,
        status: NOTIFICATION_STATUS.SENT,
        sentAt: sentAt.toISOString()
      })
      console.log(`Telegram ${plainNotification.notificationType} sent for ${orderCode}`)
    } catch (error) {
      if (notification) {
        try {
          await notification.update({
            status: NOTIFICATION_STATUS.FAILED,
            sentAt: null,
            errorMessage: toErrorMessage(error)
          })
        } catch (updateError) {
          console.error(
            `Telegram notification failure status update failed for ${orderCode}: ${toErrorMessage(updateError)}`
          )
        }
      }

      console.error(`Telegram notification failed for ${orderCode}: ${toErrorMessage(error)}`)
    }
  }
}

export default {
  buildRiskAlertMessage,
  buildStageCompletedMessage,
  createMissingRiskAlertNotificationsForActiveOrder,
  createRiskAlertNotificationsForTransition,
  createStageCompletedNotificationLog,
  deliverPendingNotifications
}
