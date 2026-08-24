import type { Model, Transaction, WhereOptions } from 'sequelize'
import { col, fn, Op, UniqueConstraintError } from 'sequelize'
import sequelize from '../config/db.js'
import { INCIDENT_STATUS, ORDER_STAGE_STATUS, RESOURCE_STATUS, RESOURCE_TYPE } from '../constants/databaseConstants.js'
import BadRequestError from '../errors/BadRequestError.js'
import ConflictError from '../errors/ConflictError.js'
import NotFoundError from '../errors/NotFoundError.js'
import { Incident, Order, OrderStage, Resource } from '../models/index.js'

export type GetResourcesQuery = {
  type?: (typeof RESOURCE_TYPE)[keyof typeof RESOURCE_TYPE]
  status?: (typeof RESOURCE_STATUS)[keyof typeof RESOURCE_STATUS]
  active?: 'active' | 'inactive' | 'all'
  search?: string
}

export type CreateResourceInput = {
  code: string
  name: string
  type: (typeof RESOURCE_TYPE)[keyof typeof RESOURCE_TYPE]
  description?: string | null
}

export type UpdateResourceInput = Partial<CreateResourceInput> & {
  isActive?: boolean
}

type ResourceWhere = Record<string, unknown> & { [Op.or]?: unknown }

type UsageSummary = {
  orderStageCount: number
  incidentCount: number
  waitingAssignmentCount: number
  inProgressAssignmentCount: number
  openIncidentCount: number
}

type ResourcePlain = {
  id: string | number
  code: string
  name: string
  type: string
  status: string
  isActive: boolean
  description: string | null
  createdAt?: string | Date
  updatedAt?: string | Date
}

const RESOURCE_ATTRIBUTES = [
  'id',
  'code',
  'name',
  'type',
  'status',
  'isActive',
  'description',
  'createdAt',
  'updatedAt'
]

const emptyUsageSummary = (): UsageSummary => ({
  orderStageCount: 0,
  incidentCount: 0,
  waitingAssignmentCount: 0,
  inProgressAssignmentCount: 0,
  openIncidentCount: 0
})

const getPlain = <T>(model: Model): T => model.get({ plain: true }) as T

const normalizeNullableText = (value: string | null | undefined) => {
  if (value === undefined) return undefined
  if (value === null) return null

  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

const normalizeResourcePayload = <T extends CreateResourceInput | UpdateResourceInput>(input: T) => ({
  ...input,
  code: input.code?.trim().toUpperCase(),
  name: input.name?.trim(),
  description: normalizeNullableText(input.description)
})

const buildResourceWhere = (query: GetResourcesQuery): WhereOptions => {
  const where: ResourceWhere = {}

  if (query.type) where.type = query.type
  if (query.status) where.status = query.status
  if (query.active === 'inactive') where.isActive = false
  if (!query.active || query.active === 'active') where.isActive = true

  const search = query.search?.trim()
  if (search) {
    where[Op.or] = [{ code: { [Op.like]: `%${search}%` } }, { name: { [Op.like]: `%${search}%` } }]
  }

  return where as WhereOptions
}

const incrementSummary = (
  summaries: Map<string, UsageSummary>,
  resourceId: string | number | null | undefined,
  field: keyof UsageSummary,
  count: number
) => {
  if (!resourceId) return

  const key = String(resourceId)
  const summary = summaries.get(key) ?? emptyUsageSummary()
  summary[field] = count
  summaries.set(key, summary)
}

const getUsageSummaries = async (
  resourceIds: Array<string | number>,
  transaction?: Transaction
): Promise<Map<string, UsageSummary>> => {
  const summaries = new Map<string, UsageSummary>()
  if (resourceIds.length === 0) return summaries

  resourceIds.forEach((resourceId) => summaries.set(String(resourceId), emptyUsageSummary()))

  const idFilter = { [Op.in]: resourceIds }

  const [orderStageRows, incidentRows, waitingRows, inProgressRows, openIncidentRows] = await Promise.all([
    OrderStage.findAll({
      where: { assignedResourceId: idFilter },
      attributes: ['assignedResourceId', [fn('COUNT', col('id')), 'count']],
      group: ['assignedResourceId'],
      transaction
    }),
    Incident.findAll({
      where: { resourceId: idFilter },
      attributes: ['resourceId', [fn('COUNT', col('id')), 'count']],
      group: ['resourceId'],
      transaction
    }),
    OrderStage.findAll({
      where: { assignedResourceId: idFilter, status: ORDER_STAGE_STATUS.WAITING },
      attributes: ['assignedResourceId', [fn('COUNT', col('id')), 'count']],
      group: ['assignedResourceId'],
      transaction
    }),
    OrderStage.findAll({
      where: { assignedResourceId: idFilter, status: ORDER_STAGE_STATUS.IN_PROGRESS },
      attributes: ['assignedResourceId', [fn('COUNT', col('id')), 'count']],
      group: ['assignedResourceId'],
      transaction
    }),
    Incident.findAll({
      where: { resourceId: idFilter, status: INCIDENT_STATUS.OPEN },
      attributes: ['resourceId', [fn('COUNT', col('id')), 'count']],
      group: ['resourceId'],
      transaction
    })
  ])

  orderStageRows.forEach((row) =>
    incrementSummary(
      summaries,
      row.get('assignedResourceId') as string | number,
      'orderStageCount',
      Number(row.get('count'))
    )
  )
  incidentRows.forEach((row) =>
    incrementSummary(summaries, row.get('resourceId') as string | number, 'incidentCount', Number(row.get('count')))
  )
  waitingRows.forEach((row) =>
    incrementSummary(
      summaries,
      row.get('assignedResourceId') as string | number,
      'waitingAssignmentCount',
      Number(row.get('count'))
    )
  )
  inProgressRows.forEach((row) =>
    incrementSummary(
      summaries,
      row.get('assignedResourceId') as string | number,
      'inProgressAssignmentCount',
      Number(row.get('count'))
    )
  )
  openIncidentRows.forEach((row) =>
    incrementSummary(summaries, row.get('resourceId') as string | number, 'openIncidentCount', Number(row.get('count')))
  )

  return summaries
}

const toResourceDto = (resource: Model, usage: UsageSummary = emptyUsageSummary()) => ({
  ...getPlain<ResourcePlain>(resource),
  ...usage,
  hasUsage: usage.orderStageCount + usage.incidentCount > 0,
  canEditIdentity: usage.orderStageCount + usage.incidentCount === 0
})

const findResourceOrFail = async (id: string | number, transaction?: Transaction) => {
  const resource = await Resource.findByPk(id, {
    attributes: RESOURCE_ATTRIBUTES,
    transaction,
    lock: transaction?.LOCK.UPDATE
  })

  if (!resource) {
    throw new NotFoundError('Không tìm thấy tài nguyên sản xuất.')
  }

  return resource
}

const assertCanDeactivateResource = async (resource: Model, transaction: Transaction) => {
  const resourceId = resource.get('id') as string | number
  const resourceCode = resource.get('code') as string

  if (resource.get('status') === RESOURCE_STATUS.IN_USE) {
    throw new BadRequestError(`Tài nguyên ${resourceCode} đang được sử dụng, không thể ngừng hoặc xóa.`)
  }

  const activeStage = await OrderStage.findOne({
    where: { assignedResourceId: resourceId, status: ORDER_STAGE_STATUS.IN_PROGRESS },
    attributes: ['id', 'code', 'name'],
    transaction,
    lock: transaction.LOCK.UPDATE
  })

  if (activeStage) {
    throw new BadRequestError(
      `Tài nguyên ${resourceCode} đang gắn với công đoạn IN_PROGRESS, không thể ngừng hoặc xóa.`
    )
  }

  const openIncident = await Incident.findOne({
    where: { resourceId, status: INCIDENT_STATUS.OPEN },
    attributes: ['id', 'code'],
    transaction,
    lock: transaction.LOCK.UPDATE
  })

  if (openIncident) {
    throw new BadRequestError(`Tài nguyên ${resourceCode} còn sự cố đang mở, không thể ngừng hoặc xóa.`)
  }

  const waitingAssignment = await OrderStage.findOne({
    where: { assignedResourceId: resourceId, status: ORDER_STAGE_STATUS.WAITING },
    attributes: ['id', 'code', 'name'],
    transaction,
    lock: transaction.LOCK.UPDATE
  })

  if (waitingAssignment) {
    throw new BadRequestError(
      `Tài nguyên ${resourceCode} còn được gán cho công đoạn WAITING. Vui lòng đổi tài nguyên ở công đoạn đó trước.`
    )
  }
}

const createDuplicateCodeError = () => new ConflictError('Mã tài nguyên đã tồn tại.')

export const getResourcesService = async (query: GetResourcesQuery) => {
  const resources = await Resource.findAll({
    where: buildResourceWhere(query),
    attributes: RESOURCE_ATTRIBUTES,
    order: [
      ['isActive', 'DESC'],
      ['type', 'ASC'],
      ['code', 'ASC']
    ]
  })

  const summaries = await getUsageSummaries(resources.map((resource) => resource.get('id') as string | number))

  return resources.map((resource) => toResourceDto(resource, summaries.get(String(resource.get('id')))))
}

export const getResourceByIdService = async (id: string | number) => {
  const resource = await findResourceOrFail(id)
  const resourceId = resource.get('id') as string | number
  const summaries = await getUsageSummaries([resourceId])

  const currentStages = await OrderStage.findAll({
    where: {
      assignedResourceId: resourceId,
      status: {
        [Op.in]: [ORDER_STAGE_STATUS.IN_PROGRESS, ORDER_STAGE_STATUS.BLOCKED, ORDER_STAGE_STATUS.WAITING]
      }
    },
    attributes: ['id', 'code', 'name', 'status', 'orderId', 'updatedAt'],
    include: [
      {
        model: Order,
        as: 'order',
        attributes: ['id', 'code', 'customerName', 'productName']
      }
    ]
  })

  const stageRank: Record<string, number> = {
    [ORDER_STAGE_STATUS.IN_PROGRESS]: 1,
    [ORDER_STAGE_STATUS.BLOCKED]: 2,
    [ORDER_STAGE_STATUS.WAITING]: 3
  }

  const currentStage =
    currentStages
      .map((stage) => stage.get({ plain: true }) as Record<string, unknown>)
      .sort((first, second) => {
        const rankDiff = (stageRank[String(first.status)] ?? 99) - (stageRank[String(second.status)] ?? 99)
        if (rankDiff !== 0) return rankDiff

        return new Date(String(second.updatedAt ?? 0)).getTime() - new Date(String(first.updatedAt ?? 0)).getTime()
      })[0] ?? null

  const openIncident = await Incident.findOne({
    where: { resourceId, status: INCIDENT_STATUS.OPEN },
    attributes: ['id', 'code', 'type', 'severity', 'status', 'rawDescription', 'createdAt'],
    order: [['createdAt', 'DESC']]
  })

  return {
    ...toResourceDto(resource, summaries.get(String(resourceId))),
    currentStage,
    openIncident: openIncident ? openIncident.get({ plain: true }) : null
  }
}

export const createResourceService = async (input: CreateResourceInput) => {
  try {
    const resource = await Resource.create({
      ...normalizeResourcePayload(input),
      status: RESOURCE_STATUS.AVAILABLE,
      isActive: true
    })

    return getResourceByIdService(resource.get('id') as string | number)
  } catch (error) {
    if (error instanceof UniqueConstraintError) throw createDuplicateCodeError()
    throw error
  }
}

export const updateResourceService = async (id: string | number, input: UpdateResourceInput) => {
  const resourceId = await sequelize.transaction(async (transaction) => {
    const resource = await findResourceOrFail(id, transaction)
    const resourceId = resource.get('id') as string | number
    const summaries = await getUsageSummaries([resourceId], transaction)
    const usage = summaries.get(String(resourceId)) ?? emptyUsageSummary()
    const hasUsage = usage.orderStageCount + usage.incidentCount > 0

    if (hasUsage && input.code !== undefined && input.code.trim().toUpperCase() !== resource.get('code')) {
      throw new BadRequestError('Không thể đổi mã tài nguyên đã có lịch sử sử dụng.')
    }

    if (hasUsage && input.type !== undefined && input.type !== resource.get('type')) {
      throw new BadRequestError('Không thể đổi loại tài nguyên đã có lịch sử sử dụng.')
    }

    if (input.isActive === false && resource.get('isActive') !== false) {
      await assertCanDeactivateResource(resource, transaction)
    }

    const payload = normalizeResourcePayload(input)

    try {
      await resource.update(
        {
          ...(payload.code !== undefined ? { code: payload.code } : {}),
          ...(payload.name !== undefined ? { name: payload.name } : {}),
          ...(payload.type !== undefined ? { type: payload.type } : {}),
          ...(payload.description !== undefined ? { description: payload.description } : {}),
          ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {})
        },
        { transaction }
      )
    } catch (error) {
      if (error instanceof UniqueConstraintError) throw createDuplicateCodeError()
      throw error
    }

    return resourceId
  })

  return getResourceByIdService(resourceId)
}

export const deleteResourceService = async (id: string | number) => {
  return sequelize.transaction(async (transaction) => {
    const resource = await findResourceOrFail(id, transaction)
    await assertCanDeactivateResource(resource, transaction)

    const resourceId = resource.get('id') as string | number
    const summaries = await getUsageSummaries([resourceId], transaction)
    const usage = summaries.get(String(resourceId)) ?? emptyUsageSummary()
    const hasUsage = usage.orderStageCount + usage.incidentCount > 0

    if (!hasUsage) {
      await resource.destroy({ transaction })
      return { deleted: true, deactivated: false, id: resourceId }
    }

    await resource.update({ isActive: false }, { transaction })
    return { deleted: false, deactivated: true, id: resourceId }
  })
}

export default {
  createResourceService,
  deleteResourceService,
  getResourceByIdService,
  getResourcesService,
  updateResourceService
}
