import { DataTypes } from 'sequelize'
import sequelize from '../config/db.js'
import { ORDER_PRIORITY, ORDER_STATUS, RISK_LEVEL } from '../constants/databaseConstants.js'

const Order = sequelize.define(
  'Order',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    code: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
      validate: {
        notNull: { msg: 'Order code is required' },
        notEmpty: { msg: 'Order code cannot be empty' },
        len: {
          args: [2, 30],
          msg: 'Order code must be between 2 and 30 characters'
        },
        is: {
          args: /^GOM-\d{6}$/,
          msg: 'Order code must match GOM-000001 format'
        }
      }
    },
    processTemplateId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'process_template_id',
      validate: {
        isInt: { msg: 'Process template ID must be an integer' }
      }
    },
    createdByUserId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'created_by_user_id',
      validate: {
        isInt: { msg: 'Created by user ID must be an integer' }
      }
    },
    customerName: {
      type: DataTypes.STRING(150),
      allowNull: false,
      field: 'customer_name',
      validate: {
        notNull: { msg: 'Customer name is required' },
        notEmpty: { msg: 'Customer name cannot be empty' },
        len: {
          args: [2, 150],
          msg: 'Customer name must be between 2 and 150 characters'
        }
      }
    },
    productName: {
      type: DataTypes.STRING(150),
      allowNull: false,
      field: 'product_name',
      validate: {
        notNull: { msg: 'Product name is required' },
        notEmpty: { msg: 'Product name cannot be empty' },
        len: {
          args: [2, 150],
          msg: 'Product name must be between 2 and 150 characters'
        }
      }
    },
    quantity: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      validate: {
        notNull: { msg: 'Quantity is required' },
        isInt: { msg: 'Quantity must be an integer' },
        min: {
          args: [1],
          msg: 'Quantity must be greater than 0'
        }
      }
    },
    specifications: {
      type: DataTypes.JSON,
      allowNull: true
    },
    rawOrderText: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'raw_order_text'
    },
    aiAnalysis: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'ai_analysis'
    },
    deadline: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        notNull: { msg: 'Deadline is required' },
        isDate: {
          args: true,
          msg: 'Deadline must be a valid date'
        }
      }
    },
    priority: {
      type: DataTypes.ENUM(...Object.values(ORDER_PRIORITY)),
      allowNull: false,
      defaultValue: ORDER_PRIORITY.NORMAL,
      validate: {
        isIn: {
          args: [Object.values(ORDER_PRIORITY)],
          msg: 'Invalid order priority'
        }
      }
    },
    status: {
      type: DataTypes.ENUM(...Object.values(ORDER_STATUS)),
      allowNull: false,
      defaultValue: ORDER_STATUS.PENDING,
      validate: {
        isIn: {
          args: [Object.values(ORDER_STATUS)],
          msg: 'Invalid order status'
        }
      }
    },
    riskLevel: {
      type: DataTypes.ENUM(...Object.values(RISK_LEVEL)),
      allowNull: false,
      defaultValue: RISK_LEVEL.NONE,
      field: 'risk_level',
      validate: {
        isIn: {
          args: [Object.values(RISK_LEVEL)],
          msg: 'Invalid risk level'
        }
      }
    },
    progressPercent: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'progress_percent',
      validate: {
        min: {
          args: [0],
          msg: 'Progress percent must be greater than or equal to 0'
        },
        max: {
          args: [100],
          msg: 'Progress percent must be less than or equal to 100'
        }
      }
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
    }
  },
  {
    tableName: 'orders',
    timestamps: true,
    underscored: true
  }
)

export default Order
