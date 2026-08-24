import type { Express } from 'express'
import express from 'express'
import aiController from '../controllers/aiController.js'
import auth from '../middlewares/auth.js'
import validate from '../middlewares/validate.js'
import { analyzeIncidentSchema, analyzeOrderSchema } from '../validations/aiValidation.js'

const aiRoute = express.Router()

const initAiRoute = (app: Express) => {
  aiRoute.post('/analyze-order', auth, validate(analyzeOrderSchema), aiController.analyzeOrderController)
  aiRoute.post('/analyze-incident', auth, validate(analyzeIncidentSchema), aiController.analyzeIncidentController)

  app.use('/api/ai', aiRoute)
}

export default initAiRoute
