import type { Model, WhereOptions } from 'sequelize'
import { col, fn, Op, type Order as SequelizeOrder } from 'sequelize'
import { INCIDENT_STATUS } from '../constants/incidentConstants.js'
import { ORDER_STATUS, RISK_LEVEL } from '../constants/orderConstants.js'
import { ORDER_STAGE_STATUS } from '../constants/orderStageConstants.js'
import { RESOURCE_STATUS } from '../constants/resourceConstants.js'
import { Incident, IncidentAffectedOrder, Order, OrderStage, ProcessTemplate, Resource } from '../models/index.js'

const KANBAN_LIMIT = 8
const ATTENTION_LIMIT = 6
const RECENT_INCIDENT_LIMIT = 6
const BROKEN_RESOURCE_LIMIT = 6

type CountRow = {
  status: string
  count: string | number
}

type TrendRow = {
  date: string | Date
  completedOrders: string | number
}

type PlainStage = {
  id: string | number
  code: string
  name: string
  status: string
  stepOrder: number
}

type PlainDashboardOrder = {
  id: string | number
  code: string
  customerName: string
  productName: string
  quantity: number
  deadline: string | Date
  priority: string
  status: string
  riskLevel: string
  progressPercent: string | number
  createdAt: string | Date
  updatedAt?: string | Date
  completedAt?: string | Date | null
  processTemplate?: {
    id: string | number
    code: string
    name: string
  } | null
  stages?: PlainStage[]
}

type PlainDashboardIncident = {
  id: string | number
  code: string
  rawDescription: string
  type: string
  severity: string
  status: string
  estimatedDelayMinutes: number | null
  createdAt: string | Date
  resource?: {
    id: string | number
    code: string
    name: string
    type: string
    status: string
  } | null
  orderStage?: {
    id: string | number
    code: string
    name: string
    status: string
    orderId: string | number
  } | null
}

type PlainResource = {
  id: string | number
  code: string
  name: string
  type: string
  status: string
}

const getPlain = <T>(model: Model): T => model.get({ plain: true }) as T

const countByStatus = async (model: typeof Order | typeof Incident | typeof Resource, where?: WhereOptions) => {
  const rows = await model.findAll({
    where,
    attributes: ['status', [fn('COUNT', col('status')), 'count']],
    group: ['status'],
    raw: true
  })

  return (rows as unknown as CountRow[]).reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = Number(row.count)
    return acc
  }, {})
}

const countAtRiskByRiskLevel = async () => {
  const rows = await Order.findAll({
    where: { status: ORDER_STATUS.AT_RISK },
    attributes: ['riskLevel', [fn('COUNT', col('risk_level')), 'count']],
    group: ['riskLevel'],
    raw: true
  })

  return (rows as unknown as Array<{ riskLevel: string; count: string | number }>).reduce<Record<string, number>>(
    (acc, row) => {
      acc[row.riskLevel] = Number(row.count)
      return acc
    },
    {}
  )
}

const orderInclude = [
  {
    model: ProcessTemplate,
    as: 'processTemplate',
    attributes: ['id', 'code', 'name']
  },
  {
    model: OrderStage,
    as: 'stages',
    attributes: ['id', 'code', 'name', 'status', 'stepOrder']
  }
]

const incidentInclude = [
  {
    model: Resource,
    as: 'resource',
    attributes: ['id', 'code', 'name', 'type', 'status']
  },
  {
    model: OrderStage,
    as: 'orderStage',
    attributes: ['id', 'code', 'name', 'status', 'orderId']
  }
]

const normalizeDate = (value: string | Date | null | undefined) => (value ? new Date(value).toISOString() : null)

const formatDateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const getCurrentStage = (stages: PlainStage[] = []) => {
  const sortedStages = [...stages].sort((first, second) => first.stepOrder - second.stepOrder)

  return (
    sortedStages.find((stage) => stage.status === ORDER_STAGE_STATUS.IN_PROGRESS) ??
    sortedStages.find((stage) => stage.status === ORDER_STAGE_STATUS.BLOCKED) ??
    sortedStages.find((stage) => stage.status === ORDER_STAGE_STATUS.WAITING) ??
    [...sortedStages].reverse().find((stage) => stage.status === ORDER_STAGE_STATUS.COMPLETED) ??
    null
  )
}

const toDashboardOrderDto = (order: PlainDashboardOrder) => {
  const currentStage = getCurrentStage(order.stages)

  return {
    id: order.id,
    code: order.code,
    customerName: order.customerName,
    productName: order.productName,
    quantity: order.quantity,
    deadline: normalizeDate(order.deadline),
    priority: order.priority,
    status: order.status,
    riskLevel: order.riskLevel,
    progressPercent: Number(order.progressPercent),
    createdAt: normalizeDate(order.createdAt),
    updatedAt: normalizeDate(order.updatedAt),
    completedAt: normalizeDate(order.completedAt),
    processTemplate: order.processTemplate ?? null,
    currentStage: currentStage
      ? {
          id: currentStage.id,
          code: currentStage.code,
          name: currentStage.name,
          status: currentStage.status
        }
      : null
  }
}

const riskRank: Record<string, number> = {
  [RISK_LEVEL.CRITICAL]: 4,
  [RISK_LEVEL.HIGH]: 3,
  [RISK_LEVEL.MEDIUM]: 2,
  [RISK_LEVEL.LOW]: 1,
  [RISK_LEVEL.NONE]: 0
}

const sortOrdersForStatus = (status: string): SequelizeOrder => {
  if (status === ORDER_STATUS.AT_RISK) {
    return [
      ['riskLevel', 'DESC'],
      ['deadline', 'ASC'],
      ['createdAt', 'ASC']
    ]
  }

  if (status === ORDER_STATUS.COMPLETED) {
    return [
      ['completedAt', 'DESC'],
      ['updatedAt', 'DESC']
    ]
  }

  return [
    ['deadline', 'ASC'],
    ['createdAt', 'ASC']
  ]
}

const getKanbanColumn = async (status: string) => {
  const { count, rows } = await Order.findAndCountAll({
    where: { status },
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
      'createdAt',
      'updatedAt',
      'completedAt'
    ],
    include: orderInclude,
    order: sortOrdersForStatus(status),
    limit: KANBAN_LIMIT,
    distinct: true
  })

  return {
    total: count,
    items: rows
      .map((row) => toDashboardOrderDto(getPlain<PlainDashboardOrder>(row)))
      .sort((first, second) => {
        if (status !== ORDER_STATUS.AT_RISK) return 0

        const riskDiff = (riskRank[second.riskLevel] ?? 0) - (riskRank[first.riskLevel] ?? 0)
        if (riskDiff !== 0) return riskDiff

        return new Date(first.deadline ?? 0).getTime() - new Date(second.deadline ?? 0).getTime()
      })
  }
}

const getAttentionOrders = async () => {
  const rows = await Order.findAll({
    where: {
      status: {
        [Op.notIn]: [ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED]
      },
      [Op.or]: [
        { status: ORDER_STATUS.AT_RISK },
        { riskLevel: { [Op.in]: [RISK_LEVEL.HIGH, RISK_LEVEL.CRITICAL] } },
        { deadline: { [Op.lt]: new Date() } }
      ]
    },
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
      'createdAt',
      'updatedAt',
      'completedAt'
    ],
    include: orderInclude,
    order: [
      ['deadline', 'ASC'],
      ['createdAt', 'ASC']
    ],
    limit: 24
  })

  return rows
    .map((row) => toDashboardOrderDto(getPlain<PlainDashboardOrder>(row)))
    .sort((first, second) => {
      const riskDiff = (riskRank[second.riskLevel] ?? 0) - (riskRank[first.riskLevel] ?? 0)
      if (riskDiff !== 0) return riskDiff

      return new Date(first.deadline ?? 0).getTime() - new Date(second.deadline ?? 0).getTime()
    })
    .slice(0, ATTENTION_LIMIT)
}

const getRecentIncidents = async () => {
  const rows = await Incident.findAll({
    attributes: ['id', 'code', 'rawDescription', 'type', 'severity', 'status', 'estimatedDelayMinutes', 'createdAt'],
    include: incidentInclude,
    order: [['createdAt', 'DESC']],
    limit: RECENT_INCIDENT_LIMIT
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

  const affectedCountByIncidentId = new Map<string, number>()
  affectedOrderCounts.forEach((row) => {
    affectedCountByIncidentId.set(String(row.get('incidentId')), Number(row.get('affectedOrderCount') ?? 0))
  })

  return rows.map((row) => {
    const incident = getPlain<PlainDashboardIncident>(row)

    return {
      id: incident.id,
      code: incident.code,
      rawDescription: incident.rawDescription,
      type: incident.type,
      severity: incident.severity,
      status: incident.status,
      estimatedDelayMinutes: incident.estimatedDelayMinutes,
      createdAt: normalizeDate(incident.createdAt),
      resource: incident.resource ?? null,
      orderStage: incident.orderStage ?? null,
      affectedOrderCount: affectedCountByIncidentId.get(String(incident.id)) ?? 0
    }
  })
}

const getResourceHealth = async (resourceCounts: Record<string, number>) => {
  const brokenResources = await Resource.findAll({
    where: { status: RESOURCE_STATUS.BROKEN, isActive: true },
    attributes: ['id', 'code', 'name', 'type', 'status'],
    order: [['updatedAt', 'DESC']],
    limit: BROKEN_RESOURCE_LIMIT
  })

  return {
    total: Object.values(resourceCounts).reduce((sum, count) => sum + count, 0),
    available: resourceCounts[RESOURCE_STATUS.AVAILABLE] ?? 0,
    inUse: resourceCounts[RESOURCE_STATUS.IN_USE] ?? 0,
    maintenance: resourceCounts[RESOURCE_STATUS.MAINTENANCE] ?? 0,
    broken: resourceCounts[RESOURCE_STATUS.BROKEN] ?? 0,
    brokenResources: brokenResources.map((row) => getPlain<PlainResource>(row))
  }
}

const getProductionTrend = async () => {
  const today = new Date()
  const startDate = new Date(today)
  startDate.setHours(0, 0, 0, 0)
  startDate.setDate(startDate.getDate() - 6)

  const rows = await Order.findAll({
    where: {
      status: ORDER_STATUS.COMPLETED,
      completedAt: {
        [Op.gte]: startDate
      }
    },
    attributes: [
      [fn('DATE', col('completed_at')), 'date'],
      [fn('COUNT', col('id')), 'completedOrders']
    ],
    group: [fn('DATE', col('completed_at'))],
    raw: true
  })

  const countByDate = (rows as unknown as TrendRow[]).reduce<Record<string, number>>((acc, row) => {
    const dateKey = typeof row.date === 'string' ? row.date.slice(0, 10) : formatDateKey(row.date)
    acc[dateKey] = Number(row.completedOrders)
    return acc
  }, {})

  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + index)
    const dateKey = formatDateKey(date)

    return {
      date: dateKey,
      label: new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(date),
      completedOrders: countByDate[dateKey] ?? 0
    }
  })
}

export const getDashboardService = async () => {
  const [
    orderCounts,
    atRiskLevelCounts,
    incidentCounts,
    resourceCounts,
    pending,
    inProgress,
    atRisk,
    completed,
    attentionOrders,
    recentIncidents,
    productionTrend
  ] = await Promise.all([
    countByStatus(Order),
    countAtRiskByRiskLevel(),
    countByStatus(Incident),
    countByStatus(Resource, { isActive: true }),
    getKanbanColumn(ORDER_STATUS.PENDING),
    getKanbanColumn(ORDER_STATUS.IN_PROGRESS),
    getKanbanColumn(ORDER_STATUS.AT_RISK),
    getKanbanColumn(ORDER_STATUS.COMPLETED),
    getAttentionOrders(),
    getRecentIncidents(),
    getProductionTrend()
  ])

  const resources = await getResourceHealth(resourceCounts)

  return {
    summary: {
      totalOrders: Object.values(orderCounts).reduce((sum, count) => sum + count, 0),
      pendingOrders: orderCounts[ORDER_STATUS.PENDING] ?? 0,
      inProgressOrders: orderCounts[ORDER_STATUS.IN_PROGRESS] ?? 0,
      atRiskOrders: orderCounts[ORDER_STATUS.AT_RISK] ?? 0,
      completedOrders: orderCounts[ORDER_STATUS.COMPLETED] ?? 0,
      openIncidents: incidentCounts[INCIDENT_STATUS.OPEN] ?? 0,
      highRiskOrders: atRiskLevelCounts[RISK_LEVEL.HIGH] ?? 0,
      criticalRiskOrders: atRiskLevelCounts[RISK_LEVEL.CRITICAL] ?? 0
    },
    kanban: {
      pending,
      inProgress,
      atRisk,
      completed
    },
    attentionOrders,
    recentIncidents,
    resources,
    charts: {
      productionTrend
    }
  }
}

export default {
  getDashboardService
}
