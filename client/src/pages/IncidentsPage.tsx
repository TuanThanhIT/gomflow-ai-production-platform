import { Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import AffectedOrdersModal from '../components/incidents/AffectedOrdersModal'
import ResolveIncidentModal from '../components/incidents/ResolveIncidentModal'
import { useAppDispatch, useAppSelector } from '../redux/hook'
import { clearIncidentDetail, getIncidentById, getIncidents, resolveIncident } from '../redux/slices/incidentSlice'
import type { Incident, IncidentSeverity, IncidentStatus, IncidentType } from '../types/incident'
import { getApiErrorMessage } from '../utils/apiError'
import {
  getIncidentBadgeClass,
  getIncidentSeverityLabel,
  getIncidentStatusLabel,
  getIncidentTypeLabel,
  incidentSeverityOptions,
  incidentStatusOptions,
  incidentTypeOptions
} from '../utils/incidentDisplay'
import { formatDateTime } from '../utils/orderDisplay'

const Badge = ({ label, value }: { label: string; value: string }) => (
  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getIncidentBadgeClass(value)}`}>
    {label}
  </span>
)

const IncidentsPage = () => {
  const dispatch = useAppDispatch()
  const { detailError, items, listError, pagination, selectedIncident } = useAppSelector((state) => state.incident)
  const [searchParams] = useSearchParams()
  const loading = useAppSelector((state) => state.ui.loadingMap['incident/getIncidents'] || false)
  const detailLoading = useAppSelector((state) => state.ui.loadingMap['incident/getIncidentById'] || false)
  const resolveLoading = useAppSelector((state) => state.ui.loadingMap['incident/resolveIncident'] || false)
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '')
  const [status, setStatus] = useState<IncidentStatus | ''>((searchParams.get('status') as IncidentStatus | null) ?? '')
  const [severity, setSeverity] = useState<IncidentSeverity | ''>(
    (searchParams.get('severity') as IncidentSeverity | null) ?? ''
  )
  const [type, setType] = useState<IncidentType | ''>((searchParams.get('type') as IncidentType | null) ?? '')
  const [page, setPage] = useState(1)
  const [resolveTarget, setResolveTarget] = useState<Incident | null>(null)
  const [affectedTarget, setAffectedTarget] = useState<Incident | null>(null)
  const [resolutionNote, setResolutionNote] = useState('')

  const params = useMemo(
    () => ({
      search: search.trim() || undefined,
      status: status || undefined,
      severity: severity || undefined,
      type: type || undefined,
      page,
      limit: 10
    }),
    [page, search, severity, status, type]
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      void dispatch(getIncidents(params))
    }, 250)

    return () => clearTimeout(timer)
  }, [dispatch, params])

  const handleOpenResolve = (incident: Incident) => {
    setResolveTarget(incident)
    setResolutionNote('')
  }

  const handleCloseResolve = () => {
    setResolveTarget(null)
    setResolutionNote('')
  }

  const handleOpenAffectedOrders = (incident: Incident) => {
    setAffectedTarget(incident)
    void dispatch(getIncidentById({ incidentId: incident.id }))
  }

  const handleCloseAffectedOrders = () => {
    setAffectedTarget(null)
    dispatch(clearIncidentDetail())
  }

  const handleConfirmResolve = () => {
    if (!resolveTarget || !resolutionNote.trim()) return

    dispatch(resolveIncident({ incidentId: resolveTarget.id, data: { resolutionNote } }))
      .unwrap()
      .then(() => {
        toast.success('Đã xử lý sự cố.')
        handleCloseResolve()
        void dispatch(getIncidents(params))
      })
      .catch((error) => toast.error(getApiErrorMessage(error, 'Không thể xử lý sự cố.')))
  }

  const handleFilterChange = (setter: (value: never) => void, value: string) => {
    setPage(1)
    setter(value as never)
  }

  return (
    <main className='p-4 text-slate-900 sm:p-6'>
      <div className='mx-auto max-w-7xl'>
        <section className='overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm'>
          <div className='border-b border-slate-200 p-5 sm:p-6'>
            <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
              <div>
                <p className='text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700'>Incident Management</p>
                <h1 className='mt-2 text-2xl font-bold text-slate-800 sm:text-3xl'>Sự cố sản xuất</h1>
                <p className='mt-2 text-sm text-slate-500'>
                  Theo dõi, lọc và xử lý các sự cố phát sinh trong pipeline.
                </p>
              </div>
              <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
                <label className='relative block'>
                  <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
                  <input
                    value={search}
                    onChange={(event) => {
                      setPage(1)
                      setSearch(event.target.value)
                    }}
                    className='h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-100'
                    placeholder='Tìm mã/mô tả'
                  />
                </label>
                <select
                  value={status}
                  onChange={(event) => handleFilterChange(setStatus, event.target.value)}
                  className='h-11 rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-100'
                >
                  <option value=''>Tất cả trạng thái</option>
                  {incidentStatusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={severity}
                  onChange={(event) => handleFilterChange(setSeverity, event.target.value)}
                  className='h-11 rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-100'
                >
                  <option value=''>Tất cả mức độ</option>
                  {incidentSeverityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={type}
                  onChange={(event) => handleFilterChange(setType, event.target.value)}
                  className='h-11 rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-100'
                >
                  <option value=''>Tất cả loại</option>
                  {incidentTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          {listError ? (
            <div className='border-b border-rose-100 bg-rose-50 p-5 text-sm font-medium text-rose-600'>{listError}</div>
          ) : null}

          <div className='overflow-x-auto'>
            <table className='w-full min-w-[1080px] text-left text-sm'>
              <thead className='bg-slate-50 text-xs font-bold uppercase text-slate-500'>
                <tr>
                  <th className='px-4 py-4'>STT</th>
                  <th className='px-4 py-4'>Mã</th>
                  <th className='px-4 py-4'>Loại</th>
                  <th className='px-4 py-4'>Mô tả</th>
                  <th className='px-4 py-4'>Tài nguyên</th>
                  <th className='px-4 py-4'>Công đoạn</th>
                  <th className='px-4 py-4'>Mức độ</th>
                  <th className='px-4 py-4'>Trạng thái</th>
                  <th className='px-4 py-4'>Ảnh hưởng</th>
                  <th className='px-4 py-4'>Thời gian</th>
                  <th className='px-4 py-4 text-right'>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={11} className='px-4 py-10 text-center font-medium text-slate-500'>
                      Đang tải danh sách sự cố...
                    </td>
                  </tr>
                ) : items.length > 0 ? (
                  items.map((incident, index) => (
                    <tr
                      key={incident.id}
                      className='border-b border-slate-100 align-top transition hover:bg-slate-50/80 last:border-0'
                    >
                      <td className='px-4 py-4 font-semibold text-slate-500'>
                        {(pagination.page - 1) * pagination.limit + index + 1}
                      </td>
                      <td className='px-4 py-4 font-semibold text-slate-800'>{incident.code}</td>
                      <td className='px-4 py-4 text-slate-600'>{getIncidentTypeLabel(incident.type)}</td>
                      <td className='max-w-xs px-4 py-4 text-slate-600'>{incident.rawDescription}</td>
                      <td className='px-4 py-4 text-slate-600'>
                        {incident.resource ? `${incident.resource.name} (${incident.resource.code})` : '-'}
                      </td>
                      <td className='px-4 py-4 text-slate-600'>
                        {incident.orderStage ? `${incident.orderStage.name} (${incident.orderStage.code})` : '-'}
                      </td>
                      <td className='px-4 py-4'>
                        <Badge value={incident.severity} label={getIncidentSeverityLabel(incident.severity)} />
                      </td>
                      <td className='px-4 py-4'>
                        <div className='space-y-2'>
                          <Badge value={incident.status} label={getIncidentStatusLabel(incident.status)} />
                          {incident.status === 'RESOLVED' ? (
                            <div className='max-w-[220px] text-xs leading-5 text-slate-500'>
                              {incident.resolvedBy ? (
                                <p>
                                  Xử lý bởi:{' '}
                                  <span className='font-semibold text-slate-700'>{incident.resolvedBy.fullName}</span>
                                </p>
                              ) : null}
                              {incident.resolvedAt ? <p>{formatDateTime(incident.resolvedAt)}</p> : null}
                              {incident.resolutionNote ? (
                                <p className='line-clamp-2'>Ghi chú: {incident.resolutionNote}</p>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td className='px-4 py-4'>
                        {(incident.affectedOrderCount ?? 0) > 0 ? (
                          <button
                            type='button'
                            onClick={() => handleOpenAffectedOrders(incident)}
                            className='h-9 rounded-lg border border-cyan-200 bg-cyan-50 px-3 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-100 cursor-pointer'
                          >
                            Chi tiết
                          </button>
                        ) : (
                          <span className='text-xs font-semibold text-slate-400'>-</span>
                        )}
                      </td>
                      <td className='px-4 py-4 text-slate-600'>{formatDateTime(incident.createdAt)}</td>
                      <td className='px-4 py-4 text-right'>
                        {incident.status === 'OPEN' ? (
                          <button
                            type='button'
                            onClick={() => handleOpenResolve(incident)}
                            className='h-9 rounded-lg bg-emerald-500 px-3 text-xs font-semibold text-white transition hover:bg-emerald-600 cursor-pointer'
                          >
                            Đã xử lý
                          </button>
                        ) : (
                          <span className='text-xs font-semibold text-slate-400'>Hoàn tất</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={11} className='px-4 py-10 text-center text-sm text-slate-500'>
                      Chưa có sự cố phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className='flex flex-col gap-3 border-t border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between'>
            <p className='text-sm text-slate-500'>
              Trang {pagination.page}/{Math.max(pagination.totalPages, 1)} • {pagination.totalItems} sự cố
            </p>
            <div className='flex gap-2'>
              <button
                type='button'
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
                className='h-10 cursor-pointer rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:text-slate-300'
              >
                Trước
              </button>
              <button
                type='button'
                disabled={page >= pagination.totalPages || loading}
                onClick={() => setPage((current) => current + 1)}
                className='h-10 cursor-pointer rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:text-slate-300'
              >
                Sau
              </button>
            </div>
          </div>
        </section>
      </div>

      {resolveTarget ? (
        <ResolveIncidentModal
          incident={resolveTarget}
          loading={resolveLoading}
          resolutionNote={resolutionNote}
          setResolutionNote={setResolutionNote}
          onClose={handleCloseResolve}
          onConfirm={handleConfirmResolve}
        />
      ) : null}

      {affectedTarget ? (
        <AffectedOrdersModal
          incident={selectedIncident?.id === affectedTarget.id ? selectedIncident : affectedTarget}
          loading={detailLoading}
          error={detailError}
          onClose={handleCloseAffectedOrders}
        />
      ) : null}
    </main>
  )
}

export default IncidentsPage
