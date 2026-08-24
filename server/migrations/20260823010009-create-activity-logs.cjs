'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'activity_logs',
      {
        id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true
        },
        actor_user_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        order_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: true,
          references: {
            model: 'orders',
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
        incident_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: true,
          references: {
            model: 'incidents',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        event_type: {
          type: Sequelize.STRING(80),
          allowNull: false
        },
        message: {
          type: Sequelize.STRING(500),
          allowNull: false
        },
        metadata: {
          type: Sequelize.JSON,
          allowNull: true
        },
        created_at: {
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

    await queryInterface.addIndex('activity_logs', ['actor_user_id'], { name: 'idx_activity_logs_actor_user_id' })
    await queryInterface.addIndex('activity_logs', ['order_id'], { name: 'idx_activity_logs_order_id' })
    await queryInterface.addIndex('activity_logs', ['order_stage_id'], { name: 'idx_activity_logs_order_stage_id' })
    await queryInterface.addIndex('activity_logs', ['incident_id'], { name: 'idx_activity_logs_incident_id' })
    await queryInterface.addIndex('activity_logs', ['event_type'], { name: 'idx_activity_logs_event_type' })
    await queryInterface.addIndex('activity_logs', ['created_at'], { name: 'idx_activity_logs_created_at' })
    await queryInterface.addIndex('activity_logs', ['order_id', 'created_at'], {
      name: 'idx_activity_logs_order_created_at'
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('activity_logs')
  }
}
