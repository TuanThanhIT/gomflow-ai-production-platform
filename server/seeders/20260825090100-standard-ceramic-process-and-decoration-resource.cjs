'use strict'

const template = {
  code: 'CERAMIC_STANDARD',
  name: 'Quy trình sản xuất gốm tiêu chuẩn',
  description: 'Quy trình chuẩn 7 công đoạn: tạo hình, sấy sửa, vẽ họa tiết, tráng men, nung, QC và đóng gói.',
  is_active: true
}

const stages = [
  {
    code: 'FORMING',
    name: 'Tạo hình mộc',
    step_order: 1,
    estimated_duration_minutes: 120,
    required_resource_type: 'FORMING',
    description: 'Tạo hình sản phẩm gốm mộc theo yêu cầu đơn hàng.'
  },
  {
    code: 'DRYING_REPAIR',
    name: 'Phơi sấy & Sửa mộc',
    step_order: 2,
    estimated_duration_minutes: 360,
    required_resource_type: 'DRYER',
    description: 'Phơi hoặc sấy sản phẩm và sửa mộc trước khi trang trí.'
  },
  {
    code: 'DECORATION',
    name: 'Vẽ họa tiết',
    step_order: 3,
    estimated_duration_minutes: 180,
    required_resource_type: 'DECORATION',
    description: 'Vẽ hoặc hoàn thiện họa tiết trên sản phẩm gốm.'
  },
  {
    code: 'GLAZING',
    name: 'Tráng men',
    step_order: 4,
    estimated_duration_minutes: 120,
    required_resource_type: 'GLAZING',
    description: 'Tráng men theo màu men và loại men đã xác nhận.'
  },
  {
    code: 'FIRING',
    name: 'Nung lò',
    step_order: 5,
    estimated_duration_minutes: 480,
    required_resource_type: 'KILN',
    description: 'Nung sản phẩm trong lò theo thông số sản xuất.'
  },
  {
    code: 'QUALITY_CHECK',
    name: 'Kiểm định chất lượng (QC)',
    step_order: 6,
    estimated_duration_minutes: 60,
    required_resource_type: 'QC',
    description: 'Kiểm tra chất lượng, lỗi men, nứt vỡ và độ hoàn thiện.'
  },
  {
    code: 'PACKAGING',
    name: 'Đóng gói',
    step_order: 7,
    estimated_duration_minutes: 60,
    required_resource_type: 'PACKAGING',
    description: 'Đóng gói sản phẩm đạt QC để bàn giao.'
  }
]

const upsertByCode = async (queryInterface, tableName, row, transaction) => {
  const [existingRows] = await queryInterface.sequelize.query(
    `SELECT id FROM ${tableName} WHERE code = :code LIMIT 1`,
    {
      replacements: { code: row.code },
      transaction
    }
  )
  const now = new Date()
  const existing = existingRows[0]

  if (existing) {
    await queryInterface.bulkUpdate(tableName, { ...row, updated_at: now }, { code: row.code }, { transaction })
    return existing.id
  }

  await queryInterface.bulkInsert(tableName, [{ ...row, created_at: now, updated_at: now }], { transaction })
  const [insertedRows] = await queryInterface.sequelize.query(
    `SELECT id FROM ${tableName} WHERE code = :code LIMIT 1`,
    {
      replacements: { code: row.code },
      transaction
    }
  )

  return insertedRows[0].id
}

const upsertResourceByCode = async (queryInterface, row, transaction) => {
  const [existingRows] = await queryInterface.sequelize.query('SELECT id FROM resources WHERE code = :code LIMIT 1', {
    replacements: { code: row.code },
    transaction
  })
  const now = new Date()

  if (existingRows[0]) {
    await queryInterface.bulkUpdate(
      'resources',
      {
        name: row.name,
        type: row.type,
        description: row.description,
        updated_at: now
      },
      { code: row.code },
      { transaction }
    )
    return existingRows[0].id
  }

  await queryInterface.bulkInsert('resources', [{ ...row, created_at: now, updated_at: now }], { transaction })
  return null
}

const upsertTemplateStep = async (queryInterface, processTemplateId, stage, transaction) => {
  const [existingRows] = await queryInterface.sequelize.query(
    'SELECT id FROM process_template_steps WHERE process_template_id = :processTemplateId AND code = :code LIMIT 1',
    {
      replacements: { processTemplateId, code: stage.code },
      transaction
    }
  )
  const now = new Date()
  const payload = {
    ...stage,
    process_template_id: processTemplateId,
    updated_at: now
  }

  if (existingRows[0]) {
    await queryInterface.bulkUpdate(
      'process_template_steps',
      payload,
      { process_template_id: processTemplateId, code: stage.code },
      { transaction }
    )
    return
  }

  await queryInterface.bulkInsert('process_template_steps', [{ ...payload, created_at: now }], { transaction })
}

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const templateId = await upsertByCode(queryInterface, 'process_templates', template, transaction)

      for (const stage of stages) {
        await upsertTemplateStep(queryInterface, templateId, stage, transaction)
      }

      await upsertResourceByCode(
        queryInterface,
        {
          code: 'DECORATION-01',
          name: 'Khu vẽ họa tiết 01',
          type: 'DECORATION',
          status: 'AVAILABLE',
          description: 'Khu vực vẽ và hoàn thiện họa tiết demo.'
        },
        transaction
      )
    })
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.bulkDelete('resources', { code: 'DECORATION-01' }, { transaction })

      const [templates] = await queryInterface.sequelize.query(
        "SELECT id FROM process_templates WHERE code = 'CERAMIC_STANDARD' LIMIT 1",
        { transaction }
      )

      if (templates[0]) {
        await queryInterface.bulkDelete(
          'process_template_steps',
          { process_template_id: templates[0].id },
          { transaction }
        )
        await queryInterface.bulkDelete('process_templates', { code: 'CERAMIC_STANDARD' }, { transaction })
      }
    })
  }
}
