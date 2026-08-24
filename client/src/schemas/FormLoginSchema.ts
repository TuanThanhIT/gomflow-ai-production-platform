import { z } from 'zod'

export const FormLoginSchema = z.object({
  email: z.string().trim().min(1, 'Vui lòng nhập email').email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu')
})

export type FormLogin = z.infer<typeof FormLoginSchema>
