import { ExternalLink, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Incident, IncidentAffectedOrder } from '../../types/incident'
import { formatProgress, getBadgeClass, getRiskLabel, getStageStatusLabel } from '../../utils/orderDisplay'

const formatAffectedStageList = (order: IncidentAffectedOrder) =>
  order.affectedStages.map((stage) => `${stage.name} (${stage.code})`).join(', ') || '-'

type AffectedOrdersModalProps = {
  error: string
  incident: Incident | null
  loading: boolean
  onClose: () => void
}

const AffectedOrdersModal = ({ error, incident, loading, onClose }: AffectedOrdersModalProps) => {
  const affectedOrders = incident?.affectedOrders ?? []

  return (
    <div className='fixed inset-0 z-50 flex justify-end bg-slate-950/45 backdrop-blur-sm'>
      <button
        type='button'
        aria-label='Đóng danh sách ảnh hưởng'
        className='absolute inset-0 cursor-default'
        onClick={onClose}
      />
      <aside className='relative z-10 flex h-full w-full max-w-5xl flex-col bg-white shadow-2xl'>
        <div className='border-b border-slate-200 p-5'>
          <div className='flex items-start justify-between gap-4'>
            <div>
              <p className='text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700'>Affected Orders</p>
              <h2 className='mt-2 text-xl font-bold text-slate-800'>Đơn hàng bị ảnh hưởng</h2>
              <p className='mt-1 text-sm text-slate-500'>{incident?.code ?? 'Đang tải sự cố...'}</p>
            </div>
            <button
              type='button'
              onClick={onClose}
              className='h-9 w-9 cursor-pointer rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50'
            >
              <X className='mx-auto h-4 w-4' />
            </button>
          </div>
          {incident?.resource ? (
            <p className='mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600'>
              Tài nguyên: <span className='font-semibold text-slate-800'>{incident.resource.name}</span> (
              {incident.resource.code})
            </p>
          ) : null}
        </div>

        <div className='flex-1 overflow-y-auto bg-slate-50 p-5'>
          {loading ? (
            <div className='rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-medium text-slate-500'>
              Đang tải danh sách đơn hàng...
            </div>
          ) : error ? (
            <div className='rounded-lg border border-rose-200 bg-rose-50 p-5 text-sm font-medium text-rose-600'>
              {error}
            </div>
          ) : affectedOrders.length > 0 ? (
            <div>
              <p className='mb-4 text-sm font-semibold text-slate-700'>{affectedOrders.length} đơn hàng bị ảnh hưởng</p>
              <div className='overflow-x-auto rounded-lg border border-slate-200 bg-white'>
                <table className='w-full min-w-[860px] text-left text-sm'>
                  <thead className='bg-slate-50 text-xs font-bold uppercase text-slate-500'>
                    <tr>
                      <th className='px-4 py-4'>STT</th>
                      <th className='px-4 py-4'>Mã</th>
                      <th className='px-4 py-4'>Khách hàng</th>
                      <th className='px-4 py-4'>Sản phẩm</th>
                      <th className='px-4 py-4'>Công đoạn</th>
                      <th className='px-4 py-4'>Trạng thái</th>
                      <th className='px-4 py-4'>Rủi ro</th>
                      <th className='px-4 py-4'>Tiến độ</th>
                      <th className='px-4 py-4 text-right'>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {affectedOrders.map((order, index) => (
                      <tr
                        key={order.id}
                        className='border-b border-slate-100 transition hover:bg-slate-50/80 last:border-0'
                      >
                        <td className='px-4 py-4 font-semibold text-slate-500'>{index + 1}</td>
                        <td className='px-4 py-4 font-semibold text-slate-800'>{order.code}</td>
                        <td className='px-4 py-4 text-slate-700'>{order.customerName}</td>
                        <td className='px-4 py-4 text-slate-500'>{order.productName}</td>
                        <td className='max-w-[220px] px-4 py-4 text-slate-600'>{formatAffectedStageList(order)}</td>
                        <td className='px-4 py-4'>
                          <div className='flex flex-wrap gap-2'>
                            {order.affectedStages.map((stage) => (
                              <span
                                key={stage.id}
                                className={`rounded-full border px-3 py-1 text-xs font-semibold ${getBadgeClass(stage.status)}`}
                              >
                                {getStageStatusLabel(stage.status)}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className='px-4 py-4'>
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getBadgeClass(order.riskLevel || 'NONE')}`}
                          >
                            {getRiskLabel(order.riskLevel || 'NONE')}
                          </span>
                        </td>
                        <td className='px-4 py-4 font-medium text-slate-600'>
                          {formatProgress(order.progressPercent)}
                        </td>
                        <td className='px-4 py-4 text-right'>
                          <Link
                            to={`/orders/${order.id}`}
                            className='inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-3 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100'
                          >
                            Xem đơn
                            <ExternalLink className='h-3.5 w-3.5' />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className='rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500'>
              Không có đơn hàng nào bị ảnh hưởng bởi sự cố này.
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}

export default AffectedOrdersModal
