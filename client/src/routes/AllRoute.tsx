import { Route, Routes } from 'react-router-dom'
import AppLayout from '../components/layouts/AppLayout'
import CreateOrderPage from '../pages/CreateOrderPage'
import DashboardPage from '../pages/DashboardPage'
import IncidentsPage from '../pages/IncidentsPage'
import LoginPage from '../pages/LoginPage'
import OrderDetailPage from '../pages/OrderDetailPage'
import OrdersPage from '../pages/OrdersPage'
import ProcessTemplatesPage from '../pages/ProcessTemplatesPage'
import ResourcesPage from '../pages/ResourcesPage'
import PrivateRoute from './ProtectedRoute/PrivateRoute'

const AllRoute = () => {
  return (
    <Routes>
      <Route path='/login' element={<LoginPage />} />
      <Route element={<PrivateRoute />}>
        <Route element={<AppLayout />}>
          <Route path='/' element={<DashboardPage />} />
          <Route path='/dashboard' element={<DashboardPage />} />
          <Route path='/process-templates' element={<ProcessTemplatesPage />} />
          <Route path='/orders' element={<OrdersPage />} />
          <Route path='/resources' element={<ResourcesPage />} />
          <Route path='/incidents' element={<IncidentsPage />} />
          <Route path='/orders/new' element={<CreateOrderPage />} />
          <Route path='/orders/:id' element={<OrderDetailPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default AllRoute
