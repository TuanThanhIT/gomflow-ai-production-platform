import type { IncidentSeverity, IncidentStatus, IncidentType } from '../types/incident'

export const incidentTypeOptions: Array<{ value: IncidentType; label: string }> = [
  { value: 'EQUIPMENT_FAILURE', label: 'Hỏng thiết bị' },
  { value: 'MATERIAL_SHORTAGE', label: 'Thiếu vật liệu' },
  { value: 'QUALITY_ISSUE', label: 'Lỗi chất lượng' },
  { value: 'PROCESS_DELAY', label: 'Trễ công đoạn' },
  { value: 'ORDER_CHANGE', label: 'Thay đổi đơn hàng' },
  { value: 'OTHER', label: 'Khác' }
]

export const incidentSeverityOptions: Array<{ value: IncidentSeverity; label: string }> = [
  { value: 'LOW', label: 'Thấp' },
  { value: 'MEDIUM', label: 'Trung bình' },
  { value: 'HIGH', label: 'Cao' },
  { value: 'CRITICAL', label: 'Nghiêm trọng' }
]

export const incidentStatusOptions: Array<{ value: IncidentStatus; label: string }> = [
  { value: 'OPEN', label: 'Đang mở' },
  { value: 'RESOLVED', label: 'Đã xử lý' }
]

const typeLabels = Object.fromEntries(incidentTypeOptions.map((item) => [item.value, item.label]))
const severityLabels = Object.fromEntries(incidentSeverityOptions.map((item) => [item.value, item.label]))
const statusLabels = Object.fromEntries(incidentStatusOptions.map((item) => [item.value, item.label]))

export const getIncidentTypeLabel = (type: string) => typeLabels[type] || type
export const getIncidentSeverityLabel = (severity: string) => severityLabels[severity] || severity
export const getIncidentStatusLabel = (status: string) => statusLabels[status] || status

export const getIncidentBadgeClass = (value: string) => {
  const classes: Record<string, string> = {
    OPEN: 'border-amber-200 bg-amber-50 text-amber-700',
    RESOLVED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    LOW: 'border-slate-200 bg-slate-50 text-slate-600',
    MEDIUM: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    HIGH: 'border-orange-200 bg-orange-50 text-orange-700',
    CRITICAL: 'border-rose-200 bg-rose-50 text-rose-700'
  }

  return classes[value] || 'border-slate-200 bg-slate-50 text-slate-600'
}
