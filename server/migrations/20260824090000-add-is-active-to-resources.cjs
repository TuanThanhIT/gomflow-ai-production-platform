'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('resources', 'is_active', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    })

    await queryInterface.addIndex('resources', ['is_active'], {
      name: 'idx_resources_is_active'
    })
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('resources', 'idx_resources_is_active')
    await queryInterface.removeColumn('resources', 'is_active')
  }
}
