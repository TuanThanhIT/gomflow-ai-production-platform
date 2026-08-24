'use strict'

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const now = new Date()

      await queryInterface.bulkInsert(
        'process_templates',
        [
          {
            code: 'CERAMIC_SINGLE_FIRE',
            name: 'Quy trình gốm tiêu chuẩn - nung một lần',
            description: 'Quy trình demo cho sản phẩm gốm nung một lần.',
            is_active: true,
            created_at: now,
            updated_at: now
          },
          {
            code: 'CERAMIC_DOUBLE_FIRE',
            name: 'Quy trình nung mộc và nung men',
            description: 'Quy trình demo gồm nung mộc, tráng men và nung men.',
            is_active: true,
            created_at: now,
            updated_at: now
          }
        ],
        { transaction, ignoreDuplicates: true }
      )
    })
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('process_templates', {
      code: ['CERAMIC_SINGLE_FIRE', 'CERAMIC_DOUBLE_FIRE']
    })
  }
}
