import React from 'react'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, isAdmin, isLoading, logout } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f4f6fb] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="w-8 h-8 rounded-full bg-red-500 animate-ping"></span>
          <p className="text-sm font-semibold text-slate-500">Verifying Clearance...</p>
        </div>
      </div>
    )
  }

  // If no session exists, ProtectedRoute returns null (App.tsx renders Login)
  if (!session) {
    return null
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#f4f6fb] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-6 shadow-sm border border-red-100">
          <span className="material-symbols-outlined text-[40px]">gpp_bad</span>
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Access Denied</h2>
        <p className="text-slate-500 max-w-md mx-auto mb-6 text-sm leading-relaxed">
          You are authenticated as an employee, but your account does not have administrator clearance for the SkyTrack Admin Portal.
        </p>
        <button
          onClick={logout}
          className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-md"
        >
          Return to Login
        </button>
      </div>
    )
  }

  return <>{children}</>
}
