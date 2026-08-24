import { z } from 'zod'

export const ResourceTypeSchema = z.enum(
  ['KILN', 'DRYER', 'FORMING', 'DECORATION', 'GLAZING', 'QC', 'PACKAGING', 'OTHER'],
  {
    message: 'Vui lòng chọn loại tài nguyên'
  }
)

export const ResourceFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập mã tài nguyên')
    .max(50, 'Mã tài nguyên tối đa 50 ký tự')
    .regex(/^[A-Z0-9_-]+$/i, 'Mã tài nguyên chỉ gồm chữ, số, dấu gạch dưới hoặc gạch ngang')
    .transform((value) => value.toUpperCase()),
  name: z.string().trim().min(1, 'Vui lòng nhập tên tài nguyên').max(255, 'Tên tài nguyên tối đa 255 ký tự'),
  type: ResourceTypeSchema,
  description: z
    .string()
    .trim()
    .max(1000, 'Mô tả tối đa 1000 ký tự')
    .optional()
    .transform((value) => value || null)
})

export type ResourceFormData = z.infer<typeof ResourceFormSchema>
