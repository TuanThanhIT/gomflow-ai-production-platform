import { Eye, Pencil, Plus, RotateCcw, Save, Search, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import {
  getResourceTypeLabel,
  resourceTypeOptions as baseResourceTypeOptions,
  resourceTypeValues
} from '../constants/resourceTypes'
import { useAppDispatch, useAppSelector } from '../redux/hook'
import {
  clearSelectedResource,
  createResource,
  deleteResource,
  getResourceById,
  getResources,
  updateResource
} from '../redux/slices/resourceSlice'
import { ResourceFormSchema } from '../schemas/ResourceFormSchema'
import type {
  CreateResourcePayload,
  GetResourcesParams,
  Resource,
  ResourceStatus,
  ResourceType
} from '../types/resource'
import { getApiErrorMessage } from '../utils/apiError'
import { showConfirmDialog } from '../utils/confirmDialog'

type ActiveFilter = 'active' | 'inactive' | 'all'
type PageMode = 'idle' | 'detail' | 'create' | 'edit'

const resourceTypeOptions = [{ label: 'Tất cả loại', value: '' }, ...baseResourceTypeOptions] as const

const resourceStatusOptions = [
  { label: 'Tất cả trạng thái', value: '' },
  { label: 'Sẵn sàng', value: 'AVAILABLE' },
  { label: 'Đang sử dụng', value: 'IN_USE' },
  { label: 'Bảo trì', value: 'MAINTENANCE' },
  { label: 'Hỏng', value: 'BROKEN' }
] as const

const activeOptions: Array<{ label: string; value: ActiveFilter }> = [
  { label: 'Đang sử dụng', value: 'active' },
  { label: 'Ngừng sử dụng', value: 'inactive' },
  { label: 'Tất cả', value: 'all' }
]

const statusLabels: Record<string, string> = {
  AVAILABLE: 'Sẵn sàng',
  IN_USE: 'Đang sử dụng',
  MAINTENANCE: 'Bảo trì',
  BROKEN: 'Hỏng'
}

const statusClasses: Record<string, string> = {
  AVAILABLE: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  IN_USE: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  MAINTENANCE: 'border-amber-200 bg-amber-50 text-amber-700',
  BROKEN: 'border-rose-200 bg-rose-50 text-rose-700'
}

const emptyForm = (): CreateResourcePayload => ({
  code: '',
  name: '',
  type: 'FORMING',
  description: ''
})

const formatDateTime = (value?: string) => {
  if (!value) return '-'
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value))
}

const ResourceStatusBadge = ({ status }: { status: string }) => (
  <span
    className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${
      statusClasses[status] || statusClasses.AVAILABLE
    }`}
  >
    {statusLabels[status] || status}
  </span>
)

const ActiveBadge = ({ isActive }: { isActive: boolean }) => (
  <span
    className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${
      isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
    }`}
  >
    {isActive ? 'Đang dùng' : 'Đã ngừng'}
  </span>
)

const UsageStat = ({ label, value }: { label: string; value?: number }) => (
  <div className='rounded-lg border border-slate-200 bg-slate-50 p-3'>
    <p className='text-xs font-semibold uppercase text-slate-400'>{label}</p>
    <p className='mt-1 text-xl font-bold text-slate-800'>{value ?? 0}</p>
  </div>
)

const ResourcesPage = () => {
  const dispatch = useAppDispatch()
  const { detailError, items, listError, selectedResource } = useAppSelector((state) => state.resource)
  const currentUser = useAppSelector((state) => state.auth.user)
  const loading = useAppSelector((state) => state.ui.loadingMap['resource/getResources'] || false)
  const detailLoading = useAppSelector((state) => state.ui.loadingMap['resource/getResourceById'] || false)
  const createLoading = useAppSelector((state) => state.ui.loadingMap['resource/createResource'] || false)
  const updateLoading = useAppSelector((state) => state.ui.loadingMap['resource/updateResource'] || false)
  const deleteLoading = useAppSelector((state) => state.ui.loadingMap['resource/deleteResource'] || false)
  const saving = createLoading || updateLoading
  const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER'

  const [searchInput, setSearchInput] = useState('')
  const [filters, setFilters] = useState<GetResourcesParams>({ active: 'active', search: '', status: '', type: '' })
  const [mode, setMode] = useState<PageMode>('idle')
  const [form, setForm] = useState<CreateResourcePayload>(emptyForm)

  const requestParams = useMemo(
    () => ({
      active: filters.active || 'active',
      search: filters.search?.trim() || undefined,
      status: filters.status || undefined,
      type: filters.type || undefined
    }),
    [filters]
  )

  useEffect(() => {
    void dispatch(getResources(requestParams))
  }, [dispatch, requestParams])

  const updateFilter = (nextFilters: Partial<GetResourcesParams>) => {
    setFilters((current) => ({ ...current, ...nextFilters }))
  }

  const handleSearch = () => updateFilter({ search: searchInput })

  const closePanel = () => {
    setMode('idle')
    setForm(emptyForm())
    dispatch(clearSelectedResource())
  }

  const openCreate = () => {
    dispatch(clearSelectedResource())
    setForm(emptyForm())
    setMode('create')
  }

  const openDetail = (resource: Resource) => {
    setMode('detail')
    void dispatch(getResourceById({ resourceId: resource.id }))
  }

  const openEdit = async (resource: Resource) => {
    setMode('edit')
    const response = await dispatch(getResourceById({ resourceId: resource.id })).unwrap()
    const detail = response.data
    setForm({
      code: detail.code,
      name: detail.name,
      type: detail.type as ResourceType,
      description: detail.description || ''
    })
  }

  const reloadResources = () => dispatch(getResources(requestParams))

  const handleSubmit = async () => {
    const result = ResourceFormSchema.safeParse(form)
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? 'Dữ liệu tài nguyên không hợp lệ.')
      return
    }

    const payload = result.data

    try {
      if (mode === 'create') {
        await dispatch(createResource(payload)).unwrap()
        toast.success('Đã tạo tài nguyên sản xuất.')
      } else if (mode === 'edit' && selectedResource) {
        await dispatch(updateResource({ resourceId: selectedResource.id, payload })).unwrap()
        toast.success('Đã cập nhật tài nguyên sản xuất.')
      }

      await reloadResources()
      setMode('detail')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể lưu tài nguyên.'))
    }
  }

  const handleDelete = async (resource: Resource) => {
    const confirmed = await showConfirmDialog(
      resource.hasUsage ? 'Ngừng sử dụng tài nguyên?' : 'Xóa tài nguyên?',
      resource.hasUsage
        ? `${resource.name} đã có lịch sử sử dụng nên hệ thống sẽ ngừng sử dụng thay vì xóa khỏi dữ liệu.`
        : `${resource.name} chưa có lịch sử sử dụng và sẽ bị xóa khỏi danh sách.`,
      resource.hasUsage ? 'Ngừng sử dụng' : 'Xóa',
      'Hủy',
      'danger'
    )
    if (!confirmed) return

    try {
      const response = await dispatch(deleteResource({ resourceId: resource.id })).unwrap()
      toast.success(response.data.deactivated ? 'Đã ngừng sử dụng tài nguyên.' : 'Đã xóa tài nguyên.')
      await reloadResources()
      if (selectedResource?.id === resource.id) closePanel()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể xóa hoặc ngừng sử dụng tài nguyên.'))
    }
  }

  const handleReactivate = async (resource: Resource) => {
    try {
      await dispatch(updateResource({ resourceId: resource.id, payload: { isActive: true } })).unwrap()
      toast.success('Đã kích hoạt lại tài nguyên.')
      await reloadResources()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không thể kích hoạt lại tài nguyên.'))
    }
  }

  const identityLocked = mode === 'edit' && selectedResource?.canEditIdentity === false

  return (
    <main className='p-4 text-slate-900 sm:p-6'>
      <div className='mx-auto max-w-7xl'>
        <section className='overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm'>
          <div className='border-b border-slate-200 p-5 sm:p-6'>
            <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
              <div>
                <p className='text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700'>Resources</p>
                <h1 className='mt-2 text-2xl font-bold text-slate-800 sm:text-3xl'>Tài nguyên sản xuất</h1>
                <p className='mt-2 max-w-2xl text-sm leading-6 text-slate-500'>
                  Quản lý máy móc và khu vực được dùng trong quy trình sản xuất.
                </p>
              </div>
              {canManage ? (
                <button
                  type='button'
                  onClick={openCreate}
                  className='inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-cyan-500 px-5 text-sm font-semibold text-white transition hover:bg-cyan-600'
                >
                  <Plus size={18} />
                  Thêm tài nguyên
                </button>
              ) : null}
            </div>

            <div className='mt-6 grid gap-3 xl:grid-cols-[1fr_180px_190px_180px_auto]'>
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleSearch()
                }}
                className='h-11 rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-100'
                placeholder='Tìm theo mã hoặc tên tài nguyên...'
              />
              <select
                value={filters.active}
                onChange={(event) => updateFilter({ active: event.target.value as ActiveFilter })}
                className='h-11 rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-100'
              >
                {activeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={filters.type}
                onChange={(event) => updateFilter({ type: event.target.value as ResourceType | '' })}
                className='h-11 rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-100'
              >
                {resourceTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={filters.status}
                onChange={(event) => updateFilter({ status: event.target.value as ResourceStatus | '' })}
                className='h-11 rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-100'
              >
                {resourceStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type='button'
                onClick={handleSearch}
                className='inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-slate-800 px-5 text-sm font-semibold text-white transition hover:bg-slate-900'
              >
                <Search size={17} />
                Tìm
              </button>
            </div>
          </div>

          {listError ? (
            <div className='border-b border-rose-100 bg-rose-50 p-5 text-sm font-medium text-rose-600'>{listError}</div>
          ) : null}

          {mode !== 'idle' ? (
            <div className='border-b border-slate-200 bg-slate-50 p-5 sm:p-6'>
              <div className='rounded-lg border border-slate-200 bg-white p-5'>
                <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                  <div>
                    <p className='text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700'>
                      {mode === 'create' ? 'Create' : mode === 'edit' ? 'Edit' : 'Detail'}
                    </p>
                    <h2 className='mt-2 text-xl font-bold text-slate-800'>
                      {mode === 'create'
                        ? 'Thêm tài nguyên'
                        : selectedResource
                          ? `${selectedResource.name} (${selectedResource.code})`
                          : 'Chi tiết tài nguyên'}
                    </h2>
                  </div>
                  <button
                    type='button'
                    onClick={closePanel}
                    className='inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100'
                    title='Đóng'
                  >
                    <X size={18} />
                  </button>
                </div>

                {detailError ? <p className='mt-4 text-sm font-medium text-rose-600'>{detailError}</p> : null}
                {detailLoading && mode !== 'create' ? (
                  <p className='mt-4 text-sm font-medium text-slate-500'>Đang tải chi tiết...</p>
                ) : null}

                {mode === 'detail' && selectedResource ? (
                  <div className='mt-5 grid gap-5 lg:grid-cols-[1fr_320px]'>
                    <div className='grid gap-4 sm:grid-cols-2'>
                      <div>
                        <p className='text-xs font-semibold uppercase text-slate-400'>Mã</p>
                        <p className='mt-1 font-bold text-slate-800'>{selectedResource.code}</p>
                      </div>
                      <div>
                        <p className='text-xs font-semibold uppercase text-slate-400'>Loại</p>
                        <p className='mt-1 font-bold text-slate-800'>{getResourceTypeLabel(selectedResource.type)}</p>
                      </div>
                      <div>
                        <p className='text-xs font-semibold uppercase text-slate-400'>Trạng thái máy</p>
                        <div className='mt-2'>
                          <ResourceStatusBadge status={selectedResource.status} />
                        </div>
                      </div>
                      <div>
                        <p className='text-xs font-semibold uppercase text-slate-400'>Hiệu lực</p>
                        <div className='mt-2'>
                          <ActiveBadge isActive={selectedResource.isActive} />
                        </div>
                      </div>
                      <div className='sm:col-span-2'>
                        <p className='text-xs font-semibold uppercase text-slate-400'>Mô tả</p>
                        <p className='mt-1 text-sm leading-6 text-slate-600'>{selectedResource.description || '-'}</p>
                      </div>
                      <div>
                        <p className='text-xs font-semibold uppercase text-slate-400'>Tạo lúc</p>
                        <p className='mt-1 text-sm text-slate-600'>{formatDateTime(selectedResource.createdAt)}</p>
                      </div>
                      <div>
                        <p className='text-xs font-semibold uppercase text-slate-400'>Cập nhật</p>
                        <p className='mt-1 text-sm text-slate-600'>{formatDateTime(selectedResource.updatedAt)}</p>
                      </div>
                    </div>
                    <div className='grid grid-cols-2 gap-3'>
                      <UsageStat label='Công đoạn' value={selectedResource.orderStageCount} />
                      <UsageStat label='Sự cố' value={selectedResource.incidentCount} />
                      <UsageStat label='WAITING' value={selectedResource.waitingAssignmentCount} />
                      <UsageStat label='IN_PROGRESS' value={selectedResource.inProgressAssignmentCount} />
                      <UsageStat label='Incident mở' value={selectedResource.openIncidentCount} />
                    </div>
                  </div>
                ) : null}

                {(mode === 'create' || mode === 'edit') && (
                  <div className='mt-5 grid gap-4 md:grid-cols-2'>
                    <label className='block'>
                      <span className='text-sm font-semibold text-slate-700'>Mã tài nguyên</span>
                      <input
                        value={form.code}
                        onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
                        disabled={identityLocked}
                        className='mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm uppercase outline-none focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400'
                        placeholder='VD: KILN_01'
                      />
                    </label>
                    <label className='block'>
                      <span className='text-sm font-semibold text-slate-700'>Tên tài nguyên</span>
                      <input
                        value={form.name}
                        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                        className='mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-100'
                        placeholder='VD: Lò nung số 1'
                      />
                    </label>
                    <label className='block'>
                      <span className='text-sm font-semibold text-slate-700'>Loại</span>
                      <select
                        value={form.type}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, type: event.target.value as ResourceType }))
                        }
                        disabled={identityLocked}
                        className='mt-2 h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400'
                      >
                        {resourceTypeValues.map((type) => (
                          <option key={type} value={type}>
                            {getResourceTypeLabel(type)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div>
                      <span className='text-sm font-semibold text-slate-700'>Trạng thái máy</span>
                      <div className='mt-2 h-11 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2'>
                        <ResourceStatusBadge status={selectedResource?.status || 'AVAILABLE'} />
                      </div>
                    </div>
                    <label className='block md:col-span-2'>
                      <span className='text-sm font-semibold text-slate-700'>Mô tả</span>
                      <textarea
                        value={form.description || ''}
                        onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                        rows={3}
                        className='mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-100'
                        placeholder='Ghi chú vị trí, năng lực hoặc đặc điểm vận hành...'
                      />
                    </label>
                    <div className='flex flex-wrap gap-3 md:col-span-2'>
                      <button
                        type='button'
                        onClick={handleSubmit}
                        disabled={saving || !form.code.trim() || !form.name.trim()}
                        className='inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-cyan-500 px-5 text-sm font-semibold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-300'
                      >
                        <Save size={18} />
                        {saving ? 'Đang lưu...' : 'Lưu'}
                      </button>
                      <button
                        type='button'
                        onClick={closePanel}
                        className='h-11 cursor-pointer rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50'
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {loading ? (
            <div className='p-10 text-center text-sm font-medium text-slate-500'>Đang tải danh sách tài nguyên...</div>
          ) : items.length === 0 ? (
            <div className='p-10 text-center text-sm text-slate-500'>Chưa có tài nguyên sản xuất nào.</div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full min-w-[980px] text-left text-sm'>
                <thead className='bg-slate-50 text-xs font-bold uppercase text-slate-500'>
                  <tr>
                    <th className='px-4 py-4'>STT</th>
                    <th className='px-4 py-4'>Mã</th>
                    <th className='px-4 py-4'>Tên</th>
                    <th className='px-4 py-4'>Loại</th>
                    <th className='px-4 py-4'>Trạng thái máy</th>
                    <th className='px-4 py-4'>Hiệu lực</th>
                    <th className='px-4 py-4'>Sử dụng</th>
                    <th className='px-4 py-4'>Mô tả</th>
                    <th className='px-4 py-4 text-right'>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((resource, index) => (
                    <tr
                      key={resource.id}
                      className='border-b border-slate-100 transition hover:bg-slate-50/80 last:border-0'
                    >
                      <td className='px-4 py-4 font-semibold text-slate-500'>{index + 1}</td>
                      <td className='px-4 py-4 font-semibold text-slate-800'>{resource.code}</td>
                      <td className='px-4 py-4 text-slate-700'>{resource.name}</td>
                      <td className='px-4 py-4 font-medium text-slate-600'>{getResourceTypeLabel(resource.type)}</td>
                      <td className='px-4 py-4'>
                        <ResourceStatusBadge status={resource.status} />
                      </td>
                      <td className='px-4 py-4'>
                        <ActiveBadge isActive={resource.isActive} />
                      </td>
                      <td className='px-4 py-4 text-slate-600'>
                        {(resource.orderStageCount ?? 0) + (resource.incidentCount ?? 0)}
                      </td>
                      <td className='max-w-[240px] truncate px-4 py-4 text-slate-500'>{resource.description || '-'}</td>
                      <td className='px-4 py-4'>
                        <div className='flex justify-end gap-2'>
                          <button
                            type='button'
                            onClick={() => openDetail(resource)}
                            className='inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100'
                            title='Xem chi tiết'
                          >
                            <Eye size={16} />
                          </button>
                          {canManage ? (
                            <>
                              <button
                                type='button'
                                onClick={() => void openEdit(resource)}
                                className='inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100'
                                title='Sửa'
                              >
                                <Pencil size={16} />
                              </button>
                              {resource.isActive ? (
                                <button
                                  type='button'
                                  onClick={() => void handleDelete(resource)}
                                  disabled={deleteLoading}
                                  className='inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-rose-200 text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50'
                                  title={resource.hasUsage ? 'Ngừng sử dụng' : 'Xóa'}
                                >
                                  <Trash2 size={16} />
                                </button>
                              ) : (
                                <button
                                  type='button'
                                  onClick={() => void handleReactivate(resource)}
                                  disabled={updateLoading}
                                  className='inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-emerald-200 text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50'
                                  title='Kích hoạt lại'
                                >
                                  <RotateCcw size={16} />
                                </button>
                              )}
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default ResourcesPage
