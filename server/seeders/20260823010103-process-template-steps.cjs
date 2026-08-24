'use strict'

const getTemplateIdsByCode = async (queryInterface, transaction) => {
  const [templates] = await queryInterface.sequelize.query(
    "SELECT id, code FROM process_templates WHERE code IN ('CERAMIC_SINGLE_FIRE', 'CERAMIC_DOUBLE_FIRE')",
    { transaction }
  )

  return templates.reduce((map, template) => {
    map[template.code] = template.id
    return map
  }, {})
}

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const now = new Date()
      const templateIds = await getTemplateIdsByCode(queryInterface, transaction)

      await queryInterface.bulkInsert(
        'process_template_steps',
        [
          {
            process_template_id: templateIds.CERAMIC_SINGLE_FIRE,
            code: 'FORMING',
            name: 'Tạo hình',
            step_order: 1,
            estimated_duration_minutes: 120,
            required_resource_type: 'FORMING',
            description: 'Tạo hình sản phẩm gốm theo yêu cầu đơn hàng.',
            created_at: now,
            updated_at: now
          },
          {
            process_template_id: templateIds.CERAMIC_SINGLE_FIRE,
            code: 'DRYING',
            name: 'Phơi / Sấy',
            step_order: 2,
            estimated_duration_minutes: 360,
            required_resource_type: 'DRYER',
            description: 'Phơi hoặc sấy sản phẩm trước khi tráng men.',
            created_at: now,
            updated_at: now
          },
          {
            process_template_id: templateIds.CERAMIC_SINGLE_FIRE,
            code: 'GLAZING',
            name: 'Tráng men',
            step_order: 3,
            estimated_duration_minutes: 120,
            required_resource_type: 'GLAZING',
            description: 'Tráng men theo thông số màu sắc và hoàn thiện.',
            created_at: now,
            updated_at: now
          },
          {
            process_template_id: templateIds.CERAMIC_SINGLE_FIRE,
            code: 'FIRING',
            name: 'Nung',
            step_order: 4,
            estimated_duration_minutes: 480,
            required_resource_type: 'KILN',
            description: 'Nung sản phẩm trong lò.',
            created_at: now,
            updated_at: now
          },
          {
            process_template_id: templateIds.CERAMIC_SINGLE_FIRE,
            code: 'QUALITY_CHECK',
            name: 'Kiểm tra chất lượng',
            step_order: 5,
            estimated_duration_minutes: 60,
            required_resource_type: 'QC',
            description: 'Kiểm tra lỗi, độ hoàn thiện và tiêu chuẩn chất lượng.',
            created_at: now,
            updated_at: now
          },
          {
            process_template_id: templateIds.CERAMIC_SINGLE_FIRE,
            code: 'PACKAGING',
            name: 'Đóng gói',
            step_order: 6,
            estimated_duration_minutes: 60,
            required_resource_type: 'PACKAGING',
            description: 'Đóng gói sản phẩm sau khi đạt kiểm tra chất lượng.',
            created_at: now,
            updated_at: now
          },
          {
            process_template_id: templateIds.CERAMIC_DOUBLE_FIRE,
            code: 'FORMING',
            name: 'Tạo hình',
            step_order: 1,
            estimated_duration_minutes: 120,
            required_resource_type: 'FORMING',
            description: 'Tạo hình sản phẩm gốm trước khi phơi hoặc sấy.',
            created_at: now,
            updated_at: now
          },
          {
            process_template_id: templateIds.CERAMIC_DOUBLE_FIRE,
            code: 'DRYING',
            name: 'Phơi / Sấy',
            step_order: 2,
            estimated_duration_minutes: 360,
            required_resource_type: 'DRYER',
            description: 'Phơi hoặc sấy sản phẩm trước khi nung mộc.',
            created_at: now,
            updated_at: now
          },
          {
            process_template_id: templateIds.CERAMIC_DOUBLE_FIRE,
            code: 'BISQUE_FIRING',
            name: 'Nung mộc',
            step_order: 3,
            estimated_duration_minutes: 420,
            required_resource_type: 'KILN',
            description: 'Nung mộc trước khi tráng men.',
            created_at: now,
            updated_at: now
          },
          {
            process_template_id: templateIds.CERAMIC_DOUBLE_FIRE,
            code: 'GLAZING',
            name: 'Tráng men',
            step_order: 4,
            estimated_duration_minutes: 120,
            required_resource_type: 'GLAZING',
            description: 'Tráng men sau nung mộc.',
            created_at: now,
            updated_at: now
          },
          {
            process_template_id: templateIds.CERAMIC_DOUBLE_FIRE,
            code: 'GLAZE_FIRING',
            name: 'Nung men',
            step_order: 5,
            estimated_duration_minutes: 480,
            required_resource_type: 'KILN',
            description: 'Nung men hoàn thiện sản phẩm.',
            created_at: now,
            updated_at: now
          },
          {
            process_template_id: templateIds.CERAMIC_DOUBLE_FIRE,
            code: 'QUALITY_CHECK',
            name: 'Kiểm tra chất lượng',
            step_order: 6,
            estimated_duration_minutes: 60,
            required_resource_type: 'QC',
            description: 'Kiểm tra sản phẩm sau nung men.',
            created_at: now,
            updated_at: now
          },
          {
            process_template_id: templateIds.CERAMIC_DOUBLE_FIRE,
            code: 'PACKAGING',
            name: 'Đóng gói',
            step_order: 7,
            estimated_duration_minutes: 60,
            required_resource_type: 'PACKAGING',
            description: 'Đóng gói sản phẩm hoàn thiện.',
            created_at: now,
            updated_at: now
          }
        ],
        { transaction, ignoreDuplicates: true }
      )
    })
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const templateIds = await getTemplateIdsByCode(queryInterface, transaction)

      await queryInterface.bulkDelete(
        'process_template_steps',
        {
          process_template_id: Object.values(templateIds)
        },
        { transaction }
      )
    })
  }
}
