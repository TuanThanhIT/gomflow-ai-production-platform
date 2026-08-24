import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import './index.css'
import App from './App.tsx'
import { store } from './redux/store'
import ConfirmDialogProvider from './contexts/providers/ConfirmDialogProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <ConfirmDialogProvider>
        <App />
      </ConfirmDialogProvider>
    </Provider>
  </StrictMode>
)
