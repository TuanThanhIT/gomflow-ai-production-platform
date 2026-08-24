import type { ResourceType } from '../types/resource'

export const resourceTypeOptions: Array<{ label: string; value: ResourceType }> = [
  { label: 'Lò nung', value: 'KILN' },
  { label: 'Máy sấy', value: 'DRYER' },
  { label: 'Khu tạo hình', value: 'FORMING' },
  { label: 'Vẽ họa tiết', value: 'DECORATION' },
  { label: 'Khu tráng men', value: 'GLAZING' },
  { label: 'QC', value: 'QC' },
  { label: 'Đóng gói', value: 'PACKAGING' },
  { label: 'Khác', value: 'OTHER' }
]

export const resourceTypeValues = resourceTypeOptions.map((option) => option.value)

export const getResourceTypeLabel = (type?: string | null) =>
  resourceTypeOptions.find((option) => option.value === type)?.label ?? type ?? 'Không yêu cầu'
