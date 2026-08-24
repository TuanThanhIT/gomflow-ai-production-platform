import dotenv from 'dotenv'

dotenv.config()

export const AI_CONFIG = Object.freeze({
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
  timezone: process.env.APP_TIMEZONE || process.env.TZ || 'Asia/Ho_Chi_Minh',
  orderAnalysisMaxTextLength: Number(process.env.AI_ORDER_ANALYSIS_MAX_TEXT_LENGTH || 4000),
  incidentAnalysisMaxTextLength: Number(process.env.AI_INCIDENT_ANALYSIS_MAX_TEXT_LENGTH || 3000),
  geminiRequestTimeoutMs: Number(process.env.GEMINI_REQUEST_TIMEOUT_MS || 20000)
})
