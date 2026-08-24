'use strict'

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const now = new Date()

      await queryInterface.bulkInsert(
        'resources',
        [
          {
            code: 'KILN-01',
            name: 'Lò nung 01',
            type: 'KILN',
            status: 'AVAILABLE',
            description: 'Lò nung demo 01.',
            created_at: now,
            updated_at: now
          },
          {
            code: 'KILN-02',
            name: 'Lò nung 02',
            type: 'KILN',
            status: 'AVAILABLE',
            description: 'Lò nung demo 02.',
            created_at: now,
            updated_at: now
          },
          {
            code: 'DRYER-01',
            name: 'Máy sấy 01',
            type: 'DRYER',
            status: 'AVAILABLE',
            description: 'Máy sấy demo 01.',
            created_at: now,
            updated_at: now
          },
          {
            code: 'FORMING-01',
            name: 'Khu tạo hình 01',
            type: 'FORMING',
            status: 'AVAILABLE',
            description: 'Khu tạo hình demo 01.',
            created_at: now,
            updated_at: now
          },
          {
            code: 'GLAZING-01',
            name: 'Khu tráng men 01',
            type: 'GLAZING',
            status: 'AVAILABLE',
            description: 'Khu tráng men demo 01.',
            created_at: now,
            updated_at: now
          },
          {
            code: 'QC-01',
            name: 'Khu kiểm tra chất lượng',
            type: 'QC',
            status: 'AVAILABLE',
            description: 'Khu kiểm tra chất lượng demo.',
            created_at: now,
            updated_at: now
          },
          {
            code: 'PACKAGING-01',
            name: 'Khu đóng gói',
            type: 'PACKAGING',
            status: 'AVAILABLE',
            description: 'Khu đóng gói demo.',
            created_at: now,
            updated_at: now
          }
        ],
        { transaction, ignoreDuplicates: true }
      )
    })
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('resources', {
      code: ['KILN-01', 'KILN-02', 'DRYER-01', 'FORMING-01', 'GLAZING-01', 'QC-01', 'PACKAGING-01']
    })
  }
}
