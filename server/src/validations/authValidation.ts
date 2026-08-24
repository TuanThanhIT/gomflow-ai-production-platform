import Joi from 'joi'
import { emailField, passwordField } from './commons/authFields.js'

export const loginSchema = {
  body: Joi.object({
    email: emailField,
    password: passwordField
  })
}

export const refreshTokenSchema = {
  body: Joi.object({
    refreshToken: Joi.string().required().messages({
      'string.base': 'Refresh token must be a string',
      'string.empty': 'Refresh token cannot be empty',
      'any.required': 'Refresh token is required'
    })
  })
}
