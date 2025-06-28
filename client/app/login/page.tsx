// app/login/page.tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { Heart, User, Lock, Eye, EyeOff } from 'lucide-react'
import { useSignin } from '../../hooks/useAuth'

interface LoginForm {
  username: string
  password: string
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const signinMutation = useSignin()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>()

  const onSubmit = (data: LoginForm) => {
    signinMutation.mutate(data)
  }

  return (
    <div className="min-h-screen bg-dark-primary flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center space-x-2 mb-8">
            <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
              <Heart className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-primary-400">HealthCare+</span>
          </Link>
          <h2 className="text-3xl font-bold text-dark-primary">Welcome Back</h2>
          <p className="mt-2 text-dark-secondary">
            Sign in to access your healthcare dashboard
          </p>
        </div>

        {/* Login Form */}
        <div className="card">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-dark-primary mb-2">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-dark-muted" />
                <input
                  {...register('username', { 
                    required: 'Username is required'
                  })}
                  type="text"
                  className="input-field pl-10"
                  placeholder="Enter your username"
                  autoComplete="username"
                />
              </div>
              {errors.username && (
                <p className="mt-1 text-sm text-red-400">{errors.username.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-dark-primary mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-dark-muted" />
                <input
                  {...register('password', { 
                    required: 'Password is required'
                  })}
                  type={showPassword ? 'text' : 'password'}
                  className="input-field pl-10 pr-10"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-dark-muted hover:text-dark-secondary"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-dark-accent rounded bg-dark-secondary"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-dark-secondary">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="text-primary-400 hover:text-primary-300">
                  Forgot your password?
                </a>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={signinMutation.isPending}
              className="w-full btn-primary py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {signinMutation.isPending ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          {/* Signup Link */}
          <div className="mt-6 text-center">
            <p className="text-dark-secondary">
              Don't have an account?{' '}
              <Link href="/signup" className="text-primary-400 hover:text-primary-300 font-medium">
                Create one here
              </Link>
            </p>
          </div>
        </div>

        {/* Demo Credentials */}
        <div className="card border-amber-600/30 bg-amber-600/10">
          <div className="text-center">
            <h3 className="text-sm font-medium text-amber-400 mb-2">Demo Credentials</h3>
            <div className="text-sm text-amber-200 space-y-1">
              <p><strong>Username:</strong> aryanraj1</p>
              <p><strong>Password:</strong> YourSecurePassword123!</p>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="text-center text-xs text-dark-muted">
          <p>By signing in, you agree to our Terms of Service and Privacy Policy.</p>
        </div>
      </div>
    </div>
  )
}