'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'users',
      {
        id: {
          type: Sequelize.BIGINT.UNSIGNED,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true
        },
        full_name: {
          type: Sequelize.STRING(120),
          allowNull: false
        },
        email: {
          type: Sequelize.STRING(150),
          allowNull: false,
          unique: true
        },
        password_hash: {
          type: Sequelize.STRING(255),
          allowNull: false
        },
        role: {
          type: Sequelize.ENUM('ADMIN', 'MANAGER', 'OPERATOR'),
          allowNull: false,
          defaultValue: 'OPERATOR'
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        last_login_at: {
          type: Sequelize.DATE,
          allowNull: true
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false
        }
      },
      {
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
        engine: 'InnoDB'
      }
    )

    await queryInterface.addIndex('users', ['email'], { name: 'idx_users_email' })
    await queryInterface.addIndex('users', ['role'], { name: 'idx_users_role' })
    await queryInterface.addIndex('users', ['is_active'], { name: 'idx_users_is_active' })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users')
  }
}
