import type { Express } from 'express'
import express from 'express'
import authController from '../controllers/authController.js'
import auth from '../middlewares/auth.js'
import validate from '../middlewares/validate.js'
import { loginSchema } from '../validations/authValidation.js'

const authRoute = express.Router()

const initAuthRoute = (app: Express) => {
  authRoute.post('/login', validate(loginSchema), authController.loginController)
  authRoute.post('/refresh-token', authController.refreshTokenController)
  authRoute.get('/me', auth, authController.getMeController)
  authRoute.post('/logout', auth, authController.logoutController)

  app.use('/auth', authRoute)
}

export default initAuthRoute
