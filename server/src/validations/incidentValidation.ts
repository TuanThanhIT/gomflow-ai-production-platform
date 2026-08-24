import Joi from 'joi'
import { INCIDENT_SEVERITY, INCIDENT_STATUS, INCIDENT_TYPE } from '../constants/databaseConstants.js'
import { idParams } from './commons/numberField.js'

const optionalPositiveId = (name: string) =>
  Joi.number()
    .integer()
    .positive()
    .allow(null)
    .optional()
    .messages({
      'number.base': `${name} must be a number`,
      'number.integer': `${name} must be an integer`,
      'number.positive': `${name} must be a positive number`
    })

export const getIncidentsSchema = {
  query: Joi.object({
    status: Joi.string()
      .valid(...Object.values(INCIDENT_STATUS))
      .optional()
      .messages({ 'any.only': 'Invalid incident status' }),
    severity: Joi.string()
      .valid(...Object.values(INCIDENT_SEVERITY))
      .optional()
      .messages({ 'any.only': 'Invalid incident severity' }),
    type: Joi.string()
      .valid(...Object.values(INCIDENT_TYPE))
      .optional()
      .messages({ 'any.only': 'Invalid incident type' }),
    resourceId: Joi.number().integer().positive().optional().messages({
      'number.base': 'resourceId must be a number',
      'number.integer': 'resourceId must be an integer',
      'number.positive': 'resourceId must be a positive number'
    }),
    search: Joi.string().trim().allow('').max(150).optional().messages({
      'string.max': 'search must be less than or equal to 150 characters'
    }),
    page: Joi.number().integer().min(1).default(1).optional().messages({
      'number.base': 'page must be a number',
      'number.integer': 'page must be an integer',
      'number.min': 'page must be greater than or equal to 1'
    }),
    limit: Joi.number().integer().min(1).max(100).default(10).optional().messages({
      'number.base': 'limit must be a number',
      'number.integer': 'limit must be an integer',
      'number.min': 'limit must be greater than or equal to 1',
      'number.max': 'limit must be less than or equal to 100'
    })
  })
}

export const getIncidentDetailSchema = {
  params: Joi.object({
    id: idParams('id')
  })
}

export const createIncidentSchema = {
  body: Joi.object({
    orderStageId: optionalPositiveId('orderStageId'),
    resourceId: optionalPositiveId('resourceId'),
    rawDescription: Joi.string().trim().required().messages({
      'string.base': 'rawDescription must be a string',
      'string.empty': 'rawDescription cannot be empty',
      'any.required': 'rawDescription is required'
    }),
    type: Joi.string()
      .valid(...Object.values(INCIDENT_TYPE))
      .required()
      .messages({
        'any.only': 'Invalid incident type',
        'string.empty': 'type cannot be empty',
        'any.required': 'type is required'
      }),
    severity: Joi.string()
      .valid(...Object.values(INCIDENT_SEVERITY))
      .required()
      .messages({
        'any.only': 'Invalid incident severity',
        'string.empty': 'severity cannot be empty',
        'any.required': 'severity is required'
      }),
    estimatedDelayMinutes: Joi.number().integer().min(0).allow(null).optional().messages({
      'number.base': 'estimatedDelayMinutes must be a number',
      'number.integer': 'estimatedDelayMinutes must be an integer',
      'number.min': 'estimatedDelayMinutes must be greater than or equal to 0'
    })
  })
}

export const resolveIncidentSchema = {
  params: Joi.object({
    id: idParams('id')
  }),
  body: Joi.object({
    resolutionNote: Joi.string().trim().required().messages({
      'string.base': 'resolutionNote must be a string',
      'string.empty': 'resolutionNote cannot be empty',
      'any.required': 'resolutionNote is required'
    })
  })
}
