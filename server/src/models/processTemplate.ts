import { DataTypes } from 'sequelize'
import sequelize from '../config/db.js'

const ProcessTemplate = sequelize.define(
  'ProcessTemplate',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        notNull: { msg: 'Process template code is required' },
        notEmpty: { msg: 'Process template code cannot be empty' },
        len: {
          args: [2, 50],
          msg: 'Process template code must be between 2 and 50 characters'
        },
        is: {
          args: /^[A-Z0-9_]+$/,
          msg: 'Process template code can only contain uppercase letters, numbers and underscore'
        }
      }
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: {
        notNull: { msg: 'Process template name is required' },
        notEmpty: { msg: 'Process template name cannot be empty' },
        len: {
          args: [2, 150],
          msg: 'Process template name must be between 2 and 150 characters'
        }
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active'
    }
  },
  {
    tableName: 'process_templates',
    timestamps: true,
    underscored: true
  }
)

export default ProcessTemplate
