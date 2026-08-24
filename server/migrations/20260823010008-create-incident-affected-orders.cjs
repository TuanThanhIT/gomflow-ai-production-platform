'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'incident_affected_orders',
      {
        id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true
        },
        incident_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          references: {
            model: 'incidents',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        order_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          references: {
            model: 'orders',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        previous_risk_level: {
          type: Sequelize.ENUM('NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
          allowNull: true
        },
        calculated_risk_level: {
          type: Sequelize.ENUM('NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
          allowNull: false
        },
        estimated_impact_minutes: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: true
        },
        impact_reason: {
          type: Sequelize.STRING(500),
          allowNull: true
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false
        }
      },
      {
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
        engine: 'InnoDB'
      }
    )

    await queryInterface.addConstraint('incident_affected_orders', {
      fields: ['incident_id', 'order_id'],
      type: 'unique',
      name: 'uq_incident_affected_orders_incident_order'
    })

    await queryInterface.addIndex('incident_affected_orders', ['incident_id'], {
      name: 'idx_incident_affected_orders_incident_id'
    })
    await queryInterface.addIndex('incident_affected_orders', ['order_id'], {
      name: 'idx_incident_affected_orders_order_id'
    })
    await queryInterface.addIndex('incident_affected_orders', ['calculated_risk_level'], {
      name: 'idx_incident_affected_orders_calculated_risk_level'
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('incident_affected_orders')
  }
}
