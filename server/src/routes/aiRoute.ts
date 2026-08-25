import type { Express } from 'express'
import express from 'express'
import { USER_ROLE } from '../constants/userConstants.js'
import aiController from '../controllers/aiController.js'
import auth from '../middlewares/auth.js'
import authorize from '../middlewares/authorize.js'
import validate from '../middlewares/validate.js'
import { analyzeIncidentSchema, analyzeOrderSchema } from '../validations/aiValidation.js'

const aiRoute = express.Router()

const initAiRoute = (app: Express) => {
  aiRoute.post(
    '/analyze-order',
    auth,
    authorize(USER_ROLE.MANAGER, USER_ROLE.OPERATOR),
    validate(analyzeOrderSchema),
    aiController.analyzeOrderController
  )

  aiRoute.post(
    '/analyze-incident',
    auth,
    authorize(USER_ROLE.MANAGER, USER_ROLE.OPERATOR),
    validate(analyzeIncidentSchema),
    aiController.analyzeIncidentController
  )

  app.use('/api/ai', aiRoute)
}

export default initAiRoute
