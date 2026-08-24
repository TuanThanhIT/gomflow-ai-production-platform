import type { DashboardResponse } from '../types/dashboard'
import instance from '../utils/axiosCustomize'

const getDashboard = () => instance.get<DashboardResponse>('/api/dashboard')

const dashboardService = {
  getDashboard
}

export default dashboardService
