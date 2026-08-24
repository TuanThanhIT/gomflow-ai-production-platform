'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('resources', 'type', {
      type: Sequelize.ENUM('KILN', 'DRYER', 'FORMING', 'DECORATION', 'GLAZING', 'QC', 'PACKAGING', 'OTHER'),
      allowNull: false
    })

    await queryInterface.changeColumn('notification_logs', 'notification_type', {
      type: Sequelize.ENUM('INCIDENT_ALERT', 'RISK_ALERT', 'STAGE_COMPLETED', 'PROGRESS_UPDATE', 'ORDER_COMPLETED'),
      allowNull: false
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.bulkUpdate('resources', { type: 'OTHER' }, { type: 'DECORATION' }, { transaction })
      await queryInterface.bulkUpdate(
        'notification_logs',
        { notification_type: 'PROGRESS_UPDATE' },
        { notification_type: 'STAGE_COMPLETED' },
        { transaction }
      )

      await queryInterface.changeColumn(
        'resources',
        'type',
        {
          type: Sequelize.ENUM('KILN', 'DRYER', 'FORMING', 'GLAZING', 'QC', 'PACKAGING', 'OTHER'),
          allowNull: false
        },
        { transaction }
      )

      await queryInterface.changeColumn(
        'notification_logs',
        'notification_type',
        {
          type: Sequelize.ENUM('INCIDENT_ALERT', 'RISK_ALERT', 'PROGRESS_UPDATE', 'ORDER_COMPLETED'),
          allowNull: false
        },
        { transaction }
      )
    })
  }
}
