import Joi from 'joi'

export const emailField = Joi.string()
  .email({ tlds: { allow: false } })
  .max(150)
  .required()
  .messages({
    'string.base': 'Email must be a string',
    'string.email': 'Email format is invalid',
    'string.empty': 'Email cannot be empty',
    'string.max': 'Email cannot exceed 150 characters',
    'any.required': 'Email is required'
  })

export const passwordField = Joi.string().min(6).max(255).required().messages({
  'string.base': 'Password must be a string',
  'string.empty': 'Password cannot be empty',
  'string.min': 'Password must be at least 6 characters',
  'string.max': 'Password cannot exceed 255 characters',
  'any.required': 'Password is required'
})
