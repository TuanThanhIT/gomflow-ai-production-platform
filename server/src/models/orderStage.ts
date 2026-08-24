import { DataTypes } from 'sequelize'
import sequelize from '../config/db.js'
import { ORDER_STAGE_STATUS } from '../constants/databaseConstants.js'

const OrderStage = sequelize.define(
  'OrderStage',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    orderId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'order_id',
      validate: {
        notNull: { msg: 'Order ID is required' },
        isInt: { msg: 'Order ID must be an integer' }
      }
    },
    templateStepId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'template_step_id',
      validate: {
        isInt: { msg: 'Template step ID must be an integer' }
      }
    },
    assignedResourceId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'assigned_resource_id',
      validate: {
        isInt: { msg: 'Assigned resource ID must be an integer' }
      }
    },
    startedByUserId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'started_by_user_id',
      validate: {
        isInt: { msg: 'Started by user ID must be an integer' }
      }
    },
    completedByUserId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'completed_by_user_id',
      validate: {
        isInt: { msg: 'Completed by user ID must be an integer' }
      }
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notNull: { msg: 'Stage code is required' },
        notEmpty: { msg: 'Stage code cannot be empty' },
        len: {
          args: [2, 50],
          msg: 'Stage code must be between 2 and 50 characters'
        }
      }
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
      validate: {
        notNull: { msg: 'Stage name is required' },
        notEmpty: { msg: 'Stage name cannot be empty' },
        len: {
          args: [2, 120],
          msg: 'Stage name must be between 2 and 120 characters'
        }
      }
    },
    stepOrder: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'step_order',
      validate: {
        notNull: { msg: 'Stage order is required' },
        isInt: { msg: 'Stage order must be an integer' },
        min: {
          args: [1],
          msg: 'Stage order must be greater than or equal to 1'
        }
      }
    },
    status: {
      type: DataTypes.ENUM(...Object.values(ORDER_STAGE_STATUS)),
      allowNull: false,
      defaultValue: ORDER_STAGE_STATUS.WAITING,
      validate: {
        isIn: {
          args: [Object.values(ORDER_STAGE_STATUS)],
          msg: 'Invalid order stage status'
        }
      }
    },
    estimatedDurationMinutes: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'estimated_duration_minutes',
      validate: {
        min: {
          args: [0],
          msg: 'Estimated duration must be greater than or equal to 0'
        }
      }
    },
    expectedStartAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expected_start_at'
    },
    expectedEndAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expected_end_at'
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'started_at'
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'completed_at'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    tableName: 'order_stages',
    timestamps: true,
    underscored: true
  }
)

export default OrderStage
