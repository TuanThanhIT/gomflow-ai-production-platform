import type { Server as HttpServer } from 'http'
import type { Server as SocketServer } from 'socket.io'
import { Server } from 'socket.io'
import { SOCKET_EVENTS } from '../constants/socketEvents.js'
import { User } from '../models/index.js'
import { verifyAccessToken } from '../utils/jwt.js'

type SocketPayload = Record<string, unknown>

export type RealtimeEvent = {
  event: (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS]
  payload: SocketPayload
}

let io: SocketServer | null = null

const getAllowedOrigins = () =>
  (process.env.CORS_ORIGIN || process.env.CLIENT_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

export const initializeSocketServer = (httpServer: HttpServer) => {
  if (io) return io

  io = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        const allowedOrigins = getAllowedOrigins()
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true)
        }

        return callback(new Error('Not allowed by CORS'))
      },
      credentials: true
    }
  })

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token

      if (typeof token !== 'string' || !token) {
        return next(new Error('Unauthorized socket connection'))
      }

      const decoded = verifyAccessToken(token)
      const user = await User.findByPk(decoded.id, {
        attributes: ['id', 'isActive']
      })

      if (!user || !user.get('isActive')) {
        return next(new Error('Unauthorized socket connection'))
      }

      socket.data.userId = decoded.id
      return next()
    } catch {
      return next(new Error('Unauthorized socket connection'))
    }
  })

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`)

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`)
    })
  })

  return io
}

const emit = (event: RealtimeEvent) => {
  if (!io) return

  try {
    io.emit(event.event, event.payload)
  } catch (error) {
    console.error(`Socket emit failed for ${event.event}:`, error)
  }
}

export const emitRealtimeEvents = (events: RealtimeEvent[] = []) => {
  events.forEach(emit)
}

export const emitOrderCreated = (payload: SocketPayload) => emit({ event: SOCKET_EVENTS.ORDER_CREATED, payload })
export const emitOrderUpdated = (payload: SocketPayload) => emit({ event: SOCKET_EVENTS.ORDER_UPDATED, payload })
export const emitOrderCompleted = (payload: SocketPayload) => emit({ event: SOCKET_EVENTS.ORDER_COMPLETED, payload })
export const emitStageUpdated = (payload: SocketPayload) => emit({ event: SOCKET_EVENTS.STAGE_UPDATED, payload })
export const emitIncidentCreated = (payload: SocketPayload) => emit({ event: SOCKET_EVENTS.INCIDENT_CREATED, payload })
export const emitIncidentResolved = (payload: SocketPayload) =>
  emit({ event: SOCKET_EVENTS.INCIDENT_RESOLVED, payload })
export const emitOrderRiskChanged = (payload: SocketPayload) =>
  emit({ event: SOCKET_EVENTS.ORDER_RISK_CHANGED, payload })
export const emitNotificationSent = (payload: SocketPayload) =>
  emit({ event: SOCKET_EVENTS.NOTIFICATION_SENT, payload })

export default {
  emitIncidentCreated,
  emitIncidentResolved,
  emitNotificationSent,
  emitOrderCompleted,
  emitOrderCreated,
  emitOrderRiskChanged,
  emitOrderUpdated,
  emitRealtimeEvents,
  emitStageUpdated,
  initializeSocketServer
}
