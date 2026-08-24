import { Loader2, Sparkles } from 'lucide-react'
import type { RecommendedResource } from '../../types/ai'
import type { IncidentSeverity, IncidentType } from '../../types/incident'
import type { OrderStage } from '../../types/order'
import type { Resource } from '../../types/resource'
import { incidentSeverityOptions, incidentTypeOptions } from '../../utils/incidentDisplay'

const getResourcePlanningStatusText = (status: string) => {
  if (status === 'AVAILABLE') return 'Sẵn sàng'
  if (status === 'IN_USE') return 'Đang được sử dụng - Có thể gán trước'
  if (status === 'BROKEN') return 'Đang gặp sự cố'
  if (status === 'MAINTENANCE') return 'Đang bảo trì'
  return status
}

type ReportIncidentModalProps = {
  aiLoading: boolean
  aiRecommendedResource: RecommendedResource | null
  aiWarnings: string[]
  delayMinutes: string
  incidentType: IncidentType
  incidentResourceId: number | ''
  loading: boolean
  onClose: () => void
  onAnalyzeIncident: () => void
  onConfirm: () => void
  resources: Resource[]
  resourcesError: string
  resourcesLoading: boolean
  rawDescription: string
  setDelayMinutes: (value: string) => void
  setIncidentType: (value: IncidentType) => void
  setIncidentResourceId: (value: number | '') => void
  setRawDescription: (value: string) => void
  setSeverity: (value: IncidentSeverity) => void
  severity: IncidentSeverity
  stage: OrderStage
}

const ReportIncidentModal = ({
  aiLoading,
  aiRecommendedResource,
  aiWarnings,
  delayMinutes,
  incidentType,
  incidentResourceId,
  loading,
  onClose,
  onAnalyzeIncident,
  onConfirm,
  rawDescription,
  resources,
  resourcesError,
  resourcesLoading,
  setDelayMinutes,
  setIncidentType,
  setIncidentResourceId,
  setRawDescription,
  setSeverity,
  severity,
  stage
}: ReportIncidentModalProps) => {
  const selectedResource = resources.find((resource) => resource.id === incidentResourceId)
  const isAiRecommendedResource = Boolean(
    aiRecommendedResource && incidentResourceId && aiRecommendedResource.id === incidentResourceId
  )

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm'>
      <button type='button' aria-label='Đóng modal' className='absolute inset-0 cursor-default' onClick={onClose} />
      <section className='relative z-10 max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl'>
        <div className='max-h-[92vh] overflow-y-auto px-6 py-6 [scrollbar-gutter:stable]'>
          <div className='flex items-start justify-between gap-4'>
            <div>
              <p className='text-xs font-semibold uppercase tracking-[0.18em] text-amber-700'>Report Incident</p>
              <h2 className='mt-2 text-xl font-bold text-slate-800'>Báo sự cố công đoạn</h2>
            </div>
            <button
              type='button'
              onClick={onClose}
              className='h-9 w-9 cursor-pointer rounded-full border border-slate-200 text-xl text-slate-500'
            >
              ×
            </button>
          </div>

          <div className='mt-6 grid gap-4 md:grid-cols-2'>
            <div className='rounded-lg border border-slate-200 bg-slate-50 p-4'>
              <p className='text-xs font-semibold uppercase text-slate-400'>Công đoạn</p>
              <p className='mt-2 font-semibold text-slate-800'>{stage.name}</p>
              <p className='mt-1 text-sm text-slate-500'>{stage.code}</p>
            </div>
            <div className='rounded-lg border border-slate-200 bg-slate-50 p-4'>
              <p className='text-xs font-semibold uppercase text-slate-400'>Tài nguyên</p>
              <p className='mt-2 font-semibold text-slate-800'>{stage.assignedResource?.name || '-'}</p>
              <p className='mt-1 text-sm text-slate-500'>{stage.assignedResource?.code || 'Chưa có tài nguyên'}</p>
            </div>
          </div>

          <div className='mt-5 rounded-lg border border-cyan-200 bg-cyan-50 p-4'>
            <label className='block'>
              <span className='flex items-center gap-2 text-sm font-semibold text-cyan-800'>
                <Sparkles className='h-4 w-4' />
                Phân tích sự cố bằng AI
              </span>
              <textarea
                value={rawDescription}
                onChange={(event) => setRawDescription(event.target.value)}
                rows={4}
                className='mt-2 w-full resize-none rounded-lg border border-cyan-200 bg-white px-4 py-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100'
                placeholder='VD: Lò nung số 2 bị tụt nhiệt, không thể nung tiếp khoảng 8 tiếng.'
              />
            </label>
            <div className='mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <button
                type='button'
                disabled={aiLoading || !rawDescription.trim()}
                onClick={onAnalyzeIncident}
                className='inline-flex h-10 w-fit cursor-pointer items-center gap-2 rounded-lg bg-cyan-600 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300'
              >
                {aiLoading ? <Loader2 className='h-4 w-4 animate-spin' /> : <Sparkles className='h-4 w-4' />}
                {aiLoading ? 'Đang phân tích sự cố...' : 'Phân tích bằng AI'}
              </button>
              <p className='text-xs font-medium text-cyan-700'>AI chỉ điền nháp, bạn vẫn xác nhận thủ công.</p>
            </div>
            {aiWarnings.length > 0 ? (
              <div className='mt-3 space-y-2'>
                {aiWarnings.map((warning) => (
                  <p
                    key={warning}
                    className='rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700'
                  >
                    {warning}
                  </p>
                ))}
              </div>
            ) : null}
          </div>

          <div className='mt-5 grid gap-4 md:grid-cols-3'>
            <label className='block md:col-span-3'>
              <span className='text-sm font-semibold text-slate-700'>Tài nguyên ảnh hưởng</span>
              <select
                value={incidentResourceId}
                onChange={(event) => setIncidentResourceId(event.target.value ? Number(event.target.value) : '')}
                className='mt-2 h-11 w-full rounded-lg border border-slate-200 px-4 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100'
              >
                <option value=''>Chưa chọn tài nguyên</option>
                {resources.map((resource) => (
                  <option key={resource.id} value={resource.id}>
                    {resource.name} ({resource.code}) - {resource.type} -{' '}
                    {getResourcePlanningStatusText(resource.status)}
                  </option>
                ))}
              </select>
              {resourcesLoading ? (
                <span className='mt-2 block text-xs text-slate-500'>Đang tải tài nguyên...</span>
              ) : null}
              {resourcesError ? (
                <span className='mt-2 block text-xs font-medium text-rose-600'>{resourcesError}</span>
              ) : null}
              {isAiRecommendedResource && aiRecommendedResource ? (
                <span className='mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-cyan-700'>
                  <span className='inline-flex items-center gap-1 rounded-full bg-cyan-50 px-3 py-1'>
                    <Sparkles className='h-3.5 w-3.5' />
                    AI đề xuất - {Math.round(aiRecommendedResource.confidence * 100)}%
                  </span>
                  {aiRecommendedResource.reason ? <span>{aiRecommendedResource.reason}</span> : null}
                </span>
              ) : selectedResource ? (
                <span className='mt-2 block text-xs font-medium text-slate-500'>
                  Đã chọn: {selectedResource.name} ({selectedResource.code})
                </span>
              ) : null}
            </label>
            <label className='block'>
              <span className='text-sm font-semibold text-slate-700'>Loại sự cố</span>
              <select
                value={incidentType}
                onChange={(event) => setIncidentType(event.target.value as IncidentType)}
                className='mt-2 h-11 w-full rounded-lg border border-slate-200 px-4 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100'
              >
                {incidentTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className='block'>
              <span className='text-sm font-semibold text-slate-700'>Mức độ</span>
              <select
                value={severity}
                onChange={(event) => setSeverity(event.target.value as IncidentSeverity)}
                className='mt-2 h-11 w-full rounded-lg border border-slate-200 px-4 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100'
              >
                {incidentSeverityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className='block'>
              <span className='text-sm font-semibold text-slate-700'>Trễ dự kiến (phút)</span>
              <input
                value={delayMinutes}
                onChange={(event) => setDelayMinutes(event.target.value)}
                type='number'
                min='0'
                step='1'
                className='mt-2 h-11 w-full rounded-lg border border-slate-200 px-4 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100'
                placeholder='VD: 120'
              />
            </label>
          </div>

          <label className='mt-5 block'>
            <span className='text-sm font-semibold text-slate-700'>Mô tả sự cố</span>
            <textarea
              value={rawDescription}
              onChange={(event) => setRawDescription(event.target.value)}
              rows={5}
              className='mt-2 w-full resize-none rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100'
              placeholder='Mô tả tình trạng thiết bị, lỗi phát sinh, ảnh hưởng tới công đoạn...'
            />
          </label>

          <div className='mt-6 flex justify-end gap-3'>
            <button
              type='button'
              onClick={onClose}
              className='h-10 cursor-pointer rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700'
            >
              Hủy
            </button>
            <button
              type='button'
              disabled={loading || !rawDescription.trim()}
              onClick={onConfirm}
              className='h-10 cursor-pointer rounded-lg bg-amber-600 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300'
            >
              {loading ? 'Đang báo cáo...' : 'Gửi báo cáo'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default ReportIncidentModal
