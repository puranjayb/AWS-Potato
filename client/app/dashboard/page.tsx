'use client'
import React, { useEffect, useState, ReactNode, JSX } from 'react'
import { 
  Heart, 
  LogOut, 
  Clock, 
  Shield, 
  Stethoscope, 
  Users,
  Calendar,
  FileText,
  Settings,
  Bell,
  Activity,
  TrendingUp
} from 'lucide-react'
import { useLogout } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

interface FloatingElementProps {
  delay: number
  children: ReactNode
  className?: string
}

interface MousePosition {
  x: number
  y: number
}

interface QuickStat {
  id: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  value: string
  subtitle: string
  color: string
}

interface DashboardFeature {
  id: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  subtitle: string
  description: string
  buttonText: string
  buttonColor: string
  iconBg: string
  onClick?: () => void
}

interface ActivityItem {
  id: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  subtitle: string
  iconColor: string
  time: string
}

interface AuthStore {
  isAuthenticated: boolean
}

// Mock hooks for demonstration - replace with your actual hooks
const useAuthStore = (): AuthStore => ({
  isAuthenticated: true
})

export default function DashboardPage(): JSX.Element {
  const { isAuthenticated } = useAuthStore()
  const logout = useLogout()
  const [isVisible, setIsVisible] = useState<boolean>(false)
  const [mousePosition, setMousePosition] = useState<MousePosition>({ x: 0, y: 0 })
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const router = useRouter()

  useEffect((): (() => void) => {
    // Simulate auth check
    setTimeout(() => {
      setIsLoading(false)
      setIsVisible(true)
    }, 500)
    
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

  const quickStats: QuickStat[] = [
    {
      id: 'medication',
      icon: Clock,
      title: 'Next Medication',
      value: '2:30 PM',
      subtitle: 'Vitamin D',
      color: 'from-blue-500 to-purple-600'
    },
    {
      id: 'appointments',
      icon: Calendar,
      title: 'Appointments',
      value: '3',
      subtitle: 'This month',
      color: 'from-purple-500 to-pink-600'
    },
    {
      id: 'reports',
      icon: FileText,
      title: 'Reports',
      value: '12',
      subtitle: 'Available',
      color: 'from-green-500 to-blue-600'
    },
    {
      id: 'health-score',
      icon: Shield,
      title: 'Health Score',
      value: '85%',
      subtitle: 'Excellent',
      color: 'from-orange-500 to-red-600'
    }
  ]

  const dashboardFeatures: DashboardFeature[] = [
    {
      id: 'medicine',
      icon: Clock,
      title: 'Medicine Reminder',
      subtitle: 'Manage your medications',
      description: 'Set up smart reminders for all your medications and never miss a dose.',
      buttonText: 'Manage Medicines',
      buttonColor: 'from-blue-500 to-purple-600',
      iconBg: 'from-blue-500 to-purple-600'
    },
    {
      id: 'emergency',
      icon: Shield,
      title: 'Emergency Services',
      subtitle: 'Quick access to help',
      description: 'Instant access to emergency contacts and rapid response services.',
      buttonText: 'Emergency Help',
      buttonColor: 'from-red-500 to-pink-600',
      iconBg: 'from-red-500 to-pink-600'
    },
    {
      id: 'hospital',
      icon: Stethoscope,
      title: 'Hospital Finder',
      subtitle: 'Locate nearby care',
      description: 'Find the nearest hospitals and healthcare providers in your area.',
      buttonText: 'Find Hospitals',
      buttonColor: 'from-blue-500 to-cyan-600',
      iconBg: 'from-blue-500 to-cyan-600'
    },
    {
      id: 'family',
      icon: Users,
      title: 'Family Care',
      subtitle: 'Manage family health',
      description: 'Keep track of your entire family\'s health records and appointments.',
      buttonText: 'Family Health',
      buttonColor: 'from-purple-500 to-indigo-600',
      iconBg: 'from-purple-500 to-indigo-600'
    },
    {
      id: 'reports',
      icon: FileText,
      title: 'Medical Reports',
      subtitle: 'View your reports',
      description: 'Access and manage all your medical reports and test results.',
      buttonText: 'View Reports',
      buttonColor: 'from-green-500 to-emerald-600',
      iconBg: 'from-green-500 to-emerald-600',
      onClick: (): void => router.push('/reports')
    },
    {
      id: 'settings',
      icon: Settings,
      title: 'Settings',
      subtitle: 'Customize your experience',
      description: 'Personalize your dashboard and notification preferences.',
      buttonText: 'Open Settings',
      buttonColor: 'from-orange-500 to-amber-600',
      iconBg: 'from-orange-500 to-amber-600'
    }
  ]

  const recentActivities: ActivityItem[] = [
    {
      id: 'medication-reminder',
      icon: Bell,
      title: 'Medication reminder sent',
      subtitle: 'Vitamin D - 2 hours ago',
      iconColor: 'text-blue-400',
      time: '2h ago'
    },
    {
      id: 'appointment',
      icon: Calendar,
      title: 'Appointment scheduled',
      subtitle: 'Dr. Smith - Next Tuesday at 10:00 AM',
      iconColor: 'text-purple-400',
      time: '1d ago'
    },
    {
      id: 'lab-results',
      icon: FileText,
      title: 'Lab results available',
      subtitle: 'Blood test results - Yesterday',
      iconColor: 'text-green-400',
      time: '1d ago'
    }
  ]

  const handleLogout = (): void => {
    logout()
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>
        
        <div className="text-center relative z-10">
          <div className="w-16 h-16 border-4 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/70 text-lg">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
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
        <div className="absolute top-3/4 right-1/3 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-3000" />
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {([...Array(25)] as undefined[]).map((_: undefined, i: number) => (
          <FloatingElement key={i} delay={i * 0.2}>
            <div 
              className="absolute w-1 h-1 bg-white/20 rounded-full animate-twinkle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`
              }}
            />
          </FloatingElement>
        ))}
      </div>

      {/* Header */}
      <header className={`relative z-10 transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <div className="backdrop-blur-lg bg-white/5 border-b border-white/10 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4 group">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-blue-500/25">
                  <Heart className="w-6 h-6 text-white animate-pulse" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    HealthCare+
                  </h1>
                  <p className="text-sm text-white/70">Dashboard</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="hidden sm:block text-right">
                  <p className="text-sm text-white font-medium">Welcome back!</p>
                  <p className="text-xs text-white/70">Have a healthy day</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="group flex items-center space-x-2 px-4 py-2 rounded-lg backdrop-blur-sm bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all duration-300 hover:scale-105"
                  type="button"
                >
                  <LogOut className="w-4 h-4 group-hover:rotate-12 transition-transform duration-300" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Message */}
        <div className={`mb-8 transition-all duration-1000 delay-300 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="relative p-6 rounded-2xl backdrop-blur-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30 shadow-2xl hover:shadow-green-500/20 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-2xl" />
            <div className="relative z-10 flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center animate-bounce">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-green-300 flex items-center">
                  🎉 Logged in successfully!
                </h2>
                <p className="text-green-200/80">
                  Welcome to your healthcare dashboard!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 transition-all duration-1000 delay-500 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          {quickStats.map((stat: QuickStat, index: number) => (
            <div 
              key={stat.id}
              className="group relative p-6 rounded-2xl backdrop-blur-lg bg-white/10 border border-white/20 text-center hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer"
              style={{ animationDelay: `${600 + index * 100}ms` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10">
                <div className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-blue-300 transition-colors duration-300">
                  {stat.title}
                </h3>
                <p className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-1">
                  {stat.value}
                </p>
                <p className="text-sm text-white/70 group-hover:text-white/90 transition-colors duration-300">
                  {stat.subtitle}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Main Features Grid */}
        <div className={`grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 transition-all duration-1000 delay-700 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          {dashboardFeatures.map((feature: DashboardFeature, index: number) => (
            <div 
              key={feature.id}
              className="group relative p-6 rounded-2xl backdrop-blur-lg bg-white/10 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer"
              style={{ animationDelay: `${800 + index * 100}ms` }}
              onClick={() => feature.onClick ? feature.onClick() : console.log(`Navigating to ${feature.id}`) }
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative z-10">
                <div className="flex items-center space-x-4 mb-4">
                  <div className={`w-12 h-12 bg-gradient-to-r ${feature.iconBg} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white group-hover:text-blue-300 transition-colors duration-300">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-white/70 group-hover:text-white/90 transition-colors duration-300">
                      {feature.subtitle}
                    </p>
                  </div>
                </div>
                <p className="text-white/80 mb-4 group-hover:text-white transition-colors duration-300">
                  {feature.description}
                </p>
                <button 
                  className={`w-full py-3 text-white rounded-lg bg-gradient-to-r ${feature.buttonColor} hover:shadow-lg transition-all duration-300 hover:scale-105 transform font-medium`}
                >
                  {feature.buttonText}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div className={`transition-all duration-1000 delay-900 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
            <Activity className="w-7 h-7 mr-3 text-blue-400" />
            Recent Activity
          </h2>
          <div className="relative p-6 rounded-2xl backdrop-blur-lg bg-white/10 border border-white/20 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-2xl" />
            <div className="relative z-10 space-y-4">
              {recentActivities.map((activity: ActivityItem, index: number) => (
                <div 
                  key={activity.id}
                  className="group flex items-center space-x-4 p-4 rounded-lg backdrop-blur-sm bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 hover:scale-[1.02]"
                  style={{ animationDelay: `${1000 + index * 100}ms` }}
                >
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <activity.icon className={`w-5 h-5 ${activity.iconColor}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium group-hover:text-blue-300 transition-colors duration-300">
                      {activity.title}
                    </p>
                    <p className="text-sm text-white/70 group-hover:text-white/90 transition-colors duration-300">
                      {activity.subtitle}
                    </p>
                  </div>
                  <div className="text-xs text-white/50 group-hover:text-white/70 transition-colors duration-300">
                    {activity.time}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Health Trend Indicator */}
        <div className={`mt-8 transition-all duration-1000 delay-1100 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="relative p-6 rounded-2xl backdrop-blur-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-white/20 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-2xl" />
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Your health is trending upward!</h3>
                  <p className="text-white/70">Keep up the great work with your wellness routine.</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-400">+12%</div>
                <div className="text-sm text-white/70">This month</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-6px) rotate(1deg); }
          66% { transform: translateY(3px) rotate(-1deg); }
        }
        
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .animate-twinkle {
          animation: twinkle 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}