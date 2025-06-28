// hooks/useAuth.ts
import { useMutation } from '@tanstack/react-query'
import { authAPI, SignupData, SigninData } from '../utils/api'
import { useAuthStore } from '../store/authStore'
import { useRouter } from 'next/navigation'
import { toast } from '../utils/toast'

export const useSignup = () => {
  const { login } = useAuthStore()
  const router = useRouter()

  return useMutation({
    mutationFn: (data: Omit<SignupData, 'action'>) => authAPI.signup(data),
    onSuccess: (response) => {
      // Check if signup was successful and tokens exist
      if (response.tokens) {
        // Store user data and tokens in the auth store
        login(response.tokens.AccessToken)

        // Show success message
        toast.success('Signed up successfully!')

        // Redirect to the dashboard
        router.push('/dashboard')
      } else {
        // Signup failed
        toast.error('Signup failed')
      }
    },
    onError: (error: unknown) => {
      // Handle different types of errors
      if (error instanceof Error) {
        // Handle generic error
        toast.error(error.message || 'An error occurred during signup')
      } else if (typeof error === 'string') {
        // Handle string error
        toast.error(error || 'An error occurred during signup')
      } else {
        // Handle unknown error
        toast.error('An unknown error occurred during signup')
      }
    },
  })
}

export const useSignin = () => {
  const { login } = useAuthStore()
  const router = useRouter()

  return useMutation({
    mutationFn: (data: Omit<SigninData, 'action'>) => authAPI.signin(data),
    onSuccess: (response) => {
      // Check if authentication was successful and tokens exist
      if (response.tokens) {
        // Store user data and tokens in the auth store
        login(response.tokens.AccessToken)

        // Show success message
        toast.success('Logged in successfully!')

        // Redirect to the dashboard
        router.push('/dashboard')
      } else {
        // Authentication failed
        toast.error('Authentication failed')
      }
    },
    onError: (error: unknown) => {
      // Handle different types of errors
      if (error instanceof Error) {
        // Handle generic error
        toast.error(error.message || 'An error occurred during login')
      } else if (typeof error === 'string') {
        // Handle string error
        toast.error(error || 'An error occurred during login')
      } else {
        // Handle unknown error
        toast.error('An unknown error occurred during login')
      }
    },
  })
}

export const useLogout = () => {
  const { logout } = useAuthStore()
  const router = useRouter()

  return () => {
    logout()
    toast.success('Logged out successfully!')
    router.push('/')
  }
}