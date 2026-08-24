import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../redux/hook'
import { getOrders } from '../redux/slices/orderSlice'
import type { GetOrdersParams, OrderListItem, OrderPriority, OrderStatus, RiskLevel } from '../types/order'
import {
  formatDate,
  formatProgress,
  getBadgeClass,
  getPriorityLabel,
  getRiskLabel,
  getStatusLabel,
  orderStatusOptions,
  priorityOptions,
  riskLevelOptions
} from '../utils/orderDisplay'

const Badge = ({ value, label }: { value: string; label: string }) => (
  <span
    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap ${getBadgeClass(value)}`}
  >
    {label}
  </span>
)

const ProgressCell = ({ value }: { value: number }) => (
  <div className='min-w-24'>
    <div className='text-xs font-semibold text-slate-700'>{formatProgress(value)}</div>
    <div className='mt-2 h-2 rounded-full bg-slate-100'>
      <div className='h-full rounded-full bg-cyan-600' style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} />
    </div>
  </div>
)

const OrderTableRow = ({ index, order }: { index: number; order: OrderListItem }) => (
  <tr className='border-b border-slate-100 transition hover:bg-slate-50/80 last:border-0'>
    <td className='px-4 py-4 font-semibold whitespace-nowrap text-slate-500'>{index}</td>
    <td className='px-4 py-4 font-semibold whitespace-nowrap text-slate-800'>{order.code}</td>
    <td className='px-4 py-4 text-slate-700'>{order.customerName}</td>
    <td className='px-4 py-4 align-top'>
      <p className='font-semibold text-slate-900'>{order.productName}</p>
      <p className='mt-1 text-xs text-slate-400'>{order.processTemplate?.name || '-'}</p>
    </td>
    <td className='px-4 py-4 text-right font-semibold text-slate-700'>{order.quantity.toLocaleString('vi-VN')}</td>
    <td className='px-4 py-4'>
      <ProgressCell value={order.progressPercent} />
    </td>
    <td className='px-4 py-4'>
      <Badge value={order.priority} label={getPriorityLabel(order.priority)} />
    </td>
    <td className='px-4 py-4'>
      <Badge value={order.status} label={getStatusLabel(order.status)} />
    </td>
    <td className='px-4 py-4'>
      <Badge value={order.riskLevel} label={getRiskLabel(order.riskLevel)} />
    </td>
    <td className='px-4 py-4 whitespace-nowrap text-sm text-slate-600'>{formatDate(order.deadline)}</td>
    <td className='px-4 py-4 text-right'>
      <Link
        to={`/orders/${order.id}`}
        className='inline-flex h-9 items-center rounded-lg bg-cyan-500 px-4 text-sm font-semibold whitespace-nowrap text-white transition hover:bg-cyan-600'
      >
        Xem
      </Link>
    </td>
  </tr>
)

const OrdersPage = () => {
  const dispatch = useAppDispatch()
  const { items, listError, pagination } = useAppSelector((state) => state.order)
  const [searchParams] = useSearchParams()
  const loading = useAppSelector((state) => state.ui.loadingMap['order/getOrders'] || false)
  const [searchInput, setSearchInput] = useState(() => searchParams.get('search') ?? '')
  const [filters, setFilters] = useState<GetOrdersParams>({
    page: 1,
    limit: 10,
    search: searchParams.get('search') ?? '',
    status: (searchParams.get('status') as OrderStatus | null) ?? '',
    priority: (searchParams.get('priority') as OrderPriority | null) ?? '',
    riskLevel: (searchParams.get('riskLevel') as RiskLevel | null) ?? ''
  })

  const requestParams = useMemo(
    () => ({
      ...filters,
      search: filters.search?.trim() || undefined,
      status: filters.status || undefined,
      priority: filters.priority || undefined,
      riskLevel: filters.riskLevel || undefined
    }),
    [filters]
  )

  useEffect(() => {
    void dispatch(getOrders(requestParams))
  }, [dispatch, requestParams])

  const updateFilter = (nextFilters: Partial<GetOrdersParams>) => {
    setFilters((current) => ({
      ...current,
      ...nextFilters,
      page: nextFilters.page ?? 1
    }))
  }

  const handleSearch = () => updateFilter({ search: searchInput })
  const retryLoad = () => void dispatch(getOrders(requestParams))

  return (
    <main className='p-4 text-slate-900 sm:p-6'>
      <div className='mx-auto max-w-7xl'>
        <section className='overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm'>
          <div className='border-b border-slate-200 p-5 sm:p-6'>
            <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
              <div>
                <p className='text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700'>Orders</p>
                <h1 className='mt-2 text-2xl font-bold text-slate-800 sm:text-3xl'>Đơn hàng sản xuất</h1>
                <p className='mt-2 max-w-2xl text-sm leading-6 text-slate-500'>
                  Theo dõi và quản lý các đơn hàng đang được xử lý trong xưởng.
                </p>
              </div>
              <Link
                to='/orders/new'
                className='inline-flex h-11 items-center justify-center rounded-lg bg-cyan-600 px-5 text-sm font-bold whitespace-nowrap text-white transition hover:bg-cyan-700'
              >
                + Tạo đơn hàng
              </Link>
            </div>

            <div className='mt-6 grid gap-3 lg:grid-cols-[minmax(240px,1fr)_180px_180px_190px_auto]'>
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleSearch()
                }}
                className='h-11 rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-100'
                placeholder='Tìm theo mã đơn, khách hàng hoặc sản phẩm...'
              />
              <select
                value={filters.status}
                onChange={(event) => updateFilter({ status: event.target.value as OrderStatus | '' })}
                className='h-11 rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-100'
              >
                {orderStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={filters.priority}
                onChange={(event) => updateFilter({ priority: event.target.value as OrderPriority | '' })}
                className='h-11 rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-100'
              >
                {priorityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={filters.riskLevel}
                onChange={(event) => updateFilter({ riskLevel: event.target.value as RiskLevel | '' })}
                className='h-11 rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-100'
              >
                {riskLevelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type='button'
                onClick={handleSearch}
                className='h-11 cursor-pointer rounded-lg bg-cyan-500 px-5 text-sm font-semibold whitespace-nowrap text-white transition hover:bg-cyan-600'
              >
                Tìm kiếm
              </button>
            </div>
          </div>

          {listError ? (
            <div className='border-b border-rose-100 bg-rose-50 p-5 text-sm font-medium text-rose-600 sm:p-6'>
              <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                <span>{listError}</span>
                <button
                  type='button'
                  onClick={retryLoad}
                  className='w-fit cursor-pointer rounded-lg bg-rose-600 px-4 py-2 text-white'
                >
                  Thử lại
                </button>
              </div>
            </div>
          ) : null}

          {loading ? (
            <div className='p-10 text-center text-sm font-medium text-slate-500'>Đang tải danh sách đơn hàng...</div>
          ) : items.length === 0 ? (
            <div className='p-10 text-center'>
              <p className='text-sm text-slate-500'>Chưa có đơn hàng nào.</p>
              <Link
                to='/orders/new'
                className='mt-5 inline-flex h-11 items-center rounded-lg bg-cyan-600 px-5 text-sm font-semibold text-white transition hover:bg-cyan-700'
              >
                Tạo đơn hàng đầu tiên
              </Link>
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full min-w-[1040px] text-left text-sm'>
                <thead className='bg-slate-50 text-xs font-bold uppercase text-slate-500'>
                  <tr>
                    <th className='px-4 py-4'>STT</th>
                    <th className='px-4 py-4'>Mã đơn</th>
                    <th className='px-4 py-4'>Khách hàng</th>
                    <th className='px-4 py-4'>Sản phẩm</th>
                    <th className='px-4 py-4 text-right'>Số lượng</th>
                    <th className='px-4 py-4'>Tiến độ</th>
                    <th className='px-4 py-4'>Ưu tiên</th>
                    <th className='px-4 py-4'>Trạng thái</th>
                    <th className='px-4 py-4'>Rủi ro</th>
                    <th className='px-4 py-4'>Deadline</th>
                    <th className='px-4 py-4 text-right'>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((order, index) => (
                    <OrderTableRow
                      key={order.id}
                      order={order}
                      index={(pagination.page - 1) * pagination.limit + index + 1}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pagination.totalPages > 1 ? (
            <div className='flex flex-wrap items-center justify-center gap-2 border-t border-slate-200 p-4'>
              <button
                type='button'
                disabled={pagination.page <= 1 || loading}
                onClick={() => updateFilter({ page: pagination.page - 1 })}
                className='h-10 cursor-pointer rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300'
              >
                Trước
              </button>
              {Array.from({ length: pagination.totalPages }, (_, index) => index + 1).map((pageNumber) => (
                <button
                  key={pageNumber}
                  type='button'
                  disabled={loading}
                  onClick={() => updateFilter({ page: pageNumber })}
                  className={`h-10 min-w-10 cursor-pointer rounded-lg px-3 text-sm font-semibold disabled:cursor-not-allowed ${
                    pageNumber === pagination.page
                      ? 'bg-cyan-600 text-white'
                      : 'border border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  {pageNumber}
                </button>
              ))}
              <button
                type='button'
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => updateFilter({ page: pagination.page + 1 })}
                className='h-10 cursor-pointer rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300'
              >
                Sau
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  )
}

export default OrdersPage
