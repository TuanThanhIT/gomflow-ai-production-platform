import { type ReactNode, useEffect, useMemo, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { SOCKET_EVENTS } from '../../constants/socketEvents'
import { useAppDispatch, useAppSelector } from '../../redux/hook'
import { getDashboard } from '../../redux/slices/dashboardSlice'
import { getIncidents, getIncidentById } from '../../redux/slices/incidentSlice'
import { getOrderById, getOrders } from '../../redux/slices/orderSlice'
import { getResources } from '../../redux/slices/resourceSlice'
import { disconnectSocketClient, getSocketClient } from '../../services/socketClient'
import type {
  IncidentCreatedPayload,
  IncidentResolvedPayload,
  NotificationSentPayload,
  OrderCompletedPayload,
  OrderRiskChangedPayload,
  OrderUpdatedPayload,
  StageUpdatedPayload
} from '../../types/realtime'

const getOrderIdFromPath = (pathname: string) => {
  const match = pathname.match(/^\/orders\/([^/]+)$/)
  return match?.[1] ?? null
}

const isDashboardPath = (pathname: string) => pathname === '/' || pathname === '/dashboard'

const sameId = (first?: number | string | null, second?: number | string | null) =>
  first !== undefined && first !== null && second !== undefined && second !== null && String(first) === String(second)

const RealtimeProvider = ({ children }: { children: ReactNode }) => {
  const dispatch = useAppDispatch()
  const location = useLocation()
  const accessToken = useAppSelector((state) => state.auth.accessToken)
  const authInitialized = useAppSelector((state) => state.auth.authInitialized)
  const currentOrderId = useAppSelector((state) => state.order.selectedOrder?.id)
  const currentIncidentId = useAppSelector((state) => state.incident.selectedIncident?.id)
  const orderPagination = useAppSelector((state) => state.order.pagination)
  const incidentPagination = useAppSelector((state) => state.incident.pagination)
  const pathnameRef = useRef(location.pathname)
  const pendingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const routeState = useMemo(
    () => ({
      currentIncidentId,
      currentOrderId,
      incidentPagination,
      orderPagination
    }),
    [currentIncidentId, currentOrderId, incidentPagination, orderPagination]
  )

  useEffect(() => {
    pathnameRef.current = location.pathname
  }, [location.pathname])

  useEffect(() => {
    if (!authInitialized || !accessToken) {
      disconnectSocketClient()
      return
    }

    const socket = getSocketClient(accessToken)

    const schedule = (key: string, callback: () => void) => {
      if (pendingTimers.current[key]) clearTimeout(pendingTimers.current[key])

      pendingTimers.current[key] = setTimeout(() => {
        delete pendingTimers.current[key]
        callback()
      }, 150)
    }

    const syncOrderList = () => {
      const pathname = pathnameRef.current
      if (pathname !== '/orders') return

      schedule('orders:list', () => {
        void dispatch(getOrders({ page: routeState.orderPagination.page, limit: routeState.orderPagination.limit }))
      })
    }

    const syncIncidentList = () => {
      const pathname = pathnameRef.current
      if (pathname !== '/incidents') return

      schedule('incidents:list', () => {
        void dispatch(
          getIncidents({ page: routeState.incidentPagination.page, limit: routeState.incidentPagination.limit })
        )
      })
    }

    const syncResources = () => {
      if (pathnameRef.current !== '/resources') return

      schedule('resources:list', () => {
        void dispatch(getResources())
      })
    }

    const syncDashboard = () => {
      if (!isDashboardPath(pathnameRef.current)) return

      schedule('dashboard', () => {
        void dispatch(getDashboard())
      })
    }

    const syncCurrentOrder = (orderId?: number | string | null) => {
      const routeOrderId = getOrderIdFromPath(pathnameRef.current)
      const targetOrderId = orderId ?? routeOrderId ?? routeState.currentOrderId

      if (!routeOrderId || !sameId(routeOrderId, targetOrderId)) return

      schedule(`orders:detail:${routeOrderId}`, () => {
        void dispatch(getOrderById({ orderId: routeOrderId }))
      })
    }

    const syncCurrentIncident = (incidentId?: number | string | null) => {
      if (pathnameRef.current !== '/incidents' || !sameId(routeState.currentIncidentId, incidentId)) return

      schedule(`incidents:detail:${incidentId}`, () => {
        void dispatch(getIncidentById({ incidentId: incidentId as number | string }))
      })
    }

    const handleOrderCreated = () => {
      syncDashboard()
      syncOrderList()
    }

    const handleOrderUpdated = (payload: OrderUpdatedPayload) => {
      syncDashboard()
      syncOrderList()
      syncCurrentOrder(payload.orderId)
    }

    const handleOrderCompleted = (payload: OrderCompletedPayload) => {
      syncDashboard()
      syncOrderList()
      syncCurrentOrder(payload.orderId)
    }

    const handleStageUpdated = (payload: StageUpdatedPayload) => {
      syncDashboard()
      syncCurrentOrder(payload.orderId)
    }

    const handleIncidentCreated = (payload: IncidentCreatedPayload) => {
      syncDashboard()
      syncIncidentList()
      syncResources()

      if (payload.affectedOrderIds.some((orderId) => sameId(orderId, getOrderIdFromPath(pathnameRef.current)))) {
        syncCurrentOrder(getOrderIdFromPath(pathnameRef.current))
      }
    }

    const handleIncidentResolved = (payload: IncidentResolvedPayload) => {
      syncDashboard()
      syncIncidentList()
      syncResources()
      syncCurrentIncident(payload.incidentId)

      if (payload.affectedOrderIds.some((orderId) => sameId(orderId, getOrderIdFromPath(pathnameRef.current)))) {
        syncCurrentOrder(getOrderIdFromPath(pathnameRef.current))
      }
    }

    const handleOrderRiskChanged = (payload: OrderRiskChangedPayload) => {
      syncDashboard()
      syncOrderList()
      syncCurrentOrder(payload.orderId)
    }

    const handleNotificationSent = (payload: NotificationSentPayload) => {
      if (import.meta.env.DEV) {
        console.debug('Realtime notification sent', payload)
      }
    }

    const handleConnectError = (error: Error) => {
      if (import.meta.env.DEV) {
        console.warn('Socket connect error:', error.message)
      }

      if (error.message.includes('Unauthorized')) {
        socket.disconnect()
      }
    }

    const handleReconnect = () => {
      syncDashboard()
      syncOrderList()
      syncIncidentList()
      syncResources()
      syncCurrentOrder()
    }

    socket.on(SOCKET_EVENTS.ORDER_CREATED, handleOrderCreated)
    socket.on(SOCKET_EVENTS.ORDER_UPDATED, handleOrderUpdated)
    socket.on(SOCKET_EVENTS.ORDER_COMPLETED, handleOrderCompleted)
    socket.on(SOCKET_EVENTS.STAGE_UPDATED, handleStageUpdated)
    socket.on(SOCKET_EVENTS.INCIDENT_CREATED, handleIncidentCreated)
    socket.on(SOCKET_EVENTS.INCIDENT_RESOLVED, handleIncidentResolved)
    socket.on(SOCKET_EVENTS.ORDER_RISK_CHANGED, handleOrderRiskChanged)
    socket.on(SOCKET_EVENTS.NOTIFICATION_SENT, handleNotificationSent)
    socket.on('connect_error', handleConnectError)
    socket.io.on('reconnect', handleReconnect)

    if (!socket.connected) socket.connect()

    return () => {
      Object.values(pendingTimers.current).forEach(clearTimeout)
      pendingTimers.current = {}

      socket.off(SOCKET_EVENTS.ORDER_CREATED, handleOrderCreated)
      socket.off(SOCKET_EVENTS.ORDER_UPDATED, handleOrderUpdated)
      socket.off(SOCKET_EVENTS.ORDER_COMPLETED, handleOrderCompleted)
      socket.off(SOCKET_EVENTS.STAGE_UPDATED, handleStageUpdated)
      socket.off(SOCKET_EVENTS.INCIDENT_CREATED, handleIncidentCreated)
      socket.off(SOCKET_EVENTS.INCIDENT_RESOLVED, handleIncidentResolved)
      socket.off(SOCKET_EVENTS.ORDER_RISK_CHANGED, handleOrderRiskChanged)
      socket.off(SOCKET_EVENTS.NOTIFICATION_SENT, handleNotificationSent)
      socket.off('connect_error', handleConnectError)
      socket.io.off('reconnect', handleReconnect)
    }
  }, [accessToken, authInitialized, dispatch, routeState])

  return children
}

export default RealtimeProvider
