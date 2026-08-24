import { DataTypes } from 'sequelize'
import sequelize from '../config/db.js'
import { RESOURCE_STATUS, RESOURCE_TYPE } from '../constants/databaseConstants.js'

const Resource = sequelize.define(
  'Resource',
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
        notNull: { msg: 'Resource code is required' },
        notEmpty: { msg: 'Resource code cannot be empty' },
        len: {
          args: [2, 50],
          msg: 'Resource code must be between 2 and 50 characters'
        },
        is: {
          args: /^[A-Z0-9_-]+$/,
          msg: 'Resource code can only contain uppercase letters, numbers, underscore and dash'
        }
      }
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: {
        notNull: { msg: 'Resource name is required' },
        notEmpty: { msg: 'Resource name cannot be empty' },
        len: {
          args: [2, 150],
          msg: 'Resource name must be between 2 and 150 characters'
        }
      }
    },
    type: {
      type: DataTypes.ENUM(...Object.values(RESOURCE_TYPE)),
      allowNull: false,
      validate: {
        isIn: {
          args: [Object.values(RESOURCE_TYPE)],
          msg: 'Invalid resource type'
        }
      }
    },
    status: {
      type: DataTypes.ENUM(...Object.values(RESOURCE_STATUS)),
      allowNull: false,
      defaultValue: RESOURCE_STATUS.AVAILABLE,
      validate: {
        isIn: {
          args: [Object.values(RESOURCE_STATUS)],
          msg: 'Invalid resource status'
        }
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    tableName: 'resources',
    timestamps: true,
    underscored: true
  }
)

export default Resource
