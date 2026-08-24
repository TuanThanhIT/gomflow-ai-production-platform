import User from './user.js'
import ProcessTemplate from './processTemplate.js'
import ProcessTemplateStep from './processTemplateStep.js'
import Resource from './resource.js'
import Order from './order.js'
import OrderStage from './orderStage.js'
import Incident from './incident.js'
import IncidentAffectedOrder from './incidentAffectedOrder.js'
import ActivityLog from './activityLog.js'
import NotificationLog from './notificationLog.js'
import RefreshToken from './refreshToken.js'

User.hasMany(Order, {
  foreignKey: 'createdByUserId',
  as: 'createdOrders'
})

User.hasMany(OrderStage, {
  foreignKey: 'startedByUserId',
  as: 'startedStages'
})

User.hasMany(OrderStage, {
  foreignKey: 'completedByUserId',
  as: 'completedStages'
})

User.hasMany(Incident, {
  foreignKey: 'reportedByUserId',
  as: 'reportedIncidents'
})

User.hasMany(Incident, {
  foreignKey: 'resolvedByUserId',
  as: 'resolvedIncidents'
})

User.hasMany(ActivityLog, {
  foreignKey: 'actorUserId',
  as: 'activityLogs'
})

User.hasMany(RefreshToken, {
  foreignKey: 'userId',
  as: 'refreshTokens'
})

RefreshToken.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
})

ProcessTemplate.hasMany(ProcessTemplateStep, {
  foreignKey: 'processTemplateId',
  as: 'steps'
})

ProcessTemplate.hasMany(Order, {
  foreignKey: 'processTemplateId',
  as: 'orders'
})

ProcessTemplateStep.belongsTo(ProcessTemplate, {
  foreignKey: 'processTemplateId',
  as: 'processTemplate'
})

ProcessTemplateStep.hasMany(OrderStage, {
  foreignKey: 'templateStepId',
  as: 'orderStages'
})

Resource.hasMany(OrderStage, {
  foreignKey: 'assignedResourceId',
  as: 'orderStages'
})

Resource.hasMany(Incident, {
  foreignKey: 'resourceId',
  as: 'incidents'
})

Order.belongsTo(ProcessTemplate, {
  foreignKey: 'processTemplateId',
  as: 'processTemplate'
})

Order.belongsTo(User, {
  foreignKey: 'createdByUserId',
  as: 'createdBy'
})

Order.hasMany(OrderStage, {
  foreignKey: 'orderId',
  as: 'stages'
})

Order.hasMany(ActivityLog, {
  foreignKey: 'orderId',
  as: 'activityLogs'
})

Order.hasMany(NotificationLog, {
  foreignKey: 'orderId',
  as: 'notifications'
})

Order.belongsToMany(Incident, {
  through: IncidentAffectedOrder,
  foreignKey: 'orderId',
  otherKey: 'incidentId',
  as: 'incidents'
})

OrderStage.belongsTo(Order, {
  foreignKey: 'orderId',
  as: 'order'
})

OrderStage.belongsTo(ProcessTemplateStep, {
  foreignKey: 'templateStepId',
  as: 'templateStep'
})

OrderStage.belongsTo(Resource, {
  foreignKey: 'assignedResourceId',
  as: 'assignedResource'
})

OrderStage.belongsTo(User, {
  foreignKey: 'startedByUserId',
  as: 'startedBy'
})

OrderStage.belongsTo(User, {
  foreignKey: 'completedByUserId',
  as: 'completedBy'
})

OrderStage.hasMany(Incident, {
  foreignKey: 'orderStageId',
  as: 'incidents'
})

OrderStage.hasMany(ActivityLog, {
  foreignKey: 'orderStageId',
  as: 'activityLogs'
})

Incident.belongsTo(Resource, {
  foreignKey: 'resourceId',
  as: 'resource'
})

Incident.belongsTo(OrderStage, {
  foreignKey: 'orderStageId',
  as: 'orderStage'
})

Incident.belongsTo(User, {
  foreignKey: 'reportedByUserId',
  as: 'reportedBy'
})

Incident.belongsTo(User, {
  foreignKey: 'resolvedByUserId',
  as: 'resolvedBy'
})

Incident.belongsToMany(Order, {
  through: IncidentAffectedOrder,
  foreignKey: 'incidentId',
  otherKey: 'orderId',
  as: 'affectedOrders'
})

Incident.hasMany(ActivityLog, {
  foreignKey: 'incidentId',
  as: 'activityLogs'
})

Incident.hasMany(NotificationLog, {
  foreignKey: 'incidentId',
  as: 'notifications'
})

IncidentAffectedOrder.belongsTo(Incident, {
  foreignKey: 'incidentId',
  as: 'incident'
})

IncidentAffectedOrder.belongsTo(Order, {
  foreignKey: 'orderId',
  as: 'order'
})

ActivityLog.belongsTo(User, {
  foreignKey: 'actorUserId',
  as: 'actor'
})

ActivityLog.belongsTo(Order, {
  foreignKey: 'orderId',
  as: 'order'
})

ActivityLog.belongsTo(OrderStage, {
  foreignKey: 'orderStageId',
  as: 'orderStage'
})

ActivityLog.belongsTo(Incident, {
  foreignKey: 'incidentId',
  as: 'incident'
})

NotificationLog.belongsTo(Order, {
  foreignKey: 'orderId',
  as: 'order'
})

NotificationLog.belongsTo(Incident, {
  foreignKey: 'incidentId',
  as: 'incident'
})

export {
  User,
  ProcessTemplate,
  ProcessTemplateStep,
  Resource,
  Order,
  OrderStage,
  Incident,
  IncidentAffectedOrder,
  ActivityLog,
  NotificationLog,
  RefreshToken
}
