import Joi from 'joi'

const optionalPositiveInteger = (name: string) =>
  Joi.number()
    .integer()
    .positive()
    .optional()
    .messages({
      'number.base': `${name} must be a number`,
      'number.integer': `${name} must be an integer`,
      'number.positive': `${name} must be a positive number`
    })

export const getActivityLogsSchema = {
  query: Joi.object({
    search: Joi.string().trim().allow('').max(150).optional().messages({
      'string.max': 'search must be less than or equal to 150 characters'
    }),
    eventType: Joi.string().trim().allow('').max(80).optional().messages({
      'string.max': 'eventType must be less than or equal to 80 characters'
    }),
    orderId: optionalPositiveInteger('orderId'),
    actorUserId: optionalPositiveInteger('actorUserId'),
    incidentId: optionalPositiveInteger('incidentId'),
    from: Joi.date().iso().optional().messages({
      'date.base': 'from must be a valid date',
      'date.format': 'from must be a valid ISO date'
    }),
    to: Joi.date().iso().optional().messages({
      'date.base': 'to must be a valid date',
      'date.format': 'to must be a valid ISO date'
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

export const getActivityLogOrdersSchema = {
  query: Joi.object({
    search: Joi.string().trim().allow('').max(150).optional().messages({
      'string.max': 'search must be less than or equal to 150 characters'
    }),
    eventType: Joi.string().trim().allow('').max(80).optional().messages({
      'string.max': 'eventType must be less than or equal to 80 characters'
    }),
    from: Joi.date().iso().optional().messages({
      'date.base': 'from must be a valid date',
      'date.format': 'from must be a valid ISO date'
    }),
    to: Joi.date().iso().optional().messages({
      'date.base': 'to must be a valid date',
      'date.format': 'to must be a valid ISO date'
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
