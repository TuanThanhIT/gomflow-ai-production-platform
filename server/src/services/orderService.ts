import type { Model, Transaction, WhereOptions } from 'sequelize'
import { Op } from 'sequelize'
import sequelize from '../config/db.js'
import {
  ACTIVITY_EVENT_TYPE,
  INCIDENT_STATUS,
  ORDER_PRIORITY,
  ORDER_STAGE_STATUS,
  ORDER_STATUS,
  RESOURCE_STATUS,
  RISK_LEVEL
} from '../constants/databaseConstants.js'
import { SOCKET_EVENTS } from '../constants/socketEvents.js'
import BadRequestError from '../errors/BadRequestError.js'
import NotFoundError from '../errors/NotFoundError.js'
import {
  ActivityLog,
  Incident,
  IncidentAffectedOrder,
  Order,
  OrderStage,
  ProcessTemplate,
  ProcessTemplateStep,
  Resource,
  User
} from '../models/index.js'
import type { AuthenticatedUser } from '../types/auth.js'
import { createRiskAlertNotificationsForTransition, deliverPendingNotifications } from './notificationService.js'
import { emitRealtimeEvents, type RealtimeEvent } from './socketService.js'

export type CreateOrderInput = {
  processTemplateId: number
  customerName: string
  productName: string
  quantity: number
  specifications?: Record<string, unknown> | null
  rawOrderText?: string | null
  aiAnalysis?: Record<string, unknown> | null
  deadline: string
  priority: (typeof ORDER_PRIORITY)[keyof typeof ORDER_PRIORITY]
}

export type GetOrdersQuery = {
  status?: (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS]
  riskLevel?: (typeof RISK_LEVEL)[keyof typeof RISK_LEVEL]
  priority?: (typeof ORDER_PRIORITY)[keyof typeof ORDER_PRIORITY]
  search?: string
  page?: number
  limit?: number
}

type PlainProcessTemplateStep = {
  id: string | number
  code: string
  name: string
  stepOrder: number
  estimatedDurationMinutes: number | null
}

type PlainProcessTemplate = {
  id: string | number
  code: string
  name: string
  steps?: PlainProcessTemplateStep[]
}

type PlainOrderStageSummary = {
  id: string | number
  code: string
  name: string
  stepOrder: number
  status: string
  estimatedDurationMinutes: number | null
}

type PlainCreatedOrder = {
  id: string | number
  status: string
  progressPercent: string | number
  stages?: PlainOrderStageSummary[]
} & Record<string, unknown>

type PlainOrderListItem = {
  progressPercent: string | number
} & Record<string, unknown>

type PlainOrderDetail = {
  id: string | number
  status: string
  progressPercent: string | number
  stages?: Array<{
    id: string | number
    name: string
    code: string
    stepOrder: number
    status: string
    assignedResource?: {
      id: string | number
      code: string
      name: string
      status: string
    } | null
    templateStep?: {
      requiredResourceType: string | null
    } | null
    [key: string]: unknown
  }>
} & Record<string, unknown>

type PlainIncidentAffectedOrder = {
  incident?: {
    id: string | number
    code: string
    type: string
    severity: string
    status: string
    rawDescription?: string
    resourceId: string | number | null
    resource?: {
      id: string | number
      code: string
      name: string
      status: string
    } | null
  } | null
}

const orderCreateResponseInclude = [
  {
    model: ProcessTemplate,
    as: 'processTemplate',
    attributes: ['id', 'code', 'name']
  },
  {
    model: OrderStage,
    as: 'stages',
    attributes: ['id', 'code', 'name', 'stepOrder', 'status', 'estimatedDurationMinutes']
  }
]

const orderListInclude = [
  {
    model: ProcessTemplate,
    as: 'processTemplate',
    attributes: ['id', 'code', 'name']
  }
]

const orderDetailInclude = [
  {
    model: ProcessTemplate,
    as: 'processTemplate',
    attributes: ['id', 'code', 'name', 'description']
  },
  {
    model: User,
    as: 'createdBy',
    attributes: ['id', 'fullName', 'email', 'role']
  },
  {
    model: OrderStage,
    as: 'stages',
    attributes: [
      'id',
      'code',
      'name',
      'stepOrder',
      'status',
      'estimatedDurationMinutes',
      'expectedStartAt',
      'expectedEndAt',
      'startedAt',
      'completedAt',
      'notes'
    ],
    include: [
      {
        model: ProcessTemplateStep,
        as: 'templateStep',
        attributes: ['id', 'requiredResourceType']
      },
      {
        model: Resource,
        as: 'assignedResource',
        attributes: ['id', 'code', 'name', 'type', 'status']
      },
      {
        model: User,
        as: 'startedBy',
        attributes: ['id', 'fullName', 'role']
      },
      {
        model: User,
        as: 'completedBy',
        attributes: ['id', 'fullName', 'role']
      },
      {
        model: Incident,
        as: 'incidents',
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
          'resolvedAt',
          'createdAt'
        ],
        include: [
          {
            model: Resource,
            as: 'resource',
            attributes: ['id', 'code', 'name', 'type', 'status']
          }
        ]
      }
    ]
  }
]

const generateOrderCode = (orderId: string | number) => `GOM-${String(orderId).padStart(6, '0')}`

const getPlain = <T>(model: Model): T => model.get({ plain: true }) as T

const normalizeProgressPercent = <T extends { progressPercent: string | number }>(order: T) => ({
  ...order,
  progressPercent: Number(order.progressPercent)
})

const normalizeOrderDetail = (order: PlainOrderDetail) => ({
  ...normalizeProgressPercent(order),
  stages: [...(order.stages ?? [])].sort((firstStage, secondStage) => firstStage.stepOrder - secondStage.stepOrder)
})

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

const toStageResourceRequiredReason = (
  currentStage: { code: string; name: string },
  nextStage: { code: string; name: string; templateStep?: { requiredResourceType: string | null } | null }
) => ({
  code: 'NEXT_STAGE_RESOURCE_REQUIRED',
  message: `Bạn vẫn có thể hoàn thành ${currentStage.name}. Sau đó pipeline sẽ tạm dừng trước công đoạn ${nextStage.name} vì công đoạn này chưa được gán tài nguyên loại ${nextStage.templateStep?.requiredResourceType}.`,
  stage: {
    code: currentStage.code,
    name: currentStage.name
  },
  nextStage: {
    code: nextStage.code,
    name: nextStage.name,
    requiredResourceType: nextStage.templateStep?.requiredResourceType ?? null
  }
})

const toStageIncidentReason = (
  code: 'STAGE_BLOCKED_BY_INCIDENT' | 'STAGE_AFFECTED_BY_INCIDENT' | 'NEXT_STAGE_RESOURCE_INCIDENT',
  message: string,
  stage: { id?: string | number; code: string; name: string },
  incident: NonNullable<PlainIncidentAffectedOrder['incident']>
) => ({
  code,
  message,
  stage: {
    id: stage.id,
    code: stage.code,
    name: stage.name
  },
  incident: {
    id: incident.id,
    code: incident.code,
    type: incident.type,
    severity: incident.severity,
    status: incident.status
  },
  resource: incident.resource
    ? {
        id: incident.resource.id,
        code: incident.resource.code,
        name: incident.resource.name,
        status: incident.resource.status
      }
    : null
})

const enrichOrderIncidentState = async (order: ReturnType<typeof normalizeOrderDetail>) => {
  const affectedRows = await IncidentAffectedOrder.findAll({
    where: { orderId: order.id },
    attributes: ['incidentId', 'orderId'],
    include: [
      {
        model: Incident,
        as: 'incident',
        where: { status: INCIDENT_STATUS.OPEN },
        attributes: ['id', 'code', 'type', 'severity', 'status', 'rawDescription', 'resourceId'],
        include: [
          {
            model: Resource,
            as: 'resource',
            attributes: ['id', 'code', 'name', 'status']
          }
        ]
      }
    ]
  })

  const activeIncidentsById = new Map<string, NonNullable<PlainIncidentAffectedOrder['incident']>>()
  const openIncidentByResourceId = new Map<string, NonNullable<PlainIncidentAffectedOrder['incident']>>()

  affectedRows.forEach((row) => {
    const incident = getPlain<PlainIncidentAffectedOrder>(row).incident
    if (!incident) return

    activeIncidentsById.set(String(incident.id), incident)
    if (incident.resourceId) {
      openIncidentByResourceId.set(String(incident.resourceId), incident)
    }
  })

  const stages = order.stages.map((stage, index, allStages) => {
    const assignedResourceId = stage.assignedResource?.id
    const activeResourceIncident = assignedResourceId ? openIncidentByResourceId.get(String(assignedResourceId)) : null
    const baseCanComplete =
      stage.status === ORDER_STAGE_STATUS.IN_PROGRESS &&
      ([ORDER_STATUS.IN_PROGRESS, ORDER_STATUS.AT_RISK] as string[]).includes(order.status)
    let canComplete = baseCanComplete
    let blockingReason = null

    if (activeResourceIncident) {
      const reasonCode =
        stage.status === ORDER_STAGE_STATUS.BLOCKED ? 'STAGE_BLOCKED_BY_INCIDENT' : 'STAGE_AFFECTED_BY_INCIDENT'
      blockingReason = toStageIncidentReason(
        reasonCode,
        `${stage.assignedResource?.name ?? 'Tài nguyên'} (${stage.assignedResource?.code ?? '-'}) đang gặp sự cố ${activeResourceIncident.code}. Công đoạn ${stage.name} chưa thể tiếp tục bằng tài nguyên này.`,
        stage,
        activeResourceIncident
      )
      canComplete = false
    }

    if (baseCanComplete && !blockingReason) {
      const nextStage = allStages[index + 1]
      const nextRequiredResourceType = nextStage?.templateStep?.requiredResourceType
      const nextResourceIncident = nextStage?.assignedResource?.id
        ? openIncidentByResourceId.get(String(nextStage.assignedResource.id))
        : null

      if (nextStage && nextRequiredResourceType && !nextStage.assignedResource) {
        blockingReason = toStageResourceRequiredReason(stage, nextStage)
      } else if (nextStage && nextResourceIncident) {
        blockingReason = toStageIncidentReason(
          'NEXT_STAGE_RESOURCE_INCIDENT',
          `Bạn vẫn có thể hoàn thành ${stage.name}. Sau đó pipeline sẽ tạm dừng trước công đoạn ${nextStage.name} vì ${nextStage.assignedResource?.name} (${nextStage.assignedResource?.code}) đang gặp sự cố ${nextResourceIncident.code}.`,
          nextStage,
          nextResourceIncident
        )
      }
    }

    if (stage.templateStep?.requiredResourceType && !stage.assignedResource && !blockingReason) {
      blockingReason = {
        code: 'STAGE_RESOURCE_REQUIRED',
        message: `Công đoạn ${stage.name} yêu cầu tài nguyên loại ${stage.templateStep.requiredResourceType} nhưng hiện chưa được gán tài nguyên.`,
        stage: {
          id: stage.id,
          code: stage.code,
          name: stage.name
        },
        requiredResourceType: stage.templateStep.requiredResourceType
      }
    }

    return {
      ...stage,
      canComplete,
      canResume:
        stage.status === ORDER_STAGE_STATUS.BLOCKED &&
        ([ORDER_STATUS.IN_PROGRESS, ORDER_STATUS.AT_RISK] as string[]).includes(order.status) &&
        Boolean(stage.assignedResource) &&
        stage.assignedResource?.status === RESOURCE_STATUS.AVAILABLE &&
        !activeResourceIncident,
      blockingIncident: activeResourceIncident
        ? {
            id: activeResourceIncident.id,
            code: activeResourceIncident.code,
            type: activeResourceIncident.type,
            severity: activeResourceIncident.severity,
            status: activeResourceIncident.status
          }
        : null,
      blockingReason
    }
  })

  return {
    ...order,
    activeIncidents: [...activeIncidentsById.values()].map((incident) => ({
      id: incident.id,
      code: incident.code,
      type: incident.type,
      severity: incident.severity,
      status: incident.status,
      rawDescription: incident.rawDescription,
      resource: incident.resource ?? null
    })),
    stages
  }
}

const loadActiveTemplateWithSteps = async (processTemplateId: number, transaction: Transaction) => {
  const template = await ProcessTemplate.findOne({
    where: {
      id: processTemplateId,
      isActive: true
    },
    attributes: ['id', 'code', 'name'],
    include: [
      {
        model: ProcessTemplateStep,
        as: 'steps',
        attributes: ['id', 'code', 'name', 'stepOrder', 'estimatedDurationMinutes']
      }
    ],
    order: [[{ model: ProcessTemplateStep, as: 'steps' }, 'stepOrder', 'ASC']],
    transaction
  })

  if (!template) {
    throw new NotFoundError('Không tìm thấy quy trình sản xuất.')
  }

  const plainTemplate = getPlain<PlainProcessTemplate>(template)
  const steps = plainTemplate.steps ?? []

  if (steps.length === 0) {
    throw new BadRequestError('Quy trình sản xuất chưa có bước, không thể tạo đơn hàng.')
  }

  return {
    template: plainTemplate,
    steps
  }
}

const createOrderStagesFromTemplate = async (
  orderId: string | number,
  templateSteps: PlainProcessTemplateStep[],
  transaction: Transaction
) => {
  const stagePayloads = templateSteps.map((step) => ({
    orderId,
    templateStepId: step.id,
    assignedResourceId: null,
    startedByUserId: null,
    completedByUserId: null,
    code: step.code,
    name: step.name,
    stepOrder: step.stepOrder,
    status: ORDER_STAGE_STATUS.WAITING,
    estimatedDurationMinutes: step.estimatedDurationMinutes,
    expectedStartAt: null,
    expectedEndAt: null,
    startedAt: null,
    completedAt: null,
    notes: null
  }))

  await OrderStage.bulkCreate(stagePayloads, { transaction })
}

const createOrderCreatedActivityLog = async (
  orderId: string | number,
  orderCode: string,
  input: CreateOrderInput,
  currentUser: AuthenticatedUser,
  transaction: Transaction
) => {
  await ActivityLog.create(
    {
      actorUserId: currentUser.id,
      orderId,
      orderStageId: null,
      incidentId: null,
      eventType: ACTIVITY_EVENT_TYPE.ORDER_CREATED,
      message: `Created order ${orderCode}`,
      metadata: {
        processTemplateId: input.processTemplateId,
        quantity: input.quantity,
        priority: input.priority
      }
    },
    { transaction }
  )
}

type OrderWhere = Record<string, unknown> & { [Op.or]?: unknown }

const buildOrderWhere = (query: GetOrdersQuery): WhereOptions => {
  const where: OrderWhere = {}

  if (query.status) where.status = query.status
  if (query.riskLevel) where.riskLevel = query.riskLevel
  if (query.priority) where.priority = query.priority

  const search = query.search?.trim()
  if (search) {
    where[Op.or] = [
      { code: { [Op.like]: `%${search}%` } },
      { customerName: { [Op.like]: `%${search}%` } },
      { productName: { [Op.like]: `%${search}%` } }
    ]
  }

  return where as WhereOptions
}

export const getOrdersService = async (query: GetOrdersQuery) => {
  const page = query.page ?? 1
  const limit = Math.min(query.limit ?? 10, 100)
  const offset = (page - 1) * limit

  const { count, rows } = await Order.findAndCountAll({
    where: buildOrderWhere(query),
    attributes: [
      'id',
      'code',
      'customerName',
      'productName',
      'quantity',
      'deadline',
      'priority',
      'status',
      'riskLevel',
      'progressPercent',
      'createdAt'
    ],
    include: orderListInclude,
    order: [['createdAt', 'DESC']],
    limit,
    offset,
    distinct: true
  })

  return {
    items: rows.map((row) => normalizeProgressPercent(getPlain<PlainOrderListItem>(row))),
    pagination: {
      page,
      limit,
      totalItems: count,
      totalPages: Math.ceil(count / limit)
    }
  }
}

export const getOrderByIdService = async (id: string | number) => {
  const order = await Order.findByPk(id, {
    attributes: [
      'id',
      'code',
      'customerName',
      'productName',
      'quantity',
      'specifications',
      'rawOrderText',
      'aiAnalysis',
      'deadline',
      'priority',
      'status',
      'riskLevel',
      'progressPercent',
      'startedAt',
      'completedAt',
      'createdAt',
      'updatedAt'
    ],
    include: orderDetailInclude,
    order: [[{ model: OrderStage, as: 'stages' }, 'stepOrder', 'ASC']]
  })

  if (!order) {
    throw new NotFoundError('Không tìm thấy đơn hàng.')
  }

  return enrichOrderIncidentState(normalizeOrderDetail(getPlain<PlainOrderDetail>(order)))
}

export const startOrderService = async (orderId: string | number, currentUser: AuthenticatedUser) => {
  const result = await sequelize.transaction(async (transaction) => {
    const now = new Date()
    const order = await Order.findByPk(orderId, {
      attributes: ['id', 'code', 'status', 'riskLevel'],
      transaction,
      lock: transaction.LOCK.UPDATE
    })

    if (!order) {
      throw new NotFoundError('Không tìm thấy đơn hàng.')
    }

    const orderStatus = order.get('status') as string
    const orderCode = order.get('code') as string

    if (orderStatus !== ORDER_STATUS.PENDING) {
      throw new BadRequestError('Chỉ có thể bắt đầu đơn hàng đang ở trạng thái chờ sản xuất.')
    }

    const stages = await OrderStage.findAll({
      where: { orderId },
      attributes: ['id', 'code', 'name', 'stepOrder', 'status', 'assignedResourceId'],
      include: [
        {
          model: ProcessTemplateStep,
          as: 'templateStep',
          attributes: ['requiredResourceType']
        }
      ],
      order: [['stepOrder', 'ASC']],
      transaction,
      lock: transaction.LOCK.UPDATE
    })

    if (stages.length === 0) {
      throw new BadRequestError('Đơn hàng chưa có pipeline sản xuất, không thể bắt đầu.')
    }

    const firstStage = stages[0]
    const firstStageStatus = firstStage.get('status') as string

    if (firstStageStatus !== ORDER_STAGE_STATUS.WAITING) {
      throw new BadRequestError('Công đoạn đầu tiên không ở trạng thái WAITING.')
    }

    const activeStageCount = stages.filter((stage) => stage.get('status') === ORDER_STAGE_STATUS.IN_PROGRESS).length
    if (activeStageCount > 0) {
      throw new BadRequestError('Pipeline đã có công đoạn đang thực hiện.')
    }

    const firstStagePlain = firstStage.get({ plain: true }) as {
      code: string
      assignedResourceId: string | number | null
      templateStep?: { requiredResourceType: string | null } | null
    }
    const requiredResourceType = firstStagePlain.templateStep?.requiredResourceType
    if (requiredResourceType) {
      if (!firstStagePlain.assignedResourceId) {
        throw new BadRequestError(`Công đoạn ${firstStagePlain.code} cần được gán tài nguyên trước khi bắt đầu.`)
      }

      const resource = await Resource.findByPk(firstStagePlain.assignedResourceId, {
        attributes: ['id', 'code', 'name', 'type', 'status', 'isActive'],
        transaction,
        lock: transaction.LOCK.UPDATE
      })

      if (!resource) {
        throw new NotFoundError('Không tìm thấy tài nguyên sản xuất.')
      }

      if (resource.get('type') !== requiredResourceType) {
        throw new BadRequestError(`Công đoạn ${firstStagePlain.code} yêu cầu tài nguyên loại ${requiredResourceType}.`)
      }

      if (resource.get('isActive') !== true) {
        throw new BadRequestError(`${resource.get('name')} (${resource.get('code')}) da ngung su dung.`, {
          code: 'RESOURCE_INACTIVE',
          resourceId: resource.get('id'),
          resourceCode: resource.get('code')
        })
      }

      if (resource.get('status') !== RESOURCE_STATUS.AVAILABLE) {
        throw new BadRequestError(
          `${resource.get('name')} (${resource.get('code')}) hiện không khả dụng để bắt đầu công đoạn.`,
          {
            code: resource.get('status') === RESOURCE_STATUS.IN_USE ? 'RESOURCE_IN_USE' : 'RESOURCE_NOT_AVAILABLE',
            resourceId: resource.get('id'),
            resourceCode: resource.get('code'),
            resourceStatus: resource.get('status')
          }
        )
      }

      const activeStageUsingResource = await OrderStage.findOne({
        where: {
          assignedResourceId: resource.get('id') as string | number,
          status: ORDER_STAGE_STATUS.IN_PROGRESS
        },
        attributes: ['id', 'code'],
        transaction,
        lock: transaction.LOCK.UPDATE
      })

      if (activeStageUsingResource) {
        throw new BadRequestError(
          `${resource.get('name')} (${resource.get('code')}) hiện đang được một công đoạn khác sử dụng.`,
          {
            code: 'RESOURCE_IN_USE',
            resourceId: resource.get('id'),
            resourceCode: resource.get('code'),
            activeStageId: activeStageUsingResource.get('id'),
            activeStageCode: activeStageUsingResource.get('code')
          }
        )
      }

      await resource.update({ status: RESOURCE_STATUS.IN_USE }, { transaction })
    }

    const nextOrderStatus = ([RISK_LEVEL.HIGH, RISK_LEVEL.CRITICAL] as string[]).includes(
      order.get('riskLevel') as string
    )
      ? ORDER_STATUS.AT_RISK
      : ORDER_STATUS.IN_PROGRESS

    await order.update(
      {
        status: nextOrderStatus,
        startedAt: now,
        progressPercent: 0
      },
      { transaction }
    )

    await firstStage.update(
      {
        status: ORDER_STAGE_STATUS.IN_PROGRESS,
        startedAt: now,
        startedByUserId: currentUser.id
      },
      { transaction }
    )

    await ActivityLog.bulkCreate(
      [
        {
          actorUserId: currentUser.id,
          orderId,
          orderStageId: null,
          incidentId: null,
          eventType: ACTIVITY_EVENT_TYPE.ORDER_STATUS_CHANGED,
          message: `Order ${orderCode} started production`,
          metadata: {
            previousStatus: ORDER_STATUS.PENDING,
            newStatus: nextOrderStatus
          }
        },
        {
          actorUserId: currentUser.id,
          orderId,
          orderStageId: firstStage.get('id'),
          incidentId: null,
          eventType: ACTIVITY_EVENT_TYPE.STAGE_STARTED,
          message: `Stage ${firstStage.get('code')} started`,
          metadata: {
            stageCode: firstStage.get('code'),
            stepOrder: firstStage.get('stepOrder')
          }
        }
      ],
      { transaction }
    )

    const notificationLogIds = await createRiskAlertNotificationsForTransition({
      orderId: order.get('id') as string | number,
      incidentId: null,
      previousStatus: ORDER_STATUS.PENDING,
      newStatus: nextOrderStatus,
      previousRiskLevel: order.get('riskLevel') as (typeof RISK_LEVEL)[keyof typeof RISK_LEVEL],
      newRiskLevel: order.get('riskLevel') as (typeof RISK_LEVEL)[keyof typeof RISK_LEVEL],
      transaction
    })

    const realtimeEvents: RealtimeEvent[] = [
      {
        event:
          nextOrderStatus === ORDER_STATUS.AT_RISK ? SOCKET_EVENTS.ORDER_RISK_CHANGED : SOCKET_EVENTS.ORDER_UPDATED,
        payload:
          nextOrderStatus === ORDER_STATUS.AT_RISK
            ? {
                orderId: order.get('id') as string | number,
                orderCode,
                oldRiskLevel: order.get('riskLevel') as string,
                riskLevel: order.get('riskLevel') as string,
                oldStatus: ORDER_STATUS.PENDING,
                status: nextOrderStatus,
                progress: 0
              }
            : {
                orderId: order.get('id') as string | number,
                orderCode,
                status: nextOrderStatus,
                riskLevel: order.get('riskLevel') as string,
                progress: 0
              }
      },
      {
        event: SOCKET_EVENTS.STAGE_UPDATED,
        payload: buildStageUpdatedPayload({
          id: firstStage.get('id') as string | number,
          orderId: order.get('id') as string | number,
          code: firstStage.get('code') as string,
          name: firstStage.get('name') as string,
          status: ORDER_STAGE_STATUS.IN_PROGRESS,
          assignedResourceId: firstStagePlain.assignedResourceId
        })
      }
    ]

    return {
      orderId: order.get('id') as string | number,
      notificationLogIds,
      realtimeEvents
    }
  })

  emitRealtimeEvents(result.realtimeEvents)
  await deliverPendingNotifications(result.notificationLogIds)

  return getOrderByIdService(result.orderId)
}
export const createOrderService = async (input: CreateOrderInput, currentUser: AuthenticatedUser) => {
  const createdOrder = (await sequelize.transaction(async (transaction) => {
    const deadline = new Date(input.deadline)

    if (Number.isNaN(deadline.getTime())) {
      throw new BadRequestError('Deadline không hợp lệ.')
    }

    if (deadline.getTime() <= Date.now()) {
      throw new BadRequestError('Deadline phải nằm trong tương lai.')
    }

    const { steps } = await loadActiveTemplateWithSteps(input.processTemplateId, transaction)

    const order = await Order.create(
      {
        code: 'GOM-000000',
        processTemplateId: input.processTemplateId,
        createdByUserId: currentUser.id,
        customerName: input.customerName,
        productName: input.productName,
        quantity: input.quantity,
        specifications: input.specifications ?? null,
        rawOrderText: input.rawOrderText ?? null,
        aiAnalysis: input.aiAnalysis ?? null,
        deadline,
        priority: input.priority,
        status: ORDER_STATUS.PENDING,
        riskLevel: RISK_LEVEL.NONE,
        progressPercent: 0,
        startedAt: null,
        completedAt: null
      },
      { transaction }
    )

    const orderCode = generateOrderCode(order.get('id') as string | number)
    await order.update({ code: orderCode }, { transaction })
    await createOrderStagesFromTemplate(order.get('id') as string | number, steps, transaction)
    await createOrderCreatedActivityLog(order.get('id') as string | number, orderCode, input, currentUser, transaction)

    const createdOrder = await Order.findByPk(order.get('id') as string | number, {
      attributes: [
        'id',
        'code',
        'customerName',
        'productName',
        'quantity',
        'specifications',
        'rawOrderText',
        'aiAnalysis',
        'deadline',
        'priority',
        'status',
        'riskLevel',
        'progressPercent'
      ],
      include: orderCreateResponseInclude,
      order: [[{ model: OrderStage, as: 'stages' }, 'stepOrder', 'ASC']],
      transaction
    })

    if (!createdOrder) {
      throw new BadRequestError('Không thể tải đơn hàng vừa tạo.')
    }

    return normalizeOrderDetail(getPlain<PlainCreatedOrder>(createdOrder))
  })) as ReturnType<typeof normalizeOrderDetail> & {
    code: string
    riskLevel: string
  }

  emitRealtimeEvents([
    {
      event: SOCKET_EVENTS.ORDER_CREATED,
      payload: {
        orderId: createdOrder.id,
        orderCode: createdOrder.code,
        status: createdOrder.status,
        riskLevel: createdOrder.riskLevel,
        progress: createdOrder.progressPercent
      }
    }
  ])

  return createdOrder
}

export default {
  createOrderService,
  getOrderByIdService,
  getOrdersService,
  startOrderService
}
