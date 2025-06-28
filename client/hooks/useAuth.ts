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
      if (response.success && response.user && response.token) {
        login(response.user, response.token)
        toast.success('Account created successfully!')
        router.push('/dashboard')
      } else {
        toast.error(response.message || 'Signup failed')
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Signup failed')
    },
  })
}

export const useSignin = () => {
  const { login } = useAuthStore()
  const router = useRouter()

  return useMutation({
    mutationFn: (data: Omit<SigninData, 'action'>) => authAPI.signin(data),
    onSuccess: (response) => {
      if (response.success && response.user && response.token) {
        login(response.user, response.token)
        toast.success('Logged in successfully!')
        router.push('/dashboard')
      } else {
        toast.error(response.message || 'Login failed')
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Login failed')
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