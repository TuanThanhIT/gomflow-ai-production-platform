import type { Express } from 'express'
import express from 'express'
import { USER_ROLE } from '../constants/userConstants.js'
import orderStageController from '../controllers/orderStageController.js'
import auth from '../middlewares/auth.js'
import authorize from '../middlewares/authorize.js'
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
    authorize(USER_ROLE.MANAGER, USER_ROLE.OPERATOR),
    validate(getAvailableResourcesForStageSchema),
    orderStageController.getAvailableResourcesForStageController
  )

  orderStageRoute.patch(
    '/:id/assign-resource',
    auth,
    authorize(USER_ROLE.MANAGER, USER_ROLE.OPERATOR),
    validate(assignResourceToStageSchema),
    orderStageController.assignResourceToStageController
  )

  orderStageRoute.patch(
    '/:id/complete',
    auth,
    authorize(USER_ROLE.MANAGER, USER_ROLE.OPERATOR),
    validate(completeOrderStageSchema),
    orderStageController.completeOrderStageController
  )

  orderStageRoute.patch(
    '/:id/resume',
    auth,
    authorize(USER_ROLE.MANAGER, USER_ROLE.OPERATOR),
    validate(resumeOrderStageSchema),
    orderStageController.resumeOrderStageController
  )

  app.use('/api/order-stages', orderStageRoute)
}

export default initOrderStageRoute
