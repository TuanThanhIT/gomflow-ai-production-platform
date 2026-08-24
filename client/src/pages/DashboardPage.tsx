import { useCallback, useEffect, useState } from 'react'
import { DashboardOverview } from '../components/dashboard/DashboardOverview'
import { useAppDispatch, useAppSelector } from '../redux/hook'
import { getDashboard } from '../redux/slices/dashboardSlice'
import { getSocketClient } from '../services/socketClient'

const DashboardPage = () => {
  const dispatch = useAppDispatch()
  const accessToken = useAppSelector((state) => state.auth.accessToken)
  const authInitialized = useAppSelector((state) => state.auth.authInitialized)
  const data = useAppSelector((state) => state.dashboard.data)
  const error = useAppSelector((state) => state.dashboard.error)
  const loading = useAppSelector((state) => state.ui.loadingMap['dashboard/getDashboard'] || false)
  const [connected, setConnected] = useState(false)

  const refreshDashboard = useCallback(() => {
    void dispatch(getDashboard())
  }, [dispatch])

  useEffect(() => {
    if (authInitialized) refreshDashboard()
  }, [authInitialized, refreshDashboard])

  useEffect(() => {
    if (!accessToken) {
      return
    }

    const socket = getSocketClient(accessToken)
    const updateConnectionState = () => setConnected(socket.connected)

    updateConnectionState()
    socket.on('connect', updateConnectionState)
    socket.on('disconnect', updateConnectionState)

    return () => {
      socket.off('connect', updateConnectionState)
      socket.off('disconnect', updateConnectionState)
    }
  }, [accessToken])

  return (
    <DashboardOverview
      connected={Boolean(accessToken) && connected}
      data={data}
      error={error}
      loading={loading}
      refreshing={loading && Boolean(data)}
      onRefresh={refreshDashboard}
    />
  )
}

export default DashboardPage
