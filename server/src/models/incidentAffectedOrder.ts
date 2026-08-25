import { DataTypes } from 'sequelize'
import sequelize from '../config/db.js'
import { RISK_LEVEL } from '../constants/orderConstants.js'

const IncidentAffectedOrder = sequelize.define(
  'IncidentAffectedOrder',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    incidentId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'incident_id',
      validate: {
        notNull: { msg: 'Incident ID is required' },
        isInt: { msg: 'Incident ID must be an integer' }
      }
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
    previousRiskLevel: {
      type: DataTypes.ENUM(...Object.values(RISK_LEVEL)),
      allowNull: true,
      field: 'previous_risk_level',
      validate: {
        isIn: {
          args: [Object.values(RISK_LEVEL)],
          msg: 'Invalid previous risk level'
        }
      }
    },
    calculatedRiskLevel: {
      type: DataTypes.ENUM(...Object.values(RISK_LEVEL)),
      allowNull: false,
      field: 'calculated_risk_level',
      validate: {
        notNull: { msg: 'Calculated risk level is required' },
        isIn: {
          args: [Object.values(RISK_LEVEL)],
          msg: 'Invalid calculated risk level'
        }
      }
    },
    estimatedImpactMinutes: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      field: 'estimated_impact_minutes',
      validate: {
        min: {
          args: [0],
          msg: 'Estimated impact must be greater than or equal to 0'
        }
      }
    },
    impactReason: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'impact_reason',
      validate: {
        len: {
          args: [1, 500],
          msg: 'Impact reason must be between 1 and 500 characters'
        }
      }
    }
  },
  {
    tableName: 'incident_affected_orders',
    timestamps: true,
    underscored: true
  }
)

export default IncidentAffectedOrder
