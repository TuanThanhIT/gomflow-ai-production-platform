import { DataTypes } from 'sequelize'
import sequelize from '../config/db.js'
import { RESOURCE_TYPE } from '~/constants/databaseConstants.js'

const ProcessTemplateStep = sequelize.define(
  'ProcessTemplateStep',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    processTemplateId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'process_template_id',
      validate: {
        notNull: { msg: 'Process template ID is required' },
        isInt: { msg: 'Process template ID must be an integer' }
      }
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notNull: { msg: 'Step code is required' },
        notEmpty: { msg: 'Step code cannot be empty' },
        len: {
          args: [2, 50],
          msg: 'Step code must be between 2 and 50 characters'
        },
        is: {
          args: /^[A-Z0-9_]+$/,
          msg: 'Step code can only contain uppercase letters, numbers and underscore'
        }
      }
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
      validate: {
        notNull: { msg: 'Step name is required' },
        notEmpty: { msg: 'Step name cannot be empty' },
        len: {
          args: [2, 120],
          msg: 'Step name must be between 2 and 120 characters'
        }
      }
    },
    stepOrder: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: 'step_order',
      validate: {
        notNull: { msg: 'Step order is required' },
        isInt: { msg: 'Step order must be an integer' },
        min: {
          args: [1],
          msg: 'Step order must be greater than or equal to 1'
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
    requiredResourceType: {
      type: DataTypes.ENUM(...Object.values(RESOURCE_TYPE)),
      allowNull: true,
      field: 'required_resource_type',
      validate: {
        isIn: {
          args: [Object.values(RESOURCE_TYPE)],
          msg: 'Invalid required resource type'
        }
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    tableName: 'process_template_steps',
    timestamps: true,
    underscored: true
  }
)

export default ProcessTemplateStep
