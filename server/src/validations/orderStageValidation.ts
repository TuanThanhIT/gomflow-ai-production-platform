import Joi from 'joi'
import { idParams } from './commons/numberField.js'

export const getAvailableResourcesForStageSchema = {
  params: Joi.object({
    id: idParams('id')
  })
}

export const assignResourceToStageSchema = {
  params: Joi.object({
    id: idParams('id')
  }),
  body: Joi.object({
    resourceId: Joi.number().integer().positive().required().messages({
      'number.base': 'resourceId must be a number',
      'number.integer': 'resourceId must be an integer',
      'number.positive': 'resourceId must be a positive number',
      'any.required': 'resourceId is required'
    })
  })
}

export const completeOrderStageSchema = {
  params: Joi.object({
    id: idParams('id')
  })
}

export const resumeOrderStageSchema = {
  params: Joi.object({
    id: idParams('id')
  })
}
