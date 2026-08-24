'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'process_template_steps',
      {
        id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true
        },
        process_template_id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          references: {
            model: 'process_templates',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
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
        estimated_duration_minutes: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: true
        },
        required_resource_type: {
          type: Sequelize.STRING(50),
          allowNull: true
        },
        description: {
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

    await queryInterface.addConstraint('process_template_steps', {
      fields: ['process_template_id', 'step_order'],
      type: 'unique',
      name: 'uq_process_template_steps_template_order'
    })

    await queryInterface.addConstraint('process_template_steps', {
      fields: ['process_template_id', 'code'],
      type: 'unique',
      name: 'uq_process_template_steps_template_code'
    })

    await queryInterface.addIndex('process_template_steps', ['process_template_id'], {
      name: 'idx_process_template_steps_template_id'
    })
    await queryInterface.addIndex('process_template_steps', ['process_template_id', 'step_order'], {
      name: 'idx_process_template_steps_template_order'
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('process_template_steps')
  }
}
