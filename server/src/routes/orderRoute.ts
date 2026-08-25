import type { Express } from 'express'
import express from 'express'
import { USER_ROLE } from '../constants/userConstants.js'
import orderController from '../controllers/orderController.js'
import auth from '../middlewares/auth.js'
import authorize from '../middlewares/authorize.js'
import validate from '../middlewares/validate.js'
import {
  createOrderSchema,
  getOrderDetailSchema,
  getOrdersSchema,
  startOrderSchema
} from '../validations/orderValidation.js'

const orderRoute = express.Router()

const initOrderRoute = (app: Express) => {
  orderRoute.get(
    '/',
    auth,
    authorize(USER_ROLE.MANAGER, USER_ROLE.OPERATOR),
    validate(getOrdersSchema),
    orderController.getOrdersController
  )

  orderRoute.get(
    '/:id',
    auth,
    authorize(USER_ROLE.MANAGER, USER_ROLE.OPERATOR),
    validate(getOrderDetailSchema),
    orderController.getOrderDetailController
  )

  orderRoute.patch(
    '/:id/start',
    auth,
    authorize(USER_ROLE.MANAGER, USER_ROLE.OPERATOR),
    validate(startOrderSchema),
    orderController.startOrderController
  )

  orderRoute.post(
    '/',
    auth,
    authorize(USER_ROLE.MANAGER, USER_ROLE.OPERATOR),
    validate(createOrderSchema),
    orderController.createOrderController
  )

  app.use('/api/orders', orderRoute)
}

export default initOrderRoute
