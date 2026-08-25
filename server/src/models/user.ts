import { DataTypes } from 'sequelize'
import sequelize from '../config/db.js'
import { USER_ROLE } from '../constants/userConstants.js'

const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    fullName: {
      type: DataTypes.STRING(120),
      allowNull: false,
      field: 'full_name',
      validate: {
        notNull: { msg: 'Full name is required' },
        notEmpty: { msg: 'Full name cannot be empty' },
        len: {
          args: [2, 120],
          msg: 'Full name must be between 2 and 120 characters'
        }
      }
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
      validate: {
        notNull: { msg: 'Email is required' },
        notEmpty: { msg: 'Email cannot be empty' },
        isEmail: { msg: 'Invalid email format' },
        len: {
          args: [5, 150],
          msg: 'Email must be between 5 and 150 characters'
        }
      }
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'password_hash',
      validate: {
        notNull: { msg: 'Password hash is required' },
        notEmpty: { msg: 'Password hash cannot be empty' },
        len: {
          args: [20, 255],
          msg: 'Password hash must be between 20 and 255 characters'
        }
      }
    },
    role: {
      type: DataTypes.ENUM(...Object.values(USER_ROLE)),
      allowNull: false,
      defaultValue: USER_ROLE.OPERATOR,
      validate: {
        isIn: {
          args: [Object.values(USER_ROLE)],
          msg: 'Invalid user role'
        }
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active'
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_login_at'
    }
  },
  {
    tableName: 'users',
    timestamps: true,
    underscored: true
  }
)

export default User
