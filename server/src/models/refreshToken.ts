import { DataTypes } from 'sequelize'
import sequelize from '../config/db.js'
import User from './user.js'

const RefreshToken = sequelize.define(
  'RefreshToken',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    token: {
      type: DataTypes.STRING(512),
      allowNull: false,
      unique: true,
      validate: {
        notNull: { msg: 'Refresh token is required' },
        notEmpty: { msg: 'Refresh token cannot be empty' },
        len: {
          args: [10, 512],
          msg: 'Refresh token length is invalid'
        }
      }
    },
    userId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'user_id',
      references: { model: User, key: 'id' },
      validate: {
        notNull: { msg: 'User ID is required' },
        isInt: { msg: 'User ID must be an integer' },
        min: {
          args: [1],
          msg: 'User ID must be positive'
        }
      }
    },
    expiry: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        notNull: { msg: 'Expiry is required' },
        isDate: { args: true, msg: 'Expiry must be a valid date' },
        isAfterNow(value: string | Date) {
          if (new Date(value) <= new Date()) {
            throw new Error('Refresh token expiry must be in the future')
          }
        }
      }
    }
  },
  {
    tableName: 'refresh_tokens',
    timestamps: true,
    underscored: true
  }
)

export default RefreshToken
