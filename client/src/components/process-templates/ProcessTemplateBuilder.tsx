import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from 'lucide-react'
import type { Dispatch, SetStateAction } from 'react'
import { getResourceTypeLabel, resourceTypeValues } from '../../constants/resourceTypes'
import type { ProcessTemplateDetail, ProcessTemplateStagePayload } from '../../types/processTemplate'
import type { ResourceType } from '../../types/resource'

export type ProcessTemplateStageFormItem = ProcessTemplateStagePayload & { localId: string }

export type ProcessTemplateFormState = {
  code: string
  name: string
  description: string
  isActive: boolean
  stages: ProcessTemplateStageFormItem[]
}

type ProcessTemplateBuilderProps = {
  form: ProcessTemplateFormState
  mode: 'create' | 'edit'
  saving: boolean
  selectedTemplate: ProcessTemplateDetail | null
  onAddStage: () => void
  onCancel: () => void
  onDeleteStage: (stage: ProcessTemplateStageFormItem) => void
  onMoveStage: (index: number, direction: -1 | 1) => void
  onSave: () => void
  setForm: Dispatch<SetStateAction<ProcessTemplateFormState>>
  updateStage: (localId: string, patch: Partial<ProcessTemplateStageFormItem>) => void
}

const ProcessTemplateBuilder = ({
  form,
  mode,
  saving,
  selectedTemplate,
  onAddStage,
  onCancel,
  onDeleteStage,
  onMoveStage,
  onSave,
  setForm,
  updateStage
}: ProcessTemplateBuilderProps) => {
  const editUsedTemplate = mode === 'edit' && selectedTemplate && (selectedTemplate.orderCount ?? 0) > 0

  return (
    <section className='min-h-[70vh] bg-white'>
      <div className='border-b border-slate-200 p-5'>
        <p className='text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700'>
          {mode === 'edit' ? 'Edit Template' : 'Create Template'}
        </p>
        <h2 className='mt-2 text-xl font-bold text-slate-800'>
          {mode === 'edit' ? 'Sửa quy trình sản xuất' : 'Thêm quy trình sản xuất'}
        </h2>
        {editUsedTemplate ? (
          <div className='mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-700'>
            Quy trình này đã được sử dụng bởi đơn hàng. Các thay đổi bên dưới chỉ áp dụng cho đơn hàng tạo mới; các
            OrderStage đã tạo trước đó không bị cập nhật.
          </div>
        ) : null}
      </div>

      <div className='space-y-5 p-5'>
        <div className='grid gap-4 md:grid-cols-2'>
          <label className='block'>
            <span className='text-sm font-semibold text-slate-700'>Tên quy trình</span>
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className='mt-2 h-11 w-full rounded-lg border border-slate-200 px-4 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100'
            />
          </label>
          <label className='block'>
            <span className='text-sm font-semibold text-slate-700'>Mã quy trình</span>
            <input
              value={form.code}
              onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
              className='mt-2 h-11 w-full rounded-lg border border-slate-200 px-4 font-mono text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100'
              placeholder='CERAMIC_DOUBLE_FIRE'
            />
          </label>
        </div>
        <label className='block'>
          <span className='text-sm font-semibold text-slate-700'>Mô tả</span>
          <textarea
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            rows={3}
            className='mt-2 w-full resize-none rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100'
          />
        </label>
        <label className='flex w-fit items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700'>
          <input
            type='checkbox'
            checked={form.isActive}
            onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
            className='h-4 w-4 accent-cyan-600'
          />
          Đang sử dụng
        </label>

        <div>
          <div className='flex items-center justify-between gap-3'>
            <h3 className='font-bold text-slate-800'>Các công đoạn</h3>
            <button
              type='button'
              onClick={onAddStage}
              className='inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-cyan-600 px-3 text-sm font-bold text-white'
            >
              <Plus className='h-4 w-4' />
              Thêm công đoạn
            </button>
          </div>

          <div className='mt-4 space-y-3'>
            {form.stages.map((stage, index) => (
              <div key={stage.localId} className='rounded-lg border border-slate-200 bg-slate-50 p-4'>
                <div className='flex flex-col gap-3 lg:flex-row lg:items-start'>
                  <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-bold text-white'>
                    {index + 1}
                  </div>
                  <div className='grid flex-1 gap-3 md:grid-cols-2'>
                    <input
                      value={stage.name}
                      onChange={(event) => updateStage(stage.localId, { name: event.target.value })}
                      className='h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-cyan-500'
                      placeholder='Tên công đoạn'
                    />
                    <input
                      value={stage.code}
                      onChange={(event) => updateStage(stage.localId, { code: event.target.value.toUpperCase() })}
                      className='h-10 rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm outline-none focus:border-cyan-500'
                      placeholder='STEP_CODE'
                    />
                    <select
                      value={stage.requiredResourceType ?? ''}
                      onChange={(event) =>
                        updateStage(stage.localId, {
                          requiredResourceType: (event.target.value || null) as ResourceType | null
                        })
                      }
                      className='h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-cyan-500'
                    >
                      <option value=''>Không yêu cầu tài nguyên</option>
                      {resourceTypeValues.map((type) => (
                        <option key={type} value={type}>
                          {getResourceTypeLabel(type)}
                        </option>
                      ))}
                    </select>
                    <input
                      value={stage.estimatedDurationMinutes ?? ''}
                      onChange={(event) =>
                        updateStage(stage.localId, {
                          estimatedDurationMinutes: event.target.value ? Number(event.target.value) : null
                        })
                      }
                      type='number'
                      min='0'
                      step='1'
                      className='h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-cyan-500'
                      placeholder='Thời gian dự kiến (phút)'
                    />
                    <textarea
                      value={stage.description ?? ''}
                      onChange={(event) => updateStage(stage.localId, { description: event.target.value })}
                      rows={2}
                      className='resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-500 md:col-span-2'
                      placeholder='Mô tả công đoạn'
                    />
                  </div>
                  <div className='flex gap-2 lg:flex-col'>
                    <button
                      type='button'
                      onClick={() => onMoveStage(index, -1)}
                      disabled={index === 0}
                      className='flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 disabled:cursor-not-allowed disabled:opacity-40'
                      aria-label='Đưa công đoạn lên'
                    >
                      <ArrowUp className='h-4 w-4' />
                    </button>
                    <button
                      type='button'
                      onClick={() => onMoveStage(index, 1)}
                      disabled={index === form.stages.length - 1}
                      className='flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 disabled:cursor-not-allowed disabled:opacity-40'
                      aria-label='Đưa công đoạn xuống'
                    >
                      <ArrowDown className='h-4 w-4' />
                    </button>
                    <button
                      type='button'
                      onClick={() => onDeleteStage(stage)}
                      disabled={form.stages.length === 1}
                      className='flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-600 disabled:cursor-not-allowed disabled:opacity-40'
                      aria-label='Xóa công đoạn'
                    >
                      <Trash2 className='h-4 w-4' />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className='flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end'>
          <button
            type='button'
            onClick={onCancel}
            className='h-10 cursor-pointer rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600'
          >
            Hủy
          </button>
          <button
            type='button'
            disabled={saving}
            onClick={onSave}
            className='inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300'
          >
            <Save className='h-4 w-4' />
            {saving ? 'Đang lưu...' : 'Lưu quy trình'}
          </button>
        </div>
      </div>
    </section>
  )
}

export default ProcessTemplateBuilder
