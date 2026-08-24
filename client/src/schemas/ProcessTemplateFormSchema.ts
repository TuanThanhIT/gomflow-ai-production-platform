import { z } from 'zod'
import { ResourceTypeSchema } from './ResourceFormSchema'

const optionalDescription = z
  .string()
  .trim()
  .max(1000, 'Mô tả tối đa 1000 ký tự')
  .optional()
  .transform((value) => value || null)

const optionalDuration = z
  .union([z.number().int('Thời gian phải là số nguyên').min(0, 'Thời gian không được âm'), z.null(), z.undefined()])
  .transform((value) => value ?? null)

const optionalResourceType = z
  .union([ResourceTypeSchema, z.literal(''), z.null(), z.undefined()])
  .transform((value) => value || null)

const ProcessTemplateStageFormSchema = z.object({
  id: z.number().optional(),
  localId: z.string().optional(),
  code: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập mã công đoạn')
    .max(50, 'Mã công đoạn tối đa 50 ký tự')
    .regex(/^[A-Z0-9_-]+$/i, 'Mã công đoạn chỉ gồm chữ, số, dấu gạch dưới hoặc gạch ngang')
    .transform((value) => value.toUpperCase()),
  name: z.string().trim().min(1, 'Vui lòng nhập tên công đoạn').max(255, 'Tên công đoạn tối đa 255 ký tự'),
  estimatedDurationMinutes: optionalDuration,
  requiredResourceType: optionalResourceType,
  description: optionalDescription
})

export const ProcessTemplateFormSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, 'Vui lòng nhập mã quy trình')
      .max(50, 'Mã quy trình tối đa 50 ký tự')
      .regex(/^[A-Z0-9_-]+$/i, 'Mã quy trình chỉ gồm chữ, số, dấu gạch dưới hoặc gạch ngang')
      .transform((value) => value.toUpperCase()),
    name: z.string().trim().min(1, 'Vui lòng nhập tên quy trình').max(255, 'Tên quy trình tối đa 255 ký tự'),
    description: optionalDescription,
    isActive: z.boolean(),
    stages: z.array(ProcessTemplateStageFormSchema).min(1, 'Quy trình cần ít nhất 1 công đoạn')
  })
  .superRefine((form, ctx) => {
    const seenStageCodes = new Map<string, number>()

    form.stages.forEach((stage, index) => {
      const firstIndex = seenStageCodes.get(stage.code)
      if (firstIndex !== undefined) {
        ctx.addIssue({
          code: 'custom',
          message: 'Mã công đoạn bị trùng',
          path: ['stages', index, 'code']
        })
        ctx.addIssue({
          code: 'custom',
          message: 'Mã công đoạn bị trùng',
          path: ['stages', firstIndex, 'code']
        })
        return
      }

      seenStageCodes.set(stage.code, index)
    })
  })

export type ProcessTemplateFormData = z.infer<typeof ProcessTemplateFormSchema>
