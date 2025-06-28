// lib/api.ts
import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth-storage')
  if (token) {
    try {
      const parsedData = JSON.parse(token)
      if (parsedData.state?.token) {
        config.headers.Authorization = `Bearer ${parsedData.state.token}`
      }
    } catch (error) {
      console.error('Error parsing auth token:', error)
    }
  }
  return config
})

// Auth API calls
export interface SignupData {
  action: 'signup'
  username: string
  email: string
  password: string
}

export interface SigninData {
  action: 'signin'
  username: string
  password: string
}

export interface AuthResponse {
  message: string
  tokens: {
    AccessToken: string
    ExpiresIn: number
    TokenType: string
    RefreshToken: string
    IdToken: string
  }
}

export const authAPI = {
  signup: async (data: Omit<SignupData, 'action'>): Promise<AuthResponse> => {
    const response = await api.post('/auth', {
      action: 'signup',
      ...data,
    })
    return response.data
  },

  signin: async (data: Omit<SigninData, 'action'>): Promise<AuthResponse> => {
    const response = await api.post('/auth', {
      action: 'signin',
      ...data,
    })
    return response.data
  },
}