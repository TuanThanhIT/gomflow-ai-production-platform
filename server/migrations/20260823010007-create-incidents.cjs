'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'incidents',
      {
        id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true
        },
        code: {
          type: Sequelize.STRING(30),
          allowNull: false,
          unique: true
        },
        resource_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: true,
          references: {
            model: 'resources',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        order_stage_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: true,
          references: {
            model: 'order_stages',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        reported_by_user_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        raw_description: {
          type: Sequelize.TEXT,
          allowNull: false
        },
        type: {
          type: Sequelize.ENUM(
            'EQUIPMENT_FAILURE',
            'MATERIAL_SHORTAGE',
            'QUALITY_ISSUE',
            'PROCESS_DELAY',
            'ORDER_CHANGE',
            'OTHER'
          ),
          allowNull: false,
          defaultValue: 'OTHER'
        },
        severity: {
          type: Sequelize.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
          allowNull: false,
          defaultValue: 'LOW'
        },
        estimated_delay_minutes: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: true
        },
        status: {
          type: Sequelize.ENUM('OPEN', 'RESOLVED'),
          allowNull: false,
          defaultValue: 'OPEN'
        },
        ai_analysis: {
          type: Sequelize.JSON,
          allowNull: true
        },
        resolution_note: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        resolved_at: {
          type: Sequelize.DATE,
          allowNull: true
        },
        resolved_by_user_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
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

    await queryInterface.addIndex('incidents', ['status'], { name: 'idx_incidents_status' })
    await queryInterface.addIndex('incidents', ['severity'], { name: 'idx_incidents_severity' })
    await queryInterface.addIndex('incidents', ['type'], { name: 'idx_incidents_type' })
    await queryInterface.addIndex('incidents', ['resource_id'], { name: 'idx_incidents_resource_id' })
    await queryInterface.addIndex('incidents', ['order_stage_id'], { name: 'idx_incidents_order_stage_id' })
    await queryInterface.addIndex('incidents', ['created_at'], { name: 'idx_incidents_created_at' })
    await queryInterface.addIndex('incidents', ['status', 'severity'], { name: 'idx_incidents_status_severity' })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('incidents')
  }
}
