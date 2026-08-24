import { GoogleGenAI, type SchemaUnion } from '@google/genai'
import { AI_CONFIG } from '../config/ai.js'
import BadRequestError from '../errors/BadRequestError.js'

type GenerateStructuredContentInput = {
  systemInstruction: string
  prompt: string
  responseSchema: SchemaUnion
  temperature?: number
  logLabel?: string
  quotaErrorMessage?: string
  failureErrorMessage?: string
}

class GeminiService {
  private client: GoogleGenAI | null = null

  private getClient() {
    if (!AI_CONFIG.geminiApiKey) {
      throw new BadRequestError('Gemini API key chưa được cấu hình trên server.')
    }

    if (!this.client) {
      this.client = new GoogleGenAI({ apiKey: AI_CONFIG.geminiApiKey })
    }

    return this.client
  }

  async generateStructuredContent({
    prompt,
    failureErrorMessage = 'Không thể phân tích bằng AI. Bạn vẫn có thể nhập thông tin thủ công.',
    logLabel = 'AI analysis',
    quotaErrorMessage = 'Gemini đang hết quota tạm thời. Vui lòng chờ một lát rồi phân tích lại hoặc nhập thủ công.',
    responseSchema,
    systemInstruction,
    temperature = 0.1
  }: GenerateStructuredContentInput): Promise<unknown> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), AI_CONFIG.geminiRequestTimeoutMs)

    try {
      const response = await this.getClient().models.generateContent({
        model: AI_CONFIG.geminiModel,
        contents: prompt,
        config: {
          abortSignal: controller.signal,
          maxOutputTokens: 3072,
          responseMimeType: 'application/json',
          responseSchema,
          systemInstruction,
          temperature
        }
      })

      const text = response.text
      if (!text) {
        throw new BadRequestError('Gemini không trả về kết quả phân tích hợp lệ.')
      }

      return JSON.parse(text) as unknown
    } catch (error) {
      if (error instanceof BadRequestError) {
        throw error
      }

      console.warn(`${logLabel} failed`, this.toSafeErrorLog(error))
      if (this.getErrorStatus(error) === 429) {
        throw new BadRequestError(quotaErrorMessage)
      }

      throw new BadRequestError(failureErrorMessage)
    } finally {
      clearTimeout(timeout)
    }
  }

  private getErrorStatus(error: unknown) {
    const record = typeof error === 'object' && error !== null ? (error as Record<string, unknown>) : {}
    const status = record.status ?? record.statusCode
    return typeof status === 'number' ? status : null
  }

  private toSafeErrorLog(error: unknown) {
    const rawMessage = error instanceof Error ? error.message : String(error)

    return {
      name: error instanceof Error ? error.name : undefined,
      status: this.getErrorStatus(error),
      message: rawMessage.replace(AI_CONFIG.geminiApiKey, '<redacted>').slice(0, 500)
    }
  }
}

export default new GeminiService()
