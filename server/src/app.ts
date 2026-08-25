import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import './models/index.js'
import errorHandler from './middlewares/errorHandler.js'
import initAuthRoute from './routes/authRoute.js'
import initProcessTemplateRoute from './routes/processTemplateRoute.js'
import initOrderRoute from './routes/orderRoute.js'
import initOrderStageRoute from './routes/orderStageRoute.js'
import initResourceRoute from './routes/resourceRoute.js'
import initIncidentRoute from './routes/incidentRoute.js'
import initDashboardRoute from './routes/dashboardRoute.js'
import initAiRoute from './routes/aiRoute.js'
import initActivityLogRoute from './routes/activityLogRoute.js'

dotenv.config()

export const createApp = () => {
  const app = express()
  const allowedOrigins = [
    ...(process.env.CORS_ORIGIN || process.env.CLIENT_URL || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  ]

  app.set('trust proxy', 1)

  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true)
        }

        return callback(new Error('Not allowed by CORS'))
      },
      credentials: true
    })
  )
  app.use(cookieParser())

  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString()
    })
  })

  initAuthRoute(app)
  initProcessTemplateRoute(app)
  initOrderRoute(app)
  initOrderStageRoute(app)
  initResourceRoute(app)
  initIncidentRoute(app)
  initDashboardRoute(app)
  initAiRoute(app)
  initActivityLogRoute(app)

  app.use(errorHandler)

  return app
}

export default createApp
