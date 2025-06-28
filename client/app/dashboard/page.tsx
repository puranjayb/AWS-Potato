// app/dashboard/page.tsx
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '../../store/authStore'
import { useLogout } from '../../hooks/useAuth'
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
  Bell
} from 'lucide-react'

export default function DashboardPage() {
  const { isAuthenticated } = useAuthStore()
  const logout = useLogout()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-dark-primary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-dark-secondary">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-primary">
      {/* Header */}
      <header className="border-b border-dark-accent bg-dark-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-dark-primary">HealthCare+</h1>
                <p className="text-sm text-dark-muted">Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm text-dark-primary font-medium">Welcome back!</p>
              </div>
              <button
                onClick={logout}
                className="btn-secondary flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Message */}
        <div className="mb-8 card border-green-600/30 bg-green-600/10">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-green-400">
                🎉 Logged in successfully!
              </h2>
              <p className="text-green-200">
                Welcome to your healthcare dashboard!
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card text-center hover:border-primary-500 transition-colors">
            <Clock className="w-8 h-8 text-primary-400 mx-auto mb-2" />
            <h3 className="text-lg font-semibold text-dark-primary">Next Medication</h3>
            <p className="text-2xl font-bold text-primary-400">2:30 PM</p>
            <p className="text-sm text-dark-muted">Vitamin D</p>
          </div>

          <div className="card text-center hover:border-primary-500 transition-colors">
            <Calendar className="w-8 h-8 text-primary-400 mx-auto mb-2" />
            <h3 className="text-lg font-semibold text-dark-primary">Appointments</h3>
            <p className="text-2xl font-bold text-primary-400">3</p>
            <p className="text-sm text-dark-muted">This month</p>
          </div>

          <div className="card text-center hover:border-primary-500 transition-colors">
            <FileText className="w-8 h-8 text-primary-400 mx-auto mb-2" />
            <h3 className="text-lg font-semibold text-dark-primary">Reports</h3>
            <p className="text-2xl font-bold text-primary-400">12</p>
            <p className="text-sm text-dark-muted">Available</p>
          </div>

          <div className="card text-center hover:border-primary-500 transition-colors">
            <Shield className="w-8 h-8 text-primary-400 mx-auto mb-2" />
            <h3 className="text-lg font-semibold text-dark-primary">Health Score</h3>
            <p className="text-2xl font-bold text-primary-400">85%</p>
            <p className="text-sm text-dark-muted">Excellent</p>
          </div>
        </div>

        {/* Main Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="card hover:border-primary-500 transition-colors cursor-pointer">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-dark-primary">Medicine Reminder</h3>
                <p className="text-sm text-dark-muted">Manage your medications</p>
              </div>
            </div>
            <p className="text-dark-secondary mb-4">
              Set up smart reminders for all your medications and never miss a dose.
            </p>
            <button className="btn-primary w-full">
              Manage Medicines
            </button>
          </div>

          <div className="card hover:border-primary-500 transition-colors cursor-pointer">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-dark-primary">Emergency Services</h3>
                <p className="text-sm text-dark-muted">Quick access to help</p>
              </div>
            </div>
            <p className="text-dark-secondary mb-4">
              Instant access to emergency contacts and rapid response services.
            </p>
            <button className="btn-primary w-full bg-red-600 hover:bg-red-700">
              Emergency Help
            </button>
          </div>

          <div className="card hover:border-primary-500 transition-colors cursor-pointer">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <Stethoscope className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-dark-primary">Hospital Finder</h3>
                <p className="text-sm text-dark-muted">Locate nearby care</p>
              </div>
            </div>
            <p className="text-dark-secondary mb-4">
              Find the nearest hospitals and healthcare providers in your area.
            </p>
            <button className="btn-primary w-full bg-blue-600 hover:bg-blue-700">
              Find Hospitals
            </button>
          </div>

          <div className="card hover:border-primary-500 transition-colors cursor-pointer">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-dark-primary">Family Care</h3>
                <p className="text-sm text-dark-muted">Manage family health</p>
              </div>
            </div>
            <p className="text-dark-secondary mb-4">
              Keep track of your entire family`s health records and appointments.
            </p>
            <button className="btn-primary w-full bg-purple-600 hover:bg-purple-700">
              Family Health
            </button>
          </div>

          <div className="card hover:border-primary-500 transition-colors cursor-pointer">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-dark-primary">Medical Reports</h3>
                <p className="text-sm text-dark-muted">View your reports</p>
              </div>
            </div>
            <p className="text-dark-secondary mb-4">
              Access and manage all your medical reports and test results.
            </p>
            <button className="btn-primary w-full bg-green-600 hover:bg-green-700">
              View Reports
            </button>
          </div>

          <div className="card hover:border-primary-500 transition-colors cursor-pointer">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-dark-primary">Settings</h3>
                <p className="text-sm text-dark-muted">Customize your experience</p>
              </div>
            </div>
            <p className="text-dark-secondary mb-4">
              Personalize your dashboard and notification preferences.
            </p>
            <button className="btn-primary w-full bg-orange-600 hover:bg-orange-700">
              Open Settings
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-dark-primary mb-6">Recent Activity</h2>
          <div className="card">
            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-4 bg-dark-accent/50 rounded-lg">
                <Bell className="w-5 h-5 text-primary-400" />
                <div className="flex-1">
                  <p className="text-dark-primary font-medium">Medication reminder sent</p>
                  <p className="text-sm text-dark-muted">Vitamin D - 2 hours ago</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 p-4 bg-dark-accent/50 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-400" />
                <div className="flex-1">
                  <p className="text-dark-primary font-medium">Appointment scheduled</p>
                  <p className="text-sm text-dark-muted">Dr. Smith - Next Tuesday at 10:00 AM</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 p-4 bg-dark-accent/50 rounded-lg">
                <FileText className="w-5 h-5 text-green-400" />
                <div className="flex-1">
                  <p className="text-dark-primary font-medium">Lab results available</p>
                  <p className="text-sm text-dark-muted">Blood test results - Yesterday</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}