import type {
  ActivityLogOrderGroupsResponse,
  ActivityLogsResponse,
  GetActivityLogOrderGroupsParams,
  GetActivityLogsParams
} from '../types/activityLog'
import instance from '../utils/axiosCustomize'

const getActivityLogs = (params: GetActivityLogsParams = {}) =>
  instance.get<ActivityLogsResponse>('/api/activity-logs', { params })

const getActivityLogOrders = (params: GetActivityLogOrderGroupsParams = {}) =>
  instance.get<ActivityLogOrderGroupsResponse>('/api/activity-logs/orders', { params })

const activityLogService = {
  getActivityLogOrders,
  getActivityLogs
}

export default activityLogService
