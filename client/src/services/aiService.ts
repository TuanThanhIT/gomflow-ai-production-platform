import type { AnalyzeIncidentResponse, AnalyzeOrderResponse } from '../types/ai'
import instance from '../utils/axiosCustomize'

const analyzeOrder = (text: string) => instance.post<AnalyzeOrderResponse>('/api/ai/analyze-order', { text })
const analyzeIncident = (text: string) => instance.post<AnalyzeIncidentResponse>('/api/ai/analyze-incident', { text })

const aiService = {
  analyzeIncident,
  analyzeOrder
}

export default aiService
