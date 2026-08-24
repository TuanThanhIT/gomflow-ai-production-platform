import Joi from 'joi'
import { RESOURCE_STATUS, RESOURCE_TYPE } from '../constants/databaseConstants.js'
import { idParams } from './commons/numberField.js'

export const getResourcesSchema = {
  query: Joi.object({
    type: Joi.string()
      .valid(...Object.values(RESOURCE_TYPE))
      .optional()
      .messages({ 'any.only': 'Invalid resource type' }),
    status: Joi.string()
      .valid(...Object.values(RESOURCE_STATUS))
      .optional()
      .messages({ 'any.only': 'Invalid resource status' }),
    active: Joi.string().valid('active', 'inactive', 'all').optional().messages({
      'any.only': 'Invalid resource active filter'
    }),
    search: Joi.string().trim().allow('').max(150).optional().messages({
      'string.max': 'search must be less than or equal to 150 characters'
    })
  })
}

export const getResourceDetailSchema = {
  params: Joi.object({
    id: idParams('id')
  })
}

export const createResourceSchema = {
  body: Joi.object({
    code: Joi.string()
      .trim()
      .uppercase()
      .min(2)
      .max(50)
      .pattern(/^[A-Z0-9_-]+$/)
      .required()
      .messages({
        'any.required': 'Resource code is required',
        'string.empty': 'Resource code cannot be empty',
        'string.min': 'Resource code must be between 2 and 50 characters',
        'string.max': 'Resource code must be between 2 and 50 characters',
        'string.pattern.base': 'Resource code can only contain uppercase letters, numbers, underscore and dash'
      }),
    name: Joi.string().trim().min(2).max(150).required().messages({
      'any.required': 'Resource name is required',
      'string.empty': 'Resource name cannot be empty',
      'string.min': 'Resource name must be between 2 and 150 characters',
      'string.max': 'Resource name must be between 2 and 150 characters'
    }),
    type: Joi.string()
      .valid(...Object.values(RESOURCE_TYPE))
      .required()
      .messages({ 'any.only': 'Invalid resource type', 'any.required': 'Resource type is required' }),
    description: Joi.string().trim().allow('', null).max(2000).optional()
  })
}

export const updateResourceSchema = {
  params: Joi.object({
    id: idParams('id')
  }),
  body: Joi.object({
    code: Joi.string()
      .trim()
      .uppercase()
      .min(2)
      .max(50)
      .pattern(/^[A-Z0-9_-]+$/)
      .optional()
      .messages({
        'string.empty': 'Resource code cannot be empty',
        'string.min': 'Resource code must be between 2 and 50 characters',
        'string.max': 'Resource code must be between 2 and 50 characters',
        'string.pattern.base': 'Resource code can only contain uppercase letters, numbers, underscore and dash'
      }),
    name: Joi.string().trim().min(2).max(150).optional().messages({
      'string.empty': 'Resource name cannot be empty',
      'string.min': 'Resource name must be between 2 and 150 characters',
      'string.max': 'Resource name must be between 2 and 150 characters'
    }),
    type: Joi.string()
      .valid(...Object.values(RESOURCE_TYPE))
      .optional()
      .messages({ 'any.only': 'Invalid resource type' }),
    description: Joi.string().trim().allow('', null).max(2000).optional(),
    isActive: Joi.boolean().optional()
  })
    .min(1)
    .unknown(false)
}
