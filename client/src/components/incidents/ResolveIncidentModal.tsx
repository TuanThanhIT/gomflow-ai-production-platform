import { X } from 'lucide-react'
import type { Incident } from '../../types/incident'
import { getIncidentTypeLabel } from '../../utils/incidentDisplay'

type ResolveIncidentModalProps = {
  incident: Incident
  loading: boolean
  onClose: () => void
  onConfirm: () => void
  resolutionNote: string
  setResolutionNote: (value: string) => void
}

const ResolveIncidentModal = ({
  incident,
  loading,
  onClose,
  onConfirm,
  resolutionNote,
  setResolutionNote
}: ResolveIncidentModalProps) => (
  <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm'>
    <button type='button' aria-label='Đóng modal' className='absolute inset-0 cursor-default' onClick={onClose} />
    <section className='relative z-10 w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl'>
      <div className='flex items-start justify-between gap-4'>
        <div>
          <p className='text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700'>Resolve Incident</p>
          <h2 className='mt-2 text-xl font-semibold text-slate-800'>{incident.code}</h2>
          <p className='mt-1 text-sm text-slate-500'>{getIncidentTypeLabel(incident.type)}</p>
        </div>
        <button
          type='button'
          onClick={onClose}
          className='h-9 w-9 cursor-pointer rounded-full border border-slate-200 text-xl text-slate-500'
        >
          <X className='mx-auto h-4 w-4' />
        </button>
      </div>

      <label className='mt-6 block'>
        <span className='text-sm font-semibold text-slate-700'>Ghi chú xử lý</span>
        <textarea
          value={resolutionNote}
          onChange={(event) => setResolutionNote(event.target.value)}
          rows={5}
          className='mt-2 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
          placeholder='Nhập cách xử lý, ghi chú bảo trì hoặc kết quả kiểm tra...'
        />
      </label>

      <div className='mt-6 flex justify-end gap-3'>
        <button
          type='button'
          onClick={onClose}
          className='h-10 cursor-pointer rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700'
        >
          Hủy
        </button>
        <button
          type='button'
          disabled={loading || !resolutionNote.trim()}
          onClick={onConfirm}
          className='h-10 cursor-pointer rounded-2xl bg-emerald-600 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300'
        >
          {loading ? 'Đang xử lý...' : 'Đánh dấu đã xử lý'}
        </button>
      </div>
    </section>
  </div>
)

export default ResolveIncidentModal
