export const orderStatusOptions = [
  { label: 'Tất cả trạng thái', value: '' },
  { label: 'Chờ sản xuất', value: 'PENDING' },
  { label: 'Đang sản xuất', value: 'IN_PROGRESS' },
  { label: 'Có rủi ro', value: 'AT_RISK' },
  { label: 'Hoàn thành', value: 'COMPLETED' },
  { label: 'Đã huỷ', value: 'CANCELLED' }
] as const

export const priorityOptions = [
  { label: 'Tất cả mức ưu tiên', value: '' },
  { label: 'Thấp', value: 'LOW' },
  { label: 'Bình thường', value: 'NORMAL' },
  { label: 'Cao', value: 'HIGH' },
  { label: 'Khẩn cấp', value: 'URGENT' }
] as const

export const riskLevelOptions = [
  { label: 'Tất cả mức rủi ro', value: '' },
  { label: 'Không có', value: 'NONE' },
  { label: 'Thấp', value: 'LOW' },
  { label: 'Trung bình', value: 'MEDIUM' },
  { label: 'Cao', value: 'HIGH' },
  { label: 'Nghiêm trọng', value: 'CRITICAL' }
] as const

export const stageStatusLabels: Record<string, string> = {
  WAITING: 'Chờ',
  IN_PROGRESS: 'Đang thực hiện',
  COMPLETED: 'Hoàn thành',
  BLOCKED: 'Bị chặn',
  FAILED: 'Thất bại'
}

const statusLabels: Record<string, string> = {
  PENDING: 'Chờ sản xuất',
  IN_PROGRESS: 'Đang sản xuất',
  AT_RISK: 'Có rủi ro',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã huỷ'
}

const riskLabels: Record<string, string> = {
  NONE: 'Không có',
  LOW: 'Thấp',
  MEDIUM: 'Trung bình',
  HIGH: 'Cao',
  CRITICAL: 'Nghiêm trọng'
}

const priorityLabels: Record<string, string> = {
  LOW: 'Thấp',
  NORMAL: 'Bình thường',
  HIGH: 'Cao',
  URGENT: 'Khẩn cấp'
}

const badgeClasses: Record<string, string> = {
  PENDING: 'bg-slate-100 text-slate-700 border-slate-200',
  IN_PROGRESS: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  AT_RISK: 'bg-amber-50 text-amber-700 border-amber-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
  NONE: 'bg-slate-100 text-slate-600 border-slate-200',
  LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  NORMAL: 'bg-sky-50 text-sky-700 border-sky-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
  URGENT: 'bg-rose-50 text-rose-700 border-rose-200',
  CRITICAL: 'bg-red-50 text-red-700 border-red-200',
  WAITING: 'bg-slate-100 text-slate-700 border-slate-200',
  BLOCKED: 'bg-amber-50 text-amber-700 border-amber-200',
  FAILED: 'bg-rose-50 text-rose-700 border-rose-200'
}

export const getStatusLabel = (value: string) => statusLabels[value] || value
export const getRiskLabel = (value: string) => riskLabels[value] || value
export const getPriorityLabel = (value: string) => priorityLabels[value] || value
export const getStageStatusLabel = (value: string) => stageStatusLabels[value] || value
export const getBadgeClass = (value: string) => badgeClasses[value] || 'bg-slate-100 text-slate-700 border-slate-200'

export const formatDate = (value: string | null | undefined, options?: Intl.DateTimeFormatOptions) => {
  if (!value) return '-'

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options
  }).format(new Date(value))
}

export const formatDateTime = (value: string | null | undefined) =>
  formatDate(value, {
    hour: '2-digit',
    minute: '2-digit'
  })

export const formatProgress = (value: number) => `${Number(value).toFixed(2).replace(/\.00$/, '')}%`
