import { BrowserRouter as Router } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import RealtimeProvider from './contexts/providers/RealtimeProvider'
import AllRoute from './routes/AllRoute'
import 'react-toastify/dist/ReactToastify.css'

function App() {
  return (
    <Router>
      <RealtimeProvider>
        <AllRoute />
      </RealtimeProvider>
      <ToastContainer
        position='top-right'
        autoClose={2200}
        hideProgressBar={false}
        closeOnClick
        pauseOnHover
        draggable
        theme='colored'
        limit={3}
      />
    </Router>
  )
}

export default App
