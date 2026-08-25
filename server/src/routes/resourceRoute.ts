import type { Express } from 'express'
import express from 'express'
import { USER_ROLE } from '../constants/userConstants.js'
import resourceController from '../controllers/resourceController.js'
import auth from '../middlewares/auth.js'
import authorize from '../middlewares/authorize.js'
import validate from '../middlewares/validate.js'
import {
  createResourceSchema,
  getResourceDetailSchema,
  getResourcesSchema,
  updateResourceSchema
} from '../validations/resourceValidation.js'

const resourceRoute = express.Router()

const initResourceRoute = (app: Express) => {
  resourceRoute.get(
    '/',
    auth,
    authorize(USER_ROLE.MANAGER, USER_ROLE.OPERATOR),
    validate(getResourcesSchema),
    resourceController.getResourcesController
  )

  resourceRoute.post(
    '/',
    auth,
    authorize(USER_ROLE.MANAGER),
    validate(createResourceSchema),
    resourceController.createResourceController
  )

  resourceRoute.get(
    '/:id',
    auth,
    authorize(USER_ROLE.MANAGER, USER_ROLE.OPERATOR),
    validate(getResourceDetailSchema),
    resourceController.getResourceDetailController
  )

  resourceRoute.patch(
    '/:id',
    auth,
    authorize(USER_ROLE.MANAGER),
    validate(updateResourceSchema),
    resourceController.updateResourceController
  )

  resourceRoute.delete(
    '/:id',
    auth,
    authorize(USER_ROLE.MANAGER),
    validate(getResourceDetailSchema),
    resourceController.deleteResourceController
  )

  app.use('/api/resources', resourceRoute)
}

export default initResourceRoute
