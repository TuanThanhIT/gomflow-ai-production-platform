import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Sparkles, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAppDispatch, useAppSelector } from '../redux/hook'
import { createOrder } from '../redux/slices/orderSlice'
import {
  clearProcessTemplateDetailError,
  clearSelectedProcessTemplate,
  getProcessTemplateById,
  getProcessTemplates
} from '../redux/slices/processTemplateSlice'
import { CreateOrderFormSchema, type CreateOrderForm } from '../schemas/CreateOrderFormSchema'
import aiService from '../services/aiService'
import type { ManufacturingEstimate, ManufacturingEstimateSources, RecommendedProcessTemplate } from '../types/ai'
import type { CreateOrderPayload, OrderPriority, OrderSpecifications } from '../types/order'
import type { ProcessTemplateStep } from '../types/processTemplate'
import { getApiErrorMessage } from '../utils/apiError'
import { showConfirmDialog } from '../utils/confirmDialog'

const priorityOptions: Array<{ label: string; value: OrderPriority }> = [
  { label: 'Thấp', value: 'LOW' },
  { label: 'Bình thường', value: 'NORMAL' },
  { label: 'Cao', value: 'HIGH' },
  { label: 'Khẩn cấp', value: 'URGENT' }
]

const AI_TEMPLATE_AUTO_SELECT_CONFIDENCE = 0.8

const estimateSourceLabels: Record<string, string> = {
  EXTRACTED: 'Theo yêu cầu khách hàng',
  AI_ESTIMATE: 'AI ước tính'
}

const formatEstimateValue = (value: string | number | null | undefined, unit: string) => {
  if (value === null || value === undefined || value === '') return 'Chưa xác định'
  return `${value.toLocaleString('vi-VN')} ${unit}`
}

const getRecommendationConfidenceLabel = (confidence: number) => {
  if (confidence >= 0.8) return 'Cao'
  if (confidence >= 0.6) return 'Trung bình'
  return 'Thấp'
}

const numberOrUndefined = (value: number | '') => (value === '' ? undefined : value)

const buildSpecifications = (data: CreateOrderForm): OrderSpecifications | null => {
  const extraSpecifications = data.extraSpecifications
    .map((specification) => ({
      name: specification.name.trim(),
      value: specification.value.trim(),
      unit: specification.unit?.trim() || null
    }))
    .filter((specification) => specification.name && specification.value)

  const specifications: OrderSpecifications = {
    glazeColor: data.glazeColor?.trim() || undefined,
    capacityMl: numberOrUndefined(data.capacityMl),
    heightCm: numberOrUndefined(data.heightCm),
    diameterCm: numberOrUndefined(data.diameterCm),
    specialRequirements: data.customization?.trim() || undefined,
    extraSpecifications: extraSpecifications.length > 0 ? extraSpecifications : undefined
  }

  const cleanedSpecifications = Object.fromEntries(
    Object.entries(specifications).filter(([, value]) => value !== undefined && value !== '')
  ) as OrderSpecifications

  return Object.keys(cleanedSpecifications).length > 0 ? cleanedSpecifications : null
}

const PipelineStep = ({ step, isLast }: { step: ProcessTemplateStep; isLast: boolean }) => {
  return (
    <div className='relative pl-10'>
      <div className='absolute left-0 top-0 flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500 text-xs font-bold text-white'>
        {step.stepOrder}
      </div>
      {!isLast ? <div className='absolute left-[13px] top-8 h-[calc(100%-0.5rem)] w-px bg-slate-200' /> : null}
      <div className='pb-5'>
        <p className='font-semibold text-slate-800'>{step.name}</p>
        <p className='mt-1 text-xs font-semibold uppercase text-slate-400'>{step.code}</p>
      </div>
    </div>
  )
}

const CreateOrderPage = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [aiText, setAiText] = useState('')
  const [aiWarnings, setAiWarnings] = useState<string[]>([])
  const [aiSuccess, setAiSuccess] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiRecommendedTemplate, setAiRecommendedTemplate] = useState<RecommendedProcessTemplate | null>(null)
  const [aiManufacturingEstimate, setAiManufacturingEstimate] = useState<ManufacturingEstimate | null>(null)
  const [aiManufacturingEstimateSources, setAiManufacturingEstimateSources] =
    useState<ManufacturingEstimateSources | null>(null)
  const { detailError, selectedTemplate, templates } = useAppSelector((state) => state.processTemplate)
  const createError = useAppSelector((state) => state.order.createError)
  const templatesLoading = useAppSelector(
    (state) => state.ui.loadingMap['processTemplate/getProcessTemplates'] || false
  )
  const detailLoading = useAppSelector(
    (state) => state.ui.loadingMap['processTemplate/getProcessTemplateById'] || false
  )
  const createLoading = useAppSelector((state) => state.ui.loadingMap['order/createOrder'] || false)

  const {
    register,
    handleSubmit,
    control,
    formState: { dirtyFields, errors },
    getValues,
    setValue
  } = useForm<CreateOrderForm>({
    resolver: zodResolver(CreateOrderFormSchema),
    mode: 'onSubmit',
    defaultValues: {
      customerName: '',
      productName: '',
      quantity: 1,
      processTemplateId: 0,
      deadline: '',
      priority: 'NORMAL',
      glazeColor: '',
      capacityMl: '',
      heightCm: '',
      diameterCm: '',
      customization: '',
      extraSpecifications: []
    }
  })

  const { append, fields, remove, replace } = useFieldArray({
    control,
    name: 'extraSpecifications'
  })

  const selectedProcessTemplateId = useWatch({ control, name: 'processTemplateId' })
  const isUsingAiRecommendedTemplate =
    Boolean(aiRecommendedTemplate) && Number(selectedProcessTemplateId) === aiRecommendedTemplate?.id

  useEffect(() => {
    void dispatch(getProcessTemplates())

    return () => {
      dispatch(clearSelectedProcessTemplate())
    }
  }, [dispatch])

  useEffect(() => {
    if (!selectedProcessTemplateId) {
      dispatch(clearSelectedProcessTemplate())
      return
    }

    dispatch(clearProcessTemplateDetailError())
    void dispatch(getProcessTemplateById({ processTemplateId: selectedProcessTemplateId }))
  }, [dispatch, selectedProcessTemplateId])

  const clearOrderDraftFields = () => {
    setValue('customerName', '', { shouldDirty: true, shouldValidate: false })
    setValue('productName', '', { shouldDirty: true, shouldValidate: false })
    setValue('quantity', 1, { shouldDirty: true, shouldValidate: false })
    setValue('processTemplateId', 0, { shouldDirty: true, shouldValidate: false })
    setValue('deadline', '', { shouldDirty: true, shouldValidate: false })
    setValue('priority', 'NORMAL', { shouldDirty: true, shouldValidate: false })
    setValue('glazeColor', '', { shouldDirty: true, shouldValidate: false })
    setValue('capacityMl', '', { shouldDirty: true, shouldValidate: false })
    setValue('heightCm', '', { shouldDirty: true, shouldValidate: false })
    setValue('diameterCm', '', { shouldDirty: true, shouldValidate: false })
    setValue('customization', '', { shouldDirty: true, shouldValidate: false })
    replace([])
  }

  const applyAiDraft = async () => {
    const trimmedText = aiText.trim()
    if (!trimmedText) {
      toast.error('Vui lòng nhập nội dung yêu cầu khách hàng để AI phân tích.')
      return
    }

    const currentValues = getValues()
    const hasManualData = Boolean(
      dirtyFields.customerName ||
      dirtyFields.productName ||
      dirtyFields.quantity ||
      dirtyFields.deadline ||
      dirtyFields.priority ||
      dirtyFields.glazeColor ||
      dirtyFields.capacityMl ||
      dirtyFields.heightCm ||
      dirtyFields.diameterCm ||
      dirtyFields.customization ||
      currentValues.extraSpecifications.length > 0
    )

    if (hasManualData) {
      const confirmed = await showConfirmDialog(
        'Áp dụng kết quả AI',
        'Kết quả AI sẽ cập nhật các trường thông tin đơn hàng hiện tại. Quy trình sản xuất đã chọn vẫn được giữ nguyên.',
        'Áp dụng',
        'Hủy',
        'question'
      )
      if (!confirmed) return
    }

    setAiLoading(true)
    setAiSuccess('')
    setAiWarnings([])
    setAiRecommendedTemplate(null)
    setAiManufacturingEstimate(null)
    setAiManufacturingEstimateSources(null)
    clearOrderDraftFields()

    try {
      const response = await aiService.analyzeOrder(trimmedText)
      const { draft, recommendedProcessTemplate, warnings } = response.data.data
      setAiManufacturingEstimate(draft.manufacturingEstimate)
      setAiManufacturingEstimateSources(draft.manufacturingEstimateSources)

      if (draft.customerName) setValue('customerName', draft.customerName, { shouldDirty: true, shouldValidate: true })
      if (draft.productName) setValue('productName', draft.productName, { shouldDirty: true, shouldValidate: true })
      if (draft.quantity) setValue('quantity', draft.quantity, { shouldDirty: true, shouldValidate: true })
      if (draft.priority) setValue('priority', draft.priority, { shouldDirty: true, shouldValidate: true })
      if (draft.deadline) setValue('deadline', `${draft.deadline}T23:59`, { shouldDirty: true, shouldValidate: true })

      setValue('glazeColor', draft.specifications.glazeColor ?? '', { shouldDirty: true, shouldValidate: true })
      setValue('capacityMl', draft.specifications.capacityMl ?? '', { shouldDirty: true, shouldValidate: true })
      setValue('heightCm', draft.specifications.heightCm ?? '', { shouldDirty: true, shouldValidate: true })
      setValue('diameterCm', draft.specifications.diameterCm ?? '', { shouldDirty: true, shouldValidate: true })
      setValue('customization', draft.specialRequirements ?? '', { shouldDirty: true, shouldValidate: true })
      replace(
        draft.specifications.extraSpecifications.map((specification) => ({
          name: specification.name,
          value: specification.value,
          unit: specification.unit ?? ''
        }))
      )
      setAiRecommendedTemplate(recommendedProcessTemplate)
      if (recommendedProcessTemplate && recommendedProcessTemplate.confidence >= AI_TEMPLATE_AUTO_SELECT_CONFIDENCE) {
        setValue('processTemplateId', recommendedProcessTemplate.id, { shouldDirty: true, shouldValidate: true })
      }

      setAiWarnings(warnings)
      setAiSuccess('Đã phân tích yêu cầu. Vui lòng kiểm tra thông tin trước khi tạo đơn.')
      toast.success('Đã phân tích yêu cầu bằng AI.')
    } catch (error) {
      setAiSuccess('')
      toast.error(getApiErrorMessage(error, 'Không thể phân tích bằng AI. Bạn vẫn có thể nhập đơn hàng thủ công.'))
    } finally {
      setAiLoading(false)
    }
  }

  const onSubmit = (data: CreateOrderForm) => {
    const payload: CreateOrderPayload = {
      processTemplateId: data.processTemplateId,
      customerName: data.customerName.trim(),
      productName: data.productName.trim(),
      quantity: data.quantity,
      specifications: buildSpecifications(data),
      rawOrderText: aiText.trim() || null,
      aiAnalysis: aiManufacturingEstimate
        ? {
            manufacturingEstimate: aiManufacturingEstimate,
            manufacturingEstimateSources: aiManufacturingEstimateSources ?? undefined,
            warnings: aiWarnings,
            recommendedProcessTemplate: aiRecommendedTemplate
          }
        : null,
      deadline: new Date(data.deadline).toISOString(),
      priority: data.priority
    }

    dispatch(createOrder({ data: payload }))
      .unwrap()
      .then((res) => {
        toast.success(`Tạo đơn hàng ${res.data.code} thành công.`)
        navigate(`/orders/${res.data.id}`, { replace: true })
      })
      .catch((error) => {
        toast.error(getApiErrorMessage(error, 'Không thể tạo đơn hàng. Vui lòng thử lại.'))
      })
  }

  return (
    <main className='p-4 text-slate-900 sm:p-6'>
      <div className='mx-auto max-w-7xl'>
        <section className='overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm'>
          <div className='border-b border-slate-200 p-5 sm:p-6'>
            <p className='text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700'>Create Order</p>
            <h1 className='mt-2 text-2xl font-bold text-slate-800 sm:text-3xl'>Tạo đơn hàng mới</h1>
            <p className='mt-2 max-w-2xl text-sm leading-6 text-slate-500'>
              Nhập thông tin đơn hàng, chọn quy trình sản xuất và xem trước pipeline trước khi tạo.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className='grid lg:grid-cols-[minmax(0,1fr)_430px]'>
              <section className='p-5 sm:p-6 lg:border-r lg:border-slate-200'>
                <div className='mb-8 rounded-lg border border-cyan-100 bg-cyan-50 p-5'>
                  <label className='block'>
                    <span className='text-sm font-bold text-slate-800'>Phân tích yêu cầu bằng AI</span>
                    <textarea
                      value={aiText}
                      onChange={(event) => setAiText(event.target.value)}
                      rows={5}
                      maxLength={4000}
                      className='mt-3 w-full resize-y rounded-lg border border-cyan-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100'
                      placeholder='ABC Coffee đặt 200 ly gốm men xanh ngọc 350ml...'
                    />
                  </label>
                  <div className='mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                    <span className='text-xs font-medium text-cyan-700'>{aiText.trim().length}/4000 ký tự</span>
                    <button
                      type='button'
                      disabled={aiLoading || !aiText.trim()}
                      onClick={() => void applyAiDraft()}
                      className='inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-cyan-600 px-5 text-sm font-bold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300'
                    >
                      <Sparkles className='h-4 w-4' />
                      {aiLoading ? 'Đang phân tích...' : 'Phân tích bằng AI'}
                    </button>
                  </div>
                  {aiSuccess ? (
                    <p className='mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700'>
                      {aiSuccess}
                    </p>
                  ) : null}
                  {aiWarnings.length > 0 ? (
                    <div className='mt-4 space-y-2'>
                      {aiWarnings.map((warning) => (
                        <p
                          key={warning}
                          className='rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800'
                        >
                          {warning}
                        </p>
                      ))}
                    </div>
                  ) : null}
                  {aiManufacturingEstimate ? (
                    <div className='mt-4 rounded-lg border border-cyan-200 bg-white p-4'>
                      <h2 className='text-sm font-bold text-slate-800'>Ước tính sản xuất bằng AI</h2>
                      <div className='mt-3 grid gap-3 sm:grid-cols-2'>
                        {[
                          {
                            key: 'estimatedClayKg',
                            label: 'Lượng đất dự kiến',
                            value: formatEstimateValue(aiManufacturingEstimate.estimatedClayKg, 'kg')
                          },
                          {
                            key: 'glazeType',
                            label: 'Loại men',
                            value: aiManufacturingEstimate.glazeType || 'Chưa xác định'
                          },
                          {
                            key: 'estimatedFiringTemperatureC',
                            label: 'Nhiệt độ nung',
                            value: formatEstimateValue(aiManufacturingEstimate.estimatedFiringTemperatureC, '°C')
                          },
                          {
                            key: 'estimatedFiringDurationMinutes',
                            label: 'Thời gian nung dự kiến',
                            value: formatEstimateValue(aiManufacturingEstimate.estimatedFiringDurationMinutes, 'phút')
                          }
                        ].map((item) => {
                          const source =
                            aiManufacturingEstimateSources?.[item.key as keyof ManufacturingEstimateSources] ?? null

                          return (
                            <div key={item.key} className='rounded-lg border border-slate-200 bg-slate-50 p-3'>
                              <p className='text-xs font-semibold uppercase text-slate-400'>{item.label}</p>
                              <p className='mt-1 font-bold text-slate-900'>{item.value}</p>
                              {source ? (
                                <p className='mt-1 text-xs font-semibold text-cyan-700'>
                                  {estimateSourceLabels[source] ?? source}
                                </p>
                              ) : null}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className='grid gap-5 md:grid-cols-2'>
                  <label className='block'>
                    <span className='text-sm font-medium text-slate-700'>Khách hàng</span>
                    <input
                      {...register('customerName')}
                      type='text'
                      className='mt-2 h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-100'
                      placeholder='ABC Coffee'
                    />
                    {errors.customerName?.message ? (
                      <span className='mt-2 block text-xs font-medium text-rose-500'>
                        {errors.customerName.message}
                      </span>
                    ) : null}
                  </label>

                  <label className='block'>
                    <span className='text-sm font-medium text-slate-700'>Tên sản phẩm</span>
                    <input
                      {...register('productName')}
                      type='text'
                      className='mt-2 h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-100'
                      placeholder='Ly gốm men xanh'
                    />
                    {errors.productName?.message ? (
                      <span className='mt-2 block text-xs font-medium text-rose-500'>{errors.productName.message}</span>
                    ) : null}
                  </label>

                  <label className='block'>
                    <span className='text-sm font-medium text-slate-700'>Số lượng</span>
                    <input
                      {...register('quantity', { setValueAs: (value) => Number(value) })}
                      type='number'
                      min={1}
                      className='mt-2 h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-100'
                    />
                    {errors.quantity?.message ? (
                      <span className='mt-2 block text-xs font-medium text-rose-500'>{errors.quantity.message}</span>
                    ) : null}
                  </label>

                  <label className='block'>
                    <span className='text-sm font-medium text-slate-700'>Độ ưu tiên</span>
                    <select
                      {...register('priority')}
                      className='mt-2 h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-100'
                    >
                      {priorityOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {errors.priority?.message ? (
                      <span className='mt-2 block text-xs font-medium text-rose-500'>{errors.priority.message}</span>
                    ) : null}
                  </label>

                  <label className='block'>
                    <span className='text-sm font-medium text-slate-700'>Deadline</span>
                    <input
                      {...register('deadline')}
                      type='datetime-local'
                      className='mt-2 h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-100'
                    />
                    {errors.deadline?.message ? (
                      <span className='mt-2 block text-xs font-medium text-rose-500'>{errors.deadline.message}</span>
                    ) : null}
                  </label>

                  <label className='block'>
                    <span className='text-sm font-medium text-slate-700'>Quy trình sản xuất</span>
                    <select
                      {...register('processTemplateId', { setValueAs: (value) => Number(value) })}
                      disabled={templatesLoading}
                      className='mt-2 h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-100 disabled:cursor-not-allowed disabled:text-slate-400'
                    >
                      <option value={0}>{templatesLoading ? 'Đang tải quy trình...' : 'Chọn quy trình'}</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                    {errors.processTemplateId?.message ? (
                      <span className='mt-2 block text-xs font-medium text-rose-500'>
                        {errors.processTemplateId.message}
                      </span>
                    ) : null}
                    {aiRecommendedTemplate ? (
                      <div
                        className={`mt-3 rounded-lg border px-4 py-3 text-sm ${
                          isUsingAiRecommendedTemplate
                            ? 'border-cyan-200 bg-cyan-50 text-cyan-800'
                            : 'border-amber-200 bg-amber-50 text-amber-800'
                        }`}
                      >
                        <div className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
                          <div>
                            <p className='font-bold'>
                              {isUsingAiRecommendedTemplate
                                ? 'AI đề xuất quy trình này'
                                : 'Bạn đã chọn quy trình khác với đề xuất AI'}
                            </p>
                            <p className='mt-1 leading-6'>{aiRecommendedTemplate.reason}</p>
                          </div>
                          <span className='shrink-0 rounded-full border border-current/20 bg-white/70 px-3 py-1 text-xs font-bold'>
                            Tự tin: {getRecommendationConfidenceLabel(aiRecommendedTemplate.confidence)}
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </label>
                </div>

                <div className='mt-8'>
                  <h2 className='text-lg font-bold text-slate-800'>Thông số sản phẩm</h2>
                  <div className='mt-4 grid gap-5 md:grid-cols-2'>
                    <label className='block'>
                      <span className='text-sm font-medium text-slate-700'>Màu men</span>
                      <input
                        {...register('glazeColor')}
                        type='text'
                        className='mt-2 h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-100'
                        placeholder='Xanh ngọc'
                      />
                    </label>

                    <label className='block'>
                      <span className='text-sm font-medium text-slate-700'>Dung tích ml</span>
                      <input
                        {...register('capacityMl', { setValueAs: (value) => (value === '' ? '' : Number(value)) })}
                        type='number'
                        min={1}
                        className='mt-2 h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-100'
                        placeholder='350'
                      />
                      {errors.capacityMl?.message ? (
                        <span className='mt-2 block text-xs font-medium text-rose-500'>
                          {errors.capacityMl.message}
                        </span>
                      ) : null}
                    </label>

                    <label className='block'>
                      <span className='text-sm font-medium text-slate-700'>Chiều cao cm</span>
                      <input
                        {...register('heightCm', { setValueAs: (value) => (value === '' ? '' : Number(value)) })}
                        type='number'
                        min={1}
                        step='0.1'
                        className='mt-2 h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-100'
                        placeholder='10'
                      />
                      {errors.heightCm?.message ? (
                        <span className='mt-2 block text-xs font-medium text-rose-500'>{errors.heightCm.message}</span>
                      ) : null}
                    </label>

                    <label className='block'>
                      <span className='text-sm font-medium text-slate-700'>Đường kính cm</span>
                      <input
                        {...register('diameterCm', { setValueAs: (value) => (value === '' ? '' : Number(value)) })}
                        type='number'
                        min={1}
                        step='0.1'
                        className='mt-2 h-12 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-100'
                        placeholder='8'
                      />
                      {errors.diameterCm?.message ? (
                        <span className='mt-2 block text-xs font-medium text-rose-500'>
                          {errors.diameterCm.message}
                        </span>
                      ) : null}
                    </label>
                  </div>

                  <label className='mt-5 block'>
                    <span className='text-sm font-medium text-slate-700'>Yêu cầu riêng</span>
                    <textarea
                      {...register('customization')}
                      rows={4}
                      className='mt-2 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-100'
                      placeholder='In logo ABC Coffee'
                    />
                  </label>

                  <div className='mt-6'>
                    <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                      <h3 className='text-base font-bold text-slate-800'>Thông số bổ sung</h3>
                      <button
                        type='button'
                        onClick={() => append({ name: '', value: '', unit: '' })}
                        className='inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-cyan-200 bg-white px-4 text-sm font-bold text-cyan-700 transition hover:bg-cyan-50'
                      >
                        <Plus className='h-4 w-4' />
                        Thêm thông số
                      </button>
                    </div>
                    {fields.length > 0 ? (
                      <div className='mt-4 space-y-3'>
                        {fields.map((field, index) => (
                          <div
                            key={field.id}
                            className='grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px_44px]'
                          >
                            <label className='block'>
                              <span className='text-xs font-semibold text-slate-500'>Tên thông số</span>
                              <input
                                {...register(`extraSpecifications.${index}.name`)}
                                type='text'
                                className='mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100'
                                placeholder='Độ dày thành'
                              />
                              {errors.extraSpecifications?.[index]?.name?.message ? (
                                <span className='mt-2 block text-xs font-medium text-rose-500'>
                                  {errors.extraSpecifications[index]?.name?.message}
                                </span>
                              ) : null}
                            </label>
                            <label className='block'>
                              <span className='text-xs font-semibold text-slate-500'>Giá trị</span>
                              <input
                                {...register(`extraSpecifications.${index}.value`)}
                                type='text'
                                className='mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100'
                                placeholder='4'
                              />
                              {errors.extraSpecifications?.[index]?.value?.message ? (
                                <span className='mt-2 block text-xs font-medium text-rose-500'>
                                  {errors.extraSpecifications[index]?.value?.message}
                                </span>
                              ) : null}
                            </label>
                            <label className='block'>
                              <span className='text-xs font-semibold text-slate-500'>Đơn vị</span>
                              <input
                                {...register(`extraSpecifications.${index}.unit`)}
                                type='text'
                                className='mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100'
                                placeholder='mm'
                              />
                            </label>
                            <button
                              type='button'
                              onClick={() => remove(index)}
                              className='mt-6 flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-600 transition hover:bg-rose-50 md:mt-7'
                              aria-label='Xóa thông số bổ sung'
                              title='Xóa thông số bổ sung'
                            >
                              <Trash2 className='h-4 w-4' />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className='mt-4 rounded-lg border border-dashed border-slate-300 p-5 text-sm text-slate-500'>
                        Chưa có thông số bổ sung.
                      </p>
                    )}
                  </div>
                </div>

                {createError ? (
                  <div className='mt-6 rounded-lg border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-600'>
                    {createError}
                  </div>
                ) : null}
              </section>

              <aside className='border-t border-slate-200 bg-slate-50 p-5 sm:p-6 lg:border-t-0'>
                <p className='text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700'>Preview pipeline</p>
                <h2 className='mt-2 text-xl font-bold text-slate-800'>Quy trình sản xuất đã chọn</h2>

                {detailLoading ? (
                  <div className='mt-6 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-medium text-slate-500'>
                    Đang tải pipeline...
                  </div>
                ) : detailError ? (
                  <div className='mt-6 rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-700'>
                    {detailError}
                  </div>
                ) : selectedTemplate ? (
                  <div className='mt-6'>
                    <p className='rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700'>
                      {selectedTemplate.name}
                    </p>
                    <div className='mt-5'>
                      {selectedTemplate.steps.map((step, index) => (
                        <PipelineStep key={step.id} step={step} isLast={index === selectedTemplate.steps.length - 1} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className='mt-6 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500'>
                    Chọn quy trình sản xuất để xem trước các bước.
                  </div>
                )}
              </aside>
            </div>

            <div className='flex justify-end border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6'>
              <button
                type='submit'
                disabled={createLoading || templatesLoading || !selectedProcessTemplateId}
                className='flex h-12 min-w-44 cursor-pointer items-center justify-center rounded-lg bg-cyan-500 px-6 text-sm font-bold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-300'
              >
                {createLoading ? 'Đang tạo đơn hàng...' : 'Tạo đơn hàng'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}

export default CreateOrderPage
