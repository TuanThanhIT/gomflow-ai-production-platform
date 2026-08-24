import { Sequelize } from 'sequelize'
import dotenv from 'dotenv'
dotenv.config()

const { DB_NAME = '', DB_USER = '', DB_PASSWORD = '' } = process.env

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  dialect: 'mysql',
  logging: false,
  timezone: '+07:00'
})

export const testConnection = async () => {
  try {
    await sequelize.authenticate()
    console.log('Database connection has been established successfully.')
  } catch (error) {
    console.error('Unable to connect to the database:', error)
    throw error
  }
}

export default sequelize
