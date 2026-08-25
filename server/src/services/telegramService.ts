const TELEGRAM_REQUEST_TIMEOUT_MS = 30000

type TelegramApiResponse = {
  ok?: boolean
  description?: string
  result?: unknown
}

type InlineKeyboardButton = {
  text: string
  callback_data: string
}

type InlineKeyboardMarkup = {
  inline_keyboard: InlineKeyboardButton[][]
}

const getTelegramConfig = () => ({
  botToken: process.env.TELEGRAM_BOT_TOKEN,
  chatId: process.env.TELEGRAM_CHAT_ID
})

const toErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message
  return String(error)
}

const requestTelegramApi = async <T = unknown>(method: string, payload: Record<string, unknown>) => {
  const { botToken } = getTelegramConfig()

  if (!botToken) {
    throw new Error('Telegram bot token is not configured')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TELEGRAM_REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    })

    const bodyText = await response.text()
    let body: TelegramApiResponse | null = null

    if (bodyText) {
      try {
        body = JSON.parse(bodyText) as TelegramApiResponse
      } catch {
        body = null
      }
    }

    if (!response.ok) {
      throw new Error(body?.description || `Telegram API returned HTTP ${response.status}`)
    }

    if (body && body.ok === false) {
      throw new Error(body.description || 'Telegram API rejected the message')
    }

    return body?.result as T
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Telegram API request timed out', { cause: error })
    }

    throw new Error(toErrorMessage(error), { cause: error })
  } finally {
    clearTimeout(timeout)
  }
}

export const sendMessage = async (message: string, options: { replyMarkup?: InlineKeyboardMarkup } = {}) => {
  const { chatId } = getTelegramConfig()

  if (!chatId) {
    throw new Error('Telegram chat ID is not configured')
  }

  await requestTelegramApi('sendMessage', {
    chat_id: chatId,
    text: message,
    ...(options.replyMarkup ? { reply_markup: options.replyMarkup } : {})
  })
}

export const answerCallbackQuery = async (callbackQueryId: string, text: string) => {
  await requestTelegramApi('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
    show_alert: false
  })
}

export const editMessageText = async ({
  chatId,
  messageId,
  replyMarkup,
  text
}: {
  chatId: string | number
  messageId: string | number
  replyMarkup?: InlineKeyboardMarkup
  text: string
}) => {
  await requestTelegramApi('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    reply_markup: replyMarkup ?? {
      inline_keyboard: []
    }
  })
}

export const getUpdates = async (offset?: number) => {
  return requestTelegramApi<Array<Record<string, unknown>>>('getUpdates', {
    ...(offset ? { offset } : {}),
    timeout: 25,
    allowed_updates: ['callback_query']
  })
}

export default {
  answerCallbackQuery,
  editMessageText,
  getUpdates,
  sendMessage
}
