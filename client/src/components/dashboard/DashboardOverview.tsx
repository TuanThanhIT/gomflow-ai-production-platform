import { AlertTriangle, CircleDot, Factory, Flame, Gauge, PackageCheck, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import type {
  DashboardData,
  DashboardIncident,
  DashboardKanbanColumn,
  DashboardOrder,
  DashboardResourceHealth,
  DashboardSummary
} from '../../types/dashboard'
import { formatDate, formatProgress, getBadgeClass, getRiskLabel } from '../../utils/orderDisplay'
import {
  getIncidentBadgeClass,
  getIncidentSeverityLabel,
  getIncidentStatusLabel,
  getIncidentTypeLabel
} from '../../utils/incidentDisplay'
import OrderStatusChart from './charts/OrderStatusChart'
import ProductionTrendChart from './charts/ProductionTrendChart'
import ResourceStatusChart from './charts/ResourceStatusChart'

const kanbanConfig = [
  { key: 'pending', title: 'PENDING', label: 'Chờ sản xuất', tone: 'slate' },
  { key: 'inProgress', title: 'IN PROGRESS', label: 'Đang sản xuất', tone: 'cyan' },
  { key: 'atRisk', title: 'AT RISK', label: 'Có rủi ro', tone: 'amber' },
  { key: 'completed', title: 'COMPLETED', label: 'Hoàn thành', tone: 'emerald' }
] as const

const isOverdue = (deadline: string | null, status: string) =>
  Boolean(deadline && status !== 'COMPLETED' && new Date(deadline).getTime() < Date.now())

const formatShortDate = (value: string | null) =>
  formatDate(value, {
    day: '2-digit',
    month: '2-digit'
  })

const formatRelativeTime = (value: string | null) => {
  if (!value) return '-'

  const diffSeconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (diffSeconds < 60) return 'Vừa xong'

  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) return `${diffMinutes} phút trước`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} giờ trước`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} ngày trước`
}

const ProgressBar = ({ value, danger = false }: { value: number; danger?: boolean }) => (
  <div className='space-y-2'>
    <div className='flex items-center justify-between text-xs font-semibold text-slate-500'>
      <span>Tiến độ</span>
      <span>{formatProgress(value)}</span>
    </div>
    <div className='h-2 rounded-full bg-slate-100'>
      <div
        className={`h-full rounded-full ${danger ? 'bg-rose-500' : 'bg-cyan-600'}`}
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  </div>
)

const DashboardSkeleton = () => (
  <main className='p-4 text-slate-900 sm:p-6'>
    <div className='mx-auto max-w-7xl space-y-5'>
      <div className='h-20 animate-pulse rounded-lg bg-white shadow-sm' />
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className='h-32 animate-pulse rounded-lg bg-white shadow-sm' />
        ))}
      </div>
      <div className='h-96 animate-pulse rounded-lg bg-white shadow-sm' />
      <div className='grid gap-5 xl:grid-cols-2'>
        <div className='h-72 animate-pulse rounded-lg bg-white shadow-sm' />
        <div className='h-72 animate-pulse rounded-lg bg-white shadow-sm' />
      </div>
    </div>
  </main>
)

const KpiCard = ({
  icon: Icon,
  label,
  value,
  caption,
  to,
  danger = false
}: {
  icon: typeof Factory
  label: string
  value: number
  caption?: string
  to?: string
  danger?: boolean
}) => {
  const content = (
    <div
      className={`h-full rounded-lg border bg-white p-5 shadow-sm transition ${
        danger ? 'border-amber-200 ring-1 ring-amber-100' : 'border-slate-200'
      } ${to ? 'hover:border-cyan-200 hover:shadow-md' : ''}`}
    >
      <div className='flex items-start justify-between gap-3'>
        <div>
          <p className='text-sm font-semibold text-slate-500'>{label}</p>
          <p className={`mt-3 text-3xl font-bold ${danger ? 'text-amber-700' : 'text-slate-900'}`}>
            {value.toLocaleString('vi-VN')}
          </p>
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
            danger ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-700'
          }`}
        >
          <Icon className='h-5 w-5' />
        </div>
      </div>
      {caption ? <p className='mt-4 text-xs font-medium text-slate-500'>{caption}</p> : null}
    </div>
  )

  return to ? <Link to={to}>{content}</Link> : content
}

const DashboardHeader = ({
  connected,
  onRefresh,
  refreshing
}: {
  connected: boolean
  onRefresh: () => void
  refreshing: boolean
}) => (
  <section className='flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between'>
    <div>
      <h1 className='text-2xl font-bold text-slate-900 sm:text-3xl'>Dashboard</h1>
      <p className='mt-2 text-sm text-slate-500'>Tổng quan vận hành xưởng theo thời gian thực</p>
    </div>
    <div className='flex flex-wrap items-center gap-3'>
      <span
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
          connected
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-slate-200 bg-slate-50 text-slate-500'
        }`}
      >
        <CircleDot className='h-3.5 w-3.5' />
        {connected ? 'Realtime connected' : 'Đang kết nối lại...'}
      </span>
      <button
        type='button'
        onClick={onRefresh}
        disabled={refreshing}
        className='inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-cyan-200 hover:text-cyan-700 disabled:cursor-not-allowed disabled:text-slate-300'
      >
        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        Làm mới
      </button>
    </div>
  </section>
)

const KpiGrid = ({ summary }: { summary: DashboardSummary }) => (
  <section className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
    <KpiCard icon={Factory} label='Tổng đơn hàng' value={summary.totalOrders} to='/orders' />
    <KpiCard icon={Gauge} label='Đang sản xuất' value={summary.inProgressOrders} to='/orders?status=IN_PROGRESS' />
    <KpiCard
      icon={AlertTriangle}
      label='Đang rủi ro'
      value={summary.atRiskOrders}
      caption={`HIGH: ${summary.highRiskOrders} · CRITICAL: ${summary.criticalRiskOrders}`}
      to='/orders?status=AT_RISK'
      danger
    />
    <KpiCard icon={Flame} label='Sự cố đang mở' value={summary.openIncidents} to='/incidents?status=OPEN' danger />
  </section>
)

const OrderKanbanCard = ({ order }: { order: DashboardOrder }) => {
  const overdue = isOverdue(order.deadline, order.status)
  const riskClass =
    order.riskLevel === 'CRITICAL'
      ? 'border-rose-300 bg-rose-50 text-rose-700'
      : order.riskLevel === 'HIGH'
        ? 'border-orange-300 bg-orange-50 text-orange-700'
        : getBadgeClass(order.riskLevel)

  return (
    <Link
      to={`/orders/${order.id}`}
      className={`block rounded-lg border bg-white p-4 shadow-sm transition hover:border-cyan-200 hover:shadow-md ${
        order.status === 'AT_RISK' ? 'border-amber-200' : 'border-slate-200'
      }`}
    >
      <div className='flex items-start justify-between gap-3'>
        <p className='font-mono text-base font-bold text-slate-900'>{order.code}</p>
        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${riskClass}`}>
          {getRiskLabel(order.riskLevel)}
        </span>
      </div>
      <p className='mt-3 line-clamp-2 text-sm font-semibold text-slate-800'>{order.productName}</p>
      {order.customerName ? <p className='mt-1 line-clamp-1 text-xs text-slate-500'>{order.customerName}</p> : null}
      {order.status === 'IN_PROGRESS' || order.status === 'AT_RISK' ? (
        <div className='mt-4'>
          <ProgressBar value={order.progressPercent} danger={order.status === 'AT_RISK'} />
        </div>
      ) : null}
      <div className='mt-4 space-y-2 text-xs text-slate-500'>
        {order.currentStage ? (
          <div className='flex items-center justify-between gap-3'>
            <span>Công đoạn</span>
            <span className='max-w-32 truncate font-semibold text-slate-700' title={order.currentStage.name}>
              {order.currentStage.name}
            </span>
          </div>
        ) : null}
        {order.currentStage?.status === 'BLOCKED' ? (
          <span className='inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-1 font-semibold text-amber-700'>
            Công đoạn bị chặn
          </span>
        ) : null}
        <div className='flex items-center justify-between gap-3'>
          <span>Hạn giao</span>
          <span className={`font-semibold ${overdue ? 'text-rose-700' : 'text-slate-700'}`}>
            {formatShortDate(order.deadline)}
          </span>
        </div>
      </div>
    </Link>
  )
}

const KanbanColumn = ({
  column,
  title,
  label,
  status
}: {
  column: DashboardKanbanColumn
  title: string
  label: string
  status: string
}) => (
  <div className='flex h-full min-h-0 w-[280px] shrink-0 flex-col rounded-lg border border-slate-200 bg-slate-50 lg:w-auto'>
    <div className='shrink-0 flex items-center justify-between border-b border-slate-200 px-4 py-3'>
      <div>
        <p className='text-xs font-bold tracking-wide text-slate-500'>{title}</p>
        <p className='mt-1 text-xs text-slate-400'>{label}</p>
      </div>
      <span className='rounded-full bg-white px-2.5 py-1 text-sm font-bold text-slate-700'>{column.total}</span>
    </div>
    <div className='min-h-0 flex-1 space-y-3 overflow-y-auto p-3 [scrollbar-gutter:stable]'>
      {column.items.length > 0 ? (
        column.items.map((order) => <OrderKanbanCard key={order.id} order={order} />)
      ) : (
        <div className='flex h-40 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white px-4 text-center text-sm font-medium text-slate-400'>
          {status === 'AT_RISK' ? 'Không có đơn hàng rủi ro' : 'Chưa có đơn hàng'}
        </div>
      )}
    </div>
    {column.total > column.items.length ? (
      <Link
        to={`/orders?status=${status}`}
        className='shrink-0 border-t border-slate-200 px-4 py-3 text-center text-sm font-semibold text-cyan-700 hover:bg-white'
      >
        Xem tất cả {column.total}
      </Link>
    ) : null}
  </div>
)

const ProductionKanban = ({ data }: { data: DashboardData }) => (
  <section className='rounded-lg border border-slate-200 bg-white shadow-sm'>
    <div className='flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between'>
      <div>
        <h2 className='text-lg font-bold text-slate-900'>Production Kanban</h2>
        <p className='mt-1 text-sm text-slate-500'>Trạng thái backend hiện tại của các đơn hàng</p>
      </div>
      <Link to='/orders' className='text-sm font-semibold text-cyan-700 hover:text-cyan-800'>
        Danh sách đơn hàng
      </Link>
    </div>
    {data.summary.totalOrders === 0 ? (
      <div className='p-10 text-center'>
        <PackageCheck className='mx-auto h-10 w-10 text-slate-300' />
        <p className='mt-3 text-sm font-semibold text-slate-600'>Chưa có đơn hàng</p>
        <Link
          to='/orders/new'
          className='mt-5 inline-flex h-10 items-center rounded-lg bg-cyan-600 px-4 text-sm font-semibold text-white transition hover:bg-cyan-700'
        >
          Tạo đơn hàng
        </Link>
      </div>
    ) : (
      <div className='overflow-x-auto p-4'>
        <div className='grid h-[calc(100vh-260px)] min-h-[420px] max-h-[640px] min-w-[1120px] gap-4 lg:grid-cols-4'>
          {kanbanConfig.map((column) => (
            <KanbanColumn
              key={column.key}
              column={data.kanban[column.key]}
              title={column.title}
              label={column.label}
              status={column.title.replace(' ', '_')}
            />
          ))}
        </div>
      </div>
    )}
  </section>
)

const AttentionOrders = ({ orders }: { orders: DashboardOrder[] }) => (
  <section className='rounded-lg border border-slate-200 bg-white shadow-sm'>
    <div className='border-b border-slate-200 p-5'>
      <h2 className='text-lg font-bold text-slate-900'>Đơn hàng cần chú ý</h2>
    </div>
    <div className='divide-y divide-slate-100'>
      {orders.length > 0 ? (
        orders.map((order) => (
          <Link key={order.id} to={`/orders/${order.id}`} className='block p-4 transition hover:bg-slate-50'>
            <div className='flex items-start justify-between gap-3'>
              <div className='min-w-0'>
                <p className='font-mono text-sm font-bold text-slate-900'>{order.code}</p>
                <p className='mt-1 truncate text-sm font-semibold text-slate-700'>{order.productName}</p>
                <p className='mt-1 text-xs text-slate-500'>
                  Tiến độ {formatProgress(order.progressPercent)} · Hạn giao {formatShortDate(order.deadline)}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full border px-2 py-1 text-xs font-bold ${getBadgeClass(order.riskLevel)}`}
              >
                {getRiskLabel(order.riskLevel)}
              </span>
            </div>
          </Link>
        ))
      ) : (
        <div className='p-8 text-center text-sm font-medium text-slate-400'>Không có đơn hàng cần chú ý</div>
      )}
    </div>
  </section>
)

const ResourceHealth = ({ resources }: { resources: DashboardResourceHealth }) => (
  <section className='rounded-lg border border-slate-200 bg-white shadow-sm'>
    <div className='border-b border-slate-200 p-5'>
      <h2 className='text-lg font-bold text-slate-900'>Tình trạng tài nguyên</h2>
      <p className='mt-1 text-sm text-slate-500'>Phân bố theo trạng thái tài nguyên hiện tại</p>
    </div>
    <div className='space-y-4 p-5'>
      <ResourceStatusChart resources={resources} />
      {resources.brokenResources.length > 0 ? (
        <div className='border-t border-slate-100 pt-4'>
          <p className='text-sm font-bold text-rose-700'>Tài nguyên đang hỏng</p>
          <div className='mt-3 space-y-2'>
            {resources.brokenResources.map((resource) => (
              <div
                key={resource.id}
                className='flex items-center justify-between gap-3 rounded-lg bg-rose-50 px-3 py-2'
              >
                <div className='min-w-0'>
                  <p className='truncate font-mono text-sm font-bold text-slate-900'>{resource.code}</p>
                  <p className='truncate text-xs text-slate-500'>{resource.name}</p>
                </div>
                <span className='rounded-full border border-rose-200 bg-white px-2 py-1 text-xs font-bold text-rose-700'>
                  {resource.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  </section>
)

const RecentIncidents = ({ incidents }: { incidents: DashboardIncident[] }) => (
  <section className='rounded-lg border border-slate-200 bg-white shadow-sm'>
    <div className='border-b border-slate-200 p-5'>
      <h2 className='text-lg font-bold text-slate-900'>Sự cố gần đây</h2>
    </div>
    <div className='divide-y divide-slate-100'>
      {incidents.length > 0 ? (
        incidents.map((incident) => (
          <div key={incident.id} className='p-4'>
            <div className='flex items-start justify-between gap-3'>
              <div className='min-w-0'>
                <p className='font-mono text-sm font-bold text-slate-900'>{incident.code}</p>
                <p className='mt-1 line-clamp-1 text-sm text-slate-600'>{getIncidentTypeLabel(incident.type)}</p>
                <p className='mt-1 text-xs text-slate-500'>
                  {incident.resource?.name || incident.orderStage?.name || '-'} ·{' '}
                  {formatRelativeTime(incident.createdAt)}
                </p>
              </div>
              <div className='flex shrink-0 flex-col items-end gap-2'>
                <span
                  className={`rounded-full border px-2 py-1 text-xs font-bold ${getIncidentBadgeClass(incident.severity)}`}
                >
                  {getIncidentSeverityLabel(incident.severity)}
                </span>
                <span
                  className={`rounded-full border px-2 py-1 text-xs font-bold ${getIncidentBadgeClass(incident.status)}`}
                >
                  {getIncidentStatusLabel(incident.status)}
                </span>
              </div>
            </div>
            {incident.affectedOrderCount > 0 ? (
              <p className='mt-2 text-xs font-medium text-slate-500'>{incident.affectedOrderCount} đơn bị ảnh hưởng</p>
            ) : null}
          </div>
        ))
      ) : (
        <div className='p-8 text-center text-sm font-medium text-slate-400'>Không có sự cố đang mở</div>
      )}
    </div>
  </section>
)

const DashboardError = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <main className='p-4 text-slate-900 sm:p-6'>
    <div className='mx-auto max-w-7xl rounded-lg border border-rose-200 bg-rose-50 p-6'>
      <p className='font-semibold text-rose-700'>{message}</p>
      <button
        type='button'
        onClick={onRetry}
        className='mt-4 inline-flex h-10 cursor-pointer items-center rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700'
      >
        Thử lại
      </button>
    </div>
  </main>
)

export const DashboardOverview = ({
  connected,
  data,
  error,
  loading,
  refreshing,
  onRefresh
}: {
  connected: boolean
  data?: DashboardData
  error: string
  loading: boolean
  refreshing: boolean
  onRefresh: () => void
}) => {
  if (loading && !data) return <DashboardSkeleton />
  if (error && !data) return <DashboardError message={error} onRetry={onRefresh} />
  if (!data) return null

  return (
    <main className='p-4 text-slate-900 sm:p-6'>
      <div className='mx-auto max-w-7xl space-y-5'>
        <DashboardHeader connected={connected} onRefresh={onRefresh} refreshing={refreshing} />
        <KpiGrid summary={data.summary} />
        <ProductionKanban data={data} />
        <div className='grid gap-5 xl:grid-cols-[1.1fr_0.9fr]'>
          <AttentionOrders orders={data.attentionOrders} />
          <ResourceHealth resources={data.resources} />
        </div>
        <div className='grid gap-5 xl:grid-cols-[1.1fr_0.9fr]'>
          <RecentIncidents incidents={data.recentIncidents} />
          <OrderStatusChart summary={data.summary} />
        </div>
        <ProductionTrendChart data={data.charts.productionTrend} />
        {error ? (
          <div className='rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-700'>
            {error}
          </div>
        ) : null}
      </div>
    </main>
  )
}

export { DashboardSkeleton }
