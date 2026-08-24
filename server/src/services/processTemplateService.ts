import type { Transaction, WhereOptions } from 'sequelize'
import { Op, UniqueConstraintError } from 'sequelize'
import sequelize from '../config/db.js'
import { RESOURCE_TYPE } from '../constants/databaseConstants.js'
import BadRequestError from '../errors/BadRequestError.js'
import ConflictError from '../errors/ConflictError.js'
import NotFoundError from '../errors/NotFoundError.js'
import { Order, ProcessTemplate, ProcessTemplateStep } from '../models/index.js'

type ResourceType = (typeof RESOURCE_TYPE)[keyof typeof RESOURCE_TYPE]

export type ProcessTemplateStageInput = {
  id?: number
  code: string
  name: string
  estimatedDurationMinutes?: number | null
  requiredResourceType?: ResourceType | null
  description?: string | null
}

export type CreateProcessTemplateInput = {
  code: string
  name: string
  description?: string | null
  isActive?: boolean
  stages: ProcessTemplateStageInput[]
}

export type UpdateProcessTemplateInput = {
  code?: string
  name?: string
  description?: string | null
  isActive?: boolean
  stages?: ProcessTemplateStageInput[]
}

export type GetProcessTemplatesQuery = {
  status?: 'active' | 'inactive' | 'all'
  search?: string
}

const templateAttributes = ['id', 'code', 'name', 'description', 'isActive', 'updatedAt', 'createdAt']
const stepAttributes = [
  'id',
  'processTemplateId',
  'code',
  'name',
  'stepOrder',
  'estimatedDurationMinutes',
  'requiredResourceType',
  'description'
]

const normalizeCode = (value: string) => value.trim().toUpperCase()
const normalizeText = (value: string) => value.trim()
const normalizeNullableText = (value: string | null | undefined) => {
  if (value === null) return null
  if (value === undefined) return undefined

  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

const buildTemplateWhere = (query: GetProcessTemplatesQuery): WhereOptions => {
  const where: Record<string, unknown> & { [Op.or]?: unknown } = {}

  if (query.status === 'active' || !query.status) where.isActive = true
  if (query.status === 'inactive') where.isActive = false

  const search = query.search?.trim()
  if (search) {
    where[Op.or] = [{ code: { [Op.like]: `%${search}%` } }, { name: { [Op.like]: `%${search}%` } }]
  }

  return where as WhereOptions
}

const getPlain = <T>(model: { get: (options?: { plain: boolean }) => unknown }) => model.get({ plain: true }) as T

const toTemplateResponse = async (template: { get: (options?: { plain: boolean }) => unknown }) => {
  const plain = getPlain<Record<string, unknown> & { id: string | number; steps?: unknown[] }>(template)
  const orderCount = await Order.count({ where: { processTemplateId: plain.id } })

  return {
    ...plain,
    stepCount: Array.isArray(plain.steps) ? plain.steps.length : 0,
    orderCount
  }
}

const assertUniqueTemplateCode = async (code: string, excludeId?: string | number, transaction?: Transaction) => {
  const existing = await ProcessTemplate.findOne({
    where: {
      code,
      ...(excludeId
        ? {
            id: {
              [Op.ne]: excludeId
            }
          }
        : {})
    },
    attributes: ['id'],
    transaction
  })

  if (existing) {
    throw new ConflictError('Mã quy trình đã tồn tại.')
  }
}

const normalizeStagePayloads = (stages: ProcessTemplateStageInput[]) => {
  if (stages.length === 0) {
    throw new BadRequestError('Quy trình sản xuất phải có ít nhất một công đoạn.')
  }

  const seenCodes = new Set<string>()

  return stages.map((stage, index) => {
    const code = normalizeCode(stage.code)
    if (seenCodes.has(code)) {
      throw new BadRequestError(`Mã công đoạn "${code}" bị trùng trong quy trình.`)
    }
    seenCodes.add(code)

    return {
      id: stage.id,
      code,
      name: normalizeText(stage.name),
      stepOrder: index + 1,
      estimatedDurationMinutes: stage.estimatedDurationMinutes ?? null,
      requiredResourceType: stage.requiredResourceType ?? null,
      description: normalizeNullableText(stage.description) ?? null
    }
  })
}

const handleUniqueConstraint = (error: unknown): never => {
  if (error instanceof UniqueConstraintError) {
    throw new ConflictError('Mã quy trình hoặc mã công đoạn đã tồn tại.')
  }

  throw error
}

const loadTemplate = async (id: string | number, transaction?: Transaction) => {
  const template = await ProcessTemplate.findByPk(id, {
    attributes: templateAttributes,
    transaction
  })

  if (!template) {
    throw new NotFoundError('Không tìm thấy quy trình sản xuất.')
  }

  return template
}

const syncTemplateStages = async (
  processTemplateId: string | number,
  stages: ProcessTemplateStageInput[],
  transaction: Transaction
) => {
  const normalizedStages = normalizeStagePayloads(stages)
  const existingSteps = await ProcessTemplateStep.findAll({
    where: { processTemplateId },
    attributes: stepAttributes,
    transaction,
    lock: transaction.LOCK.UPDATE
  })
  const existingStepIds = new Set(existingSteps.map((step) => Number(step.get('id'))))
  const incomingIds = normalizedStages
    .map((stage) => stage.id)
    .filter((stageId): stageId is number => typeof stageId === 'number')

  incomingIds.forEach((stageId) => {
    if (!existingStepIds.has(stageId)) {
      throw new BadRequestError('Công đoạn không thuộc quy trình này.')
    }
  })

  const incomingIdSet = new Set(incomingIds)
  const removedStepIds = existingSteps
    .map((step) => Number(step.get('id')))
    .filter((stageId) => !incomingIdSet.has(stageId))

  if (removedStepIds.length > 0) {
    await ProcessTemplateStep.destroy({
      where: {
        id: {
          [Op.in]: removedStepIds
        },
        processTemplateId
      },
      transaction
    })
  }

  const existingToKeep = normalizedStages.filter((stage) => stage.id)
  for (const [index, stage] of existingToKeep.entries()) {
    await ProcessTemplateStep.update(
      {
        code: `TMP_${stage.id}_${index + 1}`,
        stepOrder: 10000 + index + 1
      },
      {
        where: {
          id: stage.id,
          processTemplateId
        },
        transaction
      }
    )
  }

  for (const stage of normalizedStages) {
    if (stage.id) {
      await ProcessTemplateStep.update(
        {
          code: stage.code,
          name: stage.name,
          stepOrder: stage.stepOrder,
          estimatedDurationMinutes: stage.estimatedDurationMinutes,
          requiredResourceType: stage.requiredResourceType,
          description: stage.description
        },
        {
          where: {
            id: stage.id,
            processTemplateId
          },
          transaction
        }
      )
    } else {
      await ProcessTemplateStep.create(
        {
          processTemplateId,
          code: stage.code,
          name: stage.name,
          stepOrder: stage.stepOrder,
          estimatedDurationMinutes: stage.estimatedDurationMinutes,
          requiredResourceType: stage.requiredResourceType,
          description: stage.description
        },
        { transaction }
      )
    }
  }
}

export const getProcessTemplatesService = async (query: GetProcessTemplatesQuery = {}) => {
  const templates = await ProcessTemplate.findAll({
    where: buildTemplateWhere(query),
    attributes: templateAttributes,
    include: [
      {
        model: ProcessTemplateStep,
        as: 'steps',
        attributes: ['id']
      }
    ],
    order: [
      ['isActive', 'DESC'],
      ['updatedAt', 'DESC']
    ]
  })

  return Promise.all(templates.map(toTemplateResponse))
}

export const getActiveProcessTemplatesService = async () => getProcessTemplatesService({ status: 'active' })

export const getProcessTemplateByIdService = async (id: string | number) => {
  const template = await ProcessTemplate.findByPk(id, {
    attributes: templateAttributes,
    include: [
      {
        model: ProcessTemplateStep,
        as: 'steps',
        attributes: stepAttributes
      }
    ],
    order: [[{ model: ProcessTemplateStep, as: 'steps' }, 'stepOrder', 'ASC']]
  })

  if (!template) {
    throw new NotFoundError('Không tìm thấy quy trình sản xuất.')
  }

  return toTemplateResponse(template)
}

export const createProcessTemplateService = async (input: CreateProcessTemplateInput) => {
  try {
    const templateId = await sequelize.transaction(async (transaction) => {
      const code = normalizeCode(input.code)
      await assertUniqueTemplateCode(code, undefined, transaction)

      const template = await ProcessTemplate.create(
        {
          code,
          name: normalizeText(input.name),
          description: normalizeNullableText(input.description) ?? null,
          isActive: input.isActive ?? true
        },
        { transaction }
      )

      await syncTemplateStages(template.get('id') as string | number, input.stages, transaction)

      return template.get('id') as string | number
    })

    return getProcessTemplateByIdService(templateId)
  } catch (error) {
    handleUniqueConstraint(error)
  }
}

export const updateProcessTemplateService = async (id: string | number, input: UpdateProcessTemplateInput) => {
  try {
    await sequelize.transaction(async (transaction) => {
      const template = await loadTemplate(id, transaction)
      const updatePayload: Record<string, unknown> = {}

      if (input.code !== undefined) {
        const code = normalizeCode(input.code)
        await assertUniqueTemplateCode(code, id, transaction)
        updatePayload.code = code
      }
      if (input.name !== undefined) updatePayload.name = normalizeText(input.name)
      if (input.description !== undefined) updatePayload.description = normalizeNullableText(input.description) ?? null
      if (input.isActive !== undefined) updatePayload.isActive = input.isActive

      if (Object.keys(updatePayload).length > 0) {
        await template.update(updatePayload, { transaction })
      }

      if (input.stages !== undefined) {
        await syncTemplateStages(id, input.stages, transaction)
      }

      const finalActive = input.isActive ?? (template.get('isActive') as boolean)
      if (finalActive) {
        const stageCount =
          input.stages !== undefined
            ? input.stages.length
            : await ProcessTemplateStep.count({ where: { processTemplateId: id }, transaction })
        if (stageCount === 0) {
          throw new BadRequestError('Quy trình đang sử dụng phải có ít nhất một công đoạn.')
        }
      }
    })

    return getProcessTemplateByIdService(id)
  } catch (error) {
    handleUniqueConstraint(error)
  }
}

export const deleteProcessTemplateService = async (id: string | number) => {
  const result = await sequelize.transaction(async (transaction) => {
    const template = await loadTemplate(id, transaction)
    const orderCount = await Order.count({
      where: { processTemplateId: id },
      transaction
    })

    if (orderCount > 0) {
      await template.update({ isActive: false }, { transaction })
      return {
        mode: 'deactivated' as const,
        orderCount
      }
    }

    await ProcessTemplateStep.destroy({
      where: { processTemplateId: id },
      transaction
    })
    await template.destroy({ transaction })

    return {
      mode: 'deleted' as const,
      orderCount
    }
  })

  return result
}

export default {
  createProcessTemplateService,
  deleteProcessTemplateService,
  getActiveProcessTemplatesService,
  getProcessTemplateByIdService,
  getProcessTemplatesService,
  updateProcessTemplateService
}
