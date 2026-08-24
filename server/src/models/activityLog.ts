import { DataTypes } from 'sequelize'
import sequelize from '../config/db.js'

const ActivityLog = sequelize.define(
  'ActivityLog',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    actorUserId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'actor_user_id',
      validate: {
        isInt: { msg: 'Actor user ID must be an integer' }
      }
    },
    orderId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'order_id',
      validate: {
        isInt: { msg: 'Order ID must be an integer' }
      }
    },
    orderStageId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'order_stage_id',
      validate: {
        isInt: { msg: 'Order stage ID must be an integer' }
      }
    },
    incidentId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'incident_id',
      validate: {
        isInt: { msg: 'Incident ID must be an integer' }
      }
    },
    eventType: {
      type: DataTypes.STRING(80),
      allowNull: false,
      field: 'event_type',
      validate: {
        notNull: { msg: 'Event type is required' },
        notEmpty: { msg: 'Event type cannot be empty' },
        len: {
          args: [2, 80],
          msg: 'Event type must be between 2 and 80 characters'
        }
      }
    },
    message: {
      type: DataTypes.STRING(500),
      allowNull: false,
      validate: {
        notNull: { msg: 'Activity message is required' },
        notEmpty: { msg: 'Activity message cannot be empty' },
        len: {
          args: [2, 500],
          msg: 'Activity message must be between 2 and 500 characters'
        }
      }
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    }
  },
  {
    tableName: 'activity_logs',
    timestamps: true,
    underscored: true,
    updatedAt: false
  }
)

export default ActivityLog
