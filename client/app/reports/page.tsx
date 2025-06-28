'use client'
import { Heart, LogOut } from 'lucide-react'
import React from 'react'

const ReportsPage = () => {
  const handleLogout = () => {
    // Logic for logging out the user
    console.log('Logging out...')
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Reports</h1>
      <div className="flex items-center space-x-2 mb-4">
        <Heart className="w-6 h-6 text-red-500" />
        <span className="text-lg">Your Reports</span>
      </div>
      <p className="mb-4">Here you can view your reports.</p>
      <button
        onClick={handleLogout}
        className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        <LogOut className="w-4 h-4 mr-2" />
        Logout
      </button>
    </div>
  )
}

export default ReportsPage