'use client'
import React, { useState, useEffect, ReactNode, JSX } from 'react'
import { Heart, User, Lock, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { useSignin } from '@/hooks/useAuth'

interface LoginForm {
  username: string
  password: string
  rememberMe?: boolean
}

interface FormErrors {
  username?: string
  password?: string
}

interface FloatingElementProps {
  delay: number
  children: ReactNode
  className?: string
}

interface MousePosition {
  x: number
  y: number
}

export default function LoginPage(): JSX.Element {
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [formData, setFormData] = useState<LoginForm>({ username: '', password: '', rememberMe: false })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isVisible, setIsVisible] = useState<boolean>(false)
  const [mousePosition, setMousePosition] = useState<MousePosition>({ x: 0, y: 0 })
  const [focusedField, setFocusedField] = useState<string | null>(null)
  
  const signinMutation = useSignin()

  useEffect((): (() => void) => {
    setIsVisible(true)
    
    const handleMouseMove = (e: MouseEvent): void => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    return (): void => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const FloatingElement: React.FC<FloatingElementProps> = ({ 
    delay, 
    children, 
    className = "" 
  }) => (
    <div 
      className={`animate-float ${className}`}
      style={{ 
        animationDelay: `${delay}s`,
        animationDuration: '6s'
      }}
    >
      {children}
    </div>
  )

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}
    
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required'
    }
    
    if (!formData.password.trim()) {
      newErrors.password = 'Password is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleKeyPress = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  const handleSubmit = (): void => {
    if (validateForm()) {
      signinMutation.mutate(formData)
    }
  }

  const handleInputChange = (field: keyof LoginForm, value: string | boolean): void => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleFocus = (fieldName: string): void => {
    setFocusedField(fieldName)
  }

  const handleBlur = (): void => {
    setFocusedField(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden flex items-center justify-center px-4 sm:px-6 lg:px-8">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"
          style={{
            left: `${mousePosition.x * 0.02}px`,
            top: `${mousePosition.y * 0.02}px`,
          }}
        />
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-2000" />
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {([...Array(15)] as undefined[]).map((_: undefined, i: number) => (
          <FloatingElement key={i} delay={i * 0.3}>
            <div 
              className="absolute w-1.5 h-1.5 bg-white/20 rounded-full animate-twinkle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`
              }}
            />
          </FloatingElement>
        ))}
      </div>

      <div className={`max-w-md w-full space-y-8 relative z-10 transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
        {/* Header */}
        <div className={`text-center transition-all duration-1000 delay-200 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <Link
            href="/" 
            className="inline-flex items-center space-x-2 mb-8 group"
            onClick={(e: React.MouseEvent): void => {
              e.preventDefault()
              // Handle navigation
            }}
          >
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-blue-500/25">
              <Heart className="w-7 h-7 text-white animate-pulse" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              HealthCare+
            </span>
          </Link>
          <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
          <p className="text-white/70">
            Sign in to access your healthcare dashboard
          </p>
        </div>

        {/* Login Form */}
        <div className={`relative transition-all duration-1000 delay-400 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="relative p-8 rounded-2xl backdrop-blur-lg bg-white/10 border border-white/20 shadow-2xl hover:bg-white/15 transition-all duration-300">
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-2xl" />
            
            <div className="relative z-10 space-y-6">
              {/* Username */}
              <div className="group">
                <label 
                  htmlFor="username" 
                  className="block text-sm font-medium text-white/90 mb-2 transition-colors duration-300"
                >
                  Username
                </label>
                <div className="relative">
                  <User className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${
                    focusedField === 'username' ? 'text-blue-400' : 'text-white/50'
                  }`} />
                  <input
                    id="username"
                    type="text"
                    value={formData.username}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void => 
                      handleInputChange('username', e.target.value)
                    }
                    onFocus={(): void => handleFocus('username')}
                    onBlur={handleBlur}
                    onKeyPress={handleKeyPress}
                    className={`w-full pl-10 pr-4 py-3 rounded-lg backdrop-blur-sm bg-white/5 border transition-all duration-300 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 hover:bg-white/10 ${
                      errors.username 
                        ? 'border-red-400/50 focus:border-red-400' 
                        : focusedField === 'username'
                        ? 'border-blue-400/50'
                        : 'border-white/20 hover:border-white/30'
                    }`}
                    placeholder="Enter your username"
                    autoComplete="username"
                  />
                </div>
                {errors.username && (
                  <p className="mt-1 text-sm text-red-400 animate-fadeIn">{errors.username}</p>
                )}
              </div>

              {/* Password */}
              <div className="group">
                <label 
                  htmlFor="password" 
                  className="block text-sm font-medium text-white/90 mb-2 transition-colors duration-300"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${
                    focusedField === 'password' ? 'text-blue-400' : 'text-white/50'
                  }`} />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void => 
                      handleInputChange('password', e.target.value)
                    }
                    onFocus={(): void => handleFocus('password')}
                    onBlur={handleBlur}
                    onKeyPress={handleKeyPress}
                    className={`w-full pl-10 pr-12 py-3 rounded-lg backdrop-blur-sm bg-white/5 border transition-all duration-300 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 hover:bg-white/10 ${
                      errors.password 
                        ? 'border-red-400/50 focus:border-red-400' 
                        : focusedField === 'password'
                        ? 'border-blue-400/50'
                        : 'border-white/20 hover:border-white/30'
                    }`}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={(): void => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors duration-300 hover:scale-110"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-400 animate-fadeIn">{errors.password}</p>
                )}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center group">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={formData.rememberMe || false}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>): void => 
                      handleInputChange('rememberMe', e.target.checked)
                    }
                    className="h-4 w-4 text-blue-400 focus:ring-blue-400/50 border-white/30 rounded bg-white/10 backdrop-blur-sm transition-all duration-300 hover:scale-110"
                  />
                  <label 
                    htmlFor="remember-me" 
                    className="ml-2 block text-sm text-white/70 group-hover:text-white/90 transition-colors duration-300 cursor-pointer"
                  >
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <a 
                    href="#" 
                    className="text-blue-400 hover:text-blue-300 transition-colors duration-300 hover:underline"
                    onClick={(e: React.MouseEvent): void => {
                      e.preventDefault()
                      // Handle forgot password
                    }}
                  >
                    Forgot your password?
                  </a>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={signinMutation.isPending}
                className="group relative w-full py-3 text-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105 transform overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative flex items-center justify-center">
                  {signinMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white mr-2" />
                      Signing In...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </span>
              </button>
            </div>

            {/* Signup Link */}
            <div className="relative z-10 mt-6 text-center">
              <p className="text-white/70">
                Do not have an account?{' '}
                <a 
                  href="/signup" 
                  className="text-blue-400 hover:text-blue-300 font-medium transition-colors duration-300 hover:underline"
                  onClick={(e: React.MouseEvent): void => {
                    e.preventDefault()
                    // Handle navigation to signup
                  }}
                >
                  Create one here
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className={`text-center text-xs text-white/50 transition-all duration-1000 delay-600 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <p>By signing in, you agree to our Terms of Service and Privacy Policy.</p>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-8px) rotate(1deg); }
          66% { transform: translateY(4px) rotate(-1deg); }
        }
        
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .animate-twinkle {
          animation: twinkle 3s ease-in-out infinite;
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  )
}