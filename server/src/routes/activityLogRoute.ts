import type { Express } from 'express'
import express from 'express'
import activityLogController from '../controllers/activityLogController.js'
import { USER_ROLE } from '../constants/userConstants.js'
import auth from '../middlewares/auth.js'
import authorize from '../middlewares/authorize.js'
import validate from '../middlewares/validate.js'
import { getActivityLogOrdersSchema, getActivityLogsSchema } from '../validations/activityLogValidation.js'

const activityLogRoute = express.Router()

const initActivityLogRoute = (app: Express) => {
  activityLogRoute.get(
    '/orders',
    auth,
    authorize(USER_ROLE.MANAGER),
    validate(getActivityLogOrdersSchema),
    activityLogController.getActivityLogOrdersController
  )

  activityLogRoute.get(
    '/',
    auth,
    authorize(USER_ROLE.MANAGER),
    validate(getActivityLogsSchema),
    activityLogController.getActivityLogsController
  )

  app.use('/api/activity-logs', activityLogRoute)
}

export default initActivityLogRoute
