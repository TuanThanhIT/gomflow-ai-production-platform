import type {
  CreateIncidentPayload,
  GetIncidentsParams,
  IncidentResponse,
  IncidentsResponse,
  ResolveIncidentPayload
} from '../types/incident'
import instance from '../utils/axiosCustomize'

const getIncidents = (params: GetIncidentsParams = {}) => instance.get<IncidentsResponse>('/api/incidents', { params })

const getIncidentById = (incidentId: number | string) => instance.get<IncidentResponse>(`/api/incidents/${incidentId}`)

const createIncident = (data: CreateIncidentPayload) => instance.post<IncidentResponse>('/api/incidents', data)

const resolveIncident = (incidentId: number | string, data: ResolveIncidentPayload) =>
  instance.patch<IncidentResponse>(`/api/incidents/${incidentId}/resolve`, data)

const incidentService = {
  createIncident,
  getIncidentById,
  getIncidents,
  resolveIncident
}

export default incidentService
