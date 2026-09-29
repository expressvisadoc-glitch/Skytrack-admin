/**
 * SkyTrack API Client
 * Connects to the existing SkyTrack Supabase backend.
 */

const SKYTRACK_API_URL =
  import.meta.env.VITE_SKYTRACK_API_URL ||
  (import.meta.env.DEV ? '/api/skytrack' : 'https://cwtrrtbodqctntkpnjlv.supabase.co/functions/v1/skytrack-api')

const SUPABASE_REST_URL =
  import.meta.env.VITE_SUPABASE_REST_URL ||
  'https://cwtrrtbodqctntkpnjlv.supabase.co/rest/v1'

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
  [key: string]: any
}

export interface SkyTrackLoginResponse {
  success: boolean
  message?: string
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

/**
 * Sends a login request to the existing SkyTrack Edge Function
 */
export async function loginWithSkyTrack(
  employeeId: string,
  password: string
): Promise<SkyTrackLoginResponse> {
  const payload = {
    action: 'login',
    employeeId: employeeId.trim(),
    password,
  }

  const response = await fetch(SKYTRACK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  let data: any
  try {
    data = await response.json()
  } catch (err) {
    throw new Error('Invalid JSON response from SkyTrack authentication server.')
  }

  return data as SkyTrackLoginResponse
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
 * Formats an ISO date or timestamp into readable 12-hour time string (e.g. 09:58 AM)
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
  name: string
  role: string
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
}

export interface AttendanceHistoryItem {
  id: string
  date: string
  startTime: string
  endTime: string
  status: 'Present' | 'Week Off' | 'Late' | 'Half Day' | 'Leave' | 'Absent'
  hours?: string
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

  const [employeesData, attendanceData, leavesData] = await Promise.all([
    fetchSupabaseRest<SkyTrackEmployee[]>('employees?select=*&order=name.asc', token),
    fetchSupabaseRest<any[]>(
      `attendance?attendance_date=eq.${todayIsoDate}&select=*`,
      token
    ),
    fetchSupabaseRest<any[]>('leaves?select=*&order=created_at.desc', token),
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

    return {
      id: emp.id || String(Math.random()),
      code: emp.employee_id || emp.employeeId || '—',
      name: emp.name || 'Unnamed Employee',
      role: emp.designation || emp.role || 'Field Personnel',
      department: emp.department || 'Operations',
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
  const [attendanceData, leavesData] = await Promise.all([
    fetchSupabaseRest<any[]>(
      `attendance?employee_id=eq.${employeeDbId}&order=attendance_date.desc&limit=30`,
      token
    ),
    fetchSupabaseRest<any[]>(
      `leaves?employee_id=eq.${employeeDbId}&order=created_at.desc&limit=30`,
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

    return {
      id: att.id,
      date: formatDate(att.attendance_date),
      startTime: formatTime(att.check_in),
      endTime: formatTime(att.check_out),
      status,
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
  avatar?: string
  initials?: string
  initialsBg?: string
  initialsColor?: string
  date: string
  startWork: string
  endWork: string
  status: 'Present' | 'Late' | 'Absent' | 'Half Day' | 'Leave'
  history: {
    date: string
    time: string
    status: 'Present' | 'Late' | 'Absent' | 'Half Day' | 'Leave'
  }[]
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
  const targetDate = targetDateStr || new Date().toISOString().slice(0, 10)

  const [employeesData, attendanceData, leavesData, allRecentAttendance] =
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

    if (attRecord) {
      startWork = formatTime(attRecord.check_in)
      if (attRecord.check_out) {
        endWork = formatTime(attRecord.check_out)
      } else if (attRecord.check_in) {
        endWork = '— (In Progress)'
      }

      const rawStatus = (attRecord.status || '').toLowerCase()
      if (rawStatus === 'late') {
        status = 'Late'
        lateCount++
      } else if (rawStatus === 'half_day' || rawStatus === 'half day') {
        status = 'Half Day'
        halfDayCount++
      } else if (rawStatus === 'leave') {
        status = 'Leave'
        leaveCount++
      } else if (rawStatus === 'absent') {
        status = 'Absent'
        absentCount++
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
      const isToday = a.attendance_date === targetDate
      const dateLabel = isToday ? `${formatDate(a.attendance_date)} (Today)` : formatDate(a.attendance_date)
      const inTime = formatTime(a.check_in)
      const outTime = a.check_out ? formatTime(a.check_out) : isToday ? 'Ongoing' : '—'
      const timeStr = `${inTime} — ${outTime}`

      let histStatus: 'Present' | 'Late' | 'Absent' | 'Half Day' | 'Leave' = 'Present'
      const raw = (a.status || '').toLowerCase()
      if (raw === 'late') histStatus = 'Late'
      else if (raw === 'half_day' || raw === 'half day') histStatus = 'Half Day'
      else if (raw === 'leave') histStatus = 'Leave'
      else if (raw === 'absent') histStatus = 'Absent'

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

    return {
      id: attRecord?.id || emp.id || String(Math.random()),
      employeeDbId: emp.id || '',
      employeeId: emp.employee_id || emp.employeeId || '—',
      employeeName: emp.name || 'Unnamed Employee',
      role: emp.designation || emp.role || 'Field Personnel',
      department: emp.department || 'Operations',
      avatar: emp.profile_photo_url || emp.avatar_url || undefined,
      initials,
      date: formatDate(targetDate),
      startWork,
      endWork,
      status,
      history,
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

export interface LeaveSubmissionRecord {
  id: string
  leaveDbId: string
  requestId?: string
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
  const supabaseUrl =
    import.meta.env.VITE_SUPABASE_URL || 'https://cwtrrtbodqctntkpnjlv.supabase.co'

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

  // Build filter query for employees table
  const filters: string[] = []
  if (employeeIdOrDbId) {
    filters.push(`id.eq.${employeeIdOrDbId}`, `employee_id.eq.${employeeIdOrDbId}`)
  }
  if (effectiveSub) {
    filters.push(`id.eq.${effectiveSub}`, `employee_id.eq.${effectiveSub}`)
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

  return {
    ...(empRecord || {}),
    id: empRecord?.id || effectiveSub || '',
    employee_id: empRecord?.employee_id || empRecord?.id || '—',
    name: empRecord?.name || authUser?.user_metadata?.name || 'Administrator',
    email: empRecord?.email || effectiveEmail || '',
    role: empRecord?.designation || empRecord?.role || 'System Administrator',
    designation: empRecord?.designation || empRecord?.role || 'System Administrator',
    department: empRecord?.department || 'Operations',
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
  const supabaseUrl =
    import.meta.env.VITE_SUPABASE_URL || 'https://cwtrrtbodqctntkpnjlv.supabase.co'
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



