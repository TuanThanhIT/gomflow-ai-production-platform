import { ProcessTemplate, ProcessTemplateStep } from '../models/index.js'

export type RecommendedProcessTemplate = {
  id: number
  code: string
  name: string
  confidence: number
  reason: string
}

export type ProcessTemplateCandidateStep = {
  code: string
  name: string
  stepOrder: number
  description?: string | null
}

export type ProcessTemplateCandidate = {
  id: number
  code: string
  name: string
  description?: string | null
  steps: ProcessTemplateCandidateStep[]
}

export type ProcessRecommendationOutput = {
  selectedTemplateId: number | null
  confidence: number | null
  reason: string | null
}

const MIN_RECOMMENDATION_CONFIDENCE = 0.6

export const loadActiveTemplateCandidatesService = async (): Promise<ProcessTemplateCandidate[]> => {
  const templates = await ProcessTemplate.findAll({
    where: { isActive: true },
    attributes: ['id', 'code', 'name', 'description'],
    include: [
      {
        model: ProcessTemplateStep,
        as: 'steps',
        attributes: ['code', 'name', 'stepOrder', 'description']
      }
    ],
    order: [
      ['id', 'ASC'],
      [{ model: ProcessTemplateStep, as: 'steps' }, 'stepOrder', 'ASC']
    ]
  })

  return templates.map((template) => {
    const plain = template.get({ plain: true }) as {
      id: string | number
      code: string
      name: string
      description?: string | null
      steps?: ProcessTemplateCandidateStep[]
    }

    return {
      id: Number(plain.id),
      code: plain.code,
      name: plain.name,
      description: plain.description ?? null,
      steps: (plain.steps ?? []).map((step) => ({
        code: step.code,
        name: step.name,
        stepOrder: step.stepOrder,
        description: step.description ?? null
      }))
    }
  })
}

export const hydrateRecommendation = (
  output: ProcessRecommendationOutput,
  candidates: ProcessTemplateCandidate[],
  warnings: string[]
): RecommendedProcessTemplate | null => {
  if (!output.selectedTemplateId) return null

  const candidate = candidates.find((item) => item.id === output.selectedTemplateId)
  if (!candidate) {
    warnings.push('AI đã đề xuất quy trình không nằm trong danh sách khả dụng, vui lòng chọn thủ công.')
    console.warn('AI process recommendation returned an unknown template id')
    return null
  }

  if (output.confidence === null || output.confidence < MIN_RECOMMENDATION_CONFIDENCE || !output.reason) {
    warnings.push('Không đủ thông tin để đề xuất quy trình sản xuất phù hợp. Vui lòng chọn thủ công.')
    return null
  }

  return {
    id: candidate.id,
    code: candidate.code,
    name: candidate.name,
    confidence: output.confidence,
    reason: output.reason
  }
}

export default {
  hydrateRecommendation,
  loadActiveTemplateCandidatesService
}
