import React, { createContext, useContext, useEffect, useState } from 'react'
import { loginWithSkyTrack, type SkyTrackEmployee, type SkyTrackLoginResponse } from '../lib/api'

export interface AdminSession {
  token: string
  employee: SkyTrackEmployee
  authenticatedAt: number
  expiresAt?: number
}

interface AuthContextType {
  session: AdminSession | null
  employee: SkyTrackEmployee | null
  token: string | null
  isAdmin: boolean
  isLoading: boolean
  login: (employeeId: string, password: string, remember?: boolean) => Promise<{ success: boolean; error?: string; code?: string }>
  logout: () => void
}

const STORAGE_KEY = 'skytrack_admin_session'

const AuthContext = createContext<AuthContextType>({
  session: null,
  employee: null,
  token: null,
  isAdmin: false,
  isLoading: true,
  login: async () => ({ success: false }),
  logout: () => {},
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<AdminSession | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Load session from storage on initial application mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed: AdminSession = JSON.parse(stored)
        // Check if token has expired
        const isExpired = parsed?.expiresAt ? Date.now() > parsed.expiresAt : false

        if (parsed?.token && parsed?.employee && !isExpired) {
          // Verify admin status from the stored profile
          if (isAuthorizedAdmin(parsed.employee)) {
            setSession(parsed)
          } else {
            // Non-admin session found in storage, discard
            localStorage.removeItem(STORAGE_KEY)
            sessionStorage.removeItem(STORAGE_KEY)
            setSession(null)
          }
        } else if (isExpired) {
          localStorage.removeItem(STORAGE_KEY)
          sessionStorage.removeItem(STORAGE_KEY)
          setSession(null)
        }
      }
    } catch (err) {
      console.error('Failed to parse stored session:', err)
      localStorage.removeItem(STORAGE_KEY)
      sessionStorage.removeItem(STORAGE_KEY)
      setSession(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Helper to verify if an employee object has administrator privileges
   */
  function isAuthorizedAdmin(emp?: SkyTrackEmployee): boolean {
    if (!emp) return false

    const role = (
      emp.role ||
      emp.role_name ||
      emp.user_role ||
      emp.designation ||
      ''
    ).toLowerCase()

    const adminRoles = ['admin', 'super_admin', 'superadmin', 'administrator', 'system_admin', 'manager']
    const hasAdminRole = adminRoles.includes(role) || Boolean(emp.isAdmin) || Boolean(emp.is_admin)

    return hasAdminRole
  }

  /**
   * Authenticate via the existing SkyTrack Edge Function
   */
  const login = async (
    employeeId: string,
    password: string,
    remember: boolean = true
  ): Promise<{ success: boolean; error?: string; code?: string }> => {
    try {
      const response: SkyTrackLoginResponse = await loginWithSkyTrack(employeeId, password)

      // Handle failed response from SkyTrack API
      if (!response || response.success === false || response.error || response.code === 'BOOT_ERROR') {
        const code = response?.code || response?.error || 'auth_failed'
        const msg = response?.message || 'Invalid Employee ID or password.'
        return { success: false, error: msg, code }
      }

      // Extract access token and employee record from response structure
      const token =
        response.session?.token ||
        response.session?.accessToken ||
        response.session?.access_token ||
        response.token ||
        response.accessToken ||
        response.access_token ||
        response.data?.session?.token ||
        response.data?.token ||
        response.data?.accessToken ||
        response.data?.access_token

      const employee =
        response.employee ||
        response.user ||
        response.data?.employee ||
        response.data?.user ||
        response.data

      if (!token || !employee) {
        return {
          success: false,
          error: 'Malformed response received from SkyTrack authentication backend.',
          code: 'malformed_response',
        }
      }

      // Check Admin Portal Authorization
      const authorized = isAuthorizedAdmin(employee)
      if (!authorized) {
        // Normal employee who is allowed in Android app but forbidden from Admin Portal
        return {
          success: false,
          error: 'Access Denied: This account does not possess administrator clearance for the SkyTrack Admin Portal.',
          code: 'unauthorized_employee',
        }
      }

      const expiresIn = response.session?.expiresInSeconds || response.data?.session?.expiresInSeconds
      const expiresAt = expiresIn ? Date.now() + expiresIn * 1000 : undefined

      // Construct Session
      const newSession: AdminSession = {
        token,
        employee,
        authenticatedAt: Date.now(),
        expiresAt,
      }

      // Persist Session
      const storage = remember ? localStorage : sessionStorage
      storage.setItem(STORAGE_KEY, JSON.stringify(newSession))
      if (remember) {
        sessionStorage.removeItem(STORAGE_KEY)
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }

      setSession(newSession)
      return { success: true }
    } catch (err: any) {
      console.error('SkyTrack Login Error:', err)
      const message =
        err?.message?.includes('Failed to fetch') || err?.name === 'TypeError'
          ? 'Unable to connect to SkyTrack authentication servers. Please verify your network connection.'
          : err?.message || 'An unexpected error occurred during authentication.'

      return {
        success: false,
        error: message,
        code: 'network_or_system_error',
      }
    }
  }

  /**
   * Log out the current administrator session
   */
  const logout = () => {
    localStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(STORAGE_KEY)
    setSession(null)
  }

  const isAdmin = session ? isAuthorizedAdmin(session.employee) : false

  return (
    <AuthContext.Provider
      value={{
        session,
        employee: session?.employee ?? null,
        token: session?.token ?? null,
        isAdmin,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  return useContext(AuthContext)
}
