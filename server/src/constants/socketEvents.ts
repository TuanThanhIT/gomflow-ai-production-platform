export const SOCKET_EVENTS = Object.freeze({
  ORDER_CREATED: 'order:created',
  ORDER_UPDATED: 'order:updated',
  ORDER_COMPLETED: 'order:completed',
  STAGE_UPDATED: 'stage:updated',
  INCIDENT_CREATED: 'incident:created',
  INCIDENT_RESOLVED: 'incident:resolved',
  ORDER_RISK_CHANGED: 'order:risk-changed',
  NOTIFICATION_SENT: 'notification:sent'
})

export default SOCKET_EVENTS
