import type { Express } from 'express'
import express from 'express'
import { USER_ROLE } from '../constants/databaseConstants.js'
import processTemplateController from '../controllers/processTemplateController.js'
import auth from '../middlewares/auth.js'
import authorize from '../middlewares/authorize.js'
import validate from '../middlewares/validate.js'
import {
  createProcessTemplateSchema,
  deleteProcessTemplateSchema,
  getProcessTemplateDetailSchema,
  getProcessTemplatesSchema,
  updateProcessTemplateSchema
} from '../validations/processTemplateValidation.js'

const processTemplateRoute = express.Router()

const initProcessTemplateRoute = (app: Express) => {
  processTemplateRoute.get(
    '/',
    auth,
    validate(getProcessTemplatesSchema),
    processTemplateController.getProcessTemplatesController
  )
  processTemplateRoute.get(
    '/:processTemplateId',
    auth,
    validate(getProcessTemplateDetailSchema),
    processTemplateController.getProcessTemplateDetailController
  )
  processTemplateRoute.post(
    '/',
    auth,
    authorize(USER_ROLE.MANAGER),
    validate(createProcessTemplateSchema),
    processTemplateController.createProcessTemplateController
  )
  processTemplateRoute.patch(
    '/:processTemplateId',
    auth,
    authorize(USER_ROLE.MANAGER),
    validate(updateProcessTemplateSchema),
    processTemplateController.updateProcessTemplateController
  )
  processTemplateRoute.delete(
    '/:processTemplateId',
    auth,
    authorize(USER_ROLE.MANAGER),
    validate(deleteProcessTemplateSchema),
    processTemplateController.deleteProcessTemplateController
  )

  app.use('/api/process-templates', processTemplateRoute)
}

export default initProcessTemplateRoute
