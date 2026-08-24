import { z } from 'zod'

const optionalPositiveNumber = z.union([
  z.literal(''),
  z.number().finite('Giá trị không hợp lệ').positive('Giá trị phải lớn hơn 0')
])

export const CreateOrderFormSchema = z.object({
  customerName: z.string().trim().min(1, 'Vui lòng nhập tên khách hàng'),
  productName: z.string().trim().min(1, 'Vui lòng nhập tên sản phẩm'),
  quantity: z.number().int('Số lượng phải là số nguyên').min(1, 'Số lượng phải lớn hơn 0'),
  processTemplateId: z.number().int('Vui lòng chọn quy trình').min(1, 'Vui lòng chọn quy trình'),
  deadline: z
    .string()
    .min(1, 'Vui lòng chọn deadline')
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Deadline không hợp lệ')
    .refine((value) => new Date(value).getTime() > Date.now(), 'Deadline phải nằm trong tương lai'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT'], {
    message: 'Vui lòng chọn độ ưu tiên'
  }),
  glazeColor: z.string().trim().optional(),
  capacityMl: optionalPositiveNumber,
  heightCm: optionalPositiveNumber,
  diameterCm: optionalPositiveNumber,
  customization: z.string().trim().optional(),
  extraSpecifications: z
    .array(
      z.object({
        name: z.string().trim().min(1, 'Vui lòng nhập tên thông số'),
        value: z.string().trim().min(1, 'Vui lòng nhập giá trị'),
        unit: z.string().trim().optional()
      })
    )
    .superRefine((items, ctx) => {
      const seenNames = new Map<string, number>()

      items.forEach((item, index) => {
        const key = item.name.trim().toLowerCase()
        if (!key) return

        const firstIndex = seenNames.get(key)
        if (firstIndex !== undefined) {
          ctx.addIssue({
            code: 'custom',
            message: 'Tên thông số bị trùng',
            path: [index, 'name']
          })
          ctx.addIssue({
            code: 'custom',
            message: 'Tên thông số bị trùng',
            path: [firstIndex, 'name']
          })
          return
        }

        seenNames.set(key, index)
      })
    })
})

export type CreateOrderForm = z.infer<typeof CreateOrderFormSchema>
