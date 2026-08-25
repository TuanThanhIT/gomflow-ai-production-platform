import { fn, literal, Op, col, type WhereOptions } from 'sequelize'
import { ActivityLog, Incident, Order, OrderStage, User } from '../models/index.js'

export type GetActivityLogsQuery = {
  search?: string
  eventType?: string
  orderId?: string | number
  actorUserId?: string | number
  incidentId?: string | number
  from?: string
  to?: string
  page?: string | number
  limit?: string | number
}

export type GetActivityLogOrdersQuery = Pick<
  GetActivityLogsQuery,
  'search' | 'eventType' | 'from' | 'to' | 'page' | 'limit'
>

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 10
const MAX_LIMIT = 100

const toPositiveInteger = (value: string | number | undefined, fallback: number) => {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback
  return parsed
}

const normalizePagination = (query: GetActivityLogsQuery) => {
  const page = toPositiveInteger(query.page, DEFAULT_PAGE)
  const limit = Math.min(toPositiveInteger(query.limit, DEFAULT_LIMIT), MAX_LIMIT)

  return {
    page,
    limit,
    offset: (page - 1) * limit
  }
}

const parseLocalDate = (value?: string, endOfDay = false) => {
  if (!value) return null

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch
    const date = new Date(Number(year), Number(month) - 1, Number(day))
    if (endOfDay) date.setHours(23, 59, 59, 999)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  if (endOfDay) date.setHours(23, 59, 59, 999)
  return date
}

const buildWhere = (query: GetActivityLogsQuery): WhereOptions => {
  const where: WhereOptions = {}
  const search = query.search?.trim()
  const fromDate = parseLocalDate(query.from)
  const toDate = parseLocalDate(query.to, true)

  if (search) {
    where[Op.or as keyof WhereOptions] = [
      { message: { [Op.like]: `%${search}%` } },
      { eventType: { [Op.like]: `%${search}%` } }
    ]
  }

  if (query.eventType?.trim()) {
    where.eventType = query.eventType.trim()
  }

  if (query.orderId) {
    where.orderId = query.orderId
  }

  if (query.actorUserId) {
    where.actorUserId = query.actorUserId
  }

  if (query.incidentId) {
    where.incidentId = query.incidentId
  }

  if (fromDate || toDate) {
    where.createdAt = {
      ...(fromDate ? { [Op.gte]: fromDate } : {}),
      ...(toDate ? { [Op.lte]: toDate } : {})
    }
  }

  return where
}

const buildOrderWhere = (query: GetActivityLogOrdersQuery): WhereOptions => {
  const where: WhereOptions = {
    orderId: {
      [Op.ne]: null
    }
  }
  const fromDate = parseLocalDate(query.from)
  const toDate = parseLocalDate(query.to, true)

  if (query.eventType?.trim()) {
    where.eventType = query.eventType.trim()
  }

  if (fromDate || toDate) {
    where.createdAt = {
      ...(fromDate ? { [Op.gte]: fromDate } : {}),
      ...(toDate ? { [Op.lte]: toDate } : {})
    }
  }

  return where
}

const buildOrderSearchWhere = (query: GetActivityLogOrdersQuery): WhereOptions | undefined => {
  const search = query.search?.trim()
  if (!search) return undefined

  return {
    [Op.or]: [
      { code: { [Op.like]: `%${search}%` } },
      { customerName: { [Op.like]: `%${search}%` } },
      { productName: { [Op.like]: `%${search}%` } }
    ]
  }
}

export const getActivityLogsService = async (query: GetActivityLogsQuery) => {
  const { limit, offset, page } = normalizePagination(query)
  const where = buildWhere(query)

  const { count, rows } = await ActivityLog.findAndCountAll({
    where,
    attributes: ['id', 'eventType', 'message', 'metadata', 'createdAt'],
    include: [
      {
        model: User,
        as: 'actor',
        attributes: ['id', 'fullName', 'role'],
        required: false
      },
      {
        model: Order,
        as: 'order',
        attributes: ['id', 'code', 'customerName', 'productName'],
        required: false
      },
      {
        model: OrderStage,
        as: 'orderStage',
        attributes: ['id', 'code', 'name', 'stepOrder', 'status'],
        required: false
      },
      {
        model: Incident,
        as: 'incident',
        attributes: ['id', 'code', 'type', 'severity', 'status'],
        required: false
      }
    ],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
    distinct: true
  })

  return {
    items: rows.map((row) => row.get({ plain: true })),
    pagination: {
      page,
      limit,
      totalItems: count,
      totalPages: Math.ceil(count / limit)
    }
  }
}

export const getActivityLogOrdersService = async (query: GetActivityLogOrdersQuery) => {
  const { limit, offset, page } = normalizePagination(query)
  const where = buildOrderWhere(query)
  const orderWhere = buildOrderSearchWhere(query)
  const orderInclude = {
    model: Order,
    as: 'order',
    attributes: ['id', 'code', 'customerName', 'productName'],
    required: true,
    ...(orderWhere ? { where: orderWhere } : {})
  }

  const [totalItems, rows] = await Promise.all([
    ActivityLog.count({
      where,
      include: [orderInclude],
      distinct: true,
      col: 'order_id'
    }),
    ActivityLog.findAll({
      where,
      attributes: [
        'orderId',
        [fn('COUNT', col('ActivityLog.id')), 'activityCount'],
        [fn('MAX', col('ActivityLog.created_at')), 'latestActivityAt']
      ],
      include: [orderInclude],
      group: ['ActivityLog.order_id', 'order.id', 'order.code', 'order.customer_name', 'order.product_name'],
      order: [[literal('latestActivityAt'), 'DESC']],
      limit,
      offset,
      subQuery: false
    })
  ])

  return {
    items: rows.map((row) => {
      const plain = row.get({ plain: true }) as Record<string, unknown>

      return {
        order: plain.order,
        activityCount: Number(plain.activityCount) || 0,
        latestActivityAt: plain.latestActivityAt
      }
    }),
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit)
    }
  }
}

export default {
  getActivityLogsService,
  getActivityLogOrdersService
}
