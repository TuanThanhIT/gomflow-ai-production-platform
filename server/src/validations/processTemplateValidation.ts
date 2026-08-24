import Joi from 'joi'
import { RESOURCE_TYPE } from '../constants/databaseConstants.js'
import { idParams } from './commons/numberField.js'

const templateCode = Joi.string()
  .trim()
  .uppercase()
  .min(2)
  .max(50)
  .pattern(/^[A-Z0-9_]+$/)
  .messages({
    'string.base': 'code must be a string',
    'string.empty': 'code cannot be empty',
    'string.min': 'code must be at least 2 characters',
    'string.max': 'code must be less than or equal to 50 characters',
    'string.pattern.base': 'code can only contain uppercase letters, numbers and underscore'
  })

const stageCode = Joi.string()
  .trim()
  .uppercase()
  .min(2)
  .max(50)
  .pattern(/^[A-Z0-9_]+$/)
  .messages({
    'string.base': 'stage code must be a string',
    'string.empty': 'stage code cannot be empty',
    'string.min': 'stage code must be at least 2 characters',
    'string.max': 'stage code must be less than or equal to 50 characters',
    'string.pattern.base': 'stage code can only contain uppercase letters, numbers and underscore'
  })

const stageSchema = Joi.object({
  id: Joi.number().integer().positive().optional().messages({
    'number.base': 'stage id must be a number',
    'number.integer': 'stage id must be an integer',
    'number.positive': 'stage id must be a positive number'
  }),
  code: stageCode.required().messages({
    'any.required': 'stage code is required'
  }),
  name: Joi.string().trim().min(2).max(120).required().messages({
    'string.base': 'stage name must be a string',
    'string.empty': 'stage name cannot be empty',
    'string.min': 'stage name must be at least 2 characters',
    'string.max': 'stage name must be less than or equal to 120 characters',
    'any.required': 'stage name is required'
  }),
  estimatedDurationMinutes: Joi.number().integer().min(0).allow(null).optional().messages({
    'number.base': 'estimatedDurationMinutes must be a number',
    'number.integer': 'estimatedDurationMinutes must be an integer',
    'number.min': 'estimatedDurationMinutes must be greater than or equal to 0'
  }),
  requiredResourceType: Joi.string()
    .valid(...Object.values(RESOURCE_TYPE))
    .allow(null)
    .optional()
    .messages({
      'any.only': 'Invalid required resource type'
    }),
  description: Joi.string().trim().allow('', null).max(1000).optional().messages({
    'string.base': 'stage description must be a string',
    'string.max': 'stage description must be less than or equal to 1000 characters'
  })
})

export const getProcessTemplatesSchema = {
  query: Joi.object({
    status: Joi.string().valid('active', 'inactive', 'all').default('active').optional().messages({
      'any.only': 'Invalid process template status filter'
    }),
    search: Joi.string().trim().allow('').max(150).optional().messages({
      'string.max': 'search must be less than or equal to 150 characters'
    })
  })
}

export const getProcessTemplateDetailSchema = {
  params: Joi.object({
    processTemplateId: idParams('processTemplateId')
  })
}

export const createProcessTemplateSchema = {
  body: Joi.object({
    code: templateCode.required().messages({
      'any.required': 'code is required'
    }),
    name: Joi.string().trim().min(2).max(150).required().messages({
      'string.base': 'name must be a string',
      'string.empty': 'name cannot be empty',
      'string.min': 'name must be at least 2 characters',
      'string.max': 'name must be less than or equal to 150 characters',
      'any.required': 'name is required'
    }),
    description: Joi.string().trim().allow('', null).max(2000).optional().messages({
      'string.base': 'description must be a string',
      'string.max': 'description must be less than or equal to 2000 characters'
    }),
    isActive: Joi.boolean().optional().messages({
      'boolean.base': 'isActive must be a boolean'
    }),
    stages: Joi.array().items(stageSchema).min(1).required().messages({
      'array.base': 'stages must be an array',
      'array.min': 'Process template must have at least one stage',
      'any.required': 'stages is required'
    })
  })
}

export const updateProcessTemplateSchema = {
  params: Joi.object({
    processTemplateId: idParams('processTemplateId')
  }),
  body: Joi.object({
    code: templateCode.optional(),
    name: Joi.string().trim().min(2).max(150).optional().messages({
      'string.base': 'name must be a string',
      'string.empty': 'name cannot be empty',
      'string.min': 'name must be at least 2 characters',
      'string.max': 'name must be less than or equal to 150 characters'
    }),
    description: Joi.string().trim().allow('', null).max(2000).optional().messages({
      'string.base': 'description must be a string',
      'string.max': 'description must be less than or equal to 2000 characters'
    }),
    isActive: Joi.boolean().optional().messages({
      'boolean.base': 'isActive must be a boolean'
    }),
    stages: Joi.array().items(stageSchema).min(1).optional().messages({
      'array.base': 'stages must be an array',
      'array.min': 'Process template must have at least one stage'
    })
  })
    .min(1)
    .messages({
      'object.min': 'At least one field is required'
    })
}

export const deleteProcessTemplateSchema = {
  params: Joi.object({
    processTemplateId: idParams('processTemplateId')
  })
}
