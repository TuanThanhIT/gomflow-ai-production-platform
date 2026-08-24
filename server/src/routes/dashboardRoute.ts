import type { Express } from 'express'
import express from 'express'
import dashboardController from '../controllers/dashboardController.js'
import auth from '../middlewares/auth.js'

const dashboardRoute = express.Router()

const initDashboardRoute = (app: Express) => {
  dashboardRoute.get('/', auth, dashboardController.getDashboardController)

  app.use('/api/dashboard', dashboardRoute)
}

export default initDashboardRoute
