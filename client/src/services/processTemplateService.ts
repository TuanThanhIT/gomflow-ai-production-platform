import type {
  CreateProcessTemplatePayload,
  DeleteProcessTemplateResponse,
  GetProcessTemplatesParams,
  ProcessTemplateDetailResponse,
  ProcessTemplatesResponse,
  UpdateProcessTemplatePayload
} from '../types/processTemplate'
import instance from '../utils/axiosCustomize'

const getProcessTemplates = (params: GetProcessTemplatesParams = {}) =>
  instance.get<ProcessTemplatesResponse>('/api/process-templates', { params })

const getProcessTemplateById = (processTemplateId: number) =>
  instance.get<ProcessTemplateDetailResponse>(`/api/process-templates/${processTemplateId}`)

const createProcessTemplate = (data: CreateProcessTemplatePayload) =>
  instance.post<ProcessTemplateDetailResponse>('/api/process-templates', data)

const updateProcessTemplate = (processTemplateId: number, data: UpdateProcessTemplatePayload) =>
  instance.patch<ProcessTemplateDetailResponse>(`/api/process-templates/${processTemplateId}`, data)

const deleteProcessTemplate = (processTemplateId: number) =>
  instance.delete<DeleteProcessTemplateResponse>(`/api/process-templates/${processTemplateId}`)

const processTemplateService = {
  createProcessTemplate,
  deleteProcessTemplate,
  getProcessTemplateById,
  getProcessTemplates,
  updateProcessTemplate
}

export default processTemplateService
