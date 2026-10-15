/**
 * SkyTrack API Client
 * Connects to the existing SkyTrack Supabase backend.
 */

import { supabase } from './supabase'

const SUPABASE_BASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://cwtrrtbodqctntkpnjlv.supabase.co'

const SKYTRACK_API_URL =
  import.meta.env.VITE_SKYTRACK_API_URL || '/api/skytrack'

const SUPABASE_REST_URL =
  import.meta.env.VITE_SUPABASE_REST_URL ||
  `${SUPABASE_BASE_URL}/rest/v1`

const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_hvKs5JBFtNafLUmmsD0WHw_6mWC6oEc'

export interface SkyTrackEmployee {
  id?: string
  employeeId?: string
  employee_id?: string
  name?: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  role?: string
  role_name?: string
  user_role?: string
  isAdmin?: boolean
  is_admin?: boolean
  department?: string
  designation?: string
  joining_date?: string
  status?: string
  avatar_url?: string
  profile_photo_url?: string
  created_at?: string
  updated_at?: string
  reporting_manager_id?: string | null
  department_id?: string | null
  work_shift_id?: string | null
  [key: string]: any
}

export interface SkyTrackLoginResponse {
  success: boolean
  message?: string
  code?: string
  session?: {
    token?: string
    accessToken?: string
    access_token?: string
    expiresInSeconds?: number
    [key: string]: any
  }
  token?: string
  accessToken?: string
  access_token?: string
  employee?: SkyTrackEmployee
  user?: SkyTrackEmployee
  data?: {
    token?: string
    accessToken?: string
    access_token?: string
    employee?: SkyTrackEmployee
    user?: SkyTrackEmployee
    session?: {
      token?: string
      accessToken?: string
      access_token?: string
      expiresInSeconds?: number
      [key: string]: any
    }
    [key: string]: any
  }
  error?: string
}

export interface DashboardSummary {
  totalEmployees: number
  employeeGrowth: string | null
  presentToday: number
  presentPercentage: number
  absentToday: number
  absentPercentage: number
  onLeave: number
  pendingLeaveRequests: number
}

export interface DashboardAttendanceRecord {
  id: string
  name: string
  employeeId: string
  avatar: string | null
  initials?: string
  initialsBg?: string
  initialsColor?: string
  date: string
  startTime: string
  endTime: string
  status: 'Present' | 'Late' | 'Absent' | 'Half Day' | 'Leave'
}

export interface DashboardLeaveRequest {
  id: string
  name: string
  employeeId: string
  dates: string
  type: string
  reason: string
  fullReason: string
  status: 'Pending' | 'Approved' | 'Rejected'
}

export interface DashboardRecentActivity {
  id: string
  user: string
  employeeId: string
  action: string
  badgeText?: string
  badgeColor?: string
  time: string
  timestamp: string
  activityType: 'start_work' | 'end_work' | 'leave_request'
  icon: string
  iconBg: string
  iconColor: string
}

export interface DashboardData {
  admin: {
    name: string
    operationalDate: string
  }
  summary: DashboardSummary
  todayAttendance: DashboardAttendanceRecord[]
  pendingLeaveRequests: DashboardLeaveRequest[]
  recentActivity: DashboardRecentActivity[]
}

export interface Department {
  id: string
  department_name: string
  department_code?: string | null
  description?: string | null
  status: string
}

export interface WorkShift {
  id: string
  shift_name: string
  shift_code?: string | null
  start_time: string
  end_time: string
  break_minutes: number
  working_minutes: number
  status: string
}

export interface OrganizationManager {
  id: string
  employee_id: string
  name: string
  role: string
  status: string
}

export interface OrganizationData {
  departments: Department[]
  work_shifts: WorkShift[]
  managers: OrganizationManager[]
}

/**
 * Sends a login request to the existing SkyTrack Edge Function
 */
export async function loginWithSkyTrack(
  employeeId: string,
  password: string
): Promise<SkyTrackLoginResponse> {
  const cleanId = employeeId.trim()

  // 1. Direct Supabase Auth attempt if input is an email address
  if (cleanId.includes('@')) {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanId,
        password,
      })

      if (!authError && authData.session && authData.user) {
        const token = authData.session.access_token
        const profile = await getAdminProfile(token, authData.user.id)
        if (profile) {
          return {
            success: true,
            session: {
              token,
              accessToken: token,
              expiresInSeconds: authData.session.expires_in,
            },
            employee: profile,
          }
        }
      }
    } catch (directAuthErr) {
      console.warn('Direct Supabase email login fallback error:', directAuthErr)
    }
  }

  // 2. Query SkyTrack Edge Function with automated failover
  const payload = {
    action: 'login',
    employeeId: cleanId,
    password,
  }

  const directEdgeUrl = `${SUPABASE_BASE_URL}/functions/v1/skytrack-api`
  const endpointsToTry = [
    SKYTRACK_API_URL,
    SKYTRACK_API_URL !== directEdgeUrl ? directEdgeUrl : '/api/skytrack',
  ].filter(Boolean)

  let lastError: any = null

  for (const url of endpointsToTry) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(payload),
      })

      let data: any
      try {
        data = await response.json()
      } catch (err) {
        // Non-JSON response (e.g. static server returning index.html for 404) -> try next endpoint
        continue
      }

      if (!response.ok && data) {
        return {
          success: false,
          error: data.code || data.error || 'http_error',
          message: data.message || data.msg || 'Authentication failed.',
        }
      }

      return data as SkyTrackLoginResponse
    } catch (err: any) {
      lastError = err
      // Try next endpoint in list
    }
  }

  if (lastError) {
    throw lastError
  }

  throw new Error('Unable to connect to SkyTrack authentication servers.')
}

/**
 * Performs authenticated REST queries against Supabase
 */
async function fetchSupabaseRest<T = any>(
  path: string,
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${SUPABASE_REST_URL}/${path}`, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('SESSION_EXPIRED')
    }
    throw new Error(`Supabase query failed: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Performs authenticated REST PATCH queries against Supabase
 */
async function patchSupabaseRest<T = any>(
  path: string,
  body: any,
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${SUPABASE_REST_URL}/${path}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('SESSION_EXPIRED')
    }
    throw new Error(`Supabase query failed: ${response.statusText}`)
  }

  if (response.status === 204) return {} as T
  const text = await response.text()
  return text ? JSON.parse(text) : ({} as T)
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(val?: string | null): boolean {
  if (!val) return false
  return UUID_REGEX.test(val.trim())
}

/**
 * Checks if the current time in IST (Asia/Kolkata) is at or past 11:59 PM (23:59)
 */
export function isCurrentTimePast1159(): boolean {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour12: false,
      hour: 'numeric',
      minute: 'numeric',
    }).formatToParts(new Date())
    const h = Number(parts.find(p => p.type === 'hour')?.value ?? 0)
    const m = Number(parts.find(p => p.type === 'minute')?.value ?? 0)
    return h === 23 && m >= 59
  } catch {
    return false
  }
}

/**
 * Returns true if the target date has passed 11:59 PM (all past dates, or today if >= 23:59 IST)
 */
export function isDatePast1159(dateStr: string, todayIso: string): boolean {
  if (dateStr < todayIso) return true
  if (dateStr > todayIso) return false
  return isCurrentTimePast1159()
}

/**
 * Formats an ISO date or timestamp into readable 12-hour time string in IST (e.g. 06:00 PM)
 */
function formatTime(isoStr?: string | null): string {
  if (!isoStr) return '—'
  try {
    const d = new Date(isoStr)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    })
  } catch {
    return '—'
  }
}

/**
 * Formats a Date object or date string (e.g. "2026-09-21") into "21 Sep 2026"
 */
function formatDate(dateStr?: string | null): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

/**
 * Formats full operational date (e.g. "Monday, 21 Sep 2026")
 */
function formatOperationalDate(d: Date): string {
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export async function getOrganizationData(token: string): Promise<OrganizationData> {
  const payload = { action: 'organization_data' }
  const response = await fetch(SKYTRACK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload),
  })

  let data: any
  try {
    data = await response.json()
  } catch (err) {
    throw new Error('Invalid JSON response.')
  }

  if (!response.ok || !data.success) {
    if (response.status === 401 || response.status === 403 || data.error === 'invalid_session') {
      throw new Error('SESSION_EXPIRED')
    }
    throw new Error(data.message || 'Failed to load organization data.')
  }
  return data as OrganizationData
}

export async function updateEmployeeOrganization(
  token: string,
  employeeId: string,
  reportingManagerId: string | null,
  departmentId: string | null,
  workShiftId: string | null
): Promise<{ success: boolean; message?: string }> {
  const payload = {
    action: 'update_employee_organization',
    employeeId,
    reportingManagerId,
    departmentId,
    workShiftId
  }
  const response = await fetch(SKYTRACK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload),
  })

  let data: any
  try {
    data = await response.json()
  } catch (err) {
    throw new Error('Invalid JSON response.')
  }

  if (!response.ok || !data.success) {
    if (response.status === 401 || response.status === 403 || data.error === 'invalid_session') {
      throw new Error('SESSION_EXPIRED')
    }
    throw new Error(data.message || 'Failed to update organization data.')
  }
  return data
}

export async function updateWorkShift(
  token: string,
  shiftId: string,
  startTime: string,
  endTime: string,
  workingMinutes: number
) {
  return patchSupabaseRest(`work_shifts?id=eq.${shiftId}`, {
    start_time: startTime,
    end_time: endTime,
    working_minutes: workingMinutes
  }, token)
}

/**
 * Fetches and builds complete Dashboard operational data from real Supabase records
 */
export async function getAdminDashboardData(
  token: string,
  adminEmployee?: SkyTrackEmployee | null
): Promise<DashboardData> {
  const now = new Date()
  const todayIsoDate = now.toISOString().slice(0, 10) // "YYYY-MM-DD"
  const operationalDate = formatOperationalDate(now)

  // Fetch employees, today's attendance, and leaves concurrently
  const [employeesData, attendanceData, leavesData] = await Promise.all([
    fetchSupabaseRest<SkyTrackEmployee[]>('employees?select=*&order=name.asc', token),
    fetchSupabaseRest<any[]>(
      `attendance?attendance_date=eq.${todayIsoDate}&select=*,employees:employees(id,name,employee_id,profile_photo_url)`,
      token
    ),
    fetchSupabaseRest<any[]>(
      'leaves?select=*,employees:employees!leaves_employee_id_fkey(id,name,employee_id,profile_photo_url)&order=created_at.desc',
      token
    ),
  ])

  const employees = employeesData || []
  const attendanceList = attendanceData || []
  const leavesList = leavesData || []

  // 1. Total Employees
  const totalEmployees = employees.length

  // Calculate growth (net additions in the past 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const recentAdditions = employees.filter((emp) => {
    const dateStr = emp.joining_date || emp.created_at
    return dateStr ? new Date(dateStr) >= thirtyDaysAgo : false
  }).length
  const employeeGrowth = recentAdditions > 0 ? `+${recentAdditions}` : null

  // 2. Leaves Analysis (On Leave today & Pending Requests)
  const activeApprovedLeavesToday = leavesList.filter((lv) => {
    if (lv.status?.toLowerCase() !== 'approved') return false
    const from = lv.from_date || ''
    const to = lv.to_date || from
    return from <= todayIsoDate && to >= todayIsoDate
  })
  const onLeaveCount = activeApprovedLeavesToday.length

  const pendingLeaves = leavesList.filter(
    (lv) => lv.status?.toLowerCase() === 'pending'
  )
  const pendingLeaveRequestsCount = pendingLeaves.length

  // 3. Attendance Analysis (Present Today & Absent Today)
  const presentRecords = attendanceList.filter((att) => {
    const status = (att.status || '').toLowerCase()
    return (
      status === 'present' ||
      status === 'late' ||
      status === 'half_day' ||
      status === 'half day' ||
      Boolean(att.check_in)
    )
  })
  const presentToday = presentRecords.length

  // Absent Today: Employees without check-in AND not on approved leave today
  const absentToday = Math.max(0, totalEmployees - presentToday - onLeaveCount)

  // Calculate percentages safely without division by zero
  const presentPercentage =
    totalEmployees > 0
      ? Math.round((presentToday / totalEmployees) * 1000) / 10
      : 0
  const absentPercentage =
    totalEmployees > 0
      ? Math.round((absentToday / totalEmployees) * 1000) / 10
      : 0

  // 4. Today's Attendance Table Records
  // Map all registered employees to show a complete status representation
  const todayAttendance: DashboardAttendanceRecord[] = employees.map((emp) => {
    const attRecord = attendanceList.find(
      (a) => a.employee_id === emp.id || a.employee_id === emp.employee_id
    )
    const isOnApprovedLeave = activeApprovedLeavesToday.some(
      (lv) => lv.employee_id === emp.id || lv.employee_id === emp.employee_id
    )

    let status: 'Present' | 'Late' | 'Absent' | 'Half Day' | 'Leave' = 'Absent'
    let startTime = '—'
    let endTime = '—'

    if (attRecord) {
      startTime = formatTime(attRecord.check_in)
      endTime = formatTime(attRecord.check_out)
      const rawStatus = (attRecord.status || '').toLowerCase()
      if (rawStatus === 'late') {
        status = 'Late'
      } else if (rawStatus === 'half_day' || rawStatus === 'half day') {
        status = 'Half Day'
      } else if (rawStatus === 'leave') {
        status = 'Leave'
      } else if (rawStatus === 'absent') {
        status = 'Absent'
      } else {
        status = 'Present'
      }
    } else if (isOnApprovedLeave) {
      status = 'Leave'
    } else {
      status = 'Absent'
    }

    const initials = emp.name
      ? emp.name
          .split(' ')
          .filter(Boolean)
          .map((n: string) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase()
      : 'SK'

    return {
      id: attRecord?.id || emp.id || String(Math.random()),
      name: emp.name || 'Unnamed Employee',
      employeeId: emp.employee_id || emp.employeeId || '—',
      avatar: emp.profile_photo_url || emp.avatar_url || null,
      initials,
      date: formatDate(todayIsoDate),
      startTime,
      endTime,
      status,
    }
  })

  // 5. Pending Leave Requests
  const pendingLeaveRequests: DashboardLeaveRequest[] = pendingLeaves.map((lv) => {
    const emp = lv.employees || {}
    let dates = formatDate(lv.from_date)
    if (lv.to_date && lv.to_date !== lv.from_date) {
      dates = `${formatDate(lv.from_date)} → ${formatDate(lv.to_date)}`
    }

    return {
      id: lv.id,
      name: emp.name || 'Employee',
      employeeId: emp.employee_id || '—',
      dates,
      type: lv.leave_type || 'Leave',
      reason: lv.reason || 'No reason specified',
      fullReason: lv.reason || 'No reason specified',
      status: 'Pending',
    }
  })

  // 6. Recent Activity Feed (Derived strictly from real attendance and leave events)
  const activities: DashboardRecentActivity[] = []

  // Check-ins
  attendanceList.forEach((att) => {
    if (att.check_in) {
      const emp = att.employees || {}
      const time = formatTime(att.check_in)
      const isLate = (att.status || '').toLowerCase() === 'late'
      activities.push({
        id: `att-in-${att.id}`,
        user: emp.name || 'Employee',
        employeeId: emp.employee_id || '—',
        action: `started work at ${time}`,
        badgeText: isLate ? '(Late)' : undefined,
        badgeColor: isLate ? 'text-red-600 bg-red-50 border border-red-100' : undefined,
        time,
        timestamp: att.check_in,
        activityType: 'start_work',
        icon: isLate ? 'schedule' : 'login',
        iconBg: isLate ? 'bg-red-50' : 'bg-emerald-50',
        iconColor: isLate ? 'text-red-600 border-red-100' : 'text-emerald-600 border-emerald-100',
      })
    }

    if (att.check_out) {
      const emp = att.employees || {}
      const time = formatTime(att.check_out)
      const isHalf = (att.status || '').toLowerCase().includes('half')
      activities.push({
        id: `att-out-${att.id}`,
        user: emp.name || 'Employee',
        employeeId: emp.employee_id || '—',
        action: `ended work at ${time}`,
        badgeText: isHalf ? '(Half Day)' : undefined,
        badgeColor: isHalf ? 'text-slate-600 bg-slate-100 border border-slate-200' : undefined,
        time,
        timestamp: att.check_out,
        activityType: 'end_work',
        icon: 'logout',
        iconBg: 'bg-slate-100',
        iconColor: 'text-slate-700 border-slate-200',
      })
    }
  })

  // Leave Submissions
  leavesList.forEach((lv) => {
    const emp = lv.employees || {}
    let dateRange = formatDate(lv.from_date)
    if (lv.to_date && lv.to_date !== lv.from_date) {
      dateRange = `${formatDate(lv.from_date)} - ${formatDate(lv.to_date)}`
    }
    const time = formatTime(lv.created_at)
    activities.push({
      id: `leave-sub-${lv.id}`,
      user: emp.name || 'Employee',
      employeeId: emp.employee_id || '—',
      action: `submitted ${lv.leave_type || 'Leave'} request (${dateRange})`,
      time,
      timestamp: lv.created_at || now.toISOString(),
      activityType: 'leave_request',
      icon: 'edit_calendar',
      iconBg: 'bg-red-50',
      iconColor: 'text-red-600 border-red-100',
    })
  })

  // Sort activities by timestamp descending
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  const recentActivity = activities.slice(0, 10)

  // Admin Profile Name
  const adminName =
    adminEmployee?.name ||
    (adminEmployee?.first_name ? `${adminEmployee.first_name} ${adminEmployee.last_name || ''}`.trim() : null) ||
    'Admin'

  return {
    admin: {
      name: adminName,
      operationalDate,
    },
    summary: {
      totalEmployees,
      employeeGrowth,
      presentToday,
      presentPercentage,
      absentToday,
      absentPercentage,
      onLeave: onLeaveCount,
      pendingLeaveRequests: pendingLeaveRequestsCount,
    },
    todayAttendance,
    pendingLeaveRequests,
    recentActivity,
  }
}

export interface EmployeeDirectoryItem {
  id: string
  code: string
  employee_id: string
  name: string
  role: string
  designation?: string
  department: string
  email: string
  phone?: string
  joiningDate?: string
  avatar: string
  initials?: string
  initialsBg?: string
  initialsColor?: string
  attendanceToday: {
    type: 'present' | 'late' | 'absent' | 'half_day' | 'leave'
    label: string
    time?: string
  }
  leaveStatus: {
    status: 'none' | 'pending' | 'approved'
    type?: string
  }
  accountStatus: 'Active' | 'Suspended' | 'Pending'
  filterCategory: 'present' | 'leave' | 'absent'
  reportingManagerId?: string | null
  departmentId?: string | null
  workShiftId?: string | null
}

export interface AttendanceHistoryItem {
  id: string
  date: string
  startTime: string
  endTime: string
  status: 'Present' | 'Week Off' | 'Late' | 'Half Day' | 'Leave' | 'Absent'
  hours?: string
  workedMinutes?: number | null
  breakMinutes?: number | null
}

export interface LeaveHistoryItem {
  id: string
  from: string
  to: string
  type: string
  reason: string
  status: 'Approved' | 'Pending' | 'Rejected'
}

/**
 * Fetches all employees with their live attendance & leave status
 */
export async function getEmployeesDirectory(
  token: string
): Promise<EmployeeDirectoryItem[]> {
  const now = new Date()
  const todayIsoDate = now.toISOString().slice(0, 10)

  const [employeesData, attendanceData, leavesData, deptsData] = await Promise.all([
    fetchSupabaseRest<SkyTrackEmployee[]>('employees?select=*&order=name.asc', token),
    fetchSupabaseRest<any[]>(
      `attendance?attendance_date=eq.${todayIsoDate}&select=*`,
      token
    ),
    fetchSupabaseRest<any[]>('leaves?select=*&order=created_at.desc', token),
    fetchSupabaseRest<any[]>('departments?select=*', token),
    fetchSupabaseRest<any[]>('work_shifts?select=*', token)
  ])

  const employees = employeesData || []
  const attendanceList = attendanceData || []
  const leavesList = leavesData || []

  return employees.map((emp) => {
    const attRecord = attendanceList.find(
      (a) => a.employee_id === emp.id || a.employee_id === emp.employee_id
    )

    const activeApprovedLeave = leavesList.find((lv) => {
      if (lv.employee_id !== emp.id && lv.employee_id !== emp.employee_id) return false
      if (lv.status?.toLowerCase() !== 'approved') return false
      const from = lv.from_date || ''
      const to = lv.to_date || from
      return from <= todayIsoDate && to >= todayIsoDate
    })

    const pendingLeave = leavesList.find((lv) => {
      if (lv.employee_id !== emp.id && lv.employee_id !== emp.employee_id) return false
      return lv.status?.toLowerCase() === 'pending'
    })

    let attType: 'present' | 'late' | 'absent' | 'half_day' | 'leave' = 'absent'
    let attLabel = 'Absent'
    let attTime: string | undefined = undefined

    if (attRecord) {
      const rawStatus = (attRecord.status || '').toLowerCase()
      if (rawStatus === 'late') {
        attType = 'late'
        attLabel = 'Late'
      } else if (rawStatus === 'half_day' || rawStatus === 'half day') {
        attType = 'half_day'
        attLabel = 'Half Day'
      } else if (rawStatus === 'leave') {
        attType = 'leave'
        attLabel = 'Leave'
      } else {
        attType = 'present'
        attLabel = 'Present'
      }
      attTime = formatTime(attRecord.check_in)
    } else if (activeApprovedLeave) {
      attType = 'leave'
      attLabel = 'Leave'
    } else {
      attType = 'absent'
      attLabel = 'Absent'
    }

    let leaveStatusObj: { status: 'none' | 'pending' | 'approved'; type?: string } = {
      status: 'none',
    }
    if (pendingLeave) {
      leaveStatusObj = {
        status: 'pending',
        type: pendingLeave.leave_type || 'Casual',
      }
    } else if (activeApprovedLeave) {
      leaveStatusObj = {
        status: 'approved',
        type: activeApprovedLeave.leave_type || 'Annual',
      }
    }

    let filterCategory: 'present' | 'leave' | 'absent' = 'absent'
    if (attType === 'present' || attType === 'late' || attType === 'half_day') {
      filterCategory = 'present'
    } else if (attType === 'leave') {
      filterCategory = 'leave'
    } else {
      filterCategory = 'absent'
    }

    const rawAccountStatus = (emp.status || 'active').toLowerCase()
    const accountStatus: 'Active' | 'Suspended' | 'Pending' =
      rawAccountStatus === 'suspended'
        ? 'Suspended'
        : rawAccountStatus === 'pending'
        ? 'Pending'
        : 'Active'

    const initials = emp.name
      ? emp.name
          .split(' ')
          .filter(Boolean)
          .map((n: string) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase()
      : 'SK'

    const employee_id = emp.employee_id || emp.employeeId || emp.code || ''
    return {
      id: emp.id || String(Math.random()),
      code: employee_id || '—',
      employee_id,
      name: emp.name || 'Unnamed Employee',
      role: emp.role || 'employee',
      designation: emp.designation || 'Field Personnel',
      department: emp.department_id ? (deptsData?.find(d => d.id === emp.department_id)?.department_name || emp.department) : (emp.department || 'Department Not Set'),
      email: emp.email || '—',
      phone: emp.phone || '—',
      joiningDate: emp.joining_date ? formatDate(emp.joining_date) : '—',
      avatar: emp.profile_photo_url || emp.avatar_url || '',
      initials,
      attendanceToday: {
        type: attType,
        label: attLabel,
        time: attTime,
      },
      leaveStatus: leaveStatusObj,
      accountStatus,
      filterCategory,
      reportingManagerId: emp.reporting_manager_id || null,
      departmentId: emp.department_id || null,
      workShiftId: emp.work_shift_id || null,
    }
  })
}

/**
 * Fetches complete attendance and leave history for a specific employee
 */
export async function getEmployeeHistory(
  token: string,
  employeeDbId: string
): Promise<{
  attendanceHistory: AttendanceHistoryItem[]
  leaveHistory: LeaveHistoryItem[]
}> {
  let resolvedUuid = employeeDbId
  if (!isUuid(employeeDbId)) {
    try {
      const emp = await fetchSupabaseRest<SkyTrackEmployee[]>(
        `employees?employee_id=eq.${employeeDbId}&select=id&limit=1`,
        token
      )
      if (emp?.[0]?.id) {
        resolvedUuid = emp[0].id
      }
    } catch (lookupErr) {
      console.warn('Error resolving employeeDbId to UUID:', lookupErr)
    }
  }

  const [attendanceData, leavesData] = await Promise.all([
    fetchSupabaseRest<any[]>(
      `attendance?employee_id=eq.${resolvedUuid}&order=attendance_date.desc&limit=30`,
      token
    ),
    fetchSupabaseRest<any[]>(
      `leaves?employee_id=eq.${resolvedUuid}&order=created_at.desc&limit=30`,
      token
    ),
  ])

  const attendanceList = attendanceData || []
  const leavesList = leavesData || []

  const attendanceHistory: AttendanceHistoryItem[] = attendanceList.map((att) => {
    let status: 'Present' | 'Week Off' | 'Late' | 'Half Day' | 'Leave' | 'Absent' =
      'Present'
    const rawStatus = (att.status || '').toLowerCase()
    if (rawStatus === 'late') status = 'Late'
    else if (rawStatus === 'half_day' || rawStatus === 'half day') status = 'Half Day'
    else if (rawStatus === 'week_off' || rawStatus === 'week off') status = 'Week Off'
    else if (rawStatus === 'leave') status = 'Leave'
    else if (rawStatus === 'absent') status = 'Absent'

    let hours: string | undefined
    if (att.worked_minutes != null) {
      const h = Math.floor(att.worked_minutes / 60)
      const m = att.worked_minutes % 60
      hours = `${h}h ${String(m).padStart(2, '0')}m`
    }

    return {
      id: att.id,
      date: formatDate(att.attendance_date),
      startTime: formatTime(att.check_in),
      endTime: formatTime(att.check_out),
      status,
      hours,
      workedMinutes: att.worked_minutes ?? null,
      breakMinutes: att.break_minutes ?? null,
    }
  })

  const leaveHistory: LeaveHistoryItem[] = leavesList.map((lv) => {
    let status: 'Approved' | 'Pending' | 'Rejected' = 'Pending'
    const rawStatus = (lv.status || '').toLowerCase()
    if (rawStatus === 'approved') status = 'Approved'
    else if (rawStatus === 'rejected') status = 'Rejected'

    return {
      id: lv.id,
      from: formatDate(lv.from_date),
      to: formatDate(lv.to_date || lv.from_date),
      type: lv.leave_type || 'Leave',
      reason: lv.reason || 'No reason provided',
      status,
    }
  })

  return {
    attendanceHistory,
    leaveHistory,
  }
}

export interface FullAttendanceRecord {
  id: string
  employeeDbId: string
  employeeId: string
  employeeName: string
  role: string
  department: string
  shiftStart?: string
  shiftEnd?: string
  avatar?: string
  initials?: string
  initialsBg?: string
  initialsColor?: string
  date: string
  startWork: string
  endWork: string
  status: 'Present' | 'Late' | 'Absent' | 'Half Day' | 'Leave'
  workedMinutes?: number | null
  breakMinutes?: number | null
  activeHours?: string
  history: {
    date: string
    time: string
    status: 'Present' | 'Late' | 'Absent' | 'Half Day' | 'Leave'
  }[]
  joiningDate?: string
  created_at?: string
  email?: string
  phone?: string
}

/**
 * Accurately compute worked minutes taking into account breaks and historical unclosed punches
 */
function computeWorkedMinutes(att: any, targetDate: string, isToday: boolean): number {
  if (!att?.check_in) return 0
  const breakMins = att.break_minutes ?? (att.total_break_seconds ? Math.round(att.total_break_seconds / 60) : 0)
  if (att.worked_minutes != null && att.worked_minutes > 0) {
    return att.worked_minutes
  }
  const checkInTime = new Date(att.check_in).getTime()
  if (!Number.isFinite(checkInTime)) return 0

  if (att.check_out) {
    const checkOutTime = new Date(att.check_out).getTime()
    if (!Number.isFinite(checkOutTime)) return 0
    return Math.max(0, Math.floor((checkOutTime - checkInTime) / 60000) - breakMins)
  }

  if (isToday) {
    return Math.max(0, Math.floor((Date.now() - checkInTime) / 60000) - breakMins)
  }

  // Historical punch missing checkout: credit until shift end (18:00 IST / 12:30 UTC) minus breaks
  const [y, m, d] = targetDate.split('-').map(Number)
  const shiftEndUtc = Date.UTC(y, m - 1, d, 12, 30, 0)
  const grossEnd = Math.max(shiftEndUtc, checkInTime + 3600 * 1000)
  const grossMins = Math.max(0, Math.floor((grossEnd - checkInTime) / 60000))
  const netMins = Math.max(0, grossMins - breakMins)
  return netMins > 0 ? netMins : 60
}

/**
 * Fetches attendance records and employee history for the Attendance module
 */
export async function getDailyAttendance(
  token: string,
  targetDateStr?: string
): Promise<{
  records: FullAttendanceRecord[]
  counts: {
    all: number
    present: number
    late: number
    absent: number
    halfDay: number
    leave: number
  }
}> {
  const todayIso = new Date().toISOString().slice(0, 10)
  const targetDate = targetDateStr || todayIso
  const isTargetToday = targetDate === todayIso

  const [employeesData, attendanceData, leavesData, allRecentAttendance, deptsData, shiftsData] =
    await Promise.all([
      fetchSupabaseRest<SkyTrackEmployee[]>('employees?select=*&order=name.asc', token),
      fetchSupabaseRest<any[]>(
        `attendance?attendance_date=eq.${targetDate}&select=*`,
        token
      ),
      fetchSupabaseRest<any[]>('leaves?select=*&order=created_at.desc', token),
      fetchSupabaseRest<any[]>(
        'attendance?select=*&order=attendance_date.desc&limit=150',
        token
      ),
      fetchSupabaseRest<any[]>('departments?select=*', token),
      fetchSupabaseRest<any[]>('work_shifts?select=*', token)
    ])

  const employees = employeesData || []
  const attendanceList = attendanceData || []
  const leavesList = leavesData || []
  const recentAttendanceList = allRecentAttendance || []

  let presentCount = 0
  let lateCount = 0
  let halfDayCount = 0
  let leaveCount = 0
  let absentCount = 0

  const records: FullAttendanceRecord[] = employees.map((emp) => {
    const attRecord = attendanceList.find(
      (a) => a.employee_id === emp.id || a.employee_id === emp.employee_id
    )

    const activeApprovedLeave = leavesList.find((lv) => {
      if (lv.employee_id !== emp.id && lv.employee_id !== emp.employee_id) return false
      if (lv.status?.toLowerCase() !== 'approved') return false
      const from = lv.from_date || ''
      const to = lv.to_date || from
      return from <= targetDate && to >= targetDate
    })

    let status: 'Present' | 'Late' | 'Absent' | 'Half Day' | 'Leave' = 'Absent'
    let startWork = '—'
    let endWork = '—'
    let workedMinutes: number | null = null
    let breakMinutes: number | null = null
    let activeHours: string | undefined

    if (attRecord && attRecord.check_in) {
      startWork = formatTime(attRecord.check_in)
      const past1159 = isDatePast1159(targetDate, todayIso)
      if (attRecord.check_out) {
        endWork = formatTime(attRecord.check_out)
      } else {
        endWork = past1159 ? '06:00 PM' : '— (In Progress)'
      }

      breakMinutes = attRecord.break_minutes ?? (attRecord.total_break_seconds ? Math.round(attRecord.total_break_seconds / 60) : 0)
      workedMinutes = computeWorkedMinutes(attRecord, targetDate, isTargetToday)
      const h = Math.floor(workedMinutes / 60)
      const m = workedMinutes % 60
      activeHours = `${h}h ${String(m).padStart(2, '0')}m`

      const rawStatus = (attRecord.status || '').toLowerCase()
      if (rawStatus === 'late') {
        status = 'Late'
        lateCount++
      } else if (rawStatus === 'half_day' || rawStatus === 'half day') {
        status = 'Half Day'
        halfDayCount++
      } else {
        status = 'Present'
        presentCount++
      }
    } else if (activeApprovedLeave) {
      status = 'Leave'
      leaveCount++
    } else {
      status = 'Absent'
      absentCount++
    }

    // Build history items for this specific employee
    const empPastAttendance = recentAttendanceList.filter(
      (a) => a.employee_id === emp.id || a.employee_id === emp.employee_id
    )

    const history = empPastAttendance.slice(0, 5).map((a) => {
      const isHistoryItemToday = a.attendance_date === todayIso
      const dateLabel = isHistoryItemToday ? `${formatDate(a.attendance_date)} (Today)` : formatDate(a.attendance_date)
      const inTime = formatTime(a.check_in)
      const past1159 = isDatePast1159(a.attendance_date, todayIso)
      const outTime = a.check_out ? formatTime(a.check_out) : isHistoryItemToday && !past1159 ? 'Ongoing' : '06:00 PM'
      const timeStr = a.check_out || past1159 ? `${inTime} — ${outTime}` : `${inTime} (${outTime})`

      let histStatus: 'Present' | 'Late' | 'Absent' | 'Half Day' | 'Leave' = 'Present'
      const raw = (a.status || '').toLowerCase()
      if (raw === 'late') histStatus = 'Late'
      else if (raw === 'half_day' || raw === 'half day') histStatus = 'Half Day'
      else if (raw === 'leave' && !a.check_in) histStatus = 'Leave'
      else if (raw === 'absent' && !a.check_in) histStatus = 'Absent'

      return {
        date: dateLabel,
        time: timeStr,
        status: histStatus,
      }
    })

    const initials = emp.name
      ? emp.name
          .split(' ')
          .filter(Boolean)
          .map((n: string) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase()
      : 'SK'

    let shiftStart = '09:00 AM'
    let shiftEnd = '06:00 PM'
    if (emp.shift_id && shiftsData) {
      const shift = shiftsData.find(s => s.id === emp.shift_id)
      if (shift) {
        if (shift.start_time) shiftStart = shift.start_time.substring(0, 5) // HH:MM
        if (shift.end_time) shiftEnd = shift.end_time.substring(0, 5)
      }
    }

    return {
      id: attRecord?.id || emp.id || String(Math.random()),
      employeeDbId: emp.id || '',
      employeeId: emp.employee_id || emp.employeeId || '—',
      employeeName: emp.name || 'Unnamed Employee',
      role: emp.designation || emp.role || 'Field Personnel',
      department: emp.department_id ? (deptsData?.find(d => d.id === emp.department_id)?.department_name || emp.department) : (emp.department || 'Department Not Set'),
      shiftStart,
      shiftEnd,
      avatar: emp.profile_photo_url || emp.avatar_url || undefined,
      initials,
      date: formatDate(targetDate),
      startWork,
      endWork,
      status,
      workedMinutes,
      breakMinutes,
      activeHours,
      history,
      joiningDate: emp.joining_date || emp.created_at,
      created_at: emp.created_at,
      email: emp.email,
      phone: emp.phone,
    }
  })

  return {
    records,
    counts: {
      all: employees.length,
      present: presentCount,
      late: lateCount,
      absent: absentCount,
      halfDay: halfDayCount,
      leave: leaveCount,
    },
  }
}

export interface MonthlyAttendanceDay {
  date: string
  dayOfWeek: string
  dayNumber: number
  status: 'present' | 'late' | 'working' | 'half_day' | 'leave' | 'weekend' | 'holiday' | 'absent' | 'incomplete' | 'upcoming'
  statusLabel: string
  checkIn: string
  checkOut: string
  rawCheckIn?: string | null
  rawCheckOut?: string | null
  breakMinutes: number
  breakFormatted: string
  workedMinutes: number
  hours: string
  isSunday: boolean
  isHoliday: boolean
  isLeave: boolean
  leaveType?: string
  holidayName?: string
  notes?: string
}

export interface MonthlyAttendanceSummary {
  month: string
  monthName: string
  requiredWorkingDays: number
  presentDays: number
  absentDays: number
  leaveDays: number
  holidayDays: number
  sundayDays: number
  presentPercent: number
  totalWorkedMinutes: number
  totalHours: string
  averageHours: string
  totalBreakMinutes: number
  overtimeHours: string
  targetHours: string
  differenceFormatted: string
}

export interface EmployeeMonthlyAttendanceResult {
  employee: {
    id: string
    employeeId: string
    name: string
    role: string
    department: string
    joiningDate?: string
    created_at?: string
    avatar?: string
    email?: string
    phone?: string
  }
  month: string
  monthName: string
  availableMonths: { value: string; label: string }[]
  summary: MonthlyAttendanceSummary
  days: MonthlyAttendanceDay[]
}

/**
 * Computes the selectable months starting strictly from the employee's added/joining date up to the current month.
 */
export function getSelectableMonthsForEmployee(joiningOrCreatedDate?: string | null): { value: string; label: string }[] {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() // 0-indexed

  let startYear = currentYear
  let startMonth = currentMonth

  if (joiningOrCreatedDate) {
    const d = new Date(joiningOrCreatedDate)
    if (!isNaN(d.getFullYear()) && !isNaN(d.getMonth())) {
      startYear = d.getFullYear()
      startMonth = d.getMonth()
    }
  }

  // Ensure start is not in future
  if (startYear > currentYear || (startYear === currentYear && startMonth > currentMonth)) {
    startYear = currentYear
    startMonth = currentMonth
  }

  const months: { value: string; label: string }[] = []
  let y = startYear
  let m = startMonth

  while (y < currentYear || (y === currentYear && m <= currentMonth)) {
    const val = `${y}-${String(m + 1).padStart(2, '0')}`
    const dateObj = new Date(Date.UTC(y, m, 1))
    const label = dateObj.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    })
    months.push({ value: val, label })
    m++
    if (m > 11) {
      m = 0
      y++
    }
  }

  // Return descending (newest month first)
  return months.reverse()
}

/**
 * Fetches complete monthly attendance for a specific employee with selectable months starting from joining date.
 */
export async function getEmployeeMonthlyAttendance(
  token: string,
  employeeIdentifier: string,
  targetMonth?: string
): Promise<EmployeeMonthlyAttendanceResult> {
  // 1. Fetch employee record safely based on whether employeeIdentifier is a UUID
  const isIdUuid = isUuid(employeeIdentifier)
  const employeeQuery = isIdUuid
    ? `employees?or=(id.eq.${employeeIdentifier},employee_id.eq.${employeeIdentifier})&select=*&limit=1`
    : `employees?employee_id=eq.${employeeIdentifier}&select=*&limit=1`

  const empData = await fetchSupabaseRest<SkyTrackEmployee[]>(
    employeeQuery,
    token
  )
  const emp = empData?.[0]
  if (!emp) {
    throw new Error(`Employee with ID ${employeeIdentifier} not found.`)
  }

  // 2. Compute available months starting from the day employee was added
  const availableMonths = getSelectableMonthsForEmployee(emp.joining_date || emp.created_at)
  const selectedMonth = targetMonth && availableMonths.some(m => m.value === targetMonth)
    ? targetMonth
    : availableMonths[0]?.value || new Date().toISOString().slice(0, 7)

  const selectedMonthLabel = availableMonths.find(m => m.value === selectedMonth)?.label || selectedMonth

  // 3. Try edge function first
  try {
    const res = await fetchSkyTrackApi<any>(token, {
      action: 'attendance_monthly',
      employeeId: emp.employee_id || emp.id,
      month: selectedMonth,
    })

    if (res && res.success) {
      const todayIso = new Date().toISOString().slice(0, 10)
      const summary = res.summary || {}
      const mappedDays: MonthlyAttendanceDay[] = (res.attendance || []).map((att: any) => {
        const d = new Date(att.date + 'T12:00:00')
        const dayNumber = !isNaN(d.getDate()) ? d.getDate() : 1
        const dayOfWeek = !isNaN(d.getDay())
          ? d.toLocaleDateString('en-US', { weekday: 'short' })
          : ''

        const hasPunch = Boolean(att.login || att.check_in)
        const past1159 = isDatePast1159(att.date, todayIso)
        const autoCheckOutIso = `${att.date}T12:30:00.000Z`
        const effectiveCheckOutIso = att.check_out || (hasPunch && past1159 ? autoCheckOutIso : null)

        let resolvedStatus = att.status || 'present'
        if (hasPunch && (resolvedStatus === 'leave' || resolvedStatus === 'absent' || resolvedStatus === 'incomplete')) {
          resolvedStatus = 'present'
        }

        let statusLabel = 'Present'
        if (resolvedStatus === 'working' && !past1159) statusLabel = 'Working Live'
        else if (resolvedStatus === 'late') statusLabel = 'Late'
        else if (resolvedStatus === 'half_day') statusLabel = 'Half Day'
        else if (resolvedStatus === 'leave') statusLabel = 'Approved Leave'
        else if (resolvedStatus === 'holiday') statusLabel = 'Public Holiday'
        else if (resolvedStatus === 'weekend') statusLabel = 'Sunday Off'
        else if (resolvedStatus === 'absent') statusLabel = 'Absent'
        else if (resolvedStatus === 'incomplete') statusLabel = 'Present'
        else if (hasPunch && !att.logout && !att.check_out && !past1159) {
          statusLabel = 'Working Live'
        } else if (hasPunch) {
          statusLabel = 'Present'
        }

        const breakMins = att.breakMinutes ?? (att.total_break_seconds ? Math.round(att.total_break_seconds / 60) : (att.break_minutes ?? 0))
        let workedMinutes = att.workedMinutes ?? 0
        let hours = att.hours || '0h 00m'

        if (hasPunch && (workedMinutes <= 0 || hours === '0h 00m' || hours === '00:00')) {
          workedMinutes = computeWorkedMinutes(
            { check_in: att.check_in, check_out: effectiveCheckOutIso, break_minutes: breakMins, total_break_seconds: att.total_break_seconds },
            att.date,
            att.date === todayIso && !past1159
          )
          hours = `${Math.floor(workedMinutes / 60)}h ${String(workedMinutes % 60).padStart(2, '0')}m`
        }

        const breakFormatted = (att.breakFormatted && att.breakFormatted !== '0m')
          ? att.breakFormatted
          : (breakMins > 0 ? `${Math.floor(breakMins / 60)}h ${String(breakMins % 60).padStart(2, '0')}m` : '0m')

        const formattedCheckOut = (resolvedStatus === 'working' && !past1159)
          ? 'Active / In Progress'
          : (att.logout && att.logout !== '00:00'
              ? (att.logout === '18:00' ? '06:00 PM' : att.logout)
              : (effectiveCheckOutIso ? formatTime(effectiveCheckOutIso) : (hasPunch && past1159 ? '06:00 PM' : '—')))

        return {
          date: att.date,
          dayOfWeek,
          dayNumber,
          status: resolvedStatus,
          statusLabel,
          checkIn: att.login || (att.check_in ? formatTime(att.check_in) : '—'),
          checkOut: formattedCheckOut,
          rawCheckIn: att.check_in,
          rawCheckOut: effectiveCheckOutIso,
          breakMinutes: breakMins,
          breakFormatted,
          workedMinutes,
          hours,
          isSunday: resolvedStatus === 'weekend',
          isHoliday: resolvedStatus === 'holiday',
          isLeave: resolvedStatus === 'leave',
          notes: att.notes || (resolvedStatus === 'working' && !past1159 ? 'Shift currently in progress' : undefined),
        }
      })

      const presentCountFromDays = mappedDays.filter(d => d.status === 'present' || d.status === 'working' || d.checkIn !== '—').length
      const totalMinsFromDays = mappedDays.reduce((acc, d) => acc + (d.workedMinutes || 0), 0)
      const resolvedPresentDays = Math.max(summary.presentDays ?? summary.present_days ?? 0, presentCountFromDays)
      const resolvedWorkedMins = Math.max(summary.totalWorkedMinutes ?? summary.total_worked_minutes ?? 0, totalMinsFromDays)
      const resolvedTotalHours = `${Math.floor(resolvedWorkedMins / 60)}h ${String(resolvedWorkedMins % 60).padStart(2, '0')}m`
      const resolvedAvgHours = resolvedPresentDays > 0
        ? `${Math.floor(Math.floor(resolvedWorkedMins / resolvedPresentDays) / 60)}h ${String(Math.floor(resolvedWorkedMins / resolvedPresentDays) % 60).padStart(2, '0')}m`
        : '0h 00m'

      return {
        employee: {
          id: emp.id || '',
          employeeId: emp.employee_id || emp.employeeId || '—',
          name: emp.name || 'Unnamed Employee',
          role: emp.designation || emp.role || 'Employee',
          department: emp.department || 'Department Not Set',
          joiningDate: emp.joining_date || emp.created_at,
          created_at: emp.created_at,
          avatar: emp.profile_photo_url || emp.avatar_url,
          email: emp.email,
          phone: emp.phone,
        },
        month: selectedMonth,
        monthName: selectedMonthLabel,
        availableMonths,
        summary: {
          month: selectedMonth,
          monthName: selectedMonthLabel,
          requiredWorkingDays: summary.workingDays ?? summary.required_working_days ?? 0,
          presentDays: resolvedPresentDays,
          absentDays: summary.absentDays ?? summary.absent_days ?? 0,
          leaveDays: summary.leaveDays ?? summary.leave_days ?? 0,
          holidayDays: summary.public_holiday_days ?? 0,
          sundayDays: summary.sunday_days ?? 0,
          presentPercent: summary.presentPercent ?? summary.present_percent ?? 0,
          totalWorkedMinutes: resolvedWorkedMins,
          totalHours: resolvedTotalHours,
          averageHours: resolvedAvgHours,
          totalBreakMinutes: summary.totalBreakMinutes ?? summary.total_break_minutes ?? 0,
          overtimeHours: summary.overtimeFormatted ?? summary.overtime_formatted ?? '0h 00m',
          targetHours: summary.target_hours_formatted ?? summary.targetHoursFormatted ?? '0h 00m',
          differenceFormatted: summary.differenceFormatted ?? summary.difference_formatted ?? '0h 00m',
        },
        days: mappedDays,
      }
    }
  } catch (edgeErr) {
    console.warn('Edge function attendance_monthly fallback to Supabase REST:', edgeErr)
  }

  // 4. Robust Fallback: Build directly from Supabase REST
  const [yearStr, monthNumStr] = selectedMonth.split('-')
  const y = parseInt(yearStr, 10)
  const m = parseInt(monthNumStr, 10)
  const monthStart = `${selectedMonth}-01`
  const nextMonthDate = new Date(Date.UTC(y, m, 1))
  const nextMonthStart = nextMonthDate.toISOString().slice(0, 10)
  const todayIso = new Date().toISOString().slice(0, 10)

  const [attRows, leaveRows, holidayRows] = await Promise.all([
    fetchSupabaseRest<any[]>(
      `attendance?employee_id=eq.${emp.id}&attendance_date=gte.${monthStart}&attendance_date=lt.${nextMonthStart}&order=attendance_date.desc`,
      token
    ),
    fetchSupabaseRest<any[]>(
      `leaves?employee_id=eq.${emp.id}&status=eq.approved&from_date=lte.${nextMonthStart}&to_date=gte.${monthStart}`,
      token
    ),
    fetchSupabaseRest<any[]>(
      `public_holidays?status=eq.published&holiday_date=gte.${monthStart}&holiday_date=lt.${nextMonthStart}`,
      token
    ),
  ])

  const attendanceList = attRows || []
  const leavesList = leaveRows || []
  const holidaysList = holidayRows || []

  const attMap = new Map<string, any>()
  for (const a of attendanceList) {
    attMap.set(a.attendance_date, a)
  }

  const holidaySet = new Map<string, string>()
  for (const h of holidaysList) {
    holidaySet.set(String(h.holiday_date).slice(0, 10), h.holiday_name || 'Public Holiday')
  }

  const addedDateIso = (emp.joining_date || emp.created_at || '1970-01-01').slice(0, 10)
  const days: MonthlyAttendanceDay[] = []

  let totalWorkedMins = 0
  let totalBreakMins = 0
  let presentDaysCount = 0
  let requiredWorkingDays = 0
  let absentDaysCount = 0
  let leaveDaysCount = 0
  let holidayDaysCount = 0
  let sundayDaysCount = 0

  // Iterate days of month up to today (or end of month if past month)
  const lastDayOfMonth = new Date(y, m, 0).getDate()
  for (let dayNum = 1; dayNum <= lastDayOfMonth; dayNum++) {
    const curDateStr = `${selectedMonth}-${String(dayNum).padStart(2, '0')}`
    if (curDateStr < addedDateIso) continue // Skip dates prior to employee added
    if (curDateStr > todayIso) break // Skip future dates for daily attendance

    const dateObj = new Date(curDateStr + 'T12:00:00')
    const isSunday = dateObj.getDay() === 0
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'short' })
    const holidayName = holidaySet.get(curDateStr)
    const isHoliday = Boolean(holidayName)

    const matchingLeave = leavesList.find((lv) => {
      const from = lv.from_date || ''
      const to = lv.to_date || from
      return from <= curDateStr && to >= curDateStr
    })
    const isLeave = Boolean(matchingLeave)

    const att = attMap.get(curDateStr)
    const hasPunch = Boolean(att?.check_in)
    const past1159 = isDatePast1159(curDateStr, todayIso)
    const isToday = curDateStr === todayIso
    const isWorking = hasPunch && !att?.check_out && isToday && !past1159
    const autoCheckOutIso = `${curDateStr}T12:30:00.000Z`
    const effectiveCheckOut = att?.check_out || (hasPunch && past1159 ? autoCheckOutIso : null)

    let status: MonthlyAttendanceDay['status'] = 'absent'
    let statusLabel = 'Absent'

    if (att?.check_in && (att?.check_out || past1159)) {
      status = 'present'
      statusLabel = 'Present'
      presentDaysCount++
    } else if (isWorking) {
      status = 'working'
      statusLabel = 'Working Live'
      presentDaysCount++
    } else if (hasPunch) {
      status = 'present'
      statusLabel = 'Present'
      presentDaysCount++
    } else if (isLeave) {
      status = 'leave'
      statusLabel = matchingLeave?.leave_type ? `${matchingLeave.leave_type} Leave` : 'Approved Leave'
      leaveDaysCount++
    } else if (isSunday) {
      status = 'weekend'
      statusLabel = 'Sunday Off'
      sundayDaysCount++
    } else if (isHoliday) {
      status = 'holiday'
      statusLabel = holidayName || 'Public Holiday'
      holidayDaysCount++
    } else {
      status = 'absent'
      statusLabel = 'Absent'
      absentDaysCount++
    }

    if (!isSunday && !isLeave && !isHoliday) {
      requiredWorkingDays++
    }

    const breakM = att?.break_minutes ?? (att?.total_break_seconds ? Math.round(att.total_break_seconds / 60) : 0)
    let workedMins = 0
    if (hasPunch) {
      workedMins = computeWorkedMinutes(
        { check_in: att?.check_in, check_out: effectiveCheckOut, break_minutes: breakM, total_break_seconds: att?.total_break_seconds },
        curDateStr,
        isToday && !past1159
      )
    }

    totalWorkedMins += workedMins
    totalBreakMins += breakM

    const hoursStr = `${Math.floor(workedMins / 60)}h ${String(workedMins % 60).padStart(2, '0')}m`
    const breakStr = breakM > 0
      ? `${Math.floor(breakM / 60)}h ${String(breakM % 60).padStart(2, '0')}m`
      : '0m'

    days.push({
      date: curDateStr,
      dayOfWeek,
      dayNumber: dayNum,
      status,
      statusLabel,
      checkIn: formatTime(att?.check_in),
      checkOut: isWorking ? 'Active / In Progress' : (effectiveCheckOut ? formatTime(effectiveCheckOut) : (hasPunch && past1159 ? '06:00 PM' : '—')),
      rawCheckIn: att?.check_in,
      rawCheckOut: effectiveCheckOut,
      breakMinutes: breakM,
      breakFormatted: breakStr,
      workedMinutes: workedMins,
      hours: hoursStr,
      isSunday,
      isHoliday,
      isLeave,
      leaveType: matchingLeave?.leave_type,
      holidayName,
      notes: isWorking ? 'Shift currently in progress' : undefined,
    })
  }

  // Reverse so newest dates are first
  days.reverse()

  const totalHours = `${Math.floor(totalWorkedMins / 60)}h ${String(totalWorkedMins % 60).padStart(2, '0')}m`
  const avgMins = presentDaysCount > 0 ? Math.floor(totalWorkedMins / presentDaysCount) : 0
  const avgHours = `${Math.floor(avgMins / 60)}h ${String(avgMins % 60).padStart(2, '0')}m`
  const targetMins = requiredWorkingDays * 480
  const targetHours = `${Math.floor(targetMins / 60)}h 00m`
  const diffMins = totalWorkedMins - targetMins
  const differenceFormatted = diffMins >= 0
    ? `+${Math.floor(diffMins / 60)}h ${String(diffMins % 60).padStart(2, '0')}m`
    : `-${Math.floor(Math.abs(diffMins) / 60)}h ${String(Math.abs(diffMins) % 60).padStart(2, '0')}m`
  const overtimeHours = diffMins > 0
    ? `${Math.floor(diffMins / 60)}h ${String(diffMins % 60).padStart(2, '0')}m`
    : '0h 00m'
  const presentPercent = requiredWorkingDays > 0 ? Math.round((presentDaysCount / requiredWorkingDays) * 100) : 0

  return {
    employee: {
      id: emp.id || '',
      employeeId: emp.employee_id || emp.employeeId || '—',
      name: emp.name || 'Unnamed Employee',
      role: emp.designation || emp.role || 'Employee',
      department: emp.department || 'Department Not Set',
      joiningDate: emp.joining_date || emp.created_at,
      created_at: emp.created_at,
      avatar: emp.profile_photo_url || emp.avatar_url,
      email: emp.email,
      phone: emp.phone,
    },
    month: selectedMonth,
    monthName: selectedMonthLabel,
    availableMonths,
    summary: {
      month: selectedMonth,
      monthName: selectedMonthLabel,
      requiredWorkingDays,
      presentDays: presentDaysCount,
      absentDays: absentDaysCount,
      leaveDays: leaveDaysCount,
      holidayDays: holidayDaysCount,
      sundayDays: sundayDaysCount,
      presentPercent,
      totalWorkedMinutes: totalWorkedMins,
      totalHours,
      averageHours: avgHours,
      totalBreakMinutes: totalBreakMins,
      overtimeHours,
      targetHours,
      differenceFormatted,
    },
    days,
  }
}

export interface LeaveSubmissionRecord {
  id: string
  leaveDbId: string
  requestId?: string
  request_id?: string
  employeeId: string
  employeeName: string
  role: string
  shift: string
  avatar: string
  fromDate: string
  fromDay: string
  toDate: string
  toDay: string
  type: 'Casual' | 'Sick' | 'Half Day' | 'Annual' | string
  reason: string
  submittedDate: string
  submittedTime: string
  duration: string
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled'
  rawStatus: string
  approvedBy?: string
  approvedAt?: string
  managerComment?: string
  leaveDays?: number
  paidLeaveDays?: number
  lopDays?: number
}

function formatDayOfWeek(dateStr?: string | null): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleDateString('en-US', { weekday: 'long' })
  } catch {
    return ''
  }
}

function normalizeLeaveType(typeStr?: string | null): 'Casual' | 'Sick' | 'Half Day' | 'Annual' | string {
  if (!typeStr) return 'Casual'
  const t = typeStr.trim().toLowerCase()
  if (t.includes('sick')) return 'Sick'
  if (t.includes('half')) return 'Half Day'
  if (t.includes('annual')) return 'Annual'
  if (t.includes('casual')) return 'Casual'
  return typeStr.replace(/leave/i, '').trim() || 'Casual'
}

/**
 * Fetches all leave submissions joined with employee records
 */
export async function getLeaveSubmissions(
  token: string
): Promise<LeaveSubmissionRecord[]> {
  const leavesData = await fetchSupabaseRest<any[]>(
    'leaves?select=*,employees:employees!leaves_employee_id_fkey(id,name,employee_id,designation,department,profile_photo_url)&order=created_at.desc',
    token
  )

  const leavesList = leavesData || []

  return leavesList.map((lv) => {
    const emp = lv.employees || {}
    const type = normalizeLeaveType(lv.leave_type)
    const isHalfDay = type === 'Half Day'

    const fromDayOfWeek = formatDayOfWeek(lv.from_date)
    const toDayOfWeek = formatDayOfWeek(lv.to_date || lv.from_date)

    const fromDay = fromDayOfWeek ? `${fromDayOfWeek} • ${isHalfDay ? 'Afternoon' : 'Full Day'}` : 'Full Day'
    const toDay = toDayOfWeek ? `${toDayOfWeek} • ${isHalfDay ? 'Afternoon' : 'Full Day'}` : 'Full Day'

    // Compute working days duration
    let duration = '1 Working Day'
    if (isHalfDay) {
      duration = '0.5 Working Day'
    } else if (lv.from_date && lv.to_date) {
      try {
        const d1 = new Date(lv.from_date)
        const d2 = new Date(lv.to_date)
        const diffTime = Math.abs(d2.getTime() - d1.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
        duration = `${diffDays} Working Day${diffDays > 1 ? 's' : ''}`
      } catch {
        duration = '1 Working Day'
      }
    }

    let status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' = 'Pending'
    const rawStatus = (lv.status || 'pending').toLowerCase()
    if (rawStatus === 'approved') status = 'Approved'
    else if (rawStatus === 'rejected') status = 'Rejected'
    else if (rawStatus === 'cancelled') status = 'Cancelled'

    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      emp.name || 'User'
    )}&background=f1f5f9&color=475569&bold=true`

    return {
      id: lv.id,
      leaveDbId: lv.id,
      requestId: lv.request_id || undefined,
      request_id: lv.request_id || undefined,
      employeeId: emp.employee_id || '—',
      employeeName: emp.name || 'Unnamed Employee',
      role: emp.designation || 'Field Officer',
      shift: 'Shift A',
      avatar: emp.profile_photo_url || defaultAvatar,
      fromDate: formatDate(lv.from_date),
      fromDay,
      toDate: formatDate(lv.to_date || lv.from_date),
      toDay,
      type,
      reason: lv.reason || 'No reason specified',
      submittedDate: formatDate(lv.created_at),
      submittedTime: formatTime(lv.created_at),
      duration,
      status,
      rawStatus,
      approvedBy: lv.approved_by,
      approvedAt: lv.approved_at,
      managerComment: lv.manager_comment,
      leaveDays: lv.leave_days || 0,
      paidLeaveDays: lv.paid_leave_days || 0,
      lopDays: lv.lop_days || 0,
    }
  })
}

/**
 * Updates leave request status (Approve / Reject) in Supabase
 */
export async function updateLeaveStatus(
  token: string,
  leaveId: string,
  status: 'approved' | 'rejected',
  comment?: string
): Promise<void> {
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const payload: any = {
    status,
    approved_at: new Date().toISOString(),
  }
  if (comment) {
    payload.manager_comment = comment
  }

  const response = await fetch(`${SUPABASE_REST_URL}/leaves?id=eq.${leaveId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Failed to update leave request status: ${response.statusText}`)
  }
}

/**
 * Fetches latest admin user and employee profile using the authenticated token
 */
export async function getAdminProfile(
  token: string,
  employeeIdOrDbId?: string
): Promise<SkyTrackEmployee | null> {
  const supabaseUrl = SUPABASE_BASE_URL

  let authUser: any = null
  let tokenEmail: string | null = null
  let tokenSub: string | null = null

  // Extract from JWT token
  try {
    const parts = token.split('.')
    if (parts.length === 3) {
      const base64Url = parts[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
      const payload = JSON.parse(jsonPayload)
      tokenEmail = payload.email || null
      tokenSub = payload.sub || null
    }
  } catch {
    // Ignore token parse error
  }

  // Fetch /auth/v1/user
  try {
    const authRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
    })
    if (authRes.ok) {
      authUser = await authRes.json()
    }
  } catch {
    // Ignore auth fetch error
  }

  const effectiveEmail = authUser?.email || tokenEmail || ''
  const effectiveSub = authUser?.id || tokenSub || ''

  // Build filter query for employees table safely avoiding casting non-UUIDs to UUID
  const filters: string[] = []
  if (employeeIdOrDbId) {
    if (isUuid(employeeIdOrDbId)) {
      filters.push(`id.eq.${employeeIdOrDbId}`)
    }
    filters.push(`employee_id.eq.${employeeIdOrDbId}`)
  }
  if (effectiveSub) {
    if (isUuid(effectiveSub)) {
      filters.push(`id.eq.${effectiveSub}`)
    }
    filters.push(`employee_id.eq.${effectiveSub}`)
  }
  if (effectiveEmail) {
    filters.push(`email.eq.${effectiveEmail}`)
  }

  let empRecord: SkyTrackEmployee | null = null
  if (filters.length > 0) {
    try {
      const data = await fetchSupabaseRest<SkyTrackEmployee[]>(
        `employees?or=(${filters.join(',')})&limit=1`,
        token
      )
      empRecord = data?.[0] || null
    } catch (err) {
      console.warn('Could not fetch employee record:', err)
    }
  }
  
  let deptName = empRecord?.department || 'Department Not Set'
  if (empRecord?.department_id) {
    try {
      const depts = await fetchSupabaseRest<any[]>(`departments?id=eq.${empRecord.department_id}&select=department_name`, token)
      if (depts && depts.length > 0) {
        deptName = depts[0].department_name
      }
    } catch (err) {
      console.warn('Could not fetch department name:', err)
    }
  }

  return {
    ...(empRecord || {}),
    id: empRecord?.id || effectiveSub || '',
    employee_id: empRecord?.employee_id || empRecord?.id || '—',
    name: empRecord?.name || authUser?.user_metadata?.name || 'Administrator',
    email: empRecord?.email || effectiveEmail || '',
    role: empRecord?.designation || empRecord?.role || 'System Administrator',
    designation: empRecord?.designation || empRecord?.role || 'System Administrator',
    department: deptName,
    profile_photo_url: empRecord?.profile_photo_url || undefined,
  }
}

/**
 * Updates administrator password using Supabase Auth
 */
export async function updateAdminPassword(
  token: string,
  newPassword: string
): Promise<void> {
  const supabaseUrl = SUPABASE_BASE_URL
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: 'PUT',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password: newPassword }),
  })

  if (!response.ok) {
    let errMsg = 'Failed to update password.'
    try {
      const errData = await response.json()
      errMsg = errData?.message || errData?.msg || errData?.error_description || errMsg
    } catch {
      // ignore
    }
    throw new Error(errMsg)
  }
}

export interface UpdateEmployeePayload {
  name?: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  designation?: string
  department?: string
  department_id?: string | null
  status?: string
  profile_photo_url?: string
}

/**
 * Updates an employee's details in the Supabase employees table
 */
export async function updateEmployeeDetails(
  token: string,
  employeeDbId: string,
  updates: UpdateEmployeePayload
): Promise<SkyTrackEmployee> {
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${SUPABASE_REST_URL}/employees?id=eq.${employeeDbId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      ...updates,
      updated_at: new Date().toISOString(),
    }),
  })

  if (!response.ok) {
    let msg = 'Failed to update employee details.'
    try {
      const err = await response.json()
      msg = err?.message || err?.msg || msg
    } catch {
      // ignore
    }
    throw new Error(msg)
  }

  const result = await response.json()
  return result?.[0]
}




export interface CreateEmployeeResponse {
  success: boolean
  message?: string
  employee?: {
    id: string
    employee_id: string
    name: string
    email: string
    role?: string
    status?: string
    [key: string]: any
  }
  [key: string]: any
}

export async function createEmployee(
  token: string,
  payload: {
    name: string
    email: string
    password?: string
  }
): Promise<CreateEmployeeResponse> {
  return fetchSkyTrackApi(token, {
    action: 'create_employee',
    ...payload,
  })
}

export async function updateEmployeeRole(
  token: string,
  employeeId: string,
  role: 'employee' | 'admin'
): Promise<{ success: boolean; message: string }> {
  return fetchSkyTrackApi(token, {
    action: 'update_employee_role',
    employeeId,
    role,
  })
}

export async function updateEmployeeId(
  token: string,
  targetId: string,
  newEmployeeId: string
): Promise<{ success: boolean; message: string; employee?: any }> {
  return fetchSkyTrackApi(token, {
    action: 'update_employee_id',
    targetId,
    newEmployeeId,
  })
}

export async function deleteEmployee(
  token: string,
  targetEmployeeId: string,
  password: string
): Promise<{ success: boolean; message: string }> {
  return fetchSkyTrackApi(token, {
    action: 'delete_employee',
    targetEmployeeId,
    password,
  })
}

// --- LEAVE MANAGEMENT API INTEGRATION ---

export interface SkyTrackLeave {
  id: string
  requestId: string
  employeeId: string
  fromDate: string
  toDate: string
  leaveType: 'casual' | 'sick' | string
  reason?: string | null

  leaveDays: number
  paidLeaveDays: number
  lopDays: number

  status: string
  approvedBy?: string | null
  approvedAt?: string | null
  managerComment?: string | null
  createdAt: string
  updatedAt: string
}

export interface SkyTrackLeaveBalance {
  allocated: number
  adjusted: number
  used: number
  balance: number
}

export interface SkyTrackEmployeeLeaveBalance {
  casual: SkyTrackLeaveBalance
  sick: SkyTrackLeaveBalance
}

async function fetchSkyTrackApi<T = any>(token: string, payload: any): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
  }

  const directEdgeUrl = `${SUPABASE_BASE_URL}/functions/v1/skytrack-api`
  const endpointsToTry = [
    SKYTRACK_API_URL,
    SKYTRACK_API_URL !== directEdgeUrl ? directEdgeUrl : '/api/skytrack',
  ].filter(Boolean)

  let lastError: any = null

  for (const url of endpointsToTry) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })

      let data: any
      try {
        data = await response.json()
      } catch (err) {
        continue
      }

      if (!response.ok || data.success === false) {
        throw new Error(data?.message || data?.error || 'SkyTrack API request failed.')
      }

      return data as T
    } catch (err: any) {
      lastError = err
    }
  }

  throw lastError || new Error('SkyTrack API request failed.')
}

export async function submitLeave(
  token: string,
  fromDate: string,
  toDate: string,
  leaveType: 'casual' | 'sick' | string,
  reason?: string
): Promise<{ success: boolean; leave: SkyTrackLeave }> {
  return fetchSkyTrackApi(token, {
    action: 'leave_submit',
    fromDate,
    toDate,
    leaveType,
    reason,
  })
}

export async function getLeaveHistory(
  token: string
): Promise<{ success: boolean; data: SkyTrackLeave[] }> {
  return fetchSkyTrackApi(token, {
    action: 'leave_history',
  })
}

export async function getLeaveBalance(
  token: string,
  employeeId?: string
): Promise<{ success: boolean; balance: SkyTrackEmployeeLeaveBalance }> {
  return fetchSkyTrackApi(token, {
    action: 'leave_balance',
    employeeId,
  })
}

export async function approveLeave(
  token: string,
  requestId: string,
  managerComment?: string
): Promise<{ success: boolean; leave?: SkyTrackLeave }> {
  return fetchSkyTrackApi(token, {
    action: 'approve_leave',
    requestId,
    managerComment,
  })
}

export async function rejectLeave(
  token: string,
  requestId: string,
  managerComment?: string
): Promise<{ success: boolean; leave?: SkyTrackLeave }> {
  return fetchSkyTrackApi(token, {
    action: 'reject_leave',
    requestId,
    managerComment,
  })
}

export async function cancelLeave(
  token: string,
  requestId: string,
  managerComment?: string
): Promise<{ success: boolean; leave?: SkyTrackLeave; message?: string }> {
  return fetchSkyTrackApi(token, {
    action: 'cancel_leave',
    requestId,
    managerComment,
  })
}

export async function adjustLeaveBalance(
  token: string,
  employeeId: string,
  leaveType: 'casual' | 'sick' | string,
  days: number,
  reason: string
): Promise<{ success: boolean }> {
  return fetchSkyTrackApi(token, {
    action: 'leave_balance_adjustment',
    employeeId,
    leaveType,
    days,
    reason,
  })
}

export async function searchGlobal(
  token: string,
  query: string
): Promise<{ success: boolean; results: any[] }> {
  return fetchSkyTrackApi(token, {
    action: 'search',
    query,
  })
}

export interface AttendancePunchEvent {
  id: string
  attendanceId: string
  type: 'check_in' | 'check_out'
  employeeId: string
  employeeDbId?: string
  employeeName: string
  avatar: string | null
  designation: string
  department?: string
  timestamp: string
  checkInTime?: string | null
  checkOutTime?: string | null
  timeFormatted: string | null
  date: string
  status: string
  badge: string
  badgeColor?: string
  workedMinutes?: number
  workedDuration?: string
}

export function formatWorkedDuration(
  checkIn?: string | null,
  checkOut?: string | null,
  storedMinutes?: number | null,
  breakMinutes?: number | null
): string {
  let netMinutes = storedMinutes != null && storedMinutes > 0 ? storedMinutes : 0

  if (netMinutes <= 0 && checkIn && checkOut) {
    try {
      const start = new Date(checkIn).getTime()
      const end = new Date(checkOut).getTime()
      const diffMs = Math.max(0, end - start)
      const totalSec = Math.floor(diffMs / 1000)
      const breakSec = (breakMinutes ?? 0) * 60
      const netSec = Math.max(0, totalSec - breakSec)

      if (netSec < 60) {
        return netSec > 0 ? `${netSec}s` : '1m'
      }
      netMinutes = Math.round(netSec / 60)
    } catch {
      netMinutes = 0
    }
  }

  if (netMinutes <= 0) {
    return '1m'
  }

  const hours = Math.floor(netMinutes / 60)
  const mins = netMinutes % 60

  if (hours > 0) {
    return `${hours}h ${String(mins).padStart(2, '0')}m`
  }
  return `${mins}m`
}

export async function getAttendancePunchFeed(
  token: string,
  limit: number = 50
): Promise<AttendancePunchEvent[]> {
  // 1. Try backend Edge Function
  try {
    const res = await fetchSkyTrackApi<{ success: boolean; events: AttendancePunchEvent[] }>(token, {
      action: 'attendance_feed',
      limit,
    })
    if (res && res.success && Array.isArray(res.events)) {
      return res.events
    }
  } catch (err) {
    console.warn('Backend attendance_feed fallback to Supabase REST:', err)
  }

  // 2. Direct Supabase REST fallback
  try {
    const rawData = await fetchSupabaseRest<any[]>(
      `attendance?select=id,employee_id,attendance_date,check_in,check_out,status,worked_minutes,employees:employees(id,name,employee_id,profile_photo_url,designation)&not.check_in.is.null&order=check_in.desc&limit=${limit}`,
      token
    )

    const events: AttendancePunchEvent[] = []
    for (const row of rawData || []) {
      const emp = row.employees || {}
      const employeeName = emp.name || 'Employee'
      const employeeCode = emp.employee_id || '—'
      const avatar = emp.profile_photo_url || null
      const designation = emp.designation || 'Field Staff'

      if (row.check_in) {
        const isLate = (row.status || '').toLowerCase() === 'late'
        events.push({
          id: `cin-${row.id}`,
          attendanceId: row.id,
          type: 'check_in',
          employeeId: employeeCode,
          employeeDbId: row.employee_id,
          employeeName,
          avatar,
          designation,
          timestamp: row.check_in,
          checkInTime: row.check_in,
          checkOutTime: row.check_out,
          timeFormatted: formatTime(row.check_in),
          date: row.attendance_date,
          status: isLate ? 'Late' : 'On Time',
          badge: isLate ? 'Late Check-in' : 'Checked In',
          badgeColor: isLate ? 'amber' : 'emerald',
        })
      }

      if (row.check_out) {
        const durationText = formatWorkedDuration(
          row.check_in,
          row.check_out,
          row.worked_minutes,
          row.break_minutes
        )
        const workedMins = row.worked_minutes || 0
        events.push({
          id: `cout-${row.id}`,
          attendanceId: row.id,
          type: 'check_out',
          employeeId: employeeCode,
          employeeDbId: row.employee_id,
          employeeName,
          avatar,
          designation,
          timestamp: row.check_out,
          checkInTime: row.check_in,
          checkOutTime: row.check_out,
          timeFormatted: formatTime(row.check_out),
          date: row.attendance_date,
          workedMinutes: workedMins,
          workedDuration: durationText,
          status: 'Shift Completed',
          badge: 'Checked Out',
          badgeColor: 'blue',
        })
      }
    }

    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    return events
  } catch (err) {
    console.error('Failed to query attendance feed via REST fallback:', err)
    return []
  }
}

export async function fetchPublicHolidaysApi(token: string): Promise<{ success: boolean; holidays: any[] }> {
  return fetchSkyTrackApi(token, {
    action: 'public_holidays',
  })
}

export async function seedPublicHolidays(token: string): Promise<{ success: boolean; message: string; holidays?: any[] }> {
  return fetchSkyTrackApi(token, {
    action: 'seed_public_holidays',
  })
}

