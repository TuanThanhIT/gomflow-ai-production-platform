'use strict'

const bcrypt = require('bcryptjs')

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const now = new Date()
      const passwordHash = await bcrypt.hash('Demo@123', 10)

      await queryInterface.bulkInsert(
        'users',
        [
          {
            full_name: 'GomFlow Administrator',
            email: 'admin@gomflow.local',
            password_hash: passwordHash,
            role: 'ADMIN',
            is_active: true,
            last_login_at: null,
            created_at: now,
            updated_at: now
          },
          {
            full_name: 'Production Manager',
            email: 'manager@gomflow.local',
            password_hash: passwordHash,
            role: 'MANAGER',
            is_active: true,
            last_login_at: null,
            created_at: now,
            updated_at: now
          },
          {
            full_name: 'Production Operator',
            email: 'operator@gomflow.local',
            password_hash: passwordHash,
            role: 'OPERATOR',
            is_active: true,
            last_login_at: null,
            created_at: now,
            updated_at: now
          }
        ],
        { transaction, ignoreDuplicates: true }
      )
    })
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', {
      email: ['admin@gomflow.local', 'manager@gomflow.local', 'operator@gomflow.local']
    })
  }
}
