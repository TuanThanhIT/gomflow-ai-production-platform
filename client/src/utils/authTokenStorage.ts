const ACCESS_TOKEN_KEY = 'accessToken'

export const getStoredAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY) || undefined

export const setStoredAccessToken = (accessToken: string) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
}

export const clearStoredAccessToken = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
}
