import { DataTypes } from 'sequelize'
import sequelize from '../config/db.js'
import { INCIDENT_SEVERITY, INCIDENT_STATUS, INCIDENT_TYPE } from '../constants/incidentConstants.js'

const Incident = sequelize.define(
  'Incident',
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
        notNull: { msg: 'Incident code is required' },
        notEmpty: { msg: 'Incident code cannot be empty' },
        len: {
          args: [2, 30],
          msg: 'Incident code must be between 2 and 30 characters'
        },
        is: {
          args: /^INC-\d{6}$/,
          msg: 'Incident code must match INC-000001 format'
        }
      }
    },
    resourceId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'resource_id',
      validate: {
        isInt: { msg: 'Resource ID must be an integer' }
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
    reportedByUserId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'reported_by_user_id',
      validate: {
        isInt: { msg: 'Reported by user ID must be an integer' }
      }
    },
    rawDescription: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'raw_description',
      validate: {
        notNull: { msg: 'Raw description is required' },
        notEmpty: { msg: 'Raw description cannot be empty' }
      }
    },
    type: {
      type: DataTypes.ENUM(...Object.values(INCIDENT_TYPE)),
      allowNull: false,
      defaultValue: INCIDENT_TYPE.OTHER,
      validate: {
        isIn: {
          args: [Object.values(INCIDENT_TYPE)],
          msg: 'Invalid incident type'
        }
      }
    },
    severity: {
      type: DataTypes.ENUM(...Object.values(INCIDENT_SEVERITY)),
      allowNull: false,
      defaultValue: INCIDENT_SEVERITY.LOW,
      validate: {
        isIn: {
          args: [Object.values(INCIDENT_SEVERITY)],
          msg: 'Invalid incident severity'
        }
      }
    },
    estimatedDelayMinutes: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'estimated_delay_minutes',
      validate: {
        min: {
          args: [0],
          msg: 'Estimated delay must be greater than or equal to 0'
        }
      }
    },
    status: {
      type: DataTypes.ENUM(...Object.values(INCIDENT_STATUS)),
      allowNull: false,
      defaultValue: INCIDENT_STATUS.OPEN,
      validate: {
        isIn: {
          args: [Object.values(INCIDENT_STATUS)],
          msg: 'Invalid incident status'
        }
      }
    },
    aiAnalysis: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'ai_analysis'
    },
    resolutionNote: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'resolution_note'
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'resolved_at'
    },
    resolvedByUserId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      field: 'resolved_by_user_id',
      validate: {
        isInt: { msg: 'Resolved by user ID must be an integer' }
      }
    }
  },
  {
    tableName: 'incidents',
    timestamps: true,
    underscored: true
  }
)

export default Incident
