import type { Model, Transaction, WhereOptions } from 'sequelize'
import { col, fn, Op } from 'sequelize'
import sequelize from '../config/db.js'
import { ACTIVITY_EVENT_TYPE } from '../constants/activityConstants.js'
import { INCIDENT_SEVERITY, INCIDENT_STATUS, INCIDENT_TYPE } from '../constants/incidentConstants.js'
import { RISK_LEVEL } from '../constants/orderConstants.js'
import { ORDER_STAGE_STATUS } from '../constants/orderStageConstants.js'
import { RESOURCE_STATUS } from '../constants/resourceConstants.js'
import { SOCKET_EVENTS } from '../constants/socketEvents.js'
import BadRequestError from '../errors/BadRequestError.js'
import NotFoundError from '../errors/NotFoundError.js'
import { ActivityLog, Incident, IncidentAffectedOrder, Order, OrderStage, Resource, User } from '../models/index.js'
import type { AuthenticatedUser } from '../types/auth.js'
import {
  createIncidentAlertNotificationLog,
  createIncidentResolvedNotificationLog,
  createStageReadyToResumeNotificationLog,
  deliverPendingNotifications
} from './notificationService.js'
import { recalculateRisksForOrders } from './riskEngineService.js'
import { emitRealtimeEvents, type RealtimeEvent } from './socketService.js'

export type CreateIncidentInput = {
  orderStageId?: number | null
  resourceId?: number | null
  rawDescription: string
  type: (typeof INCIDENT_TYPE)[keyof typeof INCIDENT_TYPE]
  severity: (typeof INCIDENT_SEVERITY)[keyof typeof INCIDENT_SEVERITY]
  estimatedDelayMinutes?: number | null
}

export type GetIncidentsQuery = {
  status?: (typeof INCIDENT_STATUS)[keyof typeof INCIDENT_STATUS]
  severity?: (typeof INCIDENT_SEVERITY)[keyof typeof INCIDENT_SEVERITY]
  type?: (typeof INCIDENT_TYPE)[keyof typeof INCIDENT_TYPE]
  resourceId?: number
  search?: string
  page?: number
  limit?: number
}

export type ResolveIncidentInput = {
  resolutionNote: string
}

type PlainOrderStage = {
  id: string | number
  orderId: string | number
  code: string
  name: string
  status: string
  assignedResourceId: string | number | null
}

type PlainResource = {
  id: string | number
  code: string
  name: string
  status: string
}

type PlainAffectedOrder = {
  orderId: string | number
  assignedResourceId: string | number | null
  order?: {
    id: string | number
    code: string
    riskLevel: string
  } | null
}

type PlainAffectedStage = {
  id: string | number
  orderId: string | number
  code: string
  name: string
  status: string
}

type PlainIncidentDetail = Record<string, unknown> & {
  resourceId?: string | number | null
  affectedOrders?: Array<
    Record<string, unknown> & {
      id: string | number
      affectedStages?: PlainAffectedStage[]
    }
  >
}

type IncidentWhere = Record<string, unknown> & { [Op.or]?: unknown }

const RESOURCE_STATUS_CHANGED = 'RESOURCE_STATUS_CHANGED'

const getPlain = <T>(model: Model): T => model.get({ plain: true }) as T

const generateIncidentCode = (incidentId: string | number) => `INC-${String(incidentId).padStart(6, '0')}`

const buildStageUpdatedPayload = (stage: {
  id: string | number
  orderId: string | number
  code?: string
  name: string
  status: string
  assignedResourceId?: string | number | null
}) => ({
  orderStageId: stage.id,
  orderId: stage.orderId,
  stageCode: stage.code,
  stageName: stage.name,
  status: stage.status,
  assignedResourceId: stage.assignedResourceId ?? null
})

const createIncidentInclude = [
  {
    model: Resource,
    as: 'resource',
    attributes: ['id', 'code', 'name', 'type', 'status']
  },
  {
    model: OrderStage,
    as: 'orderStage',
    attributes: ['id', 'code', 'name', 'status', 'orderId']
  },
  {
    model: User,
    as: 'reportedBy',
    attributes: ['id', 'fullName', 'email', 'role']
  },
  {
    model: User,
    as: 'resolvedBy',
    attributes: ['id', 'fullName', 'email', 'role']
  }
]

const incidentDetailInclude = [
  {
    model: Resource,
    as: 'resource',
    attributes: ['id', 'code', 'name', 'type', 'status', 'description']
  },
  {
    model: OrderStage,
    as: 'orderStage',
    attributes: ['id', 'code', 'name', 'status', 'orderId'],
    include: [
      {
        model: Order,
        as: 'order',
        attributes: ['id', 'code', 'customerName', 'productName', 'status', 'progressPercent']
      }
    ]
  },
  {
    model: User,
    as: 'reportedBy',
    attributes: ['id', 'fullName', 'email', 'role']
  },
  {
    model: User,
    as: 'resolvedBy',
    attributes: ['id', 'fullName', 'email', 'role']
  },
  {
    model: Order,
    as: 'affectedOrders',
    attributes: ['id', 'code', 'customerName', 'productName', 'status', 'riskLevel', 'progressPercent', 'deadline'],
    through: {
      attributes: ['previousRiskLevel', 'calculatedRiskLevel', 'estimatedImpactMinutes', 'impactReason']
    }
  }
]

const buildIncidentWhere = (query: GetIncidentsQuery): WhereOptions => {
  const where: IncidentWhere = {}

  if (query.status) where.status = query.status
  if (query.severity) where.severity = query.severity
  if (query.type) where.type = query.type
  if (query.resourceId) where.resourceId = query.resourceId

  const search = query.search?.trim()
  if (search) {
    where[Op.or] = [{ code: { [Op.like]: `%${search}%` } }, { rawDescription: { [Op.like]: `%${search}%` } }]
  }

  return where as WhereOptions
}

const loadOrderStage = async (orderStageId: number | null | undefined, transaction: Transaction) => {
  if (!orderStageId) return null

  const stage = await OrderStage.findByPk(orderStageId, {
    attributes: ['id', 'orderId', 'code', 'name', 'status', 'assignedResourceId'],
    transaction,
    lock: transaction.LOCK.UPDATE
  })

  if (!stage) {
    throw new NotFoundError('Không tìm thấy công đoạn sản xuất.')
  }

  return stage
}

const loadResource = async (resourceId: number | null | undefined, transaction: Transaction) => {
  if (!resourceId) return null

  const resource = await Resource.findByPk(resourceId, {
    attributes: ['id', 'code', 'name', 'status'],
    transaction,
    lock: transaction.LOCK.UPDATE
  })

  if (!resource) {
    throw new NotFoundError('Không tìm thấy tài nguyên sản xuất.')
  }

  return resource
}

const assertResourceBelongsToStage = (stage: Model | null, resource: Model | null) => {
  if (!stage || !resource) return

  const plainStage = getPlain<PlainOrderStage>(stage)
  const plainResource = getPlain<PlainResource>(resource)

  if (!plainStage.assignedResourceId || String(plainStage.assignedResourceId) !== String(plainResource.id)) {
    throw new BadRequestError('Tài nguyên không được gán cho công đoạn này.')
  }
}

const createAffectedOrdersForIncident = async (
  incidentId: string | number,
  incidentCode: string,
  resourceId: string | number | null | undefined,
  estimatedDelayMinutes: number | null | undefined,
  transaction: Transaction
) => {
  if (!resourceId) return []

  const affectedStages = await OrderStage.findAll({
    where: {
      assignedResourceId: resourceId,
      status: {
        [Op.in]: [ORDER_STAGE_STATUS.WAITING, ORDER_STAGE_STATUS.IN_PROGRESS, ORDER_STAGE_STATUS.BLOCKED]
      }
    },
    attributes: ['orderId', 'assignedResourceId'],
    include: [
      {
        model: Order,
        as: 'order',
        attributes: ['id', 'code', 'riskLevel']
      }
    ],
    transaction,
    lock: transaction.LOCK.UPDATE
  })

  const affectedOrdersById = new Map<string, PlainAffectedOrder>()
  affectedStages.forEach((stage) => {
    const plainStage = getPlain<PlainAffectedOrder>(stage)
    affectedOrdersById.set(String(plainStage.orderId), plainStage)
  })

  if (affectedOrdersById.size === 0) return []

  await IncidentAffectedOrder.bulkCreate(
    [...affectedOrdersById.values()].map((affectedStage) => {
      const previousRiskLevel = affectedStage.order?.riskLevel ?? RISK_LEVEL.NONE

      return {
        incidentId,
        orderId: affectedStage.orderId,
        previousRiskLevel,
        calculatedRiskLevel: previousRiskLevel,
        estimatedImpactMinutes: estimatedDelayMinutes ?? null,
        impactReason: `Order affected by incident ${incidentCode} on assigned resource`
      }
    }),
    { transaction }
  )

  return [...affectedOrdersById.keys()]
}

export const getIncidentsService = async (query: GetIncidentsQuery) => {
  const page = query.page ?? 1
  const limit = Math.min(query.limit ?? 10, 100)
  const offset = (page - 1) * limit

  const { count, rows } = await Incident.findAndCountAll({
    where: buildIncidentWhere(query),
    attributes: [
      'id',
      'code',
      'resourceId',
      'orderStageId',
      'rawDescription',
      'type',
      'severity',
      'estimatedDelayMinutes',
      'status',
      'resolutionNote',
      'resolvedAt',
      'createdAt'
    ],
    include: createIncidentInclude,
    order: [['createdAt', 'DESC']],
    limit,
    offset,
    distinct: true
  })

  const incidentIds = rows.map((row) => row.get('id') as string | number)
  const affectedOrderCounts =
    incidentIds.length > 0
      ? await IncidentAffectedOrder.findAll({
          where: {
            incidentId: {
              [Op.in]: incidentIds
            }
          },
          attributes: ['incidentId', [fn('COUNT', col('order_id')), 'affectedOrderCount']],
          group: ['incidentId']
        })
      : []

  const affectedOrderCountByIncidentId = new Map<string, number>()
  affectedOrderCounts.forEach((row) => {
    affectedOrderCountByIncidentId.set(String(row.get('incidentId')), Number(row.get('affectedOrderCount') ?? 0))
  })

  return {
    items: rows.map((row) => ({
      ...getPlain<Record<string, unknown>>(row),
      affectedOrderCount: affectedOrderCountByIncidentId.get(String(row.get('id'))) ?? 0
    })),
    pagination: {
      page,
      limit,
      totalItems: count,
      totalPages: Math.ceil(count / limit)
    }
  }
}

export const getIncidentByIdService = async (id: string | number, transaction?: Transaction) => {
  const incident = await Incident.findByPk(id, {
    include: incidentDetailInclude,
    transaction
  })

  if (!incident) {
    throw new NotFoundError('Không tìm thấy sự cố sản xuất.')
  }

  const plainIncident = getPlain<PlainIncidentDetail>(incident)
  const affectedOrders = plainIncident.affectedOrders ?? []
  const resourceId = plainIncident.resourceId
  const affectedOrderIds = affectedOrders.map((order) => order.id)

  if (resourceId && affectedOrderIds.length > 0) {
    const affectedStages = await OrderStage.findAll({
      where: {
        orderId: {
          [Op.in]: affectedOrderIds
        },
        assignedResourceId: resourceId,
        status: {
          [Op.in]: [ORDER_STAGE_STATUS.WAITING, ORDER_STAGE_STATUS.IN_PROGRESS, ORDER_STAGE_STATUS.BLOCKED]
        }
      },
      attributes: ['id', 'orderId', 'code', 'name', 'status'],
      order: [
        ['orderId', 'ASC'],
        ['stepOrder', 'ASC']
      ],
      transaction
    })

    const affectedStagesByOrderId = new Map<string, PlainAffectedStage[]>()
    affectedStages.forEach((stage) => {
      const plainStage = getPlain<PlainAffectedStage>(stage)
      const key = String(plainStage.orderId)
      affectedStagesByOrderId.set(key, [...(affectedStagesByOrderId.get(key) ?? []), plainStage])
    })

    plainIncident.affectedOrders = affectedOrders.map((order) => ({
      ...order,
      progressPercent: Number(order.progressPercent ?? 0),
      affectedStages: affectedStagesByOrderId.get(String(order.id)) ?? []
    }))
  } else {
    plainIncident.affectedOrders = affectedOrders.map((order) => ({
      ...order,
      progressPercent: Number(order.progressPercent ?? 0),
      affectedStages: []
    }))
  }

  plainIncident.affectedOrderCount = plainIncident.affectedOrders.length

  return plainIncident
}

export const createIncidentService = async (input: CreateIncidentInput, currentUser: AuthenticatedUser) => {
  const result = await sequelize.transaction(async (transaction) => {
    const stage = await loadOrderStage(input.orderStageId, transaction)
    const resource = await loadResource(input.resourceId, transaction)
    assertResourceBelongsToStage(stage, resource)

    const plainStage = stage ? getPlain<PlainOrderStage>(stage) : null
    const plainResource = resource ? getPlain<PlainResource>(resource) : null
    const description = input.rawDescription.trim()

    const incident = await Incident.create(
      {
        code: 'INC-000000',
        resourceId: input.resourceId ?? null,
        orderStageId: input.orderStageId ?? null,
        reportedByUserId: currentUser.id,
        rawDescription: description,
        type: input.type,
        severity: input.severity,
        estimatedDelayMinutes: input.estimatedDelayMinutes ?? null,
        status: INCIDENT_STATUS.OPEN,
        aiAnalysis: null,
        resolutionNote: null,
        resolvedAt: null,
        resolvedByUserId: null
      },
      { transaction }
    )

    const code = generateIncidentCode(incident.get('id') as string | number)
    await incident.update({ code }, { transaction })

    const affectedOrderIds = await createAffectedOrdersForIncident(
      incident.get('id') as string | number,
      code,
      plainResource?.id,
      input.estimatedDelayMinutes,
      transaction
    )

    const logs: Array<Record<string, unknown>> = [
      {
        actorUserId: currentUser.id,
        orderId: plainStage?.orderId ?? null,
        orderStageId: plainStage?.id ?? null,
        incidentId: incident.get('id'),
        eventType: ACTIVITY_EVENT_TYPE.INCIDENT_CREATED,
        message: `Incident ${code} created`,
        metadata: {
          source: currentUser.source ?? 'WEB',
          type: input.type,
          severity: input.severity,
          resourceId: plainResource?.id ?? null
        }
      }
    ]
    const realtimeEvents: RealtimeEvent[] = []

    if (input.type === INCIDENT_TYPE.EQUIPMENT_FAILURE && resource) {
      if (plainResource?.status !== RESOURCE_STATUS.BROKEN) {
        await resource.update({ status: RESOURCE_STATUS.BROKEN }, { transaction })
        logs.push({
          actorUserId: currentUser.id,
          orderId: plainStage?.orderId ?? null,
          orderStageId: plainStage?.id ?? null,
          incidentId: incident.get('id'),
          eventType: RESOURCE_STATUS_CHANGED,
          message: `Resource ${plainResource?.code} marked as BROKEN`,
          metadata: {
            source: currentUser.source ?? 'WEB',
            resourceId: plainResource?.id ?? null,
            previousStatus: plainResource?.status,
            newStatus: RESOURCE_STATUS.BROKEN
          }
        })
      }

      if (stage && plainStage?.status === ORDER_STAGE_STATUS.IN_PROGRESS) {
        await stage.update({ status: ORDER_STAGE_STATUS.BLOCKED }, { transaction })
        realtimeEvents.push({
          event: SOCKET_EVENTS.STAGE_UPDATED,
          payload: buildStageUpdatedPayload({
            id: plainStage.id,
            orderId: plainStage.orderId,
            code: plainStage.code,
            name: plainStage.name,
            status: ORDER_STAGE_STATUS.BLOCKED,
            assignedResourceId: plainStage.assignedResourceId
          })
        })
        logs.push({
          actorUserId: currentUser.id,
          orderId: plainStage.orderId,
          orderStageId: plainStage.id,
          incidentId: incident.get('id'),
          eventType: ACTIVITY_EVENT_TYPE.STAGE_BLOCKED,
          message: `Stage ${plainStage.code} blocked by incident ${code}`,
          metadata: {
            source: currentUser.source ?? 'WEB',
            previousStatus: ORDER_STAGE_STATUS.IN_PROGRESS,
            newStatus: ORDER_STAGE_STATUS.BLOCKED
          }
        })
      }
    }

    const riskRecalculation = await recalculateRisksForOrders({
      actorUserId: currentUser.id,
      incidentCode: code,
      incidentId: incident.get('id') as string | number,
      orderIds: affectedOrderIds,
      transaction
    })

    await ActivityLog.bulkCreate(logs, { transaction })

    const incidentNotificationLogIds = await createIncidentAlertNotificationLog({
      incident: {
        id: incident.get('id') as string | number,
        code,
        type: input.type,
        severity: input.severity,
        rawDescription: description,
        estimatedDelayMinutes: input.estimatedDelayMinutes ?? null
      },
      orderId: plainStage?.orderId ?? affectedOrderIds[0] ?? null,
      resource: plainResource
        ? {
            id: plainResource.id,
            code: plainResource.code,
            name: plainResource.name
          }
        : null,
      stage: plainStage
        ? {
            id: plainStage.id,
            code: plainStage.code,
            name: plainStage.name,
            status:
              input.type === INCIDENT_TYPE.EQUIPMENT_FAILURE && plainStage.status === ORDER_STAGE_STATUS.IN_PROGRESS
                ? ORDER_STAGE_STATUS.BLOCKED
                : plainStage.status
          }
        : null,
      transaction
    })

    return {
      incidentId: incident.get('id') as string | number,
      notificationLogIds: [...incidentNotificationLogIds, ...riskRecalculation.notificationLogIds],
      realtimeEvents: [
        {
          event: SOCKET_EVENTS.INCIDENT_CREATED,
          payload: {
            incidentId: incident.get('id') as string | number,
            incidentCode: code,
            severity: input.severity,
            status: INCIDENT_STATUS.OPEN,
            resourceId: plainResource?.id ?? null,
            orderStageId: plainStage?.id ?? null,
            affectedOrderIds
          }
        },
        ...realtimeEvents,
        ...riskRecalculation.realtimeEvents
      ] satisfies RealtimeEvent[]
    }
  })

  emitRealtimeEvents(result.realtimeEvents)
  await deliverPendingNotifications(result.notificationLogIds)

  return getIncidentByIdService(result.incidentId)
}

export const resolveIncidentService = async (
  id: string | number,
  input: ResolveIncidentInput,
  currentUser: AuthenticatedUser
) => {
  const result = await sequelize.transaction(async (transaction) => {
    const incident = await Incident.findByPk(id, {
      attributes: ['id', 'code', 'resourceId', 'orderStageId', 'type', 'severity', 'status'],
      transaction,
      lock: transaction.LOCK.UPDATE
    })

    if (!incident) {
      throw new NotFoundError('Không tìm thấy sự cố sản xuất.')
    }

    if (incident.get('status') !== INCIDENT_STATUS.OPEN) {
      throw new BadRequestError('Chỉ có thể xử lý sự cố đang mở.', {
        code: 'INCIDENT_NOT_OPEN',
        incidentStatus: incident.get('status')
      })
    }

    const stage = await loadOrderStage(incident.get('orderStageId') as number | null, transaction)
    const plainStage = stage ? getPlain<PlainOrderStage>(stage) : null
    const resource = await loadResource(incident.get('resourceId') as number | null, transaction)
    const plainResource = resource ? getPlain<PlainResource>(resource) : null

    await incident.update(
      {
        status: INCIDENT_STATUS.RESOLVED,
        resolutionNote: input.resolutionNote.trim(),
        resolvedAt: new Date(),
        resolvedByUserId: currentUser.id
      },
      { transaction }
    )

    if (
      incident.get('type') === INCIDENT_TYPE.EQUIPMENT_FAILURE &&
      resource?.get('status') === RESOURCE_STATUS.BROKEN
    ) {
      const remainingOpenIncidentCount = await Incident.count({
        where: {
          resourceId: resource.get('id') as string | number,
          status: INCIDENT_STATUS.OPEN
        },
        transaction
      })

      if (remainingOpenIncidentCount === 0) {
        await resource.update({ status: RESOURCE_STATUS.AVAILABLE }, { transaction })
      }
    }

    const affectedRows = await IncidentAffectedOrder.findAll({
      where: { incidentId: incident.get('id') },
      attributes: ['orderId'],
      transaction,
      lock: transaction.LOCK.UPDATE
    })

    const affectedOrderIds = affectedRows.map((row) => row.get('orderId') as string | number)

    const riskRecalculation = await recalculateRisksForOrders({
      actorUserId: currentUser.id,
      incidentCode: incident.get('code') as string,
      incidentId: incident.get('id') as string | number,
      orderIds: affectedOrderIds,
      transaction
    })

    await ActivityLog.create(
      {
        actorUserId: currentUser.id,
        orderId: plainStage?.orderId ?? null,
        orderStageId: plainStage?.id ?? null,
        incidentId: incident.get('id'),
        eventType: ACTIVITY_EVENT_TYPE.INCIDENT_RESOLVED,
        message: `Incident ${incident.get('code')} resolved`,
        metadata: {
          source: currentUser.source ?? 'WEB',
          resourceId: plainResource?.id ?? null,
          resolutionNote: input.resolutionNote.trim()
        }
      },
      { transaction }
    )

    const incidentResolvedNotificationLogIds =
      currentUser.source === 'TELEGRAM'
        ? []
        : await createIncidentResolvedNotificationLog({
            incident: {
              id: incident.get('id') as string | number,
              code: incident.get('code') as string,
              type: incident.get('type') as string,
              severity: incident.get('severity') as string,
              resolutionNote: input.resolutionNote.trim()
            },
            orderId: plainStage?.orderId ?? affectedOrderIds[0] ?? null,
            resource: plainResource
              ? {
                  id: plainResource.id,
                  code: plainResource.code,
                  name: plainResource.name
                }
              : null,
            stage: plainStage
              ? {
                  id: plainStage.id,
                  code: plainStage.code,
                  name: plainStage.name,
                  status: plainStage.status
                }
              : null,
            transaction
          })
    const stageReadyNotificationLogIds =
      plainStage?.status === ORDER_STAGE_STATUS.BLOCKED
        ? await createStageReadyToResumeNotificationLog({
            orderId: plainStage.orderId ?? affectedOrderIds[0] ?? null,
            resource: plainResource
              ? {
                  id: plainResource.id,
                  code: plainResource.code,
                  name: plainResource.name
                }
              : null,
            stage: {
              id: plainStage.id,
              code: plainStage.code,
              name: plainStage.name,
              status: plainStage.status
            },
            transaction
          })
        : []

    return {
      incidentId: incident.get('id') as string | number,
      notificationLogIds: [
        ...incidentResolvedNotificationLogIds,
        ...stageReadyNotificationLogIds,
        ...riskRecalculation.notificationLogIds
      ],
      realtimeEvents: [
        {
          event: SOCKET_EVENTS.INCIDENT_RESOLVED,
          payload: {
            incidentId: incident.get('id') as string | number,
            incidentCode: incident.get('code') as string,
            status: INCIDENT_STATUS.RESOLVED,
            resourceId: plainResource?.id ?? null,
            orderStageId: plainStage?.id ?? null,
            affectedOrderIds
          }
        },
        ...riskRecalculation.realtimeEvents
      ] satisfies RealtimeEvent[]
    }
  })

  emitRealtimeEvents(result.realtimeEvents)
  await deliverPendingNotifications(result.notificationLogIds)

  return getIncidentByIdService(result.incidentId)
}

export default {
  createIncidentService,
  getIncidentByIdService,
  getIncidentsService,
  resolveIncidentService
}
