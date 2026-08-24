'use strict'

const resourceCodeByType = {
  FORMING: 'FORMING-01',
  DRYER: 'DRYER-01',
  KILN: 'KILN-01',
  GLAZING: 'GLAZING-01',
  QC: 'QC-01',
  PACKAGING: 'PACKAGING-01'
}

const getRowsByField = (rows, field) =>
  rows.reduce((map, row) => {
    map[row[field]] = row
    return map
  }, {})

const getStageStatus = (orderCode, stepOrder, totalSteps) => {
  if (orderCode === 'GOM-000001') {
    if (stepOrder === 1) return 'COMPLETED'
    if (stepOrder === 2) return 'IN_PROGRESS'
    return 'WAITING'
  }

  if (orderCode === 'GOM-000002') {
    return 'WAITING'
  }

  if (orderCode === 'GOM-000003') {
    if (stepOrder <= 2) return 'COMPLETED'
    if (stepOrder === 3) return 'BLOCKED'
    return 'WAITING'
  }

  if (orderCode === 'GOM-000004') {
    return 'COMPLETED'
  }

  return stepOrder === totalSteps ? 'IN_PROGRESS' : 'WAITING'
}

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const now = new Date()
      const [orders] = await queryInterface.sequelize.query(
        `SELECT id, code, process_template_id
         FROM orders
         WHERE code IN ('GOM-000001', 'GOM-000002', 'GOM-000003', 'GOM-000004')`,
        { transaction }
      )
      const [steps] = await queryInterface.sequelize.query(
        `SELECT id, process_template_id, code, name, step_order, estimated_duration_minutes, required_resource_type
         FROM process_template_steps
         ORDER BY process_template_id, step_order`,
        { transaction }
      )
      const [resources] = await queryInterface.sequelize.query('SELECT id, code FROM resources', { transaction })
      const [users] = await queryInterface.sequelize.query(
        "SELECT id, email FROM users WHERE email IN ('manager@ceramiops.local', 'operator@ceramiops.local')",
        { transaction }
      )

      const resourcesByCode = getRowsByField(resources, 'code')
      const usersByEmail = getRowsByField(users, 'email')
      const stages = []

      for (const order of orders) {
        const orderSteps = steps.filter((step) => step.process_template_id === order.process_template_id)

        for (const step of orderSteps) {
          const status = getStageStatus(order.code, step.step_order, orderSteps.length)
          const resourceCode = resourceCodeByType[step.required_resource_type]
          const started = status === 'IN_PROGRESS' || status === 'COMPLETED' || status === 'BLOCKED'
          const completed = status === 'COMPLETED'

          stages.push({
            order_id: order.id,
            template_step_id: step.id,
            assigned_resource_id: resourceCode ? resourcesByCode[resourceCode]?.id : null,
            started_by_user_id: started ? usersByEmail['operator@ceramiops.local']?.id : null,
            completed_by_user_id: completed ? usersByEmail['operator@ceramiops.local']?.id : null,
            code: step.code,
            name: step.name,
            step_order: step.step_order,
            status,
            estimated_duration_minutes: step.estimated_duration_minutes,
            expected_start_at: null,
            expected_end_at: null,
            started_at: started ? now : null,
            completed_at: completed ? now : null,
            notes:
              order.code === 'GOM-000003' && status === 'BLOCKED' ? 'Demo stage blocked for Kanban risk view.' : null,
            created_at: now,
            updated_at: now
          })
        }
      }

      await queryInterface.bulkInsert('order_stages', stages, { transaction, ignoreDuplicates: true })

      const [insertedStages] = await queryInterface.sequelize.query(
        `SELECT os.id, os.order_id, os.code, os.status, o.code AS order_code
         FROM order_stages os
         INNER JOIN orders o ON o.id = os.order_id
         WHERE o.code IN ('GOM-000001', 'GOM-000002', 'GOM-000003', 'GOM-000004')
         AND os.status IN ('IN_PROGRESS', 'COMPLETED', 'BLOCKED')`,
        { transaction }
      )

      const [existingStageSeedLogs] = await queryInterface.sequelize.query(
        `SELECT id FROM activity_logs
         WHERE event_type IN ('STAGE_COMPLETED', 'STAGE_BLOCKED', 'STAGE_STARTED')
         AND message LIKE 'GOM-00000%'
         LIMIT 1`,
        { transaction }
      )

      if (existingStageSeedLogs.length === 0) {
        await queryInterface.bulkInsert(
          'activity_logs',
          insertedStages.map((stage) => ({
            actor_user_id: usersByEmail['operator@ceramiops.local']?.id ?? usersByEmail['manager@ceramiops.local']?.id,
            order_id: stage.order_id,
            order_stage_id: stage.id,
            incident_id: null,
            event_type:
              stage.status === 'COMPLETED'
                ? 'STAGE_COMPLETED'
                : stage.status === 'BLOCKED'
                  ? 'STAGE_BLOCKED'
                  : 'STAGE_STARTED',
            message: `${stage.order_code} ${stage.code} ${stage.status.toLowerCase().replace('_', ' ')}.`,
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

      await queryInterface.bulkDelete(
        'activity_logs',
        {
          order_id: orders.map((order) => order.id)
        },
        { transaction }
      )

      await queryInterface.bulkDelete(
        'order_stages',
        {
          order_id: orders.map((order) => order.id)
        },
        { transaction }
      )
    })
  }
}
