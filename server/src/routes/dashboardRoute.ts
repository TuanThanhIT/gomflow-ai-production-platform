import type { Express } from 'express'
import express from 'express'
import { USER_ROLE } from '../constants/userConstants.js'
import dashboardController from '../controllers/dashboardController.js'
import auth from '../middlewares/auth.js'
import authorize from '../middlewares/authorize.js'

const dashboardRoute = express.Router()

const initDashboardRoute = (app: Express) => {
  dashboardRoute.get(
    '/',
    auth,
    authorize(USER_ROLE.MANAGER, USER_ROLE.OPERATOR),
    dashboardController.getDashboardController
  )

  app.use('/api/dashboard', dashboardRoute)
}

export default initDashboardRoute
