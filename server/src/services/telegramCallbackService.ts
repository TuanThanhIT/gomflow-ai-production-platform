import ApiError from '../errors/ApiError.js'
import { User } from '../models/index.js'
import incidentService from '../services/incidentService.js'
import type { AuthenticatedUser } from '../types/auth.js'
import { canCompleteOrderStage, canResolveIncident } from '../utils/orderStagePermissions.js'
import {
  buildActiveStageMessage,
  buildIncidentResolvedMessage,
  buildStageCompletedMessage
} from './notificationService.js'
import orderStageService from './orderStageService.js'
import telegramService from './telegramService.js'

const COMPLETE_STAGE_ACTION = 'complete_stage'
const CONTINUE_STAGE_ACTION = 'continue_stage'
const RESOLVE_INCIDENT_ACTION = 'resolve_incident'
const TELEGRAM_POLL_INTERVAL_MS = 1000

type TelegramCallbackQuery = {
  id?: unknown
  data?: unknown
  from?: {
    id?: unknown
  }
  message?: {
    message_id?: unknown
    chat?: {
      id?: unknown
    }
  }
}

type TelegramUpdate = {
  update_id?: unknown
  callback_query?: TelegramCallbackQuery
}

type InlineKeyboardMarkup = {
  inline_keyboard: Array<Array<{ text: string; callback_data: string }>>
}

type OrderAfterStageComplete = {
  code?: string
  productName?: string | null
  status?: string
  progressPercent?: string | number
  aiAnalysis?: {
    manufacturingEstimate?: {
      estimatedFiringTemperatureC?: number | null
      estimatedFiringDurationMinutes?: number | null
    } | null
  } | null
  stages?: Array<{
    id: string | number
    name: string
    code: string
    stepOrder: number
    status: string
    completedAt?: string | null
    templateStep?: {
      requiredResourceType?: string | null
    } | null
  }>
}

type IncidentAfterResolve = {
  id: string | number
  code: string
  type: string
  severity: string
  resolutionNote?: string | null
  resource?: {
    code: string
    name: string
  } | null
  orderStage?: {
    code: string
    name: string
    status: string
    order?: {
      id: string | number
      code: string
      customerName?: string | null
      productName?: string | null
      progressPercent?: string | number
    } | null
  } | null
}

type ParsedCallback = {
  action: typeof COMPLETE_STAGE_ACTION | typeof CONTINUE_STAGE_ACTION | typeof RESOLVE_INCIDENT_ACTION
  id: number
}

const parseCallbackData = (data: unknown): ParsedCallback | null => {
  if (typeof data !== 'string') return null

  const [action, rawId, ...rest] = data.split(':')
  if (![COMPLETE_STAGE_ACTION, CONTINUE_STAGE_ACTION, RESOLVE_INCIDENT_ACTION].includes(action) || rest.length > 0) {
    return null
  }

  const id = Number(rawId)
  if (!Number.isInteger(id) || id <= 0) return null

  return { action: action as ParsedCallback['action'], id }
}

const parseTelegramUserMap = () => {
  const rawMap = process.env.TELEGRAM_USER_MAP?.trim()
  if (!rawMap) return {}

  try {
    const parsed = JSON.parse(rawMap) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}

    return parsed as Record<string, string | number>
  } catch (error) {
    console.error('TELEGRAM_USER_MAP is not valid JSON:', error)
    return {}
  }
}

const resolveMappedGomFlowUser = async (
  telegramUserId: unknown
): Promise<
  { status: 'ok'; user: AuthenticatedUser } | { status: 'unmapped' } | { status: 'missing' } | { status: 'inactive' }
> => {
  const map = parseTelegramUserMap()
  const gomFlowUserId = map[String(telegramUserId ?? '')]

  if (!gomFlowUserId) return { status: 'unmapped' }

  const user = await User.findByPk(gomFlowUserId, {
    attributes: ['id', 'fullName', 'email', 'role', 'isActive']
  })

  if (!user) return { status: 'missing' }
  if (user.get('isActive') !== true) return { status: 'inactive' }

  return {
    status: 'ok',
    user: {
      id: user.get('id') as string | number,
      fullName: user.get('fullName') as string,
      email: user.get('email') as string,
      role: user.get('role') as string,
      source: 'TELEGRAM'
    }
  }
}

const buildStageCompleteSuccessMessage = (order: OrderAfterStageComplete, completedStageId: number) => {
  const stages = [...(order.stages ?? [])].sort((a, b) => a.stepOrder - b.stepOrder)
  const completedStage = stages.find((stage) => String(stage.id) === String(completedStageId))
  const nextStage = stages.find((stage) => stage.status === 'IN_PROGRESS')

  return buildStageCompletedMessage({
    order: {
      id: '',
      code: order.code ?? '',
      productName: order.productName ?? null,
      progressPercent: order.progressPercent ?? 0,
      aiAnalysis: order.aiAnalysis ?? null
    },
    completedStage: {
      id: completedStage?.id ?? completedStageId,
      code: completedStage?.code ?? '',
      name: completedStage?.name ?? 'Công đoạn',
      stepOrder: completedStage?.stepOrder ?? 0
    },
    nextStage: nextStage
      ? {
          id: nextStage.id,
          code: nextStage.code,
          name: nextStage.name,
          requiredResourceType: nextStage.templateStep?.requiredResourceType ?? null
        }
      : null,
    completedStageCount: stages.filter((stage) => stage.status === 'COMPLETED').length,
    totalStages: stages.length,
    progressPercent: Number(order.progressPercent ?? 0),
    completedAt: completedStage?.completedAt ? new Date(completedStage.completedAt) : new Date()
  })
}

const buildStageActiveSuccessMessage = (order: OrderAfterStageComplete, resumedStageId: number) => {
  const stages = [...(order.stages ?? [])].sort((a, b) => a.stepOrder - b.stepOrder)
  const activeStage = stages.find((stage) => String(stage.id) === String(resumedStageId))

  return buildActiveStageMessage({
    order: {
      id: '',
      code: order.code ?? '',
      productName: order.productName ?? null,
      progressPercent: order.progressPercent ?? 0,
      aiAnalysis: order.aiAnalysis ?? null
    },
    activeStage: {
      id: activeStage?.id ?? resumedStageId,
      code: activeStage?.code ?? '',
      name: activeStage?.name ?? 'Công đoạn'
    },
    progressPercent: Number(order.progressPercent ?? 0)
  })
}

const buildIncidentResolveSuccessMessage = (incident: IncidentAfterResolve, currentUser: AuthenticatedUser) => {
  return buildIncidentResolvedMessage({
    incident: {
      code: incident.code,
      type: incident.type,
      severity: incident.severity,
      resolutionNote: incident.resolutionNote ?? `Đã xác nhận xử lý qua Telegram bởi ${currentUser.fullName}.`
    },
    order: incident.orderStage?.order
      ? {
          id: incident.orderStage.order.id,
          code: incident.orderStage.order.code,
          customerName: incident.orderStage.order.customerName ?? null,
          productName: incident.orderStage.order.productName ?? null,
          progressPercent: incident.orderStage.order.progressPercent ?? 0
        }
      : null,
    resource: incident.resource ?? null,
    stage: incident.orderStage
      ? {
          code: incident.orderStage.code,
          name: incident.orderStage.name,
          status: incident.orderStage.status
        }
      : null
  })
}

const getApiErrorCode = (error: unknown) => {
  if (!(error instanceof ApiError) || !error.data || typeof error.data !== 'object') return null
  const code = (error.data as { code?: unknown }).code
  return typeof code === 'string' ? code : null
}

const getApiErrorDataValue = (error: unknown, key: string) => {
  if (!(error instanceof ApiError) || !error.data || typeof error.data !== 'object') return null
  const value = (error.data as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : null
}

const getStageFriendlyErrorMessage = (error: unknown) => {
  if (error instanceof ApiError && error.statusCode === 404) return '⚠️ Không tìm thấy công đoạn.'

  const code = getApiErrorCode(error)
  const stageStatus = getApiErrorDataValue(error, 'stageStatus')
  const orderStatus = getApiErrorDataValue(error, 'orderStatus')

  if (
    code === 'STAGE_BLOCKED_BY_INCIDENT' ||
    code === 'STAGE_MUST_BE_RESUMED' ||
    code === 'STAGE_STILL_BLOCKED_BY_INCIDENT' ||
    stageStatus === 'BLOCKED'
  ) {
    return '⛔ Công đoạn đang bị chặn bởi sự cố.'
  }

  if (stageStatus === 'COMPLETED') return '⚠️ Công đoạn này đã được hoàn thành.'
  if (stageStatus === 'WAITING') return '⚠️ Công đoạn chưa được bắt đầu.'
  if (code === 'STAGE_NOT_IN_PROGRESS') {
    return '⚠️ Công đoạn này đã được hoàn thành hoặc không còn ở trạng thái có thể hoàn thành.'
  }
  if (orderStatus === 'COMPLETED') return 'ℹ️ Đơn hàng này đã hoàn thành.'
  if (code === 'ORDER_NOT_COMPLETABLE') {
    return 'ℹ️ Đơn hàng này đã hoàn thành hoặc không còn ở trạng thái có thể cập nhật.'
  }
  if (error instanceof ApiError) return error.message

  return 'Có lỗi xảy ra khi cập nhật công đoạn. Vui lòng thử lại trên GomFlow.'
}

const getIncidentFriendlyErrorMessage = (error: unknown) => {
  if (error instanceof ApiError && error.statusCode === 404) return '⚠️ Không tìm thấy sự cố.'
  if (getApiErrorCode(error) === 'INCIDENT_NOT_OPEN') return 'ℹ️ Sự cố này đã được xử lý trước đó.'
  if (error instanceof ApiError) return error.message

  return 'Có lỗi xảy ra khi xử lý sự cố. Vui lòng thử lại trên GomFlow.'
}

const acknowledgeCallback = async (callbackQueryId: string, message: string) => {
  try {
    await telegramService.answerCallbackQuery(callbackQueryId, message)
  } catch (error) {
    console.error('Telegram callback acknowledgement failed:', error)
  }
}

const editCallbackMessage = async (
  callback: TelegramCallbackQuery,
  text: string,
  replyMarkup?: InlineKeyboardMarkup
) => {
  const chatId = callback.message?.chat?.id
  const messageId = callback.message?.message_id
  if (!chatId || !messageId) return

  await telegramService.editMessageText({
    chatId: chatId as string | number,
    messageId: messageId as string | number,
    replyMarkup,
    text
  })
}

const handleCompleteStageCallback = async (
  callback: TelegramCallbackQuery,
  callbackQueryId: string,
  stageId: number,
  currentUser: AuthenticatedUser
) => {
  if (!canCompleteOrderStage(currentUser)) {
    await acknowledgeCallback(callbackQueryId, '⛔ Bạn không có quyền xác nhận hoàn thành công đoạn này.')
    return
  }

  try {
    const order = (await orderStageService.completeOrderStageService(stageId, currentUser)) as OrderAfterStageComplete

    await acknowledgeCallback(callbackQueryId, 'Đã hoàn thành công đoạn.')
    await editCallbackMessage(callback, buildStageCompleteSuccessMessage(order, stageId))
  } catch (error) {
    console.error('Telegram complete stage callback failed:', error)
    await acknowledgeCallback(callbackQueryId, getStageFriendlyErrorMessage(error))
  }
}

const handleContinueStageCallback = async (
  callback: TelegramCallbackQuery,
  callbackQueryId: string,
  stageId: number,
  currentUser: AuthenticatedUser
) => {
  if (!canCompleteOrderStage(currentUser)) {
    await acknowledgeCallback(callbackQueryId, '⛔ Bạn không có quyền tiếp tục công đoạn này.')
    return
  }

  try {
    const order = (await orderStageService.resumeOrderStageService(stageId, currentUser)) as OrderAfterStageComplete

    await acknowledgeCallback(callbackQueryId, 'Đã tiếp tục công đoạn.')
    await editCallbackMessage(callback, buildStageActiveSuccessMessage(order, stageId), {
      inline_keyboard: [
        [
          {
            text: '✅ Xác nhận hoàn thành',
            callback_data: `${COMPLETE_STAGE_ACTION}:${stageId}`
          }
        ]
      ]
    })
  } catch (error) {
    console.error('Telegram continue stage callback failed:', error)
    await acknowledgeCallback(callbackQueryId, getStageFriendlyErrorMessage(error))
  }
}

const handleResolveIncidentCallback = async (
  callback: TelegramCallbackQuery,
  callbackQueryId: string,
  incidentId: number,
  currentUser: AuthenticatedUser
) => {
  if (!canResolveIncident(currentUser)) {
    await acknowledgeCallback(callbackQueryId, '⛔ Bạn không có quyền xác nhận xử lý sự cố.')
    return
  }

  try {
    const incident = (await incidentService.resolveIncidentService(
      incidentId,
      {
        resolutionNote: `Đã xác nhận xử lý qua Telegram bởi ${currentUser.fullName}.`
      },
      currentUser
    )) as IncidentAfterResolve

    await acknowledgeCallback(callbackQueryId, 'Đã xác nhận xử lý sự cố.')
    await editCallbackMessage(callback, buildIncidentResolveSuccessMessage(incident, currentUser))
  } catch (error) {
    console.error('Telegram resolve incident callback failed:', error)
    await acknowledgeCallback(callbackQueryId, getIncidentFriendlyErrorMessage(error))
  }
}

export const handleTelegramCallbackQuery = async (callback: TelegramCallbackQuery) => {
  const callbackQueryId = typeof callback.id === 'string' ? callback.id : null
  if (!callbackQueryId) return

  const parsedCallback = parseCallbackData(callback.data)
  if (!parsedCallback) {
    await acknowledgeCallback(callbackQueryId, '⚠️ Yêu cầu không hợp lệ.')
    return
  }

  const mappedUser = await resolveMappedGomFlowUser(callback.from?.id)
  if (mappedUser.status === 'unmapped') {
    await acknowledgeCallback(callbackQueryId, '⛔ Tài khoản Telegram này chưa được liên kết với GomFlow.')
    return
  }

  if (mappedUser.status === 'missing') {
    await acknowledgeCallback(callbackQueryId, '⛔ Không tìm thấy tài khoản GomFlow được liên kết.')
    return
  }

  if (mappedUser.status === 'inactive') {
    await acknowledgeCallback(callbackQueryId, '⛔ Tài khoản GomFlow của bạn hiện không hoạt động.')
    return
  }

  if (parsedCallback.action === COMPLETE_STAGE_ACTION) {
    await handleCompleteStageCallback(callback, callbackQueryId, parsedCallback.id, mappedUser.user)
    return
  }

  if (parsedCallback.action === CONTINUE_STAGE_ACTION) {
    await handleContinueStageCallback(callback, callbackQueryId, parsedCallback.id, mappedUser.user)
    return
  }

  await handleResolveIncidentCallback(callback, callbackQueryId, parsedCallback.id, mappedUser.user)
}

let pollingStarted = false
let nextUpdateOffset: number | undefined

export const startTelegramCallbackPolling = () => {
  if (pollingStarted) return
  if (!process.env.TELEGRAM_BOT_TOKEN) return

  pollingStarted = true

  const poll = async () => {
    try {
      const updates = (await telegramService.getUpdates(nextUpdateOffset)) as TelegramUpdate[]

      for (const update of updates) {
        if (typeof update.update_id === 'number') {
          nextUpdateOffset = update.update_id + 1
        }

        if (update.callback_query) {
          await handleTelegramCallbackQuery(update.callback_query)
        }
      }
    } catch (error) {
      console.error('Telegram callback polling failed:', error)
    } finally {
      setTimeout(poll, TELEGRAM_POLL_INTERVAL_MS)
    }
  }

  void poll()
}

export default {
  handleTelegramCallbackQuery,
  startTelegramCallbackPolling
}
