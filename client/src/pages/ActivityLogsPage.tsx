import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Clock,
  MessageCircle,
  Package,
  PlayCircle,
  Search,
  Settings,
  UserRound
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import activityLogService from '../services/activityLogService'
import type {
  ActivityLog,
  ActivityLogOrderGroup,
  ActivityLogsPagination,
  GetActivityLogOrderGroupsParams,
  GetActivityLogsParams
} from '../types/activityLog'
import type { ApiErrorType } from '../types/error'
import { getApiErrorMessage } from '../utils/apiError'
import { formatDateTime } from '../utils/orderDisplay'

const eventTypeOptions = [
  { label: 'Tất cả sự kiện', value: '' },
  { label: 'Tạo đơn hàng', value: 'ORDER_CREATED' },
  { label: 'Thay đổi trạng thái đơn', value: 'ORDER_STATUS_CHANGED' },
  { label: 'Bắt đầu công đoạn', value: 'STAGE_STARTED' },
  { label: 'Hoàn thành công đoạn', value: 'STAGE_COMPLETED' },
  { label: 'Công đoạn bị chặn', value: 'STAGE_BLOCKED' },
  { label: 'Gán tài nguyên', value: 'RESOURCE_ASSIGNED' },
  { label: 'Thay đổi trạng thái tài nguyên', value: 'RESOURCE_STATUS_CHANGED' },
  { label: 'Báo sự cố', value: 'INCIDENT_CREATED' },
  { label: 'Xử lý sự cố', value: 'INCIDENT_RESOLVED' },
  { label: 'Gửi thông báo Telegram', value: 'TELEGRAM_ALERT_SENT' }
]

const eventTypeLabels = Object.fromEntries(
  eventTypeOptions.filter((option) => option.value).map((option) => [option.value, option.label])
)

const initialPagination: ActivityLogsPagination = {
  page: 1,
  limit: 10,
  totalItems: 0,
  totalPages: 0
}

const getEventLabel = (eventType: string) => eventTypeLabels[eventType] ?? eventType

const renderEventIcon = (eventType: string) => {
  const className = 'h-5 w-5'

  if (eventType.includes('INCIDENT')) return <AlertTriangle className={className} />
  if (eventType.includes('TELEGRAM')) return <MessageCircle className={className} />
  if (eventType.includes('RESOURCE')) return <Settings className={className} />
  if (eventType.includes('COMPLETED') || eventType.includes('RESOLVED')) return <CheckCircle2 className={className} />
  if (eventType.includes('STARTED')) return <PlayCircle className={className} />
  if (eventType.includes('ORDER')) return <Package className={className} />
  return <ClipboardList className={className} />
}

const getSourceLabel = (metadata: Record<string, unknown> | null) => {
  const source = typeof metadata?.source === 'string' ? metadata.source : null
  if (!source) return null

  const labels: Record<string, string> = {
    TELEGRAM: 'Telegram',
    WEB: 'Web',
    SYSTEM: 'Hệ thống'
  }

  return labels[source] ?? source
}

const getStatusTransition = (metadata: Record<string, unknown> | null) => {
  const previousStatus = typeof metadata?.previousStatus === 'string' ? metadata.previousStatus : null
  const newStatus = typeof metadata?.newStatus === 'string' ? metadata.newStatus : null

  if (!previousStatus || !newStatus) return null
  return `${previousStatus} -> ${newStatus}`
}

const ActivityTimelineItem = ({ activity }: { activity: ActivityLog }) => {
  const sourceLabel = getSourceLabel(activity.metadata)
  const statusTransition = getStatusTransition(activity.metadata)

  return (
    <article className='relative border-b border-slate-100 px-5 py-5 last:border-b-0 sm:px-6'>
      <div className='flex gap-4'>
        <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600'>
          {renderEventIcon(activity.eventType)}
        </div>
        <div className='min-w-0 flex-1'>
          <div className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
            <div className='min-w-0'>
              <p className='text-xs font-semibold text-slate-500'>{formatDateTime(activity.createdAt)}</p>
              <h2 className='mt-1 text-base font-bold text-slate-900'>{getEventLabel(activity.eventType)}</h2>
              <p className='mt-1 text-sm leading-6 text-slate-600'>{activity.message}</p>
            </div>
            <span className='w-fit rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600'>
              {activity.eventType}
            </span>
          </div>

          <div className='mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4'>
            <div>
              <p className='text-xs font-semibold uppercase text-slate-400'>Người thực hiện</p>
              <p className='mt-1 flex items-center gap-2 font-semibold text-slate-700'>
                <UserRound className='h-4 w-4 text-slate-400' />
                {activity.actor?.fullName ?? 'Hệ thống'}
              </p>
              {activity.actor?.role ? <p className='mt-1 text-xs text-slate-500'>{activity.actor.role}</p> : null}
            </div>

            <div>
              <p className='text-xs font-semibold uppercase text-slate-400'>Đơn hàng</p>
              {activity.order ? (
                <Link
                  to={`/orders/${activity.order.id}`}
                  className='mt-1 inline-flex font-semibold text-cyan-700 hover:text-cyan-800'
                >
                  {activity.order.code}
                </Link>
              ) : (
                <p className='mt-1 text-slate-500'>-</p>
              )}
              {activity.order ? <p className='mt-1 text-xs text-slate-500'>{activity.order.productName}</p> : null}
            </div>

            <div>
              <p className='text-xs font-semibold uppercase text-slate-400'>Công đoạn</p>
              <p className='mt-1 font-semibold text-slate-700'>{activity.orderStage?.name ?? '-'}</p>
              {activity.orderStage ? <p className='mt-1 text-xs text-slate-500'>{activity.orderStage.code}</p> : null}
            </div>

            <div>
              <p className='text-xs font-semibold uppercase text-slate-400'>Sự cố</p>
              <p className='mt-1 font-semibold text-slate-700'>{activity.incident?.code ?? '-'}</p>
              {activity.incident ? <p className='mt-1 text-xs text-slate-500'>{activity.incident.status}</p> : null}
            </div>
          </div>

          {sourceLabel || statusTransition ? (
            <div className='mt-4 flex flex-wrap gap-2'>
              {sourceLabel ? (
                <span className='rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700'>
                  Nguồn: {sourceLabel}
                </span>
              ) : null}
              {statusTransition ? (
                <span className='rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600'>
                  {statusTransition}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}

const ActivityOrderCard = ({
  group,
  isSelected,
  onSelect
}: {
  group: ActivityLogOrderGroup
  isSelected: boolean
  onSelect: (group: ActivityLogOrderGroup) => void
}) => (
  <button
    type='button'
    onClick={() => onSelect(group)}
    className={`w-full cursor-pointer border-b border-slate-100 px-5 py-5 text-left transition last:border-b-0 sm:px-6 ${
      isSelected ? 'bg-cyan-50' : 'bg-white hover:bg-slate-50'
    }`}
  >
    <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
      <div className='min-w-0'>
        <div className='flex items-center gap-3'>
          <span className='inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-cyan-700'>
            <Package className='h-5 w-5' />
          </span>
          <div className='min-w-0'>
            <p className='truncate text-base font-bold text-cyan-700'>{group.order.code}</p>
            <p className='mt-1 truncate text-sm text-slate-500'>{group.order.productName}</p>
          </div>
        </div>
        <p className='mt-3 text-sm font-semibold text-slate-700'>{group.order.customerName}</p>
      </div>
      <div className='flex flex-wrap gap-2 text-xs font-semibold text-slate-600 sm:justify-end'>
        <span className='rounded-full border border-slate-200 bg-white px-3 py-1'>{group.activityCount} hoạt động</span>
        <span className='inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1'>
          <Clock className='h-3.5 w-3.5' />
          {formatDateTime(group.latestActivityAt)}
        </span>
      </div>
    </div>
  </button>
)

const ActivityLogsPage = () => {
  const [searchParams] = useSearchParams()
  const initialOrderId = searchParams.get('orderId') ?? ''
  const [orderGroups, setOrderGroups] = useState<ActivityLogOrderGroup[]>([])
  const [orderPagination, setOrderPagination] = useState<ActivityLogsPagination>(initialPagination)
  const [orderLoading, setOrderLoading] = useState(false)
  const [orderError, setOrderError] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<ActivityLogOrderGroup['order'] | null>(
    initialOrderId ? { id: Number(initialOrderId), code: `#${initialOrderId}`, customerName: '', productName: '' } : null
  )
  const [items, setItems] = useState<ActivityLog[]>([])
  const [pagination, setPagination] = useState<ActivityLogsPagination>(initialPagination)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchInput, setSearchInput] = useState(() => searchParams.get('search') ?? '')
  const [filters, setFilters] = useState<GetActivityLogsParams>({
    page: Number(searchParams.get('page')) || 1,
    limit: 10,
    search: searchParams.get('search') ?? '',
    eventType: searchParams.get('eventType') ?? '',
    orderId: initialOrderId,
    actorUserId: searchParams.get('actorUserId') ?? '',
    incidentId: searchParams.get('incidentId') ?? '',
    from: searchParams.get('from') ?? '',
    to: searchParams.get('to') ?? ''
  })

  const requestParams = useMemo(
    () => ({
      ...filters,
      search: filters.search?.trim() || undefined,
      eventType: filters.eventType || undefined,
      orderId: selectedOrder?.id || filters.orderId || undefined,
      actorUserId: filters.actorUserId || undefined,
      incidentId: filters.incidentId || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined
    }),
    [filters, selectedOrder?.id]
  )

  const orderGroupParams = useMemo<GetActivityLogOrderGroupsParams>(
    () => ({
      search: filters.search?.trim() || undefined,
      eventType: filters.eventType || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      page: filters.page,
      limit: filters.limit
    }),
    [filters.eventType, filters.from, filters.limit, filters.page, filters.search, filters.to]
  )

  const loadActivityLogOrders = useCallback(() => {
    if (selectedOrder) return

    setOrderLoading(true)
    setOrderError('')

    activityLogService
      .getActivityLogOrders(orderGroupParams)
      .then((response) => {
        setOrderGroups(response.data.data.items)
        setOrderPagination(response.data.data.pagination)
      })
      .catch((requestError: ApiErrorType) => {
        setOrderGroups([])
        setOrderPagination(initialPagination)
        setOrderError(getApiErrorMessage(requestError, 'Không thể tải danh sách đơn hàng có nhật ký.'))
      })
      .finally(() => setOrderLoading(false))
  }, [orderGroupParams, selectedOrder])

  const loadActivityLogs = useCallback(() => {
    if (!selectedOrder && !requestParams.orderId) return

    setLoading(true)
    setError('')

    activityLogService
      .getActivityLogs(requestParams)
      .then((response) => {
        const nextItems = response.data.data.items

        setItems(nextItems)
        setPagination(response.data.data.pagination)

        if (selectedOrder && (!selectedOrder.productName || !selectedOrder.customerName)) {
          const orderFromLog = nextItems.find((item) => item.order)?.order
          if (orderFromLog) setSelectedOrder(orderFromLog)
        }
      })
      .catch((requestError: ApiErrorType) => {
        setItems([])
        setPagination(initialPagination)
        setError(getApiErrorMessage(requestError, 'Không thể tải nhật ký hoạt động.'))
      })
      .finally(() => setLoading(false))
  }, [requestParams, selectedOrder])

  useEffect(() => {
    const timer = setTimeout(selectedOrder ? loadActivityLogs : loadActivityLogOrders, 250)

    return () => clearTimeout(timer)
  }, [loadActivityLogOrders, loadActivityLogs, selectedOrder])

  const updateFilter = (nextFilters: Partial<GetActivityLogsParams>) => {
    setFilters((current) => ({
      ...current,
      ...nextFilters,
      page: nextFilters.page ?? 1
    }))
  }

  const handleSearch = () => updateFilter({ search: searchInput })

  const handleSelectOrder = (group: ActivityLogOrderGroup) => {
    setSelectedOrder(group.order)
    setItems([])
    setPagination(initialPagination)
    setFilters((current) => ({
      ...current,
      orderId: group.order.id,
      page: 1
    }))
  }

  const handleBackToOrders = () => {
    setSelectedOrder(null)
    setItems([])
    setPagination(initialPagination)
    setError('')
    setFilters((current) => ({
      ...current,
      orderId: '',
      page: 1
    }))
  }

  const hasFilters = Boolean(
    requestParams.search ||
      requestParams.eventType ||
      requestParams.actorUserId ||
      requestParams.incidentId ||
      requestParams.from ||
      requestParams.to
  )

  const activePagination = selectedOrder ? pagination : orderPagination
  const isLoading = selectedOrder ? loading : orderLoading

  return (
    <main className='p-4 text-slate-900 sm:p-6'>
      <div className='mx-auto max-w-7xl'>
        <section className='overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm'>
          <div className='border-b border-slate-200 p-5 sm:p-6'>
            <div>
              <p className='text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700'>Activity Logs</p>
              <h1 className='mt-2 text-2xl font-bold text-slate-800 sm:text-3xl'>Nhật ký hoạt động</h1>
              <p className='mt-2 max-w-3xl text-sm leading-6 text-slate-500'>
                Gom nhật ký theo từng đơn hàng để dễ theo dõi toàn bộ lịch sử thao tác.
              </p>
            </div>

            <div className='mt-6 grid gap-3 lg:grid-cols-[minmax(240px,1fr)_220px_160px_160px_auto]'>
              <label className='relative block'>
                <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleSearch()
                  }}
                  className='h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-100'
                  placeholder={selectedOrder ? 'Tìm nội dung nhật ký...' : 'Tìm mã đơn, khách hàng, sản phẩm...'}
                />
              </label>
              <select
                value={filters.eventType}
                onChange={(event) => updateFilter({ eventType: event.target.value })}
                className='h-11 rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-100'
              >
                {eventTypeOptions.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                type='date'
                value={filters.from}
                onChange={(event) => updateFilter({ from: event.target.value })}
                aria-label='Từ ngày'
                className='h-11 rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-100'
              />
              <input
                type='date'
                value={filters.to}
                onChange={(event) => updateFilter({ to: event.target.value })}
                aria-label='Đến ngày'
                className='h-11 rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-100'
              />
              <button
                type='button'
                onClick={handleSearch}
                className='h-11 cursor-pointer rounded-lg bg-cyan-500 px-5 text-sm font-semibold whitespace-nowrap text-white transition hover:bg-cyan-600'
              >
                Tìm kiếm
              </button>
            </div>
          </div>

          {!selectedOrder && orderError ? (
            <div className='border-b border-rose-100 bg-rose-50 p-5 text-sm font-medium text-rose-600 sm:p-6'>
              <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                <span>{orderError}</span>
                <button
                  type='button'
                  onClick={loadActivityLogOrders}
                  className='w-fit rounded-lg bg-rose-600 px-4 py-2 text-white'
                >
                  Thử lại
                </button>
              </div>
            </div>
          ) : null}

          {selectedOrder && error ? (
            <div className='border-b border-rose-100 bg-rose-50 p-5 text-sm font-medium text-rose-600 sm:p-6'>
              <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                <span>{error}</span>
                <button
                  type='button'
                  onClick={loadActivityLogs}
                  className='w-fit rounded-lg bg-rose-600 px-4 py-2 text-white'
                >
                  Thử lại
                </button>
              </div>
            </div>
          ) : null}

          {!selectedOrder ? (
            orderLoading ? (
              <div className='p-10 text-center text-sm font-medium text-slate-500'>Đang tải danh sách đơn hàng...</div>
            ) : orderGroups.length === 0 ? (
              <div className='p-10 text-center text-sm text-slate-500'>
                {hasFilters ? 'Không tìm thấy đơn hàng phù hợp.' : 'Chưa có nhật ký nào được ghi nhận theo đơn hàng.'}
              </div>
            ) : (
              <div className='divide-y divide-slate-100'>
                {orderGroups.map((group) => (
                  <ActivityOrderCard
                    key={group.order.id}
                    group={group}
                    isSelected={false}
                    onSelect={handleSelectOrder}
                  />
                ))}
              </div>
            )
          ) : (
            <>
              <div className='border-b border-slate-200 bg-slate-50 px-5 py-4 sm:px-6'>
                <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                  <div>
                    <button
                      type='button'
                      onClick={handleBackToOrders}
                      className='inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-cyan-700 hover:text-cyan-800'
                    >
                      <ArrowLeft className='h-4 w-4' />
                      Danh sách đơn hàng
                    </button>
                    <div className='mt-3'>
                      <p className='text-lg font-bold text-slate-900'>{selectedOrder.code}</p>
                      {selectedOrder.productName ? (
                        <p className='mt-1 text-sm text-slate-500'>{selectedOrder.productName}</p>
                      ) : null}
                      {selectedOrder.customerName ? (
                        <p className='mt-1 text-sm font-semibold text-slate-700'>{selectedOrder.customerName}</p>
                      ) : null}
                    </div>
                  </div>
                  <Link
                    to={`/orders/${selectedOrder.id}`}
                    className='inline-flex h-10 w-fit items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50'
                  >
                    Xem đơn hàng
                  </Link>
                </div>
              </div>

              {loading ? (
                <div className='p-10 text-center text-sm font-medium text-slate-500'>Đang tải nhật ký hoạt động...</div>
              ) : items.length === 0 ? (
                <div className='p-10 text-center text-sm text-slate-500'>
                  {hasFilters ? 'Không tìm thấy hoạt động phù hợp.' : 'Đơn hàng này chưa có hoạt động nào được ghi nhận.'}
                </div>
              ) : (
                <div className='divide-y divide-slate-100'>
                  {items.map((activity) => (
                    <ActivityTimelineItem key={activity.id} activity={activity} />
                  ))}
                </div>
              )}
            </>
          )}

          <div className='flex flex-col gap-3 border-t border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between'>
            <p className='text-sm text-slate-500'>
              Trang {activePagination.page}/{Math.max(activePagination.totalPages, 1)} · {activePagination.totalItems}{' '}
              {selectedOrder ? 'hoạt động' : 'đơn hàng'}
            </p>
            <div className='flex gap-2'>
              <button
                type='button'
                disabled={activePagination.page <= 1 || isLoading}
                onClick={() => updateFilter({ page: activePagination.page - 1 })}
                className='h-10 cursor-pointer rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:text-slate-300'
              >
                Trước
              </button>
              <button
                type='button'
                disabled={activePagination.page >= activePagination.totalPages || isLoading}
                onClick={() => updateFilter({ page: activePagination.page + 1 })}
                className='h-10 cursor-pointer rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:text-slate-300'
              >
                Sau
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

export default ActivityLogsPage
