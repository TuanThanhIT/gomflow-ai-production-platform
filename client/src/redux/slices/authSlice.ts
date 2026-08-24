import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import authService from '../../services/authService'
import type {
  AccountResponse,
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  RefreshTokenResponse,
  User
} from '../../types/auth'
import type { ApiErrorType } from '../../types/error'
import { clearStoredAccessToken, getStoredAccessToken, setStoredAccessToken } from '../../utils/authTokenStorage'

type AuthState = {
  user?: User
  accessToken?: string
  authInitialized: boolean
}

const initialState: AuthState = {
  user: undefined,
  accessToken: getStoredAccessToken(),
  authInitialized: false
}

export const login = createAsyncThunk<LoginResponse, { data: LoginRequest }, { rejectValue: ApiErrorType }>(
  'auth/login',
  async ({ data }, { rejectWithValue }) => {
    try {
      const res = await authService.loginService(data)
      return res.data
    } catch (error) {
      return rejectWithValue(error as ApiErrorType)
    }
  }
)

export const refreshTokenThunk = createAsyncThunk<RefreshTokenResponse, void, { rejectValue: ApiErrorType }>(
  'auth/refreshTokenThunk',
  async (_, { rejectWithValue }) => {
    try {
      const res = await authService.refreshTokenService()
      return res.data
    } catch (error) {
      return rejectWithValue(error as ApiErrorType)
    }
  }
)

export const getAccount = createAsyncThunk<AccountResponse, void, { rejectValue: ApiErrorType }>(
  'auth/getAccount',
  async (_, { rejectWithValue }) => {
    try {
      const res = await authService.getAccountService()
      return res.data
    } catch (error) {
      return rejectWithValue(error as ApiErrorType)
    }
  }
)

export const logout = createAsyncThunk<LogoutResponse, void, { rejectValue: ApiErrorType }>(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      const res = await authService.logoutService()
      return res.data
    } catch (error) {
      return rejectWithValue(error as ApiErrorType)
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logoutLocal: (state) => {
      state.user = undefined
      state.accessToken = undefined
      state.authInitialized = true
      clearStoredAccessToken()
    },
    setAuthInitialized: (state, action: PayloadAction<boolean>) => {
      state.authInitialized = action.payload
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload.data.user
        state.accessToken = action.payload.data.accessToken
        state.authInitialized = true
        setStoredAccessToken(action.payload.data.accessToken)
      })
      .addCase(refreshTokenThunk.fulfilled, (state, action) => {
        state.accessToken = action.payload.data.accessToken
        setStoredAccessToken(action.payload.data.accessToken)
      })
      .addCase(refreshTokenThunk.rejected, (state) => {
        state.user = undefined
        state.accessToken = undefined
        clearStoredAccessToken()
      })
      .addCase(getAccount.fulfilled, (state, action) => {
        state.user = action.payload.data.user
        state.authInitialized = true
      })
      .addCase(getAccount.rejected, (state) => {
        state.user = undefined
        state.authInitialized = true
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = undefined
        state.accessToken = undefined
        state.authInitialized = true
        clearStoredAccessToken()
      })
      .addCase(logout.rejected, (state) => {
        state.user = undefined
        state.accessToken = undefined
        state.authInitialized = true
        clearStoredAccessToken()
      })
  }
})

export const { logoutLocal, setAuthInitialized } = authSlice.actions
export default authSlice.reducer
