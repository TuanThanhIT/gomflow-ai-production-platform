import type { ApiResponse } from './api'
import type { IncidentSeverity, IncidentType } from './incident'
import type { ExtraSpecification, OrderPriority } from './order'
import type { ResourceStatus, ResourceType } from './resource'

export type ManufacturingEstimateSource = 'EXTRACTED' | 'AI_ESTIMATE'

export type ManufacturingEstimate = {
  estimatedClayKg: number | null
  glazeType: string | null
  estimatedFiringTemperatureC: number | null
  estimatedFiringDurationMinutes: number | null
}

export type ManufacturingEstimateSources = {
  estimatedClayKg: ManufacturingEstimateSource | null
  glazeType: ManufacturingEstimateSource | null
  estimatedFiringTemperatureC: ManufacturingEstimateSource | null
  estimatedFiringDurationMinutes: ManufacturingEstimateSource | null
}

export type AIOrderDraft = {
  customerName: string | null
  productName: string | null
  quantity: number | null
  specifications: {
    glazeColor: string | null
    capacityMl: number | null
    heightCm: number | null
    diameterCm: number | null
    extraSpecifications: ExtraSpecification[]
  }
  manufacturingEstimate: ManufacturingEstimate
  manufacturingEstimateSources: ManufacturingEstimateSources
  specialRequirements: string | null
  deadline: string | null
  priority: OrderPriority | null
}

export type RecommendedProcessTemplate = {
  id: number
  code: string
  name: string
  confidence: number
  reason: string
}

export type AnalyzeOrderResponse = ApiResponse<{
  draft: AIOrderDraft
  recommendedProcessTemplate: RecommendedProcessTemplate | null
  warnings: string[]
}>

export type AIIncidentDraft = {
  type: IncidentType
  severity: IncidentSeverity
  estimatedDelayMinutes: number | null
  rawDescription: string
}

export type RecommendedResource = {
  id: number
  code: string
  name: string
  type: ResourceType | string
  status: ResourceStatus | string
  confidence: number
  reason: string | null
}

export type AnalyzeIncidentResponse = ApiResponse<{
  draft: AIIncidentDraft
  recommendedResource: RecommendedResource | null
  warnings: string[]
}>
