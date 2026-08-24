import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DashboardResourceHealth } from '../../../types/dashboard'
import type { ResourceStatus } from '../../../types/resource'
import { CHART_GRID_COLOR, CHART_TEXT_COLOR, RESOURCE_STATUS_COLORS } from './dashboardChartConfig'

interface ResourceStatusChartItem {
  status: ResourceStatus
  label: string
  value: number
}

const resourceLabels: Record<ResourceStatus, string> = {
  AVAILABLE: 'Sẵn sàng',
  IN_USE: 'Đang sử dụng',
  MAINTENANCE: 'Bảo trì',
  BROKEN: 'Hỏng'
}

const buildResourceStatusData = (resources: DashboardResourceHealth): ResourceStatusChartItem[] => [
  { status: 'AVAILABLE', label: resourceLabels.AVAILABLE, value: resources.available },
  { status: 'IN_USE', label: resourceLabels.IN_USE, value: resources.inUse },
  { status: 'MAINTENANCE', label: resourceLabels.MAINTENANCE, value: resources.maintenance },
  { status: 'BROKEN', label: resourceLabels.BROKEN, value: resources.broken }
]

const ResourceStatusChart = ({ resources }: { resources: DashboardResourceHealth }) => {
  const data = buildResourceStatusData(resources)

  if (resources.total === 0) {
    return (
      <div className='flex h-[260px] items-center justify-center text-sm font-medium text-slate-400'>
        Chưa có dữ liệu tài nguyên
      </div>
    )
  }

  return (
    <div className='h-[260px]'>
      <ResponsiveContainer width='100%' height='100%'>
        <BarChart data={data} layout='vertical' margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
          <CartesianGrid stroke={CHART_GRID_COLOR} horizontal={false} />
          <XAxis type='number' allowDecimals={false} tick={{ fill: CHART_TEXT_COLOR, fontSize: 12 }} />
          <YAxis
            dataKey='label'
            type='category'
            width={96}
            tick={{ fill: CHART_TEXT_COLOR, fontSize: 12, fontWeight: 600 }}
          />
          <Tooltip
            cursor={{ fill: '#f8fafc' }}
            formatter={(value, _name, item) => [
              `${Number(value).toLocaleString('vi-VN')} tài nguyên`,
              (item.payload as ResourceStatusChartItem).label
            ]}
          />
          <Bar dataKey='value' radius={[0, 6, 6, 0]} barSize={22}>
            {data.map((item) => (
              <Cell key={item.status} fill={RESOURCE_STATUS_COLORS[item.status]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default ResourceStatusChart
