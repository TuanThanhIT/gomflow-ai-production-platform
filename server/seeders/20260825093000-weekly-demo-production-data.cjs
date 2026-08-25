'use strict'

const DEMO_ORDER_CODES = [
  'GOM-000001',
  'GOM-000002',
  'GOM-000003',
  'GOM-000004',
  'GOM-000005',
  'GOM-000006',
  'GOM-000007'
]

const DEMO_INCIDENT_CODES = ['INC-000001', 'INC-000002', 'INC-000003']

const resources = [
  ['FORMING-01', 'Khu tạo hình 01', 'FORMING'],
  ['FORMING-02', 'Khu tạo hình 02', 'FORMING'],
  ['DRYER-01', 'Máy sấy 01', 'DRYER'],
  ['DRYER-02', 'Máy sấy 02', 'DRYER'],
  ['DECORATION-01', 'Khu vẽ họa tiết 01', 'DECORATION'],
  ['DECORATION-02', 'Khu vẽ họa tiết 02', 'DECORATION'],
  ['GLAZING-01', 'Khu tráng men 01', 'GLAZING'],
  ['GLAZING-02', 'Khu tráng men 02', 'GLAZING'],
  ['KILN-01', 'Lò nung 01', 'KILN'],
  ['KILN-02', 'Lò nung 02', 'KILN'],
  ['QC-01', 'Khu kiểm tra chất lượng 01', 'QC'],
  ['QC-02', 'Khu kiểm tra chất lượng 02', 'QC'],
  ['PACKAGING-01', 'Khu đóng gói 01', 'PACKAGING'],
  ['PACKAGING-02', 'Khu đóng gói 02', 'PACKAGING']
]

const orders = [
  {
    code: 'GOM-000001',
    templateCode: 'CERAMIC_SINGLE_FIRE',
    customerName: 'Aurora Cafe',
    productName: 'Ly gốm uống cà phê',
    quantity: 180,
    priority: 'NORMAL',
    completedDaysAgo: 6,
    specifications: { glazeColor: 'Trắng ngà', capacityMl: 250, customization: 'Logo Aurora' }
  },
  {
    code: 'GOM-000002',
    templateCode: 'CERAMIC_DOUBLE_FIRE',
    customerName: 'Maison Decor',
    productName: 'Bình hoa men trắng',
    quantity: 80,
    priority: 'HIGH',
    completedDaysAgo: 5,
    specifications: { glazeColor: 'Trắng bóng', heightCm: 36, shape: 'Bình cổ cao' }
  },
  {
    code: 'GOM-000003',
    templateCode: 'CERAMIC_SINGLE_FIRE',
    customerName: 'Sun Coffee',
    productName: 'Tách espresso gốm',
    quantity: 320,
    priority: 'URGENT',
    completedDaysAgo: 4,
    specifications: { glazeColor: 'Nâu đất', capacityMl: 90, customization: 'In logo Sun Coffee' }
  },
  {
    code: 'GOM-000004',
    templateCode: 'CERAMIC_SINGLE_FIRE',
    customerName: 'Lotus Home',
    productName: 'Chén gốm men xanh',
    quantity: 240,
    priority: 'NORMAL',
    completedDaysAgo: 3,
    specifications: { glazeColor: 'Xanh rêu', diameterCm: 12 }
  },
  {
    code: 'GOM-000005',
    templateCode: 'CERAMIC_DOUBLE_FIRE',
    customerName: 'Bếp Nhà Mây',
    productName: 'Bộ đĩa gốm thủ công',
    quantity: 120,
    priority: 'HIGH',
    completedDaysAgo: 2,
    specifications: { glazeColor: 'Xanh ngọc', diameterCm: 22, setSize: 4 }
  },
  {
    code: 'GOM-000006',
    templateCode: 'CERAMIC_SINGLE_FIRE',
    customerName: 'An Nhiên Studio',
    productName: 'Bát gốm men tro',
    quantity: 150,
    priority: 'NORMAL',
    completedDaysAgo: 1,
    specifications: { glazeColor: 'Men tro', diameterCm: 15 }
  },
  {
    code: 'GOM-000007',
    templateCode: 'CERAMIC_SINGLE_FIRE',
    customerName: 'Đơn test GomFlow',
    productName: 'Ly gốm test Telegram',
    quantity: 24,
    priority: 'NORMAL',
    completedDaysAgo: null,
    specifications: { glazeColor: 'Trắng', capacityMl: 300, note: 'Đơn mới để test bắt đầu sản xuất' }
  }
]

const incidents = [
  {
    code: 'INC-000001',
    orderCode: 'GOM-000002',
    stageCode: 'BISQUE_FIRING',
    resourceCode: 'KILN-02',
    type: 'EQUIPMENT_FAILURE',
    severity: 'CRITICAL',
    delay: 360,
    createdDaysAgo: 5,
    resolvedDaysAgo: 4,
    description: 'Lò nung KILN-02 lỗi bộ điều khiển nhiệt trong ca nung mộc, cần dừng để kiểm tra.'
  },
  {
    code: 'INC-000002',
    orderCode: 'GOM-000004',
    stageCode: 'QUALITY_CHECK',
    resourceCode: 'QC-01',
    type: 'QUALITY_ISSUE',
    severity: 'HIGH',
    delay: 180,
    createdDaysAgo: 3,
    resolvedDaysAgo: 2,
    description: 'Phát hiện một lô chén có vết nứt men sau nung, cần kiểm tra phân loại lại.'
  },
  {
    code: 'INC-000003',
    orderCode: 'GOM-000006',
    stageCode: 'GLAZING',
    resourceCode: 'GLAZING-02',
    type: 'MATERIAL_SHORTAGE',
    severity: 'MEDIUM',
    delay: 90,
    createdDaysAgo: 1,
    resolvedDaysAgo: 1,
    description: 'Thiếu men tro trong quá trình tráng men, đã bổ sung vật tư trong ngày.'
  }
]

const getRowsByField = (rows, field) =>
  rows.reduce((map, row) => {
    map[row[field]] = row
    return map
  }, {})

const daysAgo = (days, hour = 8, minute = 0) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(hour, minute, 0, 0)
  return date
}

const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60 * 1000)

const upsertResource = async (queryInterface, [code, name, type], transaction) => {
  const now = new Date()
  const [existingRows] = await queryInterface.sequelize.query('SELECT id FROM resources WHERE code = :code LIMIT 1', {
    replacements: { code },
    transaction
  })

  const payload = {
    code,
    name,
    type,
    status: 'AVAILABLE',
    description: `${name} dùng cho dữ liệu demo GomFlow.`,
    updated_at: now
  }

  if (existingRows[0]) {
    await queryInterface.bulkUpdate('resources', payload, { code }, { transaction })
    return
  }

  await queryInterface.bulkInsert('resources', [{ ...payload, created_at: now }], { transaction })
}

const cleanDemoData = async (queryInterface, transaction) => {
  const [demoOrders] = await queryInterface.sequelize.query('SELECT id FROM orders WHERE code IN (:codes)', {
    replacements: { codes: DEMO_ORDER_CODES },
    transaction
  })
  const [demoIncidents] = await queryInterface.sequelize.query('SELECT id FROM incidents WHERE code IN (:codes)', {
    replacements: { codes: DEMO_INCIDENT_CODES },
    transaction
  })
  const orderIds = demoOrders.map((order) => order.id)
  const incidentIds = demoIncidents.map((incident) => incident.id)

  if (orderIds.length > 0 || incidentIds.length > 0) {
    const clauses = []
    const replacements = {}

    if (orderIds.length > 0) {
      clauses.push('order_id IN (:orderIds)')
      replacements.orderIds = orderIds
    }

    if (incidentIds.length > 0) {
      clauses.push('incident_id IN (:incidentIds)')
      replacements.incidentIds = incidentIds
    }

    await queryInterface.sequelize.query(`DELETE FROM notification_logs WHERE ${clauses.join(' OR ')}`, {
      replacements,
      transaction
    })
  }

  if (orderIds.length > 0) {
    await queryInterface.bulkDelete('activity_logs', { order_id: orderIds }, { transaction })
    await queryInterface.bulkDelete('incident_affected_orders', { order_id: orderIds }, { transaction })
    await queryInterface.bulkDelete('order_stages', { order_id: orderIds }, { transaction })
    await queryInterface.bulkDelete('orders', { id: orderIds }, { transaction })
  }

  if (incidentIds.length > 0) {
    await queryInterface.bulkDelete('activity_logs', { incident_id: incidentIds }, { transaction })
    await queryInterface.bulkDelete('incident_affected_orders', { incident_id: incidentIds }, { transaction })
    await queryInterface.bulkDelete('incidents', { id: incidentIds }, { transaction })
  }
}

const buildAiAnalysis = (order) => ({
  customerName: order.customerName,
  productName: order.productName,
  quantity: order.quantity,
  priority: order.priority,
  manufacturingEstimate: {
    estimatedFiringTemperatureC: 1240,
    estimatedFiringDurationMinutes: order.templateCode === 'CERAMIC_DOUBLE_FIRE' ? 960 : 480
  }
})

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      for (const resource of resources) {
        await upsertResource(queryInterface, resource, transaction)
      }

      await cleanDemoData(queryInterface, transaction)

      const [templates] = await queryInterface.sequelize.query(
        "SELECT id, code FROM process_templates WHERE code IN ('CERAMIC_SINGLE_FIRE', 'CERAMIC_DOUBLE_FIRE')",
        { transaction }
      )
      const [users] = await queryInterface.sequelize.query(
        "SELECT id, email FROM users WHERE email IN ('manager@ceramiops.local', 'operator@ceramiops.local')",
        { transaction }
      )
      const [steps] = await queryInterface.sequelize.query(
        `SELECT id, process_template_id, code, name, step_order, estimated_duration_minutes, required_resource_type
         FROM process_template_steps
         ORDER BY process_template_id, step_order`,
        { transaction }
      )
      const [resourceRows] = await queryInterface.sequelize.query('SELECT id, code, type FROM resources', {
        transaction
      })

      const templatesByCode = getRowsByField(templates, 'code')
      const usersByEmail = getRowsByField(users, 'email')
      const resourcesByCode = getRowsByField(resourceRows, 'code')
      const managerId = usersByEmail['manager@ceramiops.local']?.id
      const operatorId = usersByEmail['operator@ceramiops.local']?.id
      const now = new Date()

      await queryInterface.bulkInsert(
        'orders',
        orders.map((order, index) => {
          const completedAt = order.completedDaysAgo ? daysAgo(order.completedDaysAgo, 16, 30) : null
          const startedAt = completedAt ? daysAgo(order.completedDaysAgo, 8, 0) : null

          return {
            code: order.code,
            process_template_id: templatesByCode[order.templateCode]?.id,
            created_by_user_id: index === 2 ? operatorId : managerId,
            customer_name: order.customerName,
            product_name: order.productName,
            quantity: order.quantity,
            specifications: JSON.stringify(order.specifications),
            raw_order_text: `${order.customerName} đặt ${order.quantity} ${order.productName}.`,
            ai_analysis: JSON.stringify(buildAiAnalysis(order)),
            deadline: order.completedDaysAgo ? addMinutes(completedAt, 24 * 60) : daysAgo(-7, 17, 0),
            priority: order.priority,
            status: order.completedDaysAgo ? 'COMPLETED' : 'PENDING',
            risk_level: 'NONE',
            progress_percent: order.completedDaysAgo ? 100 : 0,
            started_at: startedAt,
            completed_at: completedAt,
            created_at: order.completedDaysAgo ? daysAgo(order.completedDaysAgo + 1, 9, 0) : now,
            updated_at: completedAt ?? now
          }
        }),
        { transaction }
      )

      const [orderRows] = await queryInterface.sequelize.query(
        'SELECT id, code, process_template_id FROM orders WHERE code IN (:codes)',
        {
          replacements: { codes: DEMO_ORDER_CODES },
          transaction
        }
      )
      const ordersByCode = getRowsByField(orderRows, 'code')
      const stages = []

      for (const [orderIndex, order] of orders.entries()) {
        const orderRow = ordersByCode[order.code]
        const orderSteps = steps.filter((step) => step.process_template_id === orderRow.process_template_id)
        const isCompleted = Boolean(order.completedDaysAgo)
        const startAt = isCompleted ? daysAgo(order.completedDaysAgo, 8, 0) : null
        let cursor = startAt

        for (const step of orderSteps) {
          const resourceSuffix = orderIndex % 2 === 0 ? '01' : '02'
          const resourceCode = step.required_resource_type ? `${step.required_resource_type}-${resourceSuffix}` : null
          const startedAt = isCompleted && cursor ? new Date(cursor) : null
          const completedAt =
            isCompleted && cursor ? addMinutes(cursor, Math.min(step.estimated_duration_minutes ?? 60, 120)) : null
          if (completedAt) cursor = addMinutes(completedAt, 20)

          stages.push({
            order_id: orderRow.id,
            template_step_id: step.id,
            assigned_resource_id: resourceCode ? resourcesByCode[resourceCode]?.id : null,
            started_by_user_id: isCompleted ? operatorId : null,
            completed_by_user_id: isCompleted ? operatorId : null,
            code: step.code,
            name: step.name,
            step_order: step.step_order,
            status: isCompleted ? 'COMPLETED' : 'WAITING',
            estimated_duration_minutes: step.estimated_duration_minutes,
            expected_start_at: startedAt,
            expected_end_at: completedAt,
            started_at: startedAt,
            completed_at: completedAt,
            notes:
              order.code === 'GOM-000007' && step.step_order === 1
                ? 'Đã gán tài nguyên để test bắt đầu sản xuất.'
                : null,
            created_at: isCompleted ? daysAgo(order.completedDaysAgo + 1, 9, 10) : now,
            updated_at: completedAt ?? now
          })
        }
      }

      await queryInterface.bulkInsert('order_stages', stages, { transaction })

      const [stageRows] = await queryInterface.sequelize.query(
        `SELECT os.id, os.order_id, os.code, os.step_order, os.status, os.started_at, os.completed_at, o.code AS order_code
         FROM order_stages os
         INNER JOIN orders o ON o.id = os.order_id
         WHERE o.code IN (:codes)
         ORDER BY o.code, os.step_order`,
        { replacements: { codes: DEMO_ORDER_CODES }, transaction }
      )
      const stageByOrderAndCode = stageRows.reduce((map, stage) => {
        map[`${stage.order_code}:${stage.code}`] = stage
        return map
      }, {})

      await queryInterface.bulkInsert(
        'activity_logs',
        orders.flatMap((order) => {
          const orderRow = ordersByCode[order.code]
          const orderStages = stageRows.filter((stage) => stage.order_code === order.code)
          const createdAt = order.completedDaysAgo ? daysAgo(order.completedDaysAgo + 1, 9, 0) : now
          const logs = [
            {
              actor_user_id: managerId,
              order_id: orderRow.id,
              order_stage_id: null,
              incident_id: null,
              event_type: 'ORDER_CREATED',
              message: `Order ${order.code} created from weekly demo seed.`,
              metadata: JSON.stringify({ source: 'seed' }),
              created_at: createdAt
            }
          ]

          if (order.completedDaysAgo) {
            logs.push({
              actor_user_id: operatorId,
              order_id: orderRow.id,
              order_stage_id: null,
              incident_id: null,
              event_type: 'ORDER_STATUS_CHANGED',
              message: `Order ${order.code} started production.`,
              metadata: JSON.stringify({ source: 'seed', previousStatus: 'PENDING', newStatus: 'IN_PROGRESS' }),
              created_at: daysAgo(order.completedDaysAgo, 8, 0)
            })

            for (const stage of orderStages) {
              logs.push(
                {
                  actor_user_id: operatorId,
                  order_id: orderRow.id,
                  order_stage_id: stage.id,
                  incident_id: null,
                  event_type: 'STAGE_STARTED',
                  message: `${order.code} ${stage.code} started.`,
                  metadata: JSON.stringify({ source: 'seed', stageCode: stage.code, stepOrder: stage.step_order }),
                  created_at: stage.started_at
                },
                {
                  actor_user_id: operatorId,
                  order_id: orderRow.id,
                  order_stage_id: stage.id,
                  incident_id: null,
                  event_type: 'STAGE_COMPLETED',
                  message: `${order.code} ${stage.code} completed.`,
                  metadata: JSON.stringify({ source: 'seed', stageCode: stage.code, stepOrder: stage.step_order }),
                  created_at: stage.completed_at
                }
              )
            }

            logs.push({
              actor_user_id: operatorId,
              order_id: orderRow.id,
              order_stage_id: null,
              incident_id: null,
              event_type: 'ORDER_STATUS_CHANGED',
              message: `Order ${order.code} completed.`,
              metadata: JSON.stringify({ source: 'seed', previousStatus: 'IN_PROGRESS', newStatus: 'COMPLETED' }),
              created_at: daysAgo(order.completedDaysAgo, 16, 30)
            })
          }

          return logs
        }),
        { transaction }
      )

      const incidentRows = incidents.map((incident) => {
        const stage = stageByOrderAndCode[`${incident.orderCode}:${incident.stageCode}`]
        return {
          code: incident.code,
          resource_id: resourcesByCode[incident.resourceCode]?.id ?? null,
          order_stage_id: stage?.id ?? null,
          reported_by_user_id: operatorId,
          raw_description: incident.description,
          type: incident.type,
          severity: incident.severity,
          estimated_delay_minutes: incident.delay,
          status: 'RESOLVED',
          ai_analysis: JSON.stringify({
            incidentType: incident.type,
            severity: incident.severity,
            estimatedDelayMinutes: incident.delay,
            summary: incident.description
          }),
          resolution_note: 'Đã xử lý và xác nhận trong dữ liệu demo tuần.',
          resolved_at: daysAgo(incident.resolvedDaysAgo, 15, 0),
          resolved_by_user_id: managerId,
          created_at: daysAgo(incident.createdDaysAgo, 10, 15),
          updated_at: daysAgo(incident.resolvedDaysAgo, 15, 0)
        }
      })

      await queryInterface.bulkInsert('incidents', incidentRows, { transaction })

      const [insertedIncidents] = await queryInterface.sequelize.query(
        'SELECT id, code FROM incidents WHERE code IN (:codes)',
        {
          replacements: { codes: DEMO_INCIDENT_CODES },
          transaction
        }
      )
      const incidentsByCode = getRowsByField(insertedIncidents, 'code')

      await queryInterface.bulkInsert(
        'incident_affected_orders',
        incidents.map((incident) => ({
          incident_id: incidentsByCode[incident.code].id,
          order_id: ordersByCode[incident.orderCode].id,
          previous_risk_level: 'NONE',
          calculated_risk_level:
            incident.severity === 'CRITICAL' ? 'CRITICAL' : incident.severity === 'HIGH' ? 'HIGH' : 'MEDIUM',
          estimated_impact_minutes: incident.delay,
          impact_reason: incident.description,
          created_at: daysAgo(incident.createdDaysAgo, 10, 20),
          updated_at: daysAgo(incident.resolvedDaysAgo, 15, 0)
        })),
        { transaction }
      )

      await queryInterface.bulkInsert(
        'activity_logs',
        incidents.flatMap((incident) => {
          const stage = stageByOrderAndCode[`${incident.orderCode}:${incident.stageCode}`]
          const incidentId = incidentsByCode[incident.code].id
          return [
            {
              actor_user_id: operatorId,
              order_id: ordersByCode[incident.orderCode].id,
              order_stage_id: stage?.id ?? null,
              incident_id: incidentId,
              event_type: 'INCIDENT_CREATED',
              message: `Incident ${incident.code} reported from weekly demo seed.`,
              metadata: JSON.stringify({
                source: 'seed',
                severity: incident.severity,
                resourceCode: incident.resourceCode
              }),
              created_at: daysAgo(incident.createdDaysAgo, 10, 15)
            },
            {
              actor_user_id: managerId,
              order_id: ordersByCode[incident.orderCode].id,
              order_stage_id: stage?.id ?? null,
              incident_id: incidentId,
              event_type: 'INCIDENT_RESOLVED',
              message: `Incident ${incident.code} resolved from weekly demo seed.`,
              metadata: JSON.stringify({ source: 'seed', resolutionNote: 'Đã xử lý trong dữ liệu demo tuần.' }),
              created_at: daysAgo(incident.resolvedDaysAgo, 15, 0)
            }
          ]
        }),
        { transaction }
      )
    })
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await cleanDemoData(queryInterface, transaction)
      await queryInterface.bulkDelete(
        'resources',
        {
          code: ['FORMING-02', 'DRYER-02', 'DECORATION-02', 'GLAZING-02', 'QC-02', 'PACKAGING-02']
        },
        { transaction }
      )
    })
  }
}
