'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'notification_logs',
      {
        id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true
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
        channel: {
          type: Sequelize.ENUM('TELEGRAM'),
          allowNull: false,
          defaultValue: 'TELEGRAM'
        },
        notification_type: {
          type: Sequelize.ENUM('INCIDENT_ALERT', 'RISK_ALERT', 'PROGRESS_UPDATE', 'ORDER_COMPLETED'),
          allowNull: false
        },
        status: {
          type: Sequelize.ENUM('PENDING', 'SENT', 'FAILED'),
          allowNull: false,
          defaultValue: 'PENDING'
        },
        recipient: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        message: {
          type: Sequelize.TEXT,
          allowNull: false
        },
        payload: {
          type: Sequelize.JSON,
          allowNull: true
        },
        error_message: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        sent_at: {
          type: Sequelize.DATE,
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

    await queryInterface.addIndex('notification_logs', ['order_id'], { name: 'idx_notification_logs_order_id' })
    await queryInterface.addIndex('notification_logs', ['incident_id'], { name: 'idx_notification_logs_incident_id' })
    await queryInterface.addIndex('notification_logs', ['status'], { name: 'idx_notification_logs_status' })
    await queryInterface.addIndex('notification_logs', ['notification_type'], {
      name: 'idx_notification_logs_notification_type'
    })
    await queryInterface.addIndex('notification_logs', ['created_at'], { name: 'idx_notification_logs_created_at' })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('notification_logs')
  }
}
