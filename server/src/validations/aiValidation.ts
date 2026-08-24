import Joi from 'joi'
import { AI_CONFIG } from '../config/ai.js'

export const analyzeOrderSchema = {
  body: Joi.object({
    text: Joi.string()
      .trim()
      .min(1)
      .max(AI_CONFIG.orderAnalysisMaxTextLength)
      .required()
      .messages({
        'string.base': 'text must be a string',
        'string.empty': 'text cannot be empty',
        'string.min': 'text cannot be empty',
        'string.max': `text must be less than or equal to ${AI_CONFIG.orderAnalysisMaxTextLength} characters`,
        'any.required': 'text is required'
      })
  })
}

export const analyzeIncidentSchema = {
  body: Joi.object({
    text: Joi.string()
      .trim()
      .min(1)
      .max(AI_CONFIG.incidentAnalysisMaxTextLength)
      .required()
      .messages({
        'string.base': 'text must be a string',
        'string.empty': 'text cannot be empty',
        'string.min': 'text cannot be empty',
        'string.max': `text must be less than or equal to ${AI_CONFIG.incidentAnalysisMaxTextLength} characters`,
        'any.required': 'text is required'
      })
  })
}
