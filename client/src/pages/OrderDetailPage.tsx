import { AlertTriangle, Ban, CheckCircle2, Circle, PlayCircle, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import AssignResourceModal from '../components/orders/AssignResourceModal'
import ReportIncidentModal from '../components/orders/ReportIncidentModal'
import { useAppDispatch, useAppSelector } from '../redux/hook'
import { createIncident as createIncidentThunk } from '../redux/slices/incidentSlice'
import {
  assignResourceToStage,
  clearOrderDetail,
  completeOrderStage,
  getOrderById,
  resumeOrderStage,
  startOrder
} from '../redux/slices/orderSlice'
import { clearAvailableResources, getAvailableResourcesForStage, getResources } from '../redux/slices/resourceSlice'
import aiService from '../services/aiService'
import type { RecommendedResource } from '../types/ai'
import type { IncidentSeverity, IncidentType } from '../types/incident'
import type { OrderDetail, OrderStage } from '../types/order'
import { getApiErrorMessage } from '../utils/apiError'
import { showConfirmDialog } from '../utils/confirmDialog'
import {
  getIncidentBadgeClass,
  getIncidentSeverityLabel,
  getIncidentStatusLabel,
  getIncidentTypeLabel
} from '../utils/incidentDisplay'
import {
  formatDateTime,
  formatProgress,
  getBadgeClass,
  getPriorityLabel,
  getRiskLabel,
  getStageStatusLabel,
  getStatusLabel
} from '../utils/orderDisplay'

const specificationLabels: Record<string, string> = {
  glazeColor: 'Màu men',
  capacityMl: 'Dung tích',
  heightCm: 'Chiều cao',
  diameterCm: 'Đường kính',
  customization: 'Yêu cầu riêng',
  specialRequirements: 'Yêu cầu riêng'
}

const specificationUnits: Record<string, string> = {
  capacityMl: 'ml',
  heightCm: 'cm',
  diameterCm: 'cm'
}

const manufacturingEstimateLabels = {
  estimatedClayKg: 'Đất sét',
  glazeType: 'Loại men',
  estimatedFiringTemperatureC: 'Nhiệt độ nung',
  estimatedFiringDurationMinutes: 'Thời gian nung'
}

const manufacturingEstimateUnits = {
  estimatedClayKg: 'kg',
  estimatedFiringTemperatureC: '°C',
  estimatedFiringDurationMinutes: 'phút'
}

const estimateSourceLabels: Record<string, string> = {
  EXTRACTED: 'Theo yêu cầu khách hàng',
  AI_ESTIMATE: 'AI ước tính'
}

const stageMarkerClass: Record<string, string> = {
  WAITING: 'bg-slate-100 text-slate-500 border-slate-200',
  IN_PROGRESS: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  BLOCKED: 'bg-amber-50 text-amber-700 border-amber-200',
  FAILED: 'bg-rose-50 text-rose-700 border-rose-200'
}

const Badge = ({ value, label }: { value: string; label: string }) => (
  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getBadgeClass(value)}`}>
    {label}
  </span>
)

const IncidentBadge = ({ value, label }: { value: string; label: string }) => (
  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getIncidentBadgeClass(value)}`}>
    {label}
  </span>
)

const SummaryItem = ({ label, value }: { label: string; value: string | number }) => (
  <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
    <p className='text-xs font-semibold uppercase text-slate-400'>{label}</p>
    <p className='mt-2 text-base font-semibold text-slate-800'>{value}</p>
  </div>
)

const StageIcon = ({ status }: { status: string }) => {
  if (status === 'COMPLETED') return <CheckCircle2 className='h-5 w-5' />
  if (status === 'IN_PROGRESS') return <PlayCircle className='h-5 w-5' />
  if (status === 'BLOCKED') return <Ban className='h-5 w-5' />
  if (status === 'FAILED') return <XCircle className='h-5 w-5' />
  return <Circle className='h-5 w-5' />
}

const getIncidentHref = (incidentCode?: string) =>
  incidentCode ? `/incidents?search=${encodeURIComponent(incidentCode)}` : '/incidents'

const renderSpecificationValue = (key: string, value: unknown) => {
  if (value === null || value === undefined || value === '') return '-'
  const unit = specificationUnits[key]
  return `${String(value)}${unit ? ` ${unit}` : ''}`
}

const SpecificationsSection = ({ specifications }: { specifications: OrderDetail['specifications'] }) => {
  const extraSpecifications = Array.isArray(specifications?.extraSpecifications)
    ? specifications.extraSpecifications.filter(
        (item): item is { name: string; value: string; unit?: string | null } =>
          typeof item === 'object' &&
          item !== null &&
          typeof item.name === 'string' &&
          typeof item.value === 'string' &&
          item.name.trim() !== '' &&
          item.value.trim() !== ''
      )
    : []
  const entries = Object.entries(specifications ?? {}).filter(
    ([key, value]) =>
      key !== 'extraSpecifications' &&
      value !== null &&
      value !== undefined &&
      value !== '' &&
      !(key === 'customization' && specifications?.specialRequirements)
  )

  return (
    <section className='border-t border-slate-200 p-5 sm:p-6'>
      <h2 className='text-lg font-bold text-slate-800'>Thông số sản phẩm</h2>
      {entries.length > 0 ? (
        <div className='mt-4 grid gap-3 md:grid-cols-2'>
          {entries.map(([key, value]) => (
            <div key={key} className='rounded-lg border border-slate-200 bg-slate-50 p-4'>
              <p className='text-xs font-semibold uppercase text-slate-400'>{specificationLabels[key] || key}</p>
              <p className='mt-2 font-semibold text-slate-900'>{renderSpecificationValue(key, value)}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className='mt-4 rounded-lg border border-dashed border-slate-300 p-5 text-sm text-slate-500'>
          Không có thông số bổ sung.
        </p>
      )}
      {extraSpecifications.length > 0 ? (
        <div className='mt-5'>
          <h3 className='text-base font-bold text-slate-800'>Thông số bổ sung</h3>
          <div className='mt-3 overflow-hidden rounded-lg border border-slate-200'>
            {extraSpecifications.map((specification, index) => (
              <div
                key={`${specification.name}-${index}`}
                className='grid gap-2 border-b border-slate-200 bg-white px-4 py-3 text-sm last:border-b-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'
              >
                <span className='font-semibold text-slate-700'>{specification.name}</span>
                <span className='text-slate-600'>
                  {specification.value}
                  {specification.unit ? ` ${specification.unit}` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}

const ManufacturingEstimateSection = ({ order }: { order: OrderDetail }) => {
  const estimate = order.aiAnalysis?.manufacturingEstimate ?? null
  const sources = order.aiAnalysis?.manufacturingEstimateSources ?? null
  const items = [
    'estimatedClayKg',
    'glazeType',
    'estimatedFiringTemperatureC',
    'estimatedFiringDurationMinutes'
  ] as const

  return (
    <section className='border-t border-slate-200 p-5 sm:p-6'>
      <h2 className='text-lg font-bold text-slate-800'>Ước tính sản xuất</h2>
      <div className='mt-4 grid gap-3 md:grid-cols-2'>
        {items.map((key) => {
          const value = estimate?.[key] ?? null
          const unit = manufacturingEstimateUnits[key as keyof typeof manufacturingEstimateUnits]
          const source = sources?.[key] ?? null
          const displayValue =
            value === null || value === undefined || value === ''
              ? 'Chưa xác định'
              : `${String(value)}${unit ? ` ${unit}` : ''}`

          return (
            <div key={key} className='rounded-lg border border-slate-200 bg-slate-50 p-4'>
              <p className='text-xs font-semibold uppercase text-slate-400'>{manufacturingEstimateLabels[key]}</p>
              <p className='mt-2 font-semibold text-slate-900'>{displayValue}</p>
              {source ? (
                <p className='mt-1 text-xs font-semibold text-cyan-700'>{estimateSourceLabels[source] ?? source}</p>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}

const ProgressSection = ({ progressPercent, status }: { progressPercent: number; status: string }) => (
  <section className='border-t border-slate-200 p-5 sm:p-6'>
    <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
      <div>
        <h2 className='text-lg font-bold text-slate-800'>Tiến độ sản xuất</h2>
        {status === 'COMPLETED' ? (
          <p className='mt-1 text-sm text-emerald-700'>Đơn hàng đã hoàn thành sản xuất.</p>
        ) : null}
      </div>
      <p className='text-2xl font-bold text-cyan-700'>{formatProgress(progressPercent)}</p>
    </div>
    <div className='mt-5 h-3 rounded-full bg-slate-100'>
      <div
        className='h-full rounded-full bg-cyan-600'
        style={{ width: `${Math.min(Math.max(progressPercent, 0), 100)}%` }}
      />
    </div>
  </section>
)

const IncidentImpactBanner = ({ order }: { order: OrderDetail }) => {
  const activeIncidents = order.activeIncidents ?? []
  if (activeIncidents.length === 0) return null

  return (
    <section className='border-t border-amber-200 bg-amber-50 p-5 sm:p-6'>
      <div className='flex items-start gap-3'>
        <AlertTriangle className='mt-0.5 h-5 w-5 shrink-0 text-amber-600' />
        <div className='min-w-0 flex-1'>
          <h2 className='font-bold text-amber-900'>Đơn hàng đang bị ảnh hưởng bởi {activeIncidents.length} sự cố</h2>
          <p className='mt-1 text-sm leading-6 text-amber-800'>
            Có sự cố đang mở ảnh hưởng tới tài nguyên đã gán trong quy trình sản xuất.
          </p>
          <div className='mt-4 grid gap-3 md:grid-cols-2'>
            {activeIncidents.map((incident) => (
              <article key={incident.id} className='rounded-lg border border-amber-200 bg-white/80 p-4'>
                <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                  <div>
                    <p className='font-semibold text-slate-800'>{incident.code}</p>
                    <p className='mt-1 text-sm text-slate-600'>{getIncidentTypeLabel(incident.type)}</p>
                    {incident.resource ? (
                      <p className='mt-1 text-sm text-slate-500'>
                        {incident.resource.name} ({incident.resource.code})
                      </p>
                    ) : null}
                  </div>
                  <Link
                    to={getIncidentHref(incident.code)}
                    className='inline-flex h-9 items-center justify-center rounded-lg border border-amber-200 px-3 text-xs font-semibold text-amber-800 transition hover:bg-amber-100'
                  >
                    Xem sự cố
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

const StageBlockingNotice = ({ stage }: { stage: OrderStage }) => {
  const reason = stage.blockingReason
  if (!reason) {
    if (stage.canResume) {
      return (
        <div className='mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700'>
          <div className='flex items-start gap-3'>
            <CheckCircle2 className='mt-0.5 h-4 w-4 shrink-0' />
            <div>
              <p className='font-bold'>Sẵn sàng tiếp tục</p>
              <p className='mt-1 leading-6'>
                Sự cố đã được xử lý, tài nguyên hiện đã khả dụng. Công đoạn có thể tiếp tục sản xuất.
              </p>
            </div>
          </div>
        </div>
      )
    }

    return null
  }

  const isIncidentReason = Boolean(reason.incident)
  const title =
    reason.code === 'NEXT_STAGE_RESOURCE_REQUIRED'
      ? 'Công đoạn tiếp theo chưa sẵn sàng'
      : reason.code === 'STAGE_RESOURCE_REQUIRED'
        ? 'Chưa sẵn sàng'
        : reason.code === 'NEXT_STAGE_RESOURCE_INCIDENT'
          ? 'Công đoạn tiếp theo đang bị ảnh hưởng'
          : stage.status === 'BLOCKED'
            ? 'Bị chặn bởi sự cố'
            : 'Bị ảnh hưởng bởi sự cố'

  return (
    <div
      className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
        isIncidentReason ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-amber-200 bg-amber-50 text-amber-700'
      }`}
    >
      <div className='flex items-start gap-3'>
        <AlertTriangle className='mt-0.5 h-4 w-4 shrink-0' />
        <div className='min-w-0 flex-1'>
          <p className='font-bold'>{title}</p>
          <p className='mt-1 leading-6'>{reason.message}</p>
          {reason.incident ? (
            <div className='mt-3 flex flex-wrap items-center gap-2'>
              <span className='rounded-full border border-current/20 bg-white/70 px-3 py-1 text-xs font-semibold'>
                Sự cố: {reason.incident.code}
              </span>
              {reason.resource ? (
                <span className='rounded-full border border-current/20 bg-white/70 px-3 py-1 text-xs font-semibold'>
                  {reason.resource.name} ({reason.resource.code})
                </span>
              ) : null}
              <Link
                to={getIncidentHref(reason.incident.code)}
                className='rounded-lg border border-current/20 bg-white px-3 py-1 text-xs font-semibold transition hover:bg-white/70'
              >
                Xem sự cố
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

const StageResourcePlanningNotice = ({ stage }: { stage: OrderStage }) => {
  if (stage.status !== 'WAITING' || stage.assignedResource?.status !== 'IN_USE') return null

  return (
    <div className='mt-4 rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-700'>
      <div className='flex items-start gap-3'>
        <Circle className='mt-1 h-3.5 w-3.5 shrink-0 fill-current' />
        <div>
          <p className='font-bold'>Đã gán trước tài nguyên</p>
          <p className='mt-1 leading-6'>
            Công đoạn đã được xếp cho {stage.assignedResource.name}. Hiện tài nguyên đang được công đoạn khác sử dụng,
            công đoạn này sẽ tiếp tục chờ đến khi tài nguyên khả dụng.
          </p>
        </div>
      </div>
    </div>
  )
}

const StageCard = ({
  assignLoading,
  completeLoading,
  incidentLoading,
  isLast,
  onAssign,
  onComplete,
  onReportIncident,
  onResume,
  orderStatus,
  resumeLoading,
  stage
}: {
  assignLoading: boolean
  completeLoading: boolean
  incidentLoading: boolean
  isLast: boolean
  onAssign: (stage: OrderStage) => void
  onComplete: (stage: OrderStage) => void
  onReportIncident: (stage: OrderStage) => void
  onResume: (stage: OrderStage) => void
  orderStatus: string
  resumeLoading: boolean
  stage: OrderStage
}) => {
  const requiredResourceType = stage.templateStep?.requiredResourceType
  const canAssign = stage.status === 'WAITING' && Boolean(requiredResourceType)
  const canShowCompleteAction = stage.status === 'IN_PROGRESS' && ['IN_PROGRESS', 'AT_RISK'].includes(orderStatus)
  const canComplete = Boolean(stage.canComplete ?? canShowCompleteAction)
  const canResume = Boolean(stage.canResume)
  const hasOpenIncident = Boolean(stage.blockingReason?.incident)
  const canReportIncident = stage.status === 'IN_PROGRESS' && !hasOpenIncident
  const resourceActionClass = stage.assignedResource
    ? 'border border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 hover:bg-amber-100'
    : 'bg-cyan-500 text-white hover:bg-cyan-600'

  return (
    <div className='relative pl-11'>
      <div
        className={`absolute left-0 top-1 flex h-9 w-9 items-center justify-center rounded-full border ${
          stageMarkerClass[stage.status] || stageMarkerClass.WAITING
        }`}
      >
        <StageIcon status={stage.status} />
      </div>
      {!isLast ? <div className='absolute left-[17px] top-12 h-[calc(100%-0.5rem)] w-px bg-slate-200' /> : null}

      <article className='mb-5 rounded-lg border border-slate-200 bg-white p-5'>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
          <div>
            <p className='text-lg font-semibold text-slate-800'>{stage.name}</p>
            <p className='mt-1 text-xs font-semibold uppercase text-slate-400'>{stage.code}</p>
          </div>
          <Badge value={stage.status} label={getStageStatusLabel(stage.status)} />
        </div>

        <div className='mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2'>
          <p>
            <span className='font-semibold text-slate-800'>Thời gian dự kiến:</span>{' '}
            {stage.estimatedDurationMinutes === null ? '-' : `${stage.estimatedDurationMinutes} phút`}
          </p>
          <p>
            <span className='font-semibold text-slate-800'>Thiết bị:</span>{' '}
            {stage.assignedResource
              ? `${stage.assignedResource.name} (${stage.assignedResource.code}) - ${stage.assignedResource.status}`
              : 'Chưa phân bổ tài nguyên'}
          </p>
          {requiredResourceType ? (
            <p>
              <span className='font-semibold text-slate-800'>Yêu cầu:</span> {requiredResourceType}
            </p>
          ) : null}
          {stage.startedAt ? (
            <p>
              <span className='font-semibold text-slate-800'>Bắt đầu:</span> {formatDateTime(stage.startedAt)}
            </p>
          ) : null}
          {stage.startedBy ? (
            <p>
              <span className='font-semibold text-slate-800'>Bắt đầu bởi:</span> {stage.startedBy.fullName}
            </p>
          ) : null}
          {stage.completedAt ? (
            <p>
              <span className='font-semibold text-slate-800'>Hoàn thành:</span> {formatDateTime(stage.completedAt)}
            </p>
          ) : null}
          {stage.completedBy ? (
            <p>
              <span className='font-semibold text-slate-800'>Hoàn thành bởi:</span> {stage.completedBy.fullName}
            </p>
          ) : null}
        </div>

        {stage.notes ? <p className='mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600'>{stage.notes}</p> : null}

        <StageBlockingNotice stage={stage} />
        <StageResourcePlanningNotice stage={stage} />

        {canAssign || canReportIncident || canShowCompleteAction || hasOpenIncident || canResume ? (
          <div className='mt-5 flex flex-wrap justify-end gap-3'>
            {canAssign ? (
              <button
                type='button'
                disabled={assignLoading}
                onClick={() => onAssign(stage)}
                className={`h-10 cursor-pointer rounded-lg px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:border-transparent disabled:bg-slate-200 disabled:text-slate-400 ${resourceActionClass}`}
              >
                {assignLoading ? 'Đang tải...' : stage.assignedResource ? 'Đổi tài nguyên' : 'Gán tài nguyên'}
              </button>
            ) : null}
            {hasOpenIncident && stage.blockingReason?.incident ? (
              <Link
                to={getIncidentHref(stage.blockingReason.incident.code)}
                className='inline-flex h-10 items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 text-sm font-bold text-amber-700 transition hover:bg-amber-100'
              >
                <AlertTriangle className='h-4 w-4' />
                Xem sự cố đang mở
              </Link>
            ) : null}
            {canReportIncident ? (
              <button
                type='button'
                disabled={incidentLoading}
                onClick={() => onReportIncident(stage)}
                className='inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-amber-600 px-4 text-sm font-bold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-300'
              >
                <AlertTriangle className='h-4 w-4' />
                Báo sự cố
              </button>
            ) : null}
            {canResume ? (
              <button
                type='button'
                disabled={resumeLoading}
                onClick={() => onResume(stage)}
                className='inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300'
              >
                <PlayCircle className='h-4 w-4' />
                {resumeLoading ? 'Đang tiếp tục...' : 'Tiếp tục công đoạn'}
              </button>
            ) : null}
            {canShowCompleteAction ? (
              <button
                type='button'
                disabled={completeLoading || !canComplete}
                onClick={() => onComplete(stage)}
                className='h-10 cursor-pointer rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300'
              >
                {completeLoading ? 'Đang cập nhật...' : canComplete ? 'Hoàn thành công đoạn' : 'Không thể hoàn thành'}
              </button>
            ) : null}
          </div>
        ) : null}
      </article>
    </div>
  )
}

const PipelineSection = ({
  assignLoading,
  completeLoading,
  incidentLoading,
  onAssignResource,
  onCompleteStage,
  onReportIncident,
  onResumeStage,
  orderStatus,
  resumeLoading,
  stages
}: {
  assignLoading: boolean
  completeLoading: boolean
  incidentLoading: boolean
  onAssignResource: (stage: OrderStage) => void
  onCompleteStage: (stage: OrderStage) => void
  onReportIncident: (stage: OrderStage) => void
  onResumeStage: (stage: OrderStage) => void
  orderStatus: string
  resumeLoading: boolean
  stages: OrderStage[]
}) => (
  <section className='border-t border-slate-200 p-5 sm:p-6'>
    <h2 className='text-lg font-bold text-slate-800'>Quy trình sản xuất</h2>
    <div className='mt-5'>
      {stages.length > 0 ? (
        stages.map((stage, index) => (
          <StageCard
            key={stage.id}
            stage={stage}
            orderStatus={orderStatus}
            assignLoading={assignLoading && stage.status === 'WAITING'}
            completeLoading={completeLoading && stage.status === 'IN_PROGRESS'}
            incidentLoading={incidentLoading && stage.status === 'IN_PROGRESS'}
            onAssign={onAssignResource}
            onComplete={onCompleteStage}
            onReportIncident={onReportIncident}
            onResume={onResumeStage}
            resumeLoading={resumeLoading && stage.status === 'BLOCKED'}
            isLast={index === stages.length - 1}
          />
        ))
      ) : (
        <div className='rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500'>
          Đơn hàng chưa có pipeline sản xuất.
        </div>
      )}
    </div>
  </section>
)

const IncidentsSection = ({ order }: { order: OrderDetail }) => {
  const incidents = order.stages.flatMap((stage) =>
    (stage.incidents ?? []).map((incident) => ({ ...incident, stageName: stage.name, stageCode: stage.code }))
  )

  return (
    <section className='border-t border-slate-200 p-5 sm:p-6'>
      <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
        <h2 className='text-lg font-bold text-slate-800'>Sự cố của đơn hàng</h2>
        <Link to='/incidents' className='text-sm font-semibold text-cyan-700 hover:text-cyan-800'>
          Xem tất cả sự cố
        </Link>
      </div>

      {incidents.length > 0 ? (
        <div className='mt-4 space-y-3'>
          {incidents.map((incident) => (
            <article key={incident.id} className='rounded-lg border border-slate-200 bg-slate-50 p-4'>
              <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                <div>
                  <p className='font-semibold text-slate-800'>{incident.code}</p>
                  <p className='mt-1 text-sm text-slate-500'>
                    {getIncidentTypeLabel(incident.type)} • {incident.stageName} ({incident.stageCode})
                  </p>
                </div>
                <div className='flex flex-wrap gap-2'>
                  <IncidentBadge value={incident.severity} label={getIncidentSeverityLabel(incident.severity)} />
                  <IncidentBadge value={incident.status} label={getIncidentStatusLabel(incident.status)} />
                </div>
              </div>
              <p className='mt-3 text-sm leading-6 text-slate-600'>{incident.rawDescription}</p>
              <p className='mt-3 text-xs font-semibold text-slate-400'>{formatDateTime(incident.createdAt)}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className='mt-4 rounded-lg border border-dashed border-slate-300 p-5 text-sm text-slate-500'>
          Chưa có sự cố nào được ghi nhận cho đơn hàng này.
        </p>
      )}
    </section>
  )
}

const OrderDetailContent = ({
  actionError,
  assignLoading,
  completeLoading,
  incidentLoading,
  onAssignResource,
  onCompleteStage,
  onReportIncident,
  onResumeStage,
  onStartOrder,
  order,
  resumeLoading,
  startLoading
}: {
  actionError: string
  assignLoading: boolean
  completeLoading: boolean
  incidentLoading: boolean
  onAssignResource: (stage: OrderStage) => void
  onCompleteStage: (stage: OrderStage) => void
  onReportIncident: (stage: OrderStage) => void
  onResumeStage: (stage: OrderStage) => void
  onStartOrder: () => void
  order: OrderDetail
  resumeLoading: boolean
  startLoading: boolean
}) => {
  const firstStage = [...order.stages].sort((firstItem, secondItem) => firstItem.stepOrder - secondItem.stepOrder)[0]
  const canStartOrder =
    !firstStage?.templateStep?.requiredResourceType ||
    (firstStage.status === 'WAITING' &&
      Boolean(firstStage.assignedResource) &&
      firstStage.assignedResource?.status === 'AVAILABLE')

  return (
    <section className='overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm'>
      <div className='p-5 sm:p-6'>
        <div className='flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between'>
          <div>
            <Link to='/orders' className='text-sm font-semibold text-cyan-700 hover:text-cyan-800'>
              Quay lại danh sách
            </Link>
            <h1 className='mt-4 text-3xl font-bold text-slate-800'>{order.code}</h1>
            <p className='mt-2 text-sm text-slate-500'>
              {order.customerName} • {order.productName}
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <Badge value={order.priority} label={getPriorityLabel(order.priority)} />
            <Badge value={order.status} label={getStatusLabel(order.status)} />
            <Badge value={order.riskLevel} label={`Rủi ro: ${getRiskLabel(order.riskLevel)}`} />
            {order.status === 'PENDING' ? (
              <button
                type='button'
                disabled={startLoading || !canStartOrder}
                onClick={onStartOrder}
                title={!canStartOrder ? 'Công đoạn đầu tiên cần tài nguyên sẵn sàng trước khi bắt đầu.' : undefined}
                className='h-10 cursor-pointer rounded-lg bg-cyan-500 px-4 text-sm font-semibold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400'
              >
                {startLoading ? 'Đang bắt đầu...' : 'Bắt đầu sản xuất'}
              </button>
            ) : null}
          </div>
        </div>

        {order.status === 'PENDING' && !canStartOrder ? (
          <div className='mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700'>
            Cần gán tài nguyên sẵn sàng cho công đoạn đầu tiên trước khi bắt đầu sản xuất.
          </div>
        ) : null}
      </div>

      {actionError ? (
        <div className='border-t border-rose-100 bg-rose-50 p-5 text-sm font-medium text-rose-600'>{actionError}</div>
      ) : null}

      <IncidentImpactBanner order={order} />
      <ProgressSection progressPercent={order.progressPercent} status={order.status} />

      <section className='grid gap-4 border-t border-slate-200 p-5 sm:p-6 md:grid-cols-2 xl:grid-cols-3'>
        <SummaryItem label='Khách hàng' value={order.customerName} />
        <SummaryItem label='Sản phẩm' value={order.productName} />
        <SummaryItem label='Số lượng' value={order.quantity.toLocaleString('vi-VN')} />
        <SummaryItem label='Deadline' value={formatDateTime(order.deadline)} />
        <SummaryItem label='Ưu tiên' value={getPriorityLabel(order.priority)} />
        <SummaryItem label='Rủi ro' value={getRiskLabel(order.riskLevel)} />
        <SummaryItem label='Tiến độ' value={formatProgress(order.progressPercent)} />
      </section>

      <section className='border-t border-slate-200 p-5 sm:p-6'>
        <h2 className='text-lg font-bold text-slate-800'>Quy trình mẫu</h2>
        <div className='mt-4 rounded-lg border border-slate-200 bg-slate-50 p-5'>
          <p className='font-bold text-slate-900'>{order.processTemplate?.name || '-'}</p>
          <p className='mt-1 text-xs font-semibold uppercase text-slate-400'>{order.processTemplate?.code || '-'}</p>
          {order.processTemplate?.description ? (
            <p className='mt-3 text-sm leading-6 text-slate-500'>{order.processTemplate.description}</p>
          ) : null}
        </div>
      </section>

      <SpecificationsSection specifications={order.specifications} />
      <ManufacturingEstimateSection order={order} />
      <PipelineSection
        stages={order.stages}
        orderStatus={order.status}
        assignLoading={assignLoading}
        completeLoading={completeLoading}
        incidentLoading={incidentLoading}
        resumeLoading={resumeLoading}
        onAssignResource={onAssignResource}
        onCompleteStage={onCompleteStage}
        onReportIncident={onReportIncident}
        onResumeStage={onResumeStage}
      />
      <IncidentsSection order={order} />
    </section>
  )
}

const OrderDetailPage = () => {
  const { id } = useParams()
  const dispatch = useAppDispatch()
  const { actionError, detailError, selectedOrder } = useAppSelector((state) => state.order)
  const {
    availableError,
    availableResources,
    items: resources,
    listError: resourcesError
  } = useAppSelector((state) => state.resource)
  const [assignStage, setAssignStage] = useState<OrderStage | null>(null)
  const [selectedResourceId, setSelectedResourceId] = useState<number | ''>('')
  const [incidentStage, setIncidentStage] = useState<OrderStage | null>(null)
  const [incidentResourceId, setIncidentResourceId] = useState<number | ''>('')
  const [incidentType, setIncidentType] = useState<IncidentType>('EQUIPMENT_FAILURE')
  const [severity, setSeverity] = useState<IncidentSeverity>('MEDIUM')
  const [delayMinutes, setDelayMinutes] = useState('')
  const [rawDescription, setRawDescription] = useState('')
  const [aiIncidentLoading, setAiIncidentLoading] = useState(false)
  const [aiIncidentWarnings, setAiIncidentWarnings] = useState<string[]>([])
  const [aiRecommendedResource, setAiRecommendedResource] = useState<RecommendedResource | null>(null)
  const loading = useAppSelector((state) => state.ui.loadingMap['order/getOrderById'] || false)
  const startLoading = useAppSelector((state) => state.ui.loadingMap['order/startOrder'] || false)
  const completeLoading = useAppSelector((state) => state.ui.loadingMap['order/completeOrderStage'] || false)
  const resumeLoading = useAppSelector((state) => state.ui.loadingMap['order/resumeOrderStage'] || false)
  const assignLoading = useAppSelector((state) => state.ui.loadingMap['order/assignResourceToStage'] || false)
  const incidentLoading = useAppSelector((state) => state.ui.loadingMap['incident/createIncident'] || false)
  const availableLoading = useAppSelector(
    (state) => state.ui.loadingMap['resource/getAvailableResourcesForStage'] || false
  )
  const resourcesLoading = useAppSelector((state) => state.ui.loadingMap['resource/getResources'] || false)
  const isInitialOrderLoading = loading && !selectedOrder

  useEffect(() => {
    if (id) void dispatch(getOrderById({ orderId: id }))

    return () => {
      dispatch(clearOrderDetail())
      dispatch(clearAvailableResources())
    }
  }, [dispatch, id])

  const handleStartOrder = async () => {
    if (!selectedOrder) return
    const confirmed = await showConfirmDialog(
      'Bắt đầu sản xuất',
      `Bạn có chắc muốn bắt đầu sản xuất đơn ${selectedOrder.code}?`,
      'Bắt đầu',
      'Hủy',
      'question'
    )
    if (!confirmed) return

    dispatch(startOrder({ orderId: selectedOrder.id }))
      .unwrap()
      .then(() => toast.success('Đã bắt đầu sản xuất đơn hàng.'))
      .catch((error) => toast.error(getApiErrorMessage(error, 'Không thể bắt đầu sản xuất đơn hàng.')))
  }

  const handleCompleteStage = async (stage: OrderStage) => {
    const confirmed = await showConfirmDialog(
      'Hoàn thành công đoạn',
      `Xác nhận hoàn thành công đoạn "${stage.name}"?`,
      'Hoàn thành',
      'Hủy',
      'success'
    )
    if (!confirmed) return

    dispatch(completeOrderStage({ stageId: stage.id }))
      .unwrap()
      .then((response) => {
        toast.success(`Đã hoàn thành công đoạn ${stage.name}.`)
        const nextStage = [...response.data.stages]
          .filter((item) => item.stepOrder > stage.stepOrder)
          .sort((firstStage, secondStage) => firstStage.stepOrder - secondStage.stepOrder)[0]

        if (nextStage?.status === 'WAITING' && nextStage.blockingReason) {
          toast.warning(nextStage.blockingReason.message, { toastId: `pipeline-waiting-${nextStage.id}` })
        }
      })
      .catch((error) => toast.error(getApiErrorMessage(error, 'Không thể hoàn thành công đoạn.')))
  }

  const handleResumeStage = async (stage: OrderStage) => {
    const confirmed = await showConfirmDialog(
      'Tiếp tục công đoạn',
      `Xác nhận tiếp tục công đoạn "${stage.name}"?`,
      'Tiếp tục',
      'Hủy',
      'success'
    )
    if (!confirmed) return

    dispatch(resumeOrderStage({ stageId: stage.id }))
      .unwrap()
      .then(() => toast.success(`Đã tiếp tục công đoạn ${stage.name}.`))
      .catch((error) => toast.error(getApiErrorMessage(error, 'Không thể tiếp tục công đoạn.')))
  }

  const handleOpenAssignResource = (stage: OrderStage) => {
    setAssignStage(stage)
    setSelectedResourceId(stage.assignedResource?.id ?? '')
    void dispatch(getAvailableResourcesForStage({ stageId: stage.id }))
  }

  const handleCloseAssignResource = () => {
    setAssignStage(null)
    setSelectedResourceId('')
    dispatch(clearAvailableResources())
  }

  const handleConfirmAssignResource = () => {
    if (!assignStage || !selectedResourceId) return

    dispatch(assignResourceToStage({ stageId: assignStage.id, resourceId: selectedResourceId }))
      .unwrap()
      .then(() => {
        toast.success('Đã gán tài nguyên cho công đoạn.')
        handleCloseAssignResource()
      })
      .catch((error) => toast.error(getApiErrorMessage(error, 'Không thể gán tài nguyên.')))
  }

  const handleOpenReportIncident = (stage: OrderStage) => {
    setIncidentStage(stage)
    setIncidentResourceId(stage.assignedResource?.id ?? '')
    setIncidentType('EQUIPMENT_FAILURE')
    setSeverity('MEDIUM')
    setDelayMinutes('')
    setRawDescription('')
    setAiIncidentWarnings([])
    setAiRecommendedResource(null)
    void dispatch(getResources({ active: 'active', limit: 100 }))
  }

  const handleCloseReportIncident = () => {
    setIncidentStage(null)
    setIncidentResourceId('')
    setIncidentType('EQUIPMENT_FAILURE')
    setSeverity('MEDIUM')
    setDelayMinutes('')
    setRawDescription('')
    setAiIncidentWarnings([])
    setAiRecommendedResource(null)
    setAiIncidentLoading(false)
  }

  const handleAnalyzeIncident = async () => {
    const text = rawDescription.trim()
    if (!text) return

    setAiIncidentLoading(true)
    setAiIncidentWarnings([])
    setAiRecommendedResource(null)

    try {
      const response = await aiService.analyzeIncident(text)
      const { draft, recommendedResource, warnings } = response.data.data

      setIncidentType(draft.type)
      setSeverity(draft.severity)
      setDelayMinutes(draft.estimatedDelayMinutes === null ? '' : String(draft.estimatedDelayMinutes))
      setRawDescription(draft.rawDescription)
      setAiRecommendedResource(recommendedResource)
      setAiIncidentWarnings(warnings)

      if (recommendedResource) {
        setIncidentResourceId(recommendedResource.id)
      }

      if (!recommendedResource) {
        setAiIncidentWarnings((currentWarnings) => [
          ...currentWarnings,
          'AI chưa xác định được tài nguyên cụ thể. Vui lòng chọn tài nguyên.'
        ])
      }

      if (draft.estimatedDelayMinutes === null) {
        setAiIncidentWarnings((currentWarnings) => [...currentWarnings, 'Chưa xác định được thời gian ảnh hưởng.'])
      }

      toast.success('Đã phân tích mô tả sự cố.')
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, 'Không thể phân tích sự cố bằng AI. Bạn vẫn có thể nhập thông tin sự cố thủ công.')
      )
    } finally {
      setAiIncidentLoading(false)
    }
  }

  const handleConfirmReportIncident = () => {
    if (!incidentStage || !rawDescription.trim()) return
    const parsedDelayMinutes = delayMinutes.trim() ? Number(delayMinutes) : null
    const estimatedDelayMinutes =
      parsedDelayMinutes !== null && Number.isFinite(parsedDelayMinutes) && parsedDelayMinutes >= 0
        ? Math.round(parsedDelayMinutes)
        : null

    dispatch(
      createIncidentThunk({
        data: {
          orderStageId: incidentStage.id,
          resourceId: incidentResourceId || null,
          rawDescription,
          type: incidentType,
          severity,
          estimatedDelayMinutes
        }
      })
    )
      .unwrap()
      .then(() => {
        toast.success('Đã ghi nhận sự cố sản xuất.')
        handleCloseReportIncident()
        if (id) void dispatch(getOrderById({ orderId: id }))
      })
      .catch((error) => toast.error(getApiErrorMessage(error, 'Không thể báo cáo sự cố.')))
  }

  return (
    <main className='p-4 text-slate-900 sm:p-6'>
      <div className='mx-auto max-w-6xl'>
        {isInitialOrderLoading ? (
          <div className='rounded-lg bg-white p-10 text-center text-sm font-medium text-slate-500 shadow-sm'>
            Đang tải chi tiết đơn hàng...
          </div>
        ) : detailError ? (
          <div className='rounded-lg border border-rose-200 bg-rose-50 p-6 text-sm font-medium text-rose-600'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <span>{detailError}</span>
              <Link to='/orders' className='w-fit rounded-lg bg-rose-600 px-4 py-2 text-white'>
                Quay lại danh sách
              </Link>
            </div>
          </div>
        ) : selectedOrder ? (
          <OrderDetailContent
            order={selectedOrder}
            actionError={actionError}
            startLoading={startLoading}
            assignLoading={assignLoading}
            completeLoading={completeLoading}
            incidentLoading={incidentLoading}
            resumeLoading={resumeLoading}
            onAssignResource={handleOpenAssignResource}
            onStartOrder={handleStartOrder}
            onCompleteStage={handleCompleteStage}
            onReportIncident={handleOpenReportIncident}
            onResumeStage={handleResumeStage}
          />
        ) : null}
      </div>
      {incidentStage ? (
        <ReportIncidentModal
          stage={incidentStage}
          loading={incidentLoading}
          aiLoading={aiIncidentLoading}
          aiRecommendedResource={aiRecommendedResource}
          aiWarnings={aiIncidentWarnings}
          incidentType={incidentType}
          setIncidentType={setIncidentType}
          incidentResourceId={incidentResourceId}
          setIncidentResourceId={setIncidentResourceId}
          severity={severity}
          setSeverity={setSeverity}
          delayMinutes={delayMinutes}
          setDelayMinutes={setDelayMinutes}
          resources={resources}
          resourcesError={resourcesError}
          resourcesLoading={resourcesLoading}
          rawDescription={rawDescription}
          setRawDescription={setRawDescription}
          onClose={handleCloseReportIncident}
          onAnalyzeIncident={handleAnalyzeIncident}
          onConfirm={handleConfirmReportIncident}
        />
      ) : null}

      {assignStage ? (
        <AssignResourceModal
          stage={assignStage}
          resources={availableResources}
          loading={availableLoading}
          availableError={availableError}
          assignLoading={assignLoading}
          selectedResourceId={selectedResourceId}
          setSelectedResourceId={setSelectedResourceId}
          onClose={handleCloseAssignResource}
          onConfirm={handleConfirmAssignResource}
        />
      ) : null}
    </main>
  )
}

export default OrderDetailPage
