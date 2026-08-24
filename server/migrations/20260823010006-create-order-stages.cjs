'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'order_stages',
      {
        id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true
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
        template_step_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: true,
          references: {
            model: 'process_template_steps',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        assigned_resource_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: true,
          references: {
            model: 'resources',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        started_by_user_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        completed_by_user_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        code: {
          type: Sequelize.STRING(50),
          allowNull: false
        },
        name: {
          type: Sequelize.STRING(120),
          allowNull: false
        },
        step_order: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false
        },
        status: {
          type: Sequelize.ENUM('WAITING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'FAILED'),
          allowNull: false,
          defaultValue: 'WAITING'
        },
        estimated_duration_minutes: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: true
        },
        expected_start_at: {
          type: Sequelize.DATE,
          allowNull: true
        },
        expected_end_at: {
          type: Sequelize.DATE,
          allowNull: true
        },
        started_at: {
          type: Sequelize.DATE,
          allowNull: true
        },
        completed_at: {
          type: Sequelize.DATE,
          allowNull: true
        },
        notes: {
          type: Sequelize.TEXT,
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

    await queryInterface.addConstraint('order_stages', {
      fields: ['order_id', 'step_order'],
      type: 'unique',
      name: 'uq_order_stages_order_step_order'
    })

    await queryInterface.addIndex('order_stages', ['order_id'], { name: 'idx_order_stages_order_id' })
    await queryInterface.addIndex('order_stages', ['status'], { name: 'idx_order_stages_status' })
    await queryInterface.addIndex('order_stages', ['assigned_resource_id'], {
      name: 'idx_order_stages_assigned_resource_id'
    })
    await queryInterface.addIndex('order_stages', ['order_id', 'status'], {
      name: 'idx_order_stages_order_status'
    })
    await queryInterface.addIndex('order_stages', ['order_id', 'step_order'], {
      name: 'idx_order_stages_order_step_order'
    })
    await queryInterface.addIndex('order_stages', ['assigned_resource_id', 'status'], {
      name: 'idx_order_stages_resource_status'
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('order_stages')
  }
}
