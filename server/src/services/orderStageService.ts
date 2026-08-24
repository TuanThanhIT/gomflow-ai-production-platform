import type { Transaction } from 'sequelize'
import { Op } from 'sequelize'
import sequelize from '../config/db.js'
import {
  ACTIVITY_EVENT_TYPE,
  INCIDENT_STATUS,
  ORDER_STAGE_STATUS,
  ORDER_STATUS,
  RESOURCE_STATUS
} from '../constants/databaseConstants.js'
import { SOCKET_EVENTS } from '../constants/socketEvents.js'
import BadRequestError from '../errors/BadRequestError.js'
import NotFoundError from '../errors/NotFoundError.js'
import { ActivityLog, Incident, Order, OrderStage, ProcessTemplateStep, Resource } from '../models/index.js'
import type { AuthenticatedUser } from '../types/auth.js'
import { getOrderByIdService } from './orderService.js'
import { createStageCompletedNotificationLog, deliverPendingNotifications } from './notificationService.js'
import { emitRealtimeEvents, type RealtimeEvent } from './socketService.js'

export type AssignResourceInput = {
  resourceId: number
}

type StageWithTemplate = {
  id: string | number
  code: string
  name: string
  orderId: string | number
  stepOrder: number
  status: string
  assignedResourceId: string | number | null
  templateStep?: {
    requiredResourceType: string | null
  } | null
}

const getPlain = <T>(model: { get: (options?: { plain: boolean }) => unknown }) => model.get({ plain: true }) as T

const roundProgress = (completedStages: number, totalStages: number) => {
  if (totalStages <= 0) return 0
  return Math.round((completedStages / totalStages) * 10000) / 100
}

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

const findOpenIncidentForResource = async (resourceId: string | number | null, transaction: Transaction) => {
  if (!resourceId) return null

  return Incident.findOne({
    where: {
      resourceId,
      status: INCIDENT_STATUS.OPEN
    },
    attributes: ['id', 'code', 'resourceId'],
    order: [['createdAt', 'DESC']],
    transaction
  })
}

const findActiveStageUsingResource = async (
  resourceId: string | number,
  transaction: Transaction,
  excludeStageId?: string | number
) => {
  return OrderStage.findOne({
    where: {
      assignedResourceId: resourceId,
      status: ORDER_STAGE_STATUS.IN_PROGRESS,
      ...(excludeStageId
        ? {
            id: {
              [Op.ne]: excludeStageId
            }
          }
        : {})
    },
    attributes: ['id', 'code', 'name'],
    transaction,
    lock: transaction.LOCK.UPDATE
  })
}

const assertResourceAssignableForPlanning = (
  resource: { get: (key: string) => unknown },
  stage: { code: string },
  requiredResourceType: string
) => {
  if (resource.get('isActive') !== true) {
    throw new BadRequestError(`Tài nguyên ${resource.get('code')} đã ngừng sử dụng, không thể gán cho kế hoạch mới.`, {
      code: 'RESOURCE_INACTIVE',
      resourceId: resource.get('id'),
      resourceCode: resource.get('code')
    })
  }

  if (resource.get('type') !== requiredResourceType) {
    throw new BadRequestError(`Công đoạn ${stage.code} yêu cầu tài nguyên loại ${requiredResourceType}.`, {
      code: 'RESOURCE_TYPE_MISMATCH',
      requiredResourceType,
      resourceType: resource.get('type')
    })
  }

  if (!([RESOURCE_STATUS.AVAILABLE, RESOURCE_STATUS.IN_USE] as string[]).includes(resource.get('status') as string)) {
    throw new BadRequestError(`Tài nguyên ${resource.get('code')} hiện không thể được gán cho kế hoạch mới.`, {
      code: 'RESOURCE_NOT_ASSIGNABLE',
      resourceId: resource.get('id'),
      resourceCode: resource.get('code'),
      resourceStatus: resource.get('status')
    })
  }
}

const throwStageBlockedByIncident = (
  stage: { id: string | number; code: string; name: string },
  resource: { id: string | number; code: string } | null,
  incident: { get: (key: string) => unknown }
) => {
  throw new BadRequestError(
    `Không thể hoàn thành công đoạn ${stage.name} vì tài nguyên ${resource?.code ?? ''} đang gặp sự cố ${incident.get('code')}.`,
    {
      code: 'STAGE_BLOCKED_BY_INCIDENT',
      stageId: stage.id,
      stageCode: stage.code,
      resourceId: resource?.id ?? null,
      resourceCode: resource?.code ?? null,
      incidentId: incident.get('id'),
      incidentCode: incident.get('code')
    }
  )
}

type StageStartReadiness = {
  canStart: boolean
  reason?: string
  message?: string
  resource?: {
    id: string | number
    code: string
    name?: string
    status?: string
  } | null
  incident?: {
    id: string | number
    code: string
  } | null
}

const prepareStageResourceForStart = async (
  stage: StageWithTemplate,
  transaction: Transaction
): Promise<StageStartReadiness> => {
  const requiredResourceType = stage.templateStep?.requiredResourceType

  if (!requiredResourceType) return { canStart: true }

  if (!stage.assignedResourceId) {
    return {
      canStart: false,
      reason: 'NEXT_STAGE_RESOURCE_REQUIRED',
      message: `Công đoạn ${stage.name} đang chờ được gán tài nguyên loại ${requiredResourceType}.`
    }
  }

  const resource = await Resource.findByPk(stage.assignedResourceId, {
    attributes: ['id', 'code', 'name', 'type', 'status', 'isActive'],
    transaction,
    lock: transaction.LOCK.UPDATE
  })

  if (!resource) {
    throw new NotFoundError('Không tìm thấy tài nguyên sản xuất.')
  }

  if (resource.get('type') !== requiredResourceType) {
    throw new BadRequestError(`Công đoạn ${stage.code} yêu cầu tài nguyên loại ${requiredResourceType}.`)
  }

  if (resource.get('isActive') !== true) {
    return {
      canStart: false,
      reason: 'NEXT_STAGE_RESOURCE_INACTIVE',
      message: `Công đoạn ${stage.name} chưa thể bắt đầu vì ${resource.get('code')} đã ngừng sử dụng.`,
      resource: {
        id: resource.get('id') as string | number,
        code: resource.get('code') as string,
        name: resource.get('name') as string,
        status: resource.get('status') as string
      }
    }
  }

  const activeStageUsingResource = await findActiveStageUsingResource(
    resource.get('id') as string | number,
    transaction,
    stage.id
  )
  if (activeStageUsingResource) {
    return {
      canStart: false,
      reason: 'RESOURCE_IN_USE',
      message: `Công đoạn ${stage.name} đang chờ vì ${resource.get('name')} (${resource.get('code')}) hiện được công đoạn khác sử dụng.`,
      resource: {
        id: resource.get('id') as string | number,
        code: resource.get('code') as string,
        name: resource.get('name') as string,
        status: resource.get('status') as string
      }
    }
  }

  if (resource.get('status') !== RESOURCE_STATUS.AVAILABLE) {
    const incident = await findOpenIncidentForResource(resource.get('id') as string | number, transaction)
    if (incident) {
      return {
        canStart: false,
        reason: 'NEXT_STAGE_RESOURCE_INCIDENT',
        message: `Công đoạn ${stage.name} chưa thể bắt đầu vì ${resource.get('code')} đang gặp sự cố ${incident.get('code')}.`,
        resource: {
          id: resource.get('id') as string | number,
          code: resource.get('code') as string,
          name: resource.get('name') as string,
          status: resource.get('status') as string
        },
        incident: {
          id: incident.get('id') as string | number,
          code: incident.get('code') as string
        }
      }
    }
    return {
      canStart: false,
      reason: 'NEXT_STAGE_RESOURCE_NOT_AVAILABLE',
      message: `Tài nguyên ${resource.get('code')} hiện không khả dụng.`,
      resource: {
        id: resource.get('id') as string | number,
        code: resource.get('code') as string,
        name: resource.get('name') as string,
        status: resource.get('status') as string
      }
    }
  }

  await resource.update({ status: RESOURCE_STATUS.IN_USE }, { transaction })
  return { canStart: true }
}

export const getAvailableResourcesForStageService = async (stageId: string | number) => {
  const stage = await OrderStage.findByPk(stageId, {
    attributes: ['id', 'code', 'name'],
    include: [
      {
        model: ProcessTemplateStep,
        as: 'templateStep',
        attributes: ['requiredResourceType']
      }
    ]
  })

  if (!stage) {
    throw new NotFoundError('Không tìm thấy công đoạn sản xuất.')
  }

  const plainStage = getPlain<StageWithTemplate>(stage)
  const requiredResourceType = plainStage.templateStep?.requiredResourceType ?? null

  if (!requiredResourceType) {
    return {
      stage: {
        id: plainStage.id,
        code: plainStage.code,
        name: plainStage.name,
        requiredResourceType: null
      },
      resources: []
    }
  }

  const resources = await Resource.findAll({
    where: {
      isActive: true,
      type: requiredResourceType,
      status: {
        [Op.in]: [RESOURCE_STATUS.AVAILABLE, RESOURCE_STATUS.IN_USE]
      }
    },
    attributes: ['id', 'code', 'name', 'type', 'status', 'isActive', 'description'],
    order: [['code', 'ASC']]
  })

  return {
    stage: {
      id: plainStage.id,
      code: plainStage.code,
      name: plainStage.name,
      requiredResourceType
    },
    resources
  }
}

export const assignResourceToStageService = async (
  stageId: string | number,
  input: AssignResourceInput,
  currentUser: AuthenticatedUser
) => {
  const result = await sequelize.transaction(async (transaction) => {
    const stage = await OrderStage.findByPk(stageId, {
      attributes: ['id', 'orderId', 'code', 'name', 'stepOrder', 'status', 'assignedResourceId'],
      include: [
        {
          model: ProcessTemplateStep,
          as: 'templateStep',
          attributes: ['requiredResourceType']
        }
      ],
      transaction,
      lock: transaction.LOCK.UPDATE
    })

    if (!stage) {
      throw new NotFoundError('Không tìm thấy công đoạn sản xuất.')
    }

    const plainStage = getPlain<StageWithTemplate>(stage)
    if (plainStage.status !== ORDER_STAGE_STATUS.WAITING) {
      throw new BadRequestError('Chỉ có thể gán hoặc đổi tài nguyên khi công đoạn đang WAITING.')
    }

    const requiredResourceType = plainStage.templateStep?.requiredResourceType
    if (!requiredResourceType) {
      throw new BadRequestError('Công đoạn này không yêu cầu tài nguyên.')
    }

    const order = await Order.findByPk(plainStage.orderId, {
      attributes: ['id', 'status'],
      transaction,
      lock: transaction.LOCK.UPDATE
    })

    if (!order) {
      throw new NotFoundError('Không tìm thấy đơn hàng.')
    }

    const orderStatus = order.get('status') as string
    if (orderStatus === ORDER_STATUS.COMPLETED || orderStatus === ORDER_STATUS.CANCELLED) {
      throw new BadRequestError('Không thể gán tài nguyên cho đơn hàng đã hoàn thành hoặc đã huỷ.')
    }

    const resource = await Resource.findByPk(input.resourceId, {
      attributes: ['id', 'code', 'name', 'type', 'status', 'isActive'],
      transaction,
      lock: transaction.LOCK.UPDATE
    })

    if (!resource) {
      throw new NotFoundError('Không tìm thấy tài nguyên sản xuất.')
    }

    assertResourceAssignableForPlanning(resource, plainStage, requiredResourceType)

    await stage.update({ assignedResourceId: resource.get('id') }, { transaction })

    await ActivityLog.create(
      {
        actorUserId: currentUser.id,
        orderId: plainStage.orderId,
        orderStageId: plainStage.id,
        incidentId: null,
        eventType: ACTIVITY_EVENT_TYPE.RESOURCE_ASSIGNED,
        message: `Assigned ${resource.get('code')} to stage ${plainStage.code}`,
        metadata: {
          resourceId: resource.get('id'),
          resourceCode: resource.get('code'),
          resourceType: resource.get('type'),
          stageCode: plainStage.code
        }
      },
      { transaction }
    )

    return {
      orderId: plainStage.orderId,
      realtimeEvents: [
        {
          event: SOCKET_EVENTS.STAGE_UPDATED,
          payload: buildStageUpdatedPayload({
            id: plainStage.id,
            orderId: plainStage.orderId,
            code: plainStage.code,
            name: plainStage.name,
            status: plainStage.status,
            assignedResourceId: resource.get('id') as string | number
          })
        }
      ] satisfies RealtimeEvent[]
    }
  })

  emitRealtimeEvents(result.realtimeEvents)

  return getOrderByIdService(result.orderId)
}

export const completeOrderStageService = async (stageId: string | number, currentUser: AuthenticatedUser) => {
  const result = await sequelize.transaction(async (transaction) => {
    const now = new Date()
    const currentStage = await OrderStage.findByPk(stageId, {
      attributes: ['id', 'orderId', 'code', 'name', 'stepOrder', 'status', 'assignedResourceId'],
      transaction,
      lock: transaction.LOCK.UPDATE
    })

    if (!currentStage) {
      throw new NotFoundError('Không tìm thấy công đoạn sản xuất.')
    }

    const currentOrderId = currentStage.get('orderId') as string | number
    const order = await Order.findByPk(currentOrderId, {
      attributes: ['id', 'code', 'productName', 'status', 'aiAnalysis'],
      transaction,
      lock: transaction.LOCK.UPDATE
    })

    if (!order) {
      throw new NotFoundError('Không tìm thấy đơn hàng.')
    }

    const previousOrderStatus = order.get('status') as string
    if (previousOrderStatus !== ORDER_STATUS.IN_PROGRESS && previousOrderStatus !== ORDER_STATUS.AT_RISK) {
      throw new BadRequestError('Đơn hàng không ở trạng thái cho phép hoàn thành công đoạn.')
    }

    const currentAssignedResourceId = currentStage.get('assignedResourceId') as string | number | null
    const currentResource = currentAssignedResourceId
      ? await Resource.findByPk(currentAssignedResourceId, {
          attributes: ['id', 'code', 'status'],
          transaction,
          lock: transaction.LOCK.UPDATE
        })
      : null
    const currentResourceIncident = await findOpenIncidentForResource(currentAssignedResourceId, transaction)

    if (currentStage.get('status') === ORDER_STAGE_STATUS.BLOCKED && currentResourceIncident) {
      throwStageBlockedByIncident(
        {
          id: currentStage.get('id') as string | number,
          code: currentStage.get('code') as string,
          name: currentStage.get('name') as string
        },
        currentResource
          ? {
              id: currentResource.get('id') as string | number,
              code: currentResource.get('code') as string
            }
          : null,
        currentResourceIncident
      )
    }

    const currentStageStatus = currentStage.get('status') as string
    if (currentStageStatus === ORDER_STAGE_STATUS.BLOCKED) {
      throw new BadRequestError('Công đoạn đang tạm dừng. Hãy tiếp tục công đoạn trước khi hoàn thành.', {
        code: 'STAGE_MUST_BE_RESUMED',
        stageId: currentStage.get('id'),
        stageCode: currentStage.get('code')
      })
    }

    if (currentStageStatus !== ORDER_STAGE_STATUS.IN_PROGRESS) {
      throw new BadRequestError('Chỉ có thể hoàn thành công đoạn đang thực hiện.')
    }

    if (currentResource?.get('status') === RESOURCE_STATUS.BROKEN && currentResourceIncident) {
      throwStageBlockedByIncident(
        {
          id: currentStage.get('id') as string | number,
          code: currentStage.get('code') as string,
          name: currentStage.get('name') as string
        },
        {
          id: currentResource.get('id') as string | number,
          code: currentResource.get('code') as string
        },
        currentResourceIncident
      )
    }

    const allStages = await OrderStage.findAll({
      where: { orderId: currentOrderId },
      attributes: ['id', 'status', 'stepOrder'],
      order: [['stepOrder', 'ASC']],
      transaction,
      lock: transaction.LOCK.UPDATE
    })

    const otherActiveStages = allStages.filter(
      (stage) => stage.get('status') === ORDER_STAGE_STATUS.IN_PROGRESS && String(stage.get('id')) !== String(stageId)
    )

    if (otherActiveStages.length > 0) {
      throw new BadRequestError('Pipeline đang có nhiều hơn một công đoạn IN_PROGRESS.')
    }

    const nextStage = await OrderStage.findOne({
      where: {
        orderId: currentOrderId,
        stepOrder: {
          [Op.gt]: currentStage.get('stepOrder') as number
        }
      },
      attributes: ['id', 'orderId', 'code', 'name', 'stepOrder', 'status', 'assignedResourceId'],
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

    let nextStageStarted = false
    let pipelineState: StageStartReadiness = { canStart: false }

    if (nextStage) {
      const plainNextStage = getPlain<StageWithTemplate>(nextStage)
      if (plainNextStage.status !== ORDER_STAGE_STATUS.WAITING) {
        throw new BadRequestError('Công đoạn tiếp theo không ở trạng thái WAITING.')
      }

      pipelineState = await prepareStageResourceForStart(plainNextStage, transaction)
    }

    await currentStage.update(
      {
        status: ORDER_STAGE_STATUS.COMPLETED,
        completedAt: now,
        completedByUserId: currentUser.id
      },
      { transaction }
    )

    if (currentAssignedResourceId) {
      await Resource.update(
        { status: RESOURCE_STATUS.AVAILABLE },
        {
          where: { id: currentAssignedResourceId },
          transaction
        }
      )
    }

    if (nextStage && pipelineState.canStart) {
      await nextStage.update(
        {
          status: ORDER_STAGE_STATUS.IN_PROGRESS,
          startedAt: now,
          startedByUserId: currentUser.id
        },
        { transaction }
      )
      nextStageStarted = true
    }

    const completedStages = await OrderStage.count({
      where: {
        orderId: currentOrderId,
        status: ORDER_STAGE_STATUS.COMPLETED
      },
      transaction
    })
    const totalStages = allStages.length
    const progressPercent = nextStage ? roundProgress(completedStages, totalStages) : 100

    await order.update(
      nextStage
        ? {
            progressPercent
          }
        : {
            status: ORDER_STATUS.COMPLETED,
            progressPercent,
            completedAt: now
          },
      { transaction }
    )

    const logs: Array<{
      actorUserId: string | number
      orderId: string | number
      orderStageId: string | number | null
      incidentId: null
      eventType: string
      message: string
      metadata: Record<string, unknown>
    }> = [
      {
        actorUserId: currentUser.id,
        orderId: currentOrderId,
        orderStageId: currentStage.get('id') as string | number,
        incidentId: null,
        eventType: ACTIVITY_EVENT_TYPE.STAGE_COMPLETED,
        message: `Stage ${currentStage.get('code')} completed`,
        metadata: {
          stageCode: currentStage.get('code'),
          stepOrder: currentStage.get('stepOrder')
        }
      }
    ]

    if (nextStageStarted && nextStage) {
      logs.push({
        actorUserId: currentUser.id,
        orderId: currentOrderId,
        orderStageId: nextStage.get('id') as string | number,
        incidentId: null,
        eventType: ACTIVITY_EVENT_TYPE.STAGE_STARTED,
        message: `Stage ${nextStage.get('code')} started`,
        metadata: {
          stageCode: nextStage.get('code'),
          stepOrder: nextStage.get('stepOrder')
        }
      })
    } else if (!nextStage) {
      logs.push({
        actorUserId: currentUser.id,
        orderId: currentOrderId,
        orderStageId: null,
        incidentId: null,
        eventType: ACTIVITY_EVENT_TYPE.ORDER_STATUS_CHANGED,
        message: `Order ${order.get('code')} completed`,
        metadata: {
          previousStatus: previousOrderStatus,
          newStatus: ORDER_STATUS.COMPLETED
        }
      })
    }

    await ActivityLog.bulkCreate(logs, { transaction })

    const plainNextStage = nextStage ? (nextStage.get({ plain: true }) as StageWithTemplate) : null
    const notificationLogIds = await createStageCompletedNotificationLog({
      order: {
        id: order.get('id') as string | number,
        code: order.get('code') as string,
        productName: order.get('productName') as string | null,
        progressPercent,
        aiAnalysis: order.get('aiAnalysis') as
          | {
              manufacturingEstimate?: {
                estimatedFiringTemperatureC?: number | null
                estimatedFiringDurationMinutes?: number | null
              } | null
            }
          | null
          | undefined
      },
      completedStage: {
        id: currentStage.get('id') as string | number,
        code: currentStage.get('code') as string,
        name: currentStage.get('name') as string,
        stepOrder: currentStage.get('stepOrder') as number
      },
      nextStage: plainNextStage
        ? {
            id: plainNextStage.id,
            code: plainNextStage.code,
            name: plainNextStage.name,
            requiredResourceType: plainNextStage.templateStep?.requiredResourceType ?? null
          }
        : null,
      completedStageCount: completedStages,
      totalStages,
      progressPercent,
      completedAt: now,
      transaction
    })

    const realtimeEvents: RealtimeEvent[] = [
      {
        event: SOCKET_EVENTS.STAGE_UPDATED,
        payload: buildStageUpdatedPayload({
          id: currentStage.get('id') as string | number,
          orderId: currentOrderId,
          code: currentStage.get('code') as string,
          name: currentStage.get('name') as string,
          status: ORDER_STAGE_STATUS.COMPLETED,
          assignedResourceId: currentAssignedResourceId
        })
      }
    ]

    if (nextStageStarted && nextStage) {
      realtimeEvents.push({
        event: SOCKET_EVENTS.STAGE_UPDATED,
        payload: buildStageUpdatedPayload({
          id: nextStage.get('id') as string | number,
          orderId: currentOrderId,
          code: nextStage.get('code') as string,
          name: nextStage.get('name') as string,
          status: ORDER_STAGE_STATUS.IN_PROGRESS,
          assignedResourceId: nextStage.get('assignedResourceId') as string | number | null
        })
      })
    }

    realtimeEvents.push({
      event: nextStage ? SOCKET_EVENTS.ORDER_UPDATED : SOCKET_EVENTS.ORDER_COMPLETED,
      payload: {
        orderId: currentOrderId,
        orderCode: order.get('code') as string,
        status: nextStage ? previousOrderStatus : ORDER_STATUS.COMPLETED,
        progress: progressPercent
      }
    })

    return {
      orderId: currentOrderId,
      notificationLogIds,
      realtimeEvents
    }
  })

  emitRealtimeEvents(result.realtimeEvents)
  await deliverPendingNotifications(result.notificationLogIds)

  return getOrderByIdService(result.orderId)
}

export const resumeOrderStageService = async (stageId: string | number, currentUser: AuthenticatedUser) => {
  const result = await sequelize.transaction(async (transaction) => {
    const stage = await OrderStage.findByPk(stageId, {
      attributes: ['id', 'orderId', 'code', 'name', 'status', 'assignedResourceId', 'startedAt', 'startedByUserId'],
      transaction,
      lock: transaction.LOCK.UPDATE
    })

    if (!stage) {
      throw new NotFoundError('Không tìm thấy công đoạn sản xuất.')
    }

    if (stage.get('status') !== ORDER_STAGE_STATUS.BLOCKED) {
      throw new BadRequestError('Chỉ có thể tiếp tục công đoạn đang bị chặn.')
    }

    const order = await Order.findByPk(stage.get('orderId') as string | number, {
      attributes: ['id', 'status'],
      transaction,
      lock: transaction.LOCK.UPDATE
    })

    if (!order) {
      throw new NotFoundError('Không tìm thấy đơn hàng.')
    }

    const orderStatus = order.get('status') as string
    if (orderStatus !== ORDER_STATUS.IN_PROGRESS && orderStatus !== ORDER_STATUS.AT_RISK) {
      throw new BadRequestError('Đơn hàng không ở trạng thái cho phép tiếp tục công đoạn.')
    }

    const assignedResourceId = stage.get('assignedResourceId') as string | number | null
    if (!assignedResourceId) {
      throw new BadRequestError('Công đoạn chưa được gán tài nguyên, không thể tiếp tục.')
    }

    const resource = await Resource.findByPk(assignedResourceId, {
      attributes: ['id', 'code', 'name', 'status', 'isActive'],
      transaction,
      lock: transaction.LOCK.UPDATE
    })

    if (!resource) {
      throw new NotFoundError('Không tìm thấy tài nguyên sản xuất.')
    }

    if (resource.get('isActive') !== true) {
      throw new BadRequestError(`Tài nguyên ${resource.get('code')} đã ngừng sử dụng, không thể tiếp tục công đoạn.`, {
        code: 'RESOURCE_INACTIVE',
        resourceId: resource.get('id'),
        resourceCode: resource.get('code')
      })
    }

    if (resource.get('status') !== RESOURCE_STATUS.AVAILABLE) {
      throw new BadRequestError(`Tài nguyên ${resource.get('code')} hiện không khả dụng.`, {
        code: 'RESOURCE_NOT_AVAILABLE',
        resourceId: resource.get('id'),
        resourceCode: resource.get('code'),
        resourceStatus: resource.get('status')
      })
    }

    const openBlockingIncident = await Incident.findOne({
      where: {
        status: INCIDENT_STATUS.OPEN,
        [Op.or]: [{ resourceId: assignedResourceId }, { orderStageId: stage.get('id') as string | number }]
      },
      attributes: ['id', 'code'],
      transaction
    })

    if (openBlockingIncident) {
      throw new BadRequestError(`Công đoạn vẫn còn bị chặn bởi sự cố ${openBlockingIncident.get('code')}.`, {
        code: 'STAGE_STILL_BLOCKED_BY_INCIDENT',
        incidentId: openBlockingIncident.get('id'),
        incidentCode: openBlockingIncident.get('code')
      })
    }

    const resourceUsingStage = await OrderStage.findOne({
      where: {
        assignedResourceId,
        status: ORDER_STAGE_STATUS.IN_PROGRESS,
        id: {
          [Op.ne]: stage.get('id') as string | number
        }
      },
      attributes: ['id', 'code'],
      transaction,
      lock: transaction.LOCK.UPDATE
    })

    if (resourceUsingStage) {
      throw new BadRequestError(`Tài nguyên ${resource.get('code')} đang được sử dụng bởi công đoạn khác.`, {
        code: 'RESOURCE_NOT_AVAILABLE',
        resourceId: resource.get('id'),
        resourceCode: resource.get('code'),
        activeStageId: resourceUsingStage.get('id'),
        activeStageCode: resourceUsingStage.get('code')
      })
    }

    const stageUpdatePayload: Record<string, unknown> = {
      status: ORDER_STAGE_STATUS.IN_PROGRESS
    }

    if (!stage.get('startedAt')) {
      stageUpdatePayload.startedAt = new Date()
    }

    if (!stage.get('startedByUserId')) {
      stageUpdatePayload.startedByUserId = currentUser.id
    }

    await stage.update(stageUpdatePayload, { transaction })
    await resource.update({ status: RESOURCE_STATUS.IN_USE }, { transaction })

    await ActivityLog.create(
      {
        actorUserId: currentUser.id,
        orderId: stage.get('orderId'),
        orderStageId: stage.get('id'),
        incidentId: null,
        eventType: ACTIVITY_EVENT_TYPE.STAGE_STARTED,
        message: `Stage ${stage.get('code')} resumed`,
        metadata: {
          previousStatus: ORDER_STAGE_STATUS.BLOCKED,
          newStatus: ORDER_STAGE_STATUS.IN_PROGRESS,
          resourceId: resource.get('id'),
          resourceCode: resource.get('code')
        }
      },
      { transaction }
    )

    const orderId = stage.get('orderId') as string | number

    return {
      orderId,
      realtimeEvents: [
        {
          event: SOCKET_EVENTS.STAGE_UPDATED,
          payload: buildStageUpdatedPayload({
            id: stage.get('id') as string | number,
            orderId,
            code: stage.get('code') as string,
            name: stage.get('name') as string,
            status: ORDER_STAGE_STATUS.IN_PROGRESS,
            assignedResourceId
          })
        }
      ] satisfies RealtimeEvent[]
    }
  })

  emitRealtimeEvents(result.realtimeEvents)

  return getOrderByIdService(result.orderId)
}

export default {
  assignResourceToStageService,
  completeOrderStageService,
  getAvailableResourcesForStageService,
  resumeOrderStageService
}
