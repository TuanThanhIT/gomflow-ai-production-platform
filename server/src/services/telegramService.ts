const TELEGRAM_SEND_TIMEOUT_MS = 10000

type TelegramApiResponse = {
  ok?: boolean
  description?: string
}

const getTelegramConfig = () => ({
  botToken: process.env.TELEGRAM_BOT_TOKEN,
  chatId: process.env.TELEGRAM_CHAT_ID
})

const toErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message
  return String(error)
}

export const sendMessage = async (message: string) => {
  const { botToken, chatId } = getTelegramConfig()

  if (!botToken || !chatId) {
    throw new Error('Telegram bot token or chat ID is not configured')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TELEGRAM_SEND_TIMEOUT_MS)

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message
      }),
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
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Telegram API request timed out', { cause: error })
    }

    throw new Error(toErrorMessage(error), { cause: error })
  } finally {
    clearTimeout(timeout)
  }
}

export default {
  sendMessage
}
