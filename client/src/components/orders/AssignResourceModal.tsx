import type { OrderStage } from '../../types/order'
import type { AvailableResourcesForStage } from '../../types/resource'

const getResourcePlanningStatusText = (status: string) => {
  if (status === 'AVAILABLE') return 'Sẵn sàng'
  if (status === 'IN_USE') return 'Đang được sử dụng - Có thể gán trước'
  if (status === 'BROKEN') return 'Đang gặp sự cố'
  if (status === 'MAINTENANCE') return 'Đang bảo trì'
  return status
}

type AssignResourceModalProps = {
  assignLoading: boolean
  availableError: string
  loading: boolean
  onClose: () => void
  onConfirm: () => void
  resources?: AvailableResourcesForStage
  selectedResourceId: number | ''
  setSelectedResourceId: (value: number | '') => void
  stage: OrderStage
}

const AssignResourceModal = ({
  assignLoading,
  availableError,
  loading,
  onClose,
  onConfirm,
  resources,
  selectedResourceId,
  setSelectedResourceId,
  stage
}: AssignResourceModalProps) => {
  const resourceItems = resources?.resources ?? []
  const isChangingResource = Boolean(stage.assignedResource)

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm'>
      <button type='button' aria-label='Đóng modal' className='absolute inset-0 cursor-default' onClick={onClose} />
      <section className='relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl'>
        <div className='border-b border-slate-200 p-6'>
          <div className='flex items-start justify-between gap-4'>
            <div>
              <p className='text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700'>Assign Resource</p>
              <h2 className='mt-2 text-2xl font-bold text-slate-800'>
                {isChangingResource ? 'Đổi tài nguyên' : 'Gán tài nguyên'}: {stage.name}
              </h2>
              <div className='mt-3 flex flex-wrap gap-2 text-xs font-semibold'>
                <span className='rounded-full bg-slate-100 px-3 py-1 text-slate-600'>
                  Yêu cầu: {stage.templateStep?.requiredResourceType || '-'}
                </span>
                {stage.assignedResource ? (
                  <span className='rounded-full bg-amber-50 px-3 py-1 text-amber-700'>
                    Hiện tại: {stage.assignedResource.name}
                  </span>
                ) : null}
              </div>
            </div>
            <button
              type='button'
              onClick={onClose}
              className='flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600'
              aria-label='Đóng'
            >
              ×
            </button>
          </div>
        </div>

        <div className='p-6'>
          {loading ? (
            <div className='rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500'>
              Đang tải tài nguyên có thể gán...
            </div>
          ) : null}
          {availableError ? (
            <div className='rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-600'>
              {availableError}
            </div>
          ) : null}

          {!loading && !availableError ? (
            <div className='space-y-3'>
              {resourceItems.length > 0 ? (
                resourceItems.map((resource) => {
                  const isSelected = selectedResourceId === resource.id

                  return (
                    <label
                      key={resource.id}
                      className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition ${
                        isSelected
                          ? 'border-cyan-300 bg-cyan-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-cyan-200 hover:bg-cyan-50/40'
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                          isSelected ? 'border-cyan-500 bg-cyan-500' : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected ? <span className='h-2 w-2 rounded-full bg-white' /> : null}
                      </span>
                      <input
                        type='radio'
                        name='resourceId'
                        value={resource.id}
                        checked={isSelected}
                        onChange={() => setSelectedResourceId(resource.id)}
                        className='sr-only'
                      />
                      <span className='min-w-0 flex-1'>
                        <span className='block font-semibold text-slate-800'>{resource.name}</span>
                        <span className='mt-1 block text-sm text-slate-500'>
                          {resource.code} • {resource.type} • {getResourcePlanningStatusText(resource.status)}
                        </span>
                        {resource.status === 'IN_USE' ? (
                          <span className='mt-2 block text-xs font-medium leading-5 text-cyan-700'>
                            Bạn vẫn có thể gán trước tài nguyên này. Công đoạn sẽ chờ đến khi tài nguyên được giải
                            phóng.
                          </span>
                        ) : null}
                      </span>
                    </label>
                  )
                })
              ) : (
                <div className='rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500'>
                  Không có tài nguyên phù hợp để gán.
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className='flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4'>
          <button
            type='button'
            onClick={onClose}
            className='h-10 cursor-pointer rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800'
          >
            Hủy
          </button>
          <button
            type='button'
            disabled={assignLoading || !selectedResourceId}
            onClick={onConfirm}
            className={`h-10 cursor-pointer rounded-lg px-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-slate-300 ${
              isChangingResource ? 'bg-amber-500 hover:bg-amber-600' : 'bg-cyan-500 hover:bg-cyan-600'
            }`}
          >
            {assignLoading ? 'Đang lưu...' : isChangingResource ? 'Xác nhận đổi' : 'Xác nhận gán'}
          </button>
        </div>
      </section>
    </div>
  )
}

export default AssignResourceModal
