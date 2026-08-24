import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { DashboardSummary } from '../../../types/dashboard'
import type { OrderStatus } from '../../../types/order'
import { getStatusLabel } from '../../../utils/orderDisplay'
import { ORDER_STATUS_COLORS } from './dashboardChartConfig'

interface OrderStatusChartItem {
  status: OrderStatus
  label: string
  value: number
}

const buildOrderStatusData = (summary: DashboardSummary): OrderStatusChartItem[] => [
  { status: 'PENDING', label: getStatusLabel('PENDING'), value: summary.pendingOrders },
  { status: 'IN_PROGRESS', label: getStatusLabel('IN_PROGRESS'), value: summary.inProgressOrders },
  { status: 'AT_RISK', label: getStatusLabel('AT_RISK'), value: summary.atRiskOrders },
  { status: 'COMPLETED', label: getStatusLabel('COMPLETED'), value: summary.completedOrders }
]

const formatCount = (value: number) => value.toLocaleString('vi-VN')

const OrderStatusChart = ({ summary }: { summary: DashboardSummary }) => {
  const data = buildOrderStatusData(summary)

  return (
    <section className='rounded-lg border border-slate-200 bg-white shadow-sm'>
      <div className='border-b border-slate-200 p-5'>
        <h2 className='text-lg font-bold text-slate-900'>Phân bố đơn hàng</h2>
        <p className='mt-1 text-sm text-slate-500'>Trạng thái hiện tại của các đơn sản xuất</p>
      </div>
      {summary.totalOrders > 0 ? (
        <div className='relative h-[300px] p-5'>
          <div className='pointer-events-none absolute inset-x-0 top-[128px] z-10 text-center'>
            <p className='text-2xl font-bold text-slate-900'>{formatCount(summary.totalOrders)}</p>
            <p className='text-xs font-semibold text-slate-500'>Tổng đơn</p>
          </div>
          <ResponsiveContainer width='100%' height='100%'>
            <PieChart>
              <Pie
                data={data}
                dataKey='value'
                nameKey='label'
                innerRadius='58%'
                outerRadius='78%'
                paddingAngle={2}
                strokeWidth={2}
              >
                {data.map((item) => (
                  <Cell key={item.status} fill={ORDER_STATUS_COLORS[item.status]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, _name, item) => [
                  `${formatCount(Number(value))} đơn hàng`,
                  (item.payload as OrderStatusChartItem).label
                ]}
              />
              <Legend formatter={(value) => <span className='text-xs font-semibold text-slate-600'>{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className='flex h-[300px] items-center justify-center p-5 text-sm font-medium text-slate-400'>
          Chưa có dữ liệu đơn hàng
        </div>
      )}
    </section>
  )
}

export default OrderStatusChart
