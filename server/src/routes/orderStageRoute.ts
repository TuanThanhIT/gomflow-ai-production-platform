import type { Express } from 'express'
import express from 'express'
import orderStageController from '../controllers/orderStageController.js'
import auth from '../middlewares/auth.js'
import validate from '../middlewares/validate.js'
import {
  assignResourceToStageSchema,
  completeOrderStageSchema,
  getAvailableResourcesForStageSchema,
  resumeOrderStageSchema
} from '../validations/orderStageValidation.js'

const orderStageRoute = express.Router()

const initOrderStageRoute = (app: Express) => {
  orderStageRoute.get(
    '/:id/available-resources',
    auth,
    validate(getAvailableResourcesForStageSchema),
    orderStageController.getAvailableResourcesForStageController
  )
  orderStageRoute.patch(
    '/:id/assign-resource',
    auth,
    validate(assignResourceToStageSchema),
    orderStageController.assignResourceToStageController
  )
  orderStageRoute.patch(
    '/:id/complete',
    auth,
    validate(completeOrderStageSchema),
    orderStageController.completeOrderStageController
  )
  orderStageRoute.patch(
    '/:id/resume',
    auth,
    validate(resumeOrderStageSchema),
    orderStageController.resumeOrderStageController
  )

  app.use('/api/order-stages', orderStageRoute)
}

export default initOrderStageRoute
