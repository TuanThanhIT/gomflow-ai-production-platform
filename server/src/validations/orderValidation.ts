import Joi from 'joi'
import { ORDER_PRIORITY, ORDER_STATUS, RISK_LEVEL } from '../constants/databaseConstants.js'
import { idParams } from './commons/numberField.js'

const positiveInteger = (name: string) =>
  Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': `${name} must be a number`,
      'number.integer': `${name} must be an integer`,
      'number.positive': `${name} must be a positive number`,
      'any.required': `${name} is required`
    })

const requiredText = (name: string) =>
  Joi.string()
    .trim()
    .required()
    .messages({
      'string.base': `${name} must be a string`,
      'string.empty': `${name} cannot be empty`,
      'any.required': `${name} is required`
    })

export const getOrdersSchema = {
  query: Joi.object({
    status: Joi.string()
      .valid(...Object.values(ORDER_STATUS))
      .optional()
      .messages({ 'any.only': 'Invalid order status' }),
    riskLevel: Joi.string()
      .valid(...Object.values(RISK_LEVEL))
      .optional()
      .messages({ 'any.only': 'Invalid risk level' }),
    priority: Joi.string()
      .valid(...Object.values(ORDER_PRIORITY))
      .optional()
      .messages({ 'any.only': 'Invalid order priority' }),
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

export const startOrderSchema = {
  params: Joi.object({
    id: idParams('id')
  })
}

export const getOrderDetailSchema = {
  params: Joi.object({
    id: idParams('id')
  })
}

export const createOrderSchema = {
  body: Joi.object({
    processTemplateId: positiveInteger('processTemplateId'),
    customerName: requiredText('customerName'),
    productName: requiredText('productName'),
    quantity: positiveInteger('quantity'),
    specifications: Joi.object().unknown(true).allow(null).optional(),
    rawOrderText: Joi.string().trim().allow('', null).max(4000).optional().messages({
      'string.max': 'rawOrderText must be less than or equal to 4000 characters'
    }),
    aiAnalysis: Joi.object().unknown(true).allow(null).optional(),
    deadline: Joi.date().iso().greater('now').required().messages({
      'date.base': 'deadline must be a valid datetime',
      'date.format': 'deadline must be a valid ISO datetime',
      'date.greater': 'deadline must be in the future',
      'any.required': 'deadline is required'
    }),
    priority: Joi.string()
      .valid(...Object.values(ORDER_PRIORITY))
      .required()
      .messages({
        'any.only': 'Invalid order priority',
        'string.empty': 'priority cannot be empty',
        'any.required': 'priority is required'
      })
  })
}
