import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ProductionTrendPoint } from '../../../types/dashboard'
import { CHART_GRID_COLOR, CHART_TEXT_COLOR, TREND_LINE_COLOR } from './dashboardChartConfig'

const ProductionTrendChart = ({ data }: { data: ProductionTrendPoint[] }) => {
  const totalCompleted = data.reduce((sum, item) => sum + item.completedOrders, 0)

  return (
    <section className='rounded-lg border border-slate-200 bg-white shadow-sm'>
      <div className='border-b border-slate-200 p-5'>
        <h2 className='text-lg font-bold text-slate-900'>Tiến độ sản xuất 7 ngày</h2>
        <p className='mt-1 text-sm text-slate-500'>Đơn hoàn thành theo ngày</p>
      </div>
      {data.length > 0 && totalCompleted > 0 ? (
        <div className='h-[280px] p-5'>
          <ResponsiveContainer width='100%' height='100%'>
            <LineChart data={data} margin={{ top: 8, right: 20, bottom: 8, left: 0 }}>
              <CartesianGrid stroke={CHART_GRID_COLOR} vertical={false} />
              <XAxis dataKey='label' tick={{ fill: CHART_TEXT_COLOR, fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fill: CHART_TEXT_COLOR, fontSize: 12 }} />
              <Tooltip
                formatter={(value) => [`${Number(value).toLocaleString('vi-VN')} đơn hoàn thành`, 'Hoàn thành']}
                labelFormatter={(label) => `Ngày ${label}`}
              />
              <Line
                type='monotone'
                dataKey='completedOrders'
                stroke={TREND_LINE_COLOR}
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className='flex h-[280px] items-center justify-center p-5 text-sm font-medium text-slate-400'>
          Chưa có đơn hoàn thành trong 7 ngày gần nhất
        </div>
      )}
    </section>
  )
}

export default ProductionTrendChart
