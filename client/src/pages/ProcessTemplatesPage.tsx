import { Eye, Plus, RotateCcw, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import ProcessTemplateBuilder, {
  type ProcessTemplateFormState,
  type ProcessTemplateStageFormItem
} from '../components/process-templates/ProcessTemplateBuilder'
import { getResourceTypeLabel } from '../constants/resourceTypes'
import { useAppDispatch, useAppSelector } from '../redux/hook'
import {
  clearSelectedProcessTemplate,
  createProcessTemplate,
  deleteProcessTemplate,
  getProcessTemplateById,
  getProcessTemplates,
  updateProcessTemplate
} from '../redux/slices/processTemplateSlice'
import { ProcessTemplateFormSchema } from '../schemas/ProcessTemplateFormSchema'
import type { CreateProcessTemplatePayload, ProcessTemplate, ProcessTemplateDetail } from '../types/processTemplate'
import type { ResourceType } from '../types/resource'
import { getApiErrorMessage } from '../utils/apiError'
import { showConfirmDialog } from '../utils/confirmDialog'

type StatusFilter = 'active' | 'inactive' | 'all'
type StageFormItem = ProcessTemplateStageFormItem

const emptyStage = (): StageFormItem => ({
  localId: crypto.randomUUID(),
  code: '',
  name: '',
  estimatedDurationMinutes: null,
  requiredResourceType: null,
  description: null
})

const emptyForm = (): ProcessTemplateFormState => ({
  code: '',
  name: '',
  description: '',
  isActive: true,
  stages: [emptyStage()]
})

const formatDuration = (minutes: number | null | undefined) => {
  if (minutes === null || minutes === undefined) return 'Chưa thiết lập'
  return `${minutes.toLocaleString('vi-VN')} phút`
}

const formatDateTime = (value?: string) => {
  if (!value) return '-'
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(new Date(value))
}

const toStageFormItems = (template: ProcessTemplateDetail): StageFormItem[] =>
  template.steps
    .slice()
    .sort((first, second) => first.stepOrder - second.stepOrder)
    .map((step) => ({
      localId: `persisted-${step.id}`,
      id: step.id,
      code: step.code,
      name: step.name,
      estimatedDurationMinutes: step.estimatedDurationMinutes,
      requiredResourceType: (step.requiredResourceType as ResourceType | null) ?? null,
      description: step.description
    }))

const TemplateStatusBadge = ({ isActive }: { isActive: boolean }) => (
  <span
    className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${
      isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
    }`}
  >
    {isActive ? 'Đang sử dụng' : 'Ngưng sử dụng'}
  </span>
)

const ProcessStepTimeline = ({ template }: { template: ProcessTemplateDetail }) => (
  <div className='space-y-4'>
    {template.steps.length > 0 ? (
      template.steps.map((step, index) => (
        <div key={step.id} className='relative pl-10'>
          <div className='absolute left-0 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-cyan-600 text-xs font-bold text-white'>
            {step.stepOrder}
          </div>
          {index < template.steps.length - 1 ? (
            <div className='absolute left-[13px] top-9 h-[calc(100%-0.5rem)] w-px bg-slate-200' />
          ) : null}
          <div className='rounded-lg border border-slate-200 bg-white p-4'>
            <div className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
              <div>
                <p className='font-bold text-slate-800'>{step.name}</p>
                <p className='mt-1 text-xs font-semibold uppercase text-slate-400'>{step.code}</p>
              </div>
              <span className='w-fit rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700'>
                {getResourceTypeLabel(step.requiredResourceType)}
              </span>
            </div>
            <p className='mt-3 text-sm text-slate-600'>
              Thời gian dự kiến: {formatDuration(step.estimatedDurationMinutes)}
            </p>
            {step.description ? <p className='mt-2 text-sm leading-6 text-slate-500'>{step.description}</p> : null}
          </div>
        </div>
      ))
    ) : (
      <div className='rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500'>
        Quy trình này chưa có công đoạn.
      </div>
    )}
  </div>
)

const ProcessTemplatesPage = () => {
  const dispatch = useAppDispatch()
  const { detailError, error, loadingDetailId, selectedTemplate, templates } = useAppSelector(
    (state) => state.processTemplate
  )
  const currentUser = useAppSelector((state) => state.auth.user)
  const loading = useAppSelector((state) => state.ui.loadingMap['processTemplate/getProcessTemplates'] || false)
  const detailLoading = useAppSelector(
    (state) => state.ui.loadingMap['processTemplate/getProcessTemplateById'] || false
  )
  const createLoading = useAppSelector((state) => state.ui.loadingMap['processTemplate/createProcessTemplate'] || false)
  const updateLoading = useAppSelector((state) => state.ui.loadingMap['processTemplate/updateProcessTemplate'] || false)
  const deleteLoading = useAppSelector((state) => state.ui.loadingMap['processTemplate/deleteProcessTemplate'] || false)
  const saving = createLoading || updateLoading
  const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER'

  const [status, setStatus] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState<'detail' | 'create' | 'edit'>('detail')
  const [form, setForm] = useState(emptyForm)

  const requestParams = useMemo(
    () => ({
      status,
      search: search.trim() || undefined
    }),
    [search, status]
  )

  useEffect(() => {
    void dispatch(getProcessTemplates(requestParams))
  }, [dispatch, requestParams])

  const resetForm = useCallback(() => setForm(emptyForm()), [])

  const handleCreate = () => {
    dispatch(clearSelectedProcessTemplate())
    resetForm()
    setMode('create')
  }

  const handleViewDetail = (template: ProcessTemplate) => {
    setMode('detail')
    void dispatch(getProcessTemplateById({ processTemplateId: template.id }))
  }

  const handleEdit = async (template: ProcessTemplate) => {
    setMode('edit')
    const response = await dispatch(getProcessTemplateById({ processTemplateId: template.id })).unwrap()
    const detail = response.data
    setForm({
      code: detail.code,
      name: detail.name,
      description: detail.description ?? '',
      isActive: detail.isActive,
      stages: toStageFormItems(detail)
    })
  }

  const updateStage = (localId: string, patch: Partial<StageFormItem>) => {
    setForm((current) => ({
      ...current,
      stages: current.stages.map((stage) => (stage.localId === localId ? { ...stage, ...patch } : stage))
    }))
  }

  const moveStage = (index: number, direction: -1 | 1) => {
    setForm((current) => {
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= current.stages.length) return current

      const stages = [...current.stages]
      const [item] = stages.splice(index, 1)
      stages.splice(targetIndex, 0, item)
      return { ...current, stages }
    })
  }

  const handleDeleteStage = async (stage: StageFormItem) => {
    const confirmed = await showConfirmDialog(
      'Xóa công đoạn',
      `Xóa công đoạn "${stage.name || stage.code || 'chưa đặt tên'}" khỏi quy trình? Các đơn hàng đã tạo trước đó không bị thay đổi.`,
      'Xóa',
      'Hủy',
      'warning'
    )
    if (!confirmed) return

    setForm((current) => ({
      ...current,
      stages: current.stages.filter((item) => item.localId !== stage.localId)
    }))
  }

  const buildPayload = (): CreateProcessTemplatePayload | null => {
    const result = ProcessTemplateFormSchema.safeParse(form)
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? 'Dữ liệu quy trình không hợp lệ.')
      return null
    }

    const data = result.data

    return {
      code: data.code,
      name: data.name,
      description: data.description,
      isActive: data.isActive,
      stages: data.stages.map((stage) => ({
        id: stage.id,
        code: stage.code,
        name: stage.name,
        estimatedDurationMinutes: stage.estimatedDurationMinutes,
        requiredResourceType: stage.requiredResourceType,
        description: stage.description
      }))
    }
  }
  const handleSave = () => {
    const payload = buildPayload()
    if (!payload) return

    const request =
      mode === 'edit' && selectedTemplate
        ? dispatch(updateProcessTemplate({ data: payload, processTemplateId: selectedTemplate.id }))
        : dispatch(createProcessTemplate({ data: payload }))

    request
      .unwrap()
      .then((response) => {
        toast.success(mode === 'edit' ? 'Đã cập nhật quy trình.' : 'Đã tạo quy trình.')
        setMode('detail')
        void dispatch(getProcessTemplates(requestParams))
        void dispatch(getProcessTemplateById({ processTemplateId: response.data.id }))
      })
      .catch((error) => toast.error(getApiErrorMessage(error, 'Không thể lưu quy trình.')))
  }

  const handleDeleteTemplate = async (template: ProcessTemplate) => {
    const isUsed = (template.orderCount ?? 0) > 0
    const confirmed = await showConfirmDialog(
      isUsed ? 'Ngưng sử dụng quy trình' : 'Xóa quy trình',
      isUsed
        ? `Quy trình "${template.name}" đã được dùng bởi đơn hàng. Hệ thống sẽ ngưng sử dụng quy trình này cho đơn hàng mới.`
        : `Xóa vĩnh viễn quy trình "${template.name}" và các công đoạn của nó?`,
      isUsed ? 'Ngưng sử dụng' : 'Xóa',
      'Hủy',
      'warning'
    )
    if (!confirmed) return

    dispatch(deleteProcessTemplate({ processTemplateId: template.id }))
      .unwrap()
      .then((response) => {
        toast.success(response.message)
        if (selectedTemplate?.id === template.id) dispatch(clearSelectedProcessTemplate())
        void dispatch(getProcessTemplates(requestParams))
      })
      .catch((error) => toast.error(getApiErrorMessage(error, 'Không thể xóa hoặc ngưng sử dụng quy trình.')))
  }

  const handleReactivate = (template: ProcessTemplate) => {
    dispatch(updateProcessTemplate({ processTemplateId: template.id, data: { isActive: true } }))
      .unwrap()
      .then(() => {
        toast.success('Đã kích hoạt lại quy trình.')
        void dispatch(getProcessTemplates(requestParams))
      })
      .catch((error) => toast.error(getApiErrorMessage(error, 'Không thể kích hoạt lại quy trình.')))
  }

  return (
    <main className='p-4 text-slate-900 sm:p-6'>
      <div className='mx-auto max-w-7xl'>
        <section className='overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm'>
          <div className='border-b border-slate-200 p-5 sm:p-6'>
            <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
              <div>
                <p className='text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700'>Process Template</p>
                <h1 className='mt-2 text-2xl font-bold text-slate-800 sm:text-3xl'>Quản lý quy trình sản xuất</h1>
                <p className='mt-2 max-w-2xl text-sm leading-6 text-slate-500'>
                  Tạo và chỉnh sửa mẫu quy trình. Các thay đổi chỉ áp dụng cho đơn hàng tạo mới.
                </p>
              </div>
              {canManage ? (
                <button
                  type='button'
                  onClick={handleCreate}
                  className='inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 text-sm font-bold text-white'
                >
                  <Plus className='h-4 w-4' />
                  Thêm quy trình
                </button>
              ) : null}
            </div>
          </div>

          <div className='grid xl:grid-cols-[420px_1fr]'>
            <div className='border-b border-slate-200 bg-white xl:border-b-0 xl:border-r'>
              <div className='space-y-3 border-b border-slate-200 p-4'>
                <div className='relative'>
                  <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className='h-10 w-full rounded-lg border border-slate-200 pl-11 pr-3 text-sm outline-none focus:border-cyan-500'
                    placeholder='Tìm theo tên hoặc code'
                  />
                </div>
                <div className='grid grid-cols-3 gap-2'>
                  {(['all', 'active', 'inactive'] as StatusFilter[]).map((item) => (
                    <button
                      key={item}
                      type='button'
                      onClick={() => setStatus(item)}
                      className={`h-9 cursor-pointer rounded-lg border text-sm font-semibold ${
                        status === item ? 'border-cyan-500 bg-cyan-50 text-cyan-700' : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      {item === 'all' ? 'Tất cả' : item === 'active' ? 'Đang dùng' : 'Đã dừng'}
                    </button>
                  ))}
                </div>
              </div>

              {error ? (
                <div className='border-b border-rose-100 bg-rose-50 p-4 text-sm text-rose-600'>{error}</div>
              ) : null}

              <div className='max-h-[70vh] overflow-y-auto p-4'>
                {loading ? (
                  <div className='rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500'>
                    Đang tải quy trình...
                  </div>
                ) : templates.length === 0 ? (
                  <div className='rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500'>
                    Chưa có quy trình sản xuất.
                    {canManage ? <span className='mt-2 block font-semibold'>Hãy tạo quy trình đầu tiên.</span> : null}
                  </div>
                ) : (
                  <div className='space-y-3'>
                    {templates.map((template) => (
                      <article key={template.id} className='rounded-lg border border-slate-200 bg-slate-50 p-4'>
                        <div className='flex items-start justify-between gap-3'>
                          <div>
                            <h2 className='font-bold text-slate-800'>{template.name}</h2>
                            <p className='mt-1 font-mono text-xs font-semibold text-slate-500'>{template.code}</p>
                          </div>
                          <TemplateStatusBadge isActive={template.isActive} />
                        </div>
                        <div className='mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-500'>
                          <span>{template.stepCount ?? 0} công đoạn</span>
                          <span>{template.orderCount ?? 0} đơn đã dùng</span>
                          <span>Cập nhật {formatDateTime(template.updatedAt)}</span>
                        </div>
                        <div className='mt-4 flex flex-wrap gap-2'>
                          <button
                            type='button'
                            onClick={() => handleViewDetail(template)}
                            disabled={loadingDetailId === template.id}
                            className='inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed'
                          >
                            <Eye className='h-4 w-4' />
                            Xem
                          </button>
                          {canManage ? (
                            <>
                              <button
                                type='button'
                                onClick={() => void handleEdit(template)}
                                className='h-9 cursor-pointer rounded-lg border border-cyan-200 bg-white px-3 text-sm font-semibold text-cyan-700'
                              >
                                Sửa
                              </button>
                              {template.isActive ? (
                                <button
                                  type='button'
                                  disabled={deleteLoading}
                                  onClick={() => void handleDeleteTemplate(template)}
                                  className='h-9 cursor-pointer rounded-lg border border-rose-200 bg-white px-3 text-sm font-semibold text-rose-600 disabled:cursor-not-allowed disabled:opacity-50'
                                >
                                  {(template.orderCount ?? 0) > 0 ? 'Ngưng dùng' : 'Xóa'}
                                </button>
                              ) : (
                                <button
                                  type='button'
                                  onClick={() => handleReactivate(template)}
                                  className='inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 text-sm font-semibold text-emerald-700'
                                >
                                  <RotateCcw className='h-4 w-4' />
                                  Kích hoạt
                                </button>
                              )}
                            </>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {mode === 'create' || mode === 'edit' ? (
              canManage ? (
                <ProcessTemplateBuilder
                  form={form}
                  mode={mode}
                  saving={saving}
                  selectedTemplate={selectedTemplate ?? null}
                  setForm={setForm}
                  updateStage={updateStage}
                  onAddStage={() => setForm((current) => ({ ...current, stages: [...current.stages, emptyStage()] }))}
                  onCancel={() => {
                    setMode('detail')
                    resetForm()
                  }}
                  onDeleteStage={(stage) => void handleDeleteStage(stage)}
                  onMoveStage={moveStage}
                  onSave={handleSave}
                />
              ) : null
            ) : (
              <section className='min-h-[70vh] bg-white'>
                <div className='border-b border-slate-200 p-5'>
                  <p className='text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700'>Chi tiết quy trình</p>
                  <h2 className='mt-2 text-xl font-bold text-slate-800'>
                    {selectedTemplate?.name ?? 'Chọn một quy trình'}
                  </h2>
                  {selectedTemplate ? (
                    <div className='mt-3 flex flex-wrap gap-2'>
                      <span className='rounded-full bg-slate-100 px-3 py-1 font-mono text-xs font-bold text-slate-600'>
                        {selectedTemplate.code}
                      </span>
                      <TemplateStatusBadge isActive={selectedTemplate.isActive} />
                    </div>
                  ) : null}
                </div>
                <div className='p-5'>
                  {detailLoading ? (
                    <div className='rounded-lg border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500'>
                      Đang tải chi tiết quy trình...
                    </div>
                  ) : detailError ? (
                    <div className='rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600'>
                      {detailError}
                    </div>
                  ) : selectedTemplate ? (
                    <div>
                      <p className='mb-5 text-sm leading-6 text-slate-500'>
                        {selectedTemplate.description || 'Chưa có mô tả.'}
                      </p>
                      <ProcessStepTimeline template={selectedTemplate} />
                    </div>
                  ) : (
                    <div className='rounded-lg border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500'>
                      Chọn một quy trình ở danh sách bên trái để xem các công đoạn.
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

export default ProcessTemplatesPage
