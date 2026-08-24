import { io, type Socket } from 'socket.io-client'

let socket: Socket | null = null

const getSocketUrl = () => import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:3001'

export const getSocketClient = (accessToken: string) => {
  if (!socket) {
    socket = io(getSocketUrl(), {
      autoConnect: false,
      auth: {
        token: accessToken
      },
      withCredentials: true
    })
  }

  socket.auth = {
    token: accessToken
  }

  return socket
}

export const disconnectSocketClient = () => {
  if (!socket) return

  socket.removeAllListeners()
  socket.disconnect()
  socket = null
}

export default {
  disconnectSocketClient,
  getSocketClient
}
