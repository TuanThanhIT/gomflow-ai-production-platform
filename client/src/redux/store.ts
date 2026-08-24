import { combineReducers, configureStore } from '@reduxjs/toolkit'
import { authMiddleware } from './middlewares/authMiddleware'
import authReducer from './slices/authSlice'
import dashboardReducer from './slices/dashboardSlice'
import incidentReducer from './slices/incidentSlice'
import orderReducer from './slices/orderSlice'
import processTemplateReducer from './slices/processTemplateSlice'
import resourceReducer from './slices/resourceSlice'
import uiReducer from './slices/uiSlice'
import { setStore } from './storeRef'

const rootReducer = combineReducers({
  auth: authReducer,
  dashboard: dashboardReducer,
  incident: incidentReducer,
  order: orderReducer,
  processTemplate: processTemplateReducer,
  resource: resourceReducer,
  ui: uiReducer
})

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(authMiddleware)
})

setStore(store)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
export type AppStore = typeof store
