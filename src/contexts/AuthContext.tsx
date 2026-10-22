import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  loginWithSkyTrack,
  getEmployeeProfile,
  resolveReportingManagerNameFromOrg,
  isUuid,
  type SkyTrackEmployee,
  type SkyTrackLoginResponse,
  SESSION_EXPIRED_EVENT
} from '../lib/api'

export interface UserSession {
  token: string
  employee: SkyTrackEmployee
  authenticatedAt: number
  expiresAt?: number
  role: 'admin' | 'employee'
}

export type AdminSession = UserSession

interface AuthContextType {
  session: UserSession | null
  employee: SkyTrackEmployee | null
  token: string | null
  isAdmin: boolean
  isEmployee: boolean
  userRole: 'admin' | 'employee' | null
  isLoading: boolean
  login: (employeeId: string, password: string, remember?: boolean) => Promise<{ success: boolean; error?: string; code?: string; role?: 'admin' | 'employee' }>
  logout: () => void
  updateEmployee: (partial: Partial<SkyTrackEmployee>) => void
  refreshProfile: () => Promise<SkyTrackEmployee | null>
}

const STORAGE_KEY = 'skytrack_session'
const LEGACY_STORAGE_KEY = 'skytrack_admin_session'

const AuthContext = createContext<AuthContextType>({
  session: null,
  employee: null,
  token: null,
  isAdmin: false,
  isEmployee: false,
  userRole: null,
  isLoading: true,
  login: async () => ({ success: false }),
  logout: () => {},
  updateEmployee: () => {},
  refreshProfile: async () => null,
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<UserSession | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Load session from storage on initial application mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(LEGACY_STORAGE_KEY)
      if (stored) {
        const parsed: UserSession = JSON.parse(stored)
        // Check if token has expired
        const isExpired = parsed?.expiresAt ? Date.now() > parsed.expiresAt : false

        if (parsed?.token && parsed?.employee && !isExpired) {
          const authorized = isAuthorizedAdmin(parsed.employee)
          parsed.role = parsed.role || (authorized ? 'admin' : 'employee')
          setSession(parsed)
        } else if (isExpired) {
          sessionStorage.removeItem(STORAGE_KEY)
          sessionStorage.removeItem(LEGACY_STORAGE_KEY)
          setSession(null)
        }
      }
    } catch (err) {
      console.error('Failed to parse stored session:', err)
      sessionStorage.removeItem(STORAGE_KEY)
      sessionStorage.removeItem(LEGACY_STORAGE_KEY)
      setSession(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Global listener for session expiration dispatched by API layers
  useEffect(() => {
    const handleSessionExpired = (event: any) => {
      console.warn('Handling session expiration:', event?.detail?.message)
      sessionStorage.removeItem(STORAGE_KEY)
      sessionStorage.removeItem(LEGACY_STORAGE_KEY)
      setSession(null)
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
        window.history.pushState(null, '', '/login')
      }
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
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
    _remember: boolean = true
  ): Promise<{ success: boolean; error?: string; code?: string; role?: 'admin' | 'employee' }> => {
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

      // Determine Clearance & Role
      const authorized = isAuthorizedAdmin(employee)
      const userRole: 'admin' | 'employee' = authorized ? 'admin' : 'employee'

      // Pre-resolve reporting manager name if employee object has reportingManagerId but not a name
      const repId = employee.reportingManagerId || employee.reporting_manager_id
      const currentMgrName = employee.managerName || employee.reporting_manager_name || employee.manager_name || employee.reportingManager
      if ((!currentMgrName || isUuid(currentMgrName) || currentMgrName.toLowerCase() === 'not assigned') && repId) {
        try {
          const resolvedName = await resolveReportingManagerNameFromOrg(token, repId)
          if (resolvedName) {
            employee.managerName = resolvedName
            employee.reporting_manager_name = resolvedName
            employee.reportingManager = resolvedName
            employee.manager_name = resolvedName
          }
        } catch (_) {}
      }

      const expiresIn = response.session?.expiresInSeconds || response.data?.session?.expiresInSeconds
      const expiresAt = expiresIn ? Date.now() + expiresIn * 1000 : undefined

      // Construct Session
      const newSession: UserSession = {
        token,
        employee,
        authenticatedAt: Date.now(),
        expiresAt,
        role: userRole,
      }

      // Persist Session (in sessionStorage only, so it survives refresh but requires login on new tab/launch)
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newSession))
      sessionStorage.removeItem(LEGACY_STORAGE_KEY)

      setSession(newSession)
      return { success: true, role: userRole }
    } catch (err: any) {
      console.error('SkyTrack Login Error:', err)
      const message =
        err?.message?.includes('Failed to fetch') || err?.name === 'TypeError'
          ? 'Unable to connect to SkyTrack authentication servers. Please verify your network connection or try signing in with your employee credentials.'
          : err?.message || 'An unexpected error occurred during authentication.'

      return {
        success: false,
        error: message,
        code: 'network_or_system_error',
      }
    }
  }

  /**
   * Log out the current session
   */
  const logout = () => {
    sessionStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(LEGACY_STORAGE_KEY)
    setSession(null)
    if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
      window.history.pushState(null, '', '/login')
    }
  }

  /**
   * Update the currently authenticated employee state and persist in sessionStorage
   */
  const updateEmployee = useCallback((partial: Partial<SkyTrackEmployee>) => {
    setSession(prev => {
      if (!prev) return null
      const updatedEmployee = { ...prev.employee, ...partial }
      const updatedSession: UserSession = {
        ...prev,
        employee: updatedEmployee
      }
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSession))
      } catch (err) {
        console.warn('Failed to update session in storage:', err)
      }
      return updatedSession
    })
  }, [])

  /**
   * Fetch latest profile from backend to ensure reporting manager, department, etc. are always fresh
   */
  const refreshProfile = useCallback(async (): Promise<SkyTrackEmployee | null> => {
    if (!session?.token) return null
    try {
      const res = await getEmployeeProfile(session.token)
      if (res && res.success && res.employee) {
        const freshEmp = res.employee as SkyTrackEmployee
        const repId = freshEmp.reportingManagerId || freshEmp.reporting_manager_id
        const curMgr = freshEmp.managerName || freshEmp.reporting_manager_name
        if ((!curMgr || isUuid(curMgr) || curMgr.toLowerCase() === 'not assigned') && repId) {
          const resolved = await resolveReportingManagerNameFromOrg(session.token, repId)
          if (resolved) {
            freshEmp.managerName = resolved
            freshEmp.reporting_manager_name = resolved
            freshEmp.reportingManager = resolved
            freshEmp.manager_name = resolved
          }
        }
        updateEmployee(freshEmp)
        return freshEmp
      }
    } catch (err) {
      console.warn('Failed to refresh profile in AuthContext:', err)
    }
    return null
  }, [session?.token, updateEmployee])

  // Automatically fetch fresh profile in background when session is active
  useEffect(() => {
    if (session?.token) {
      refreshProfile()
    }
  }, [session?.token, refreshProfile])

  const isAdmin = session ? isAuthorizedAdmin(session.employee) : false
  const isEmployee = session ? !isAdmin : false
  const userRole = session ? (isAdmin ? 'admin' : 'employee') : null

  return (
    <AuthContext.Provider
      value={{
        session,
        employee: session?.employee ?? null,
        token: session?.token ?? null,
        isAdmin,
        isEmployee,
        userRole,
        isLoading,
        login,
        logout,
        updateEmployee,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  return useContext(AuthContext)
}
