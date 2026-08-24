'use strict'

const getSeedContext = async (queryInterface, transaction) => {
  const [templates] = await queryInterface.sequelize.query(
    "SELECT id, code FROM process_templates WHERE code IN ('CERAMIC_SINGLE_FIRE', 'CERAMIC_DOUBLE_FIRE')",
    { transaction }
  )
  const [users] = await queryInterface.sequelize.query(
    "SELECT id, email FROM users WHERE email IN ('manager@gomflow.local', 'operator@gomflow.local')",
    { transaction }
  )

  return {
    templates: templates.reduce((map, template) => {
      map[template.code] = template.id
      return map
    }, {}),
    users: users.reduce((map, user) => {
      map[user.email] = user.id
      return map
    }, {})
  }
}

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const now = new Date()
      const { templates, users } = await getSeedContext(queryInterface, transaction)
      const managerId = users['manager@gomflow.local']
      const operatorId = users['operator@gomflow.local']

      await queryInterface.bulkInsert(
        'orders',
        [
          {
            code: 'GOM-000001',
            process_template_id: templates.CERAMIC_SINGLE_FIRE,
            created_by_user_id: managerId,
            customer_name: 'ABC Company',
            product_name: 'Ly gốm men xanh',
            quantity: 200,
            specifications: JSON.stringify({
              glazeColor: 'Xanh ngọc',
              capacityMl: 350,
              customization: 'Khắc logo ABC'
            }),
            raw_order_text: 'Khách ABC đặt 200 ly gốm men xanh ngọc 350ml, khắc logo công ty, giao ngày 28/08.',
            ai_analysis: JSON.stringify({
              customerName: 'ABC Company',
              productName: 'Ly gốm men xanh',
              quantity: 200,
              priority: 'HIGH'
            }),
            deadline: new Date('2026-08-28T10:00:00+07:00'),
            priority: 'HIGH',
            status: 'IN_PROGRESS',
            risk_level: 'NONE',
            progress_percent: 16.67,
            started_at: now,
            completed_at: null,
            created_at: now,
            updated_at: now
          },
          {
            code: 'GOM-000002',
            process_template_id: templates.CERAMIC_DOUBLE_FIRE,
            created_by_user_id: managerId,
            customer_name: 'Minh Long',
            product_name: 'Bình hoa men trắng',
            quantity: 100,
            specifications: JSON.stringify({
              glazeColor: 'Trắng',
              heightCm: 40,
              diameterCm: 25,
              shape: 'Bình cổ cao'
            }),
            raw_order_text: 'Minh Long đặt 100 bình hoa men trắng, dáng bình cổ cao.',
            ai_analysis: JSON.stringify({
              customerName: 'Minh Long',
              productName: 'Bình hoa men trắng',
              quantity: 100,
              priority: 'NORMAL'
            }),
            deadline: new Date('2026-09-02T17:00:00+07:00'),
            priority: 'NORMAL',
            status: 'PENDING',
            risk_level: 'NONE',
            progress_percent: 0,
            started_at: null,
            completed_at: null,
            created_at: now,
            updated_at: now
          },
          {
            code: 'GOM-000003',
            process_template_id: templates.CERAMIC_SINGLE_FIRE,
            created_by_user_id: operatorId,
            customer_name: 'Sun Coffee',
            product_name: 'Ly cafe gốm',
            quantity: 500,
            specifications: JSON.stringify({
              glazeColor: 'Nâu đất',
              capacityMl: 250,
              customization: 'In logo Sun Coffee'
            }),
            raw_order_text: 'Sun Coffee đặt 500 ly cafe gốm in logo, đơn gấp.',
            ai_analysis: JSON.stringify({
              customerName: 'Sun Coffee',
              productName: 'Ly cafe gốm',
              quantity: 500,
              priority: 'URGENT'
            }),
            deadline: new Date('2026-08-26T17:00:00+07:00'),
            priority: 'URGENT',
            status: 'AT_RISK',
            risk_level: 'HIGH',
            progress_percent: 33.33,
            started_at: now,
            completed_at: null,
            created_at: now,
            updated_at: now
          },
          {
            code: 'GOM-000004',
            process_template_id: templates.CERAMIC_SINGLE_FIRE,
            created_by_user_id: managerId,
            customer_name: 'Demo Customer',
            product_name: 'Chén gốm',
            quantity: 300,
            specifications: JSON.stringify({
              glazeColor: 'Xanh rêu',
              diameterCm: 12
            }),
            raw_order_text: 'Demo Customer đặt 300 chén gốm xanh rêu.',
            ai_analysis: JSON.stringify({
              customerName: 'Demo Customer',
              productName: 'Chén gốm',
              quantity: 300,
              priority: 'NORMAL'
            }),
            deadline: new Date('2026-08-24T17:00:00+07:00'),
            priority: 'NORMAL',
            status: 'COMPLETED',
            risk_level: 'NONE',
            progress_percent: 100,
            started_at: new Date('2026-08-20T08:00:00+07:00'),
            completed_at: now,
            created_at: now,
            updated_at: now
          }
        ],
        { transaction, ignoreDuplicates: true }
      )

      const [orders] = await queryInterface.sequelize.query(
        "SELECT id, code FROM orders WHERE code IN ('GOM-000001', 'GOM-000002', 'GOM-000003', 'GOM-000004')",
        { transaction }
      )
      const orderIds = orders.reduce((map, order) => {
        map[order.code] = order.id
        return map
      }, {})

      const [existingSeedLogs] = await queryInterface.sequelize.query(
        `SELECT id FROM activity_logs
         WHERE event_type = 'ORDER_CREATED'
         AND message IN (
           'Order GOM-000001 created from demo seed.',
           'Order GOM-000002 created from demo seed.',
           'Order GOM-000003 created from demo seed.',
           'Order GOM-000004 created from demo seed.'
         )
         LIMIT 1`,
        { transaction }
      )

      if (existingSeedLogs.length === 0) {
        await queryInterface.bulkInsert(
          'activity_logs',
          Object.entries(orderIds).map(([code, id]) => ({
            actor_user_id: code === 'GOM-000003' ? operatorId : managerId,
            order_id: id,
            order_stage_id: null,
            incident_id: null,
            event_type: 'ORDER_CREATED',
            message: `Order ${code} created from demo seed.`,
            metadata: JSON.stringify({ source: 'seed' }),
            created_at: now
          })),
          { transaction }
        )
      }
    })
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const [orders] = await queryInterface.sequelize.query(
        "SELECT id FROM orders WHERE code IN ('GOM-000001', 'GOM-000002', 'GOM-000003', 'GOM-000004')",
        { transaction }
      )
      const orderIds = orders.map((order) => order.id)

      if (orderIds.length > 0) {
        await queryInterface.bulkDelete(
          'activity_logs',
          {
            order_id: orderIds
          },
          { transaction }
        )
      }

      await queryInterface.bulkDelete(
        'orders',
        {
          code: ['GOM-000001', 'GOM-000002', 'GOM-000003', 'GOM-000004']
        },
        { transaction }
      )
    })
  }
}
