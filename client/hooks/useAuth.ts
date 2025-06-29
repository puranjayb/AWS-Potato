// hooks/useAuth.ts
import { useMutation } from '@tanstack/react-query'
import { authAPI, SignupData, SigninData } from '../utils/api'
import { useAuthStore } from '../store/authStore'
import { useRouter } from 'next/navigation'
import { toast } from '../utils/toast'

export const useSignup = () => {
  const router = useRouter()

  return useMutation({
    mutationFn: (data: Omit<SignupData, 'action'>) => authAPI.signup(data),
    onSuccess: () => {
      toast.success('Signup successful! Please log in.')
      router.push('/login')
    },
    onError: (error) => {
      console.error('Signup error:', error)
      toast.error(`Signup failed: ${error instanceof Error ? error.message : 'An error occurred'}`);
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
        login(response.tokens.IdToken)

        // Show success message
        toast.success('Logged in successfully!')

        // Redirect to the dashboard
        router.push('/dashboard')
      } else {
        // Authentication failed
        toast.error('Authentication failed')
      }
    },
    onError: (error) => {
      console.error('Signin error:', error)
      toast.error(`Login failed: ${error instanceof Error ? error.message : 'An error occurred'}`);
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