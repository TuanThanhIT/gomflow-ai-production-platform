import { DataTypes } from 'sequelize'
import sequelize from '../config/db.js'
import { NOTIFICATION_CHANNEL, NOTIFICATION_STATUS, NOTIFICATION_TYPE } from '../constants/databaseConstants.js'

const NotificationLog = sequelize.define(
  'NotificationLog',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    orderId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'order_id',
      validate: {
        isInt: { msg: 'Order ID must be an integer' }
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
    channel: {
      type: DataTypes.ENUM(...Object.values(NOTIFICATION_CHANNEL)),
      allowNull: false,
      defaultValue: NOTIFICATION_CHANNEL.TELEGRAM,
      validate: {
        isIn: {
          args: [Object.values(NOTIFICATION_CHANNEL)],
          msg: 'Invalid notification channel'
        }
      }
    },
    notificationType: {
      type: DataTypes.ENUM(...Object.values(NOTIFICATION_TYPE)),
      allowNull: false,
      field: 'notification_type',
      validate: {
        notNull: { msg: 'Notification type is required' },
        isIn: {
          args: [Object.values(NOTIFICATION_TYPE)],
          msg: 'Invalid notification type'
        }
      }
    },
    status: {
      type: DataTypes.ENUM(...Object.values(NOTIFICATION_STATUS)),
      allowNull: false,
      defaultValue: NOTIFICATION_STATUS.PENDING,
      validate: {
        isIn: {
          args: [Object.values(NOTIFICATION_STATUS)],
          msg: 'Invalid notification status'
        }
      }
    },
    recipient: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        len: {
          args: [1, 255],
          msg: 'Recipient must be between 1 and 255 characters'
        }
      }
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notNull: { msg: 'Notification message is required' },
        notEmpty: { msg: 'Notification message cannot be empty' }
      }
    },
    payload: {
      type: DataTypes.JSON,
      allowNull: true
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'error_message'
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'sent_at'
    }
  },
  {
    tableName: 'notification_logs',
    timestamps: true,
    underscored: true
  }
)

export default NotificationLog
