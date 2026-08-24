import type { Express } from 'express'
import express from 'express'
import orderController from '../controllers/orderController.js'
import auth from '../middlewares/auth.js'
import validate from '../middlewares/validate.js'
import {
  createOrderSchema,
  getOrderDetailSchema,
  getOrdersSchema,
  startOrderSchema
} from '../validations/orderValidation.js'

const orderRoute = express.Router()

const initOrderRoute = (app: Express) => {
  orderRoute.get('/', auth, validate(getOrdersSchema), orderController.getOrdersController)
  orderRoute.get('/:id', auth, validate(getOrderDetailSchema), orderController.getOrderDetailController)
  orderRoute.patch('/:id/start', auth, validate(startOrderSchema), orderController.startOrderController)
  orderRoute.post('/', auth, validate(createOrderSchema), orderController.createOrderController)

  app.use('/api/orders', orderRoute)
}

export default initOrderRoute
