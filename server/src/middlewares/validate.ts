import type { NextFunction, Request, RequestHandler, Response } from 'express'
import ValidationError from '../errors/ValidationError.js'

type ValidationDetail = {
  path: Array<string | number>
  message: string
}

type ValidationResult = {
  error?: {
    details: ValidationDetail[]
  }
}

type ValidationSchema = {
  validate: (
    value: unknown,
    options?: {
      abortEarly?: boolean
      allowUnknown?: boolean
    }
  ) => ValidationResult
}

type ValidationSchemas = {
  body?: ValidationSchema
  params?: ValidationSchema
  query?: ValidationSchema
}

const validatePart = (schema: ValidationSchema | undefined, value: unknown): ValidationDetail[] => {
  if (!schema) {
    return []
  }

  const { error } = schema.validate(value, {
    abortEarly: false,
    allowUnknown: false
  })

  return error?.details ?? []
}

const validate = ({ body, params, query }: ValidationSchemas): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const errors = [
      ...validatePart(body, req.body),
      ...validatePart(params, req.params),
      ...validatePart(query, req.query)
    ]

    if (errors.length > 0) {
      return next(
        new ValidationError(
          errors.map((detail) => ({
            field: detail.path.join('.'),
            fieldMessage: detail.message
          }))
        )
      )
    }

    return next()
  }
}

export default validate
