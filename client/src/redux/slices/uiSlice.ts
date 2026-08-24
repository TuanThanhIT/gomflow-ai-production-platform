import { createSlice, isFulfilled, isPending, isRejectedWithValue } from '@reduxjs/toolkit'

const getLoadingKey = (action: { type: string }) => action.type.split('/').slice(0, 2).join('/')

type UiState = {
  loadingMap: Record<string, boolean>
}

const initialState: UiState = {
  loadingMap: {}
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addMatcher(isPending, (state, action) => {
        state.loadingMap[getLoadingKey(action)] = true
      })
      .addMatcher(isFulfilled, (state, action) => {
        state.loadingMap[getLoadingKey(action)] = false
      })
      .addMatcher(isRejectedWithValue, (state, action) => {
        state.loadingMap[getLoadingKey(action)] = false
      })
  }
})

export default uiSlice.reducer
