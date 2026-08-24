'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'orders',
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
        process_template_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: true,
          references: {
            model: 'process_templates',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        created_by_user_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        customer_name: {
          type: Sequelize.STRING(150),
          allowNull: false
        },
        product_name: {
          type: Sequelize.STRING(150),
          allowNull: false
        },
        quantity: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false
        },
        specifications: {
          type: Sequelize.JSON,
          allowNull: true
        },
        raw_order_text: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        ai_analysis: {
          type: Sequelize.JSON,
          allowNull: true
        },
        deadline: {
          type: Sequelize.DATE,
          allowNull: false
        },
        priority: {
          type: Sequelize.ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT'),
          allowNull: false,
          defaultValue: 'NORMAL'
        },
        status: {
          type: Sequelize.ENUM('PENDING', 'IN_PROGRESS', 'AT_RISK', 'COMPLETED', 'CANCELLED'),
          allowNull: false,
          defaultValue: 'PENDING'
        },
        risk_level: {
          type: Sequelize.ENUM('NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
          allowNull: false,
          defaultValue: 'NONE'
        },
        progress_percent: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 0
        },
        started_at: {
          type: Sequelize.DATE,
          allowNull: true
        },
        completed_at: {
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

    await queryInterface.addIndex('orders', ['status'], { name: 'idx_orders_status' })
    await queryInterface.addIndex('orders', ['risk_level'], { name: 'idx_orders_risk_level' })
    await queryInterface.addIndex('orders', ['priority'], { name: 'idx_orders_priority' })
    await queryInterface.addIndex('orders', ['deadline'], { name: 'idx_orders_deadline' })
    await queryInterface.addIndex('orders', ['process_template_id'], { name: 'idx_orders_process_template_id' })
    await queryInterface.addIndex('orders', ['created_by_user_id'], { name: 'idx_orders_created_by_user_id' })
    await queryInterface.addIndex('orders', ['status', 'deadline'], { name: 'idx_orders_status_deadline' })
    await queryInterface.addIndex('orders', ['status', 'risk_level'], { name: 'idx_orders_status_risk_level' })

    await queryInterface.addConstraint('orders', {
      fields: ['quantity'],
      type: 'check',
      where: {
        quantity: {
          [Sequelize.Op.gt]: 0
        }
      },
      name: 'chk_orders_quantity_positive'
    })

    await queryInterface.addConstraint('orders', {
      fields: ['progress_percent'],
      type: 'check',
      where: {
        progress_percent: {
          [Sequelize.Op.gte]: 0,
          [Sequelize.Op.lte]: 100
        }
      },
      name: 'chk_orders_progress_percent_range'
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('orders')
  }
}
