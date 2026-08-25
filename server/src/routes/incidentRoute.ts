import type { Express } from 'express'
import express from 'express'
import { USER_ROLE } from '../constants/userConstants.js'
import incidentController from '../controllers/incidentController.js'
import auth from '../middlewares/auth.js'
import authorize from '../middlewares/authorize.js'
import validate from '../middlewares/validate.js'
import {
  createIncidentSchema,
  getIncidentDetailSchema,
  getIncidentsSchema,
  resolveIncidentSchema
} from '../validations/incidentValidation.js'

const incidentRoute = express.Router()

const initIncidentRoute = (app: Express) => {
  incidentRoute.get(
    '/',
    auth,
    authorize(USER_ROLE.MANAGER, USER_ROLE.OPERATOR),
    validate(getIncidentsSchema),
    incidentController.getIncidentsController
  )

  incidentRoute.get(
    '/:id',
    auth,
    authorize(USER_ROLE.MANAGER, USER_ROLE.OPERATOR),
    validate(getIncidentDetailSchema),
    incidentController.getIncidentDetailController
  )

  incidentRoute.patch(
    '/:id/resolve',
    auth,
    authorize(USER_ROLE.MANAGER),
    validate(resolveIncidentSchema),
    incidentController.resolveIncidentController
  )

  incidentRoute.post(
    '/',
    auth,
    authorize(USER_ROLE.MANAGER, USER_ROLE.OPERATOR),
    validate(createIncidentSchema),
    incidentController.createIncidentController
  )

  app.use('/api/incidents', incidentRoute)
}

export default initIncidentRoute
