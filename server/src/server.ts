import { createServer } from 'http'
import dotenv from 'dotenv'
import createApp from './app.js'
import { testConnection } from './config/db.js'
import { initializeSocketServer } from './services/socketService.js'

dotenv.config()

const PORT = Number(process.env.PORT || 8080)
const HOST = process.env.HOST || '0.0.0.0'
const app = createApp()
const httpServer = createServer(app)
initializeSocketServer(httpServer)

const startServer = async () => {
  await testConnection()

  httpServer.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`)
  })
}

startServer().catch((error) => {
  console.error('Unable to start server:', error)
  process.exit(1)
})
