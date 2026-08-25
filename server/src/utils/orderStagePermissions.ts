import { USER_ROLE } from '../constants/userConstants.js'

type UserWithRole = {
  role: string
}

export const canCompleteOrderStage = (user: UserWithRole | null | undefined) => {
  if (!user) return false

  return ([USER_ROLE.ADMIN, USER_ROLE.MANAGER, USER_ROLE.OPERATOR] as string[]).includes(user.role)
}

export const canResolveIncident = (user: UserWithRole | null | undefined) => {
  if (!user) return false

  return ([USER_ROLE.ADMIN, USER_ROLE.MANAGER] as string[]).includes(user.role)
}
