'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'resources',
      {
        id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true
        },
        code: {
          type: Sequelize.STRING(50),
          allowNull: false,
          unique: true
        },
        name: {
          type: Sequelize.STRING(150),
          allowNull: false
        },
        type: {
          type: Sequelize.ENUM('KILN', 'DRYER', 'FORMING', 'GLAZING', 'QC', 'PACKAGING', 'OTHER'),
          allowNull: false
        },
        status: {
          type: Sequelize.ENUM('AVAILABLE', 'IN_USE', 'MAINTENANCE', 'BROKEN'),
          allowNull: false,
          defaultValue: 'AVAILABLE'
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

    await queryInterface.addIndex('resources', ['type'], { name: 'idx_resources_type' })
    await queryInterface.addIndex('resources', ['status'], { name: 'idx_resources_status' })
    await queryInterface.addIndex('resources', ['type', 'status'], { name: 'idx_resources_type_status' })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('resources')
  }
}
