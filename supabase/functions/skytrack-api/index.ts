import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Service-role client.
// Used only inside the Edge Function.
// NEVER expose this key to Android or frontend clients.
const adminClient = createClient(
  supabaseUrl,
  supabaseServiceRoleKey
);

// Regular client.
// Used for Supabase Auth.
const authClient = createClient(
  supabaseUrl,
  supabaseAnonKey
);

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return json({
        success: false,
        error: "method_not_allowed",
        message: "Only POST requests are allowed."
      }, 405);
    }

    const body = await req.json();
    const action = String(body.action ?? "");

    // =========================================================
    // LOGIN
    // =========================================================

    if (action === "login") {
      return await handleLogin(body);
    }

    // =========================================================
    // PROTECTED ACTIONS
    // =========================================================

    const authHeader = req.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return json({
        success: false,
        error: "unauthorized",
        message: "Authorization token is required."
      }, 401);
    }

    const accessToken = authHeader.replace("Bearer ", "").trim();

    // Verify the Supabase session/user.
    const {
      data: { user },
      error: userError
    } = await authClient.auth.getUser(accessToken);

    if (userError || !user) {
      return json({
        success: false,
        error: "invalid_session",
        message: "Your session is invalid or expired."
      }, 401);
    }

    // Find employee linked to the authenticated Supabase user.
    const { data: employee, error: employeeError } =
      await adminClient
        .from("employees")
        .select(`
          id,
          employee_id,
          name,
          role,
          status,
          auth_user_id
        `)
        .eq("auth_user_id", user.id)
        .maybeSingle();

    if (employeeError) {
      console.error("Employee lookup error:", employeeError);

      return json({
        success: false,
        error: "database_error",
        message: "Unable to find employee account."
      }, 500);
    }

    if (!employee) {
      return json({
        success: false,
        error: "employee_not_found",
        message: "Employee account was not found."
      }, 404);
    }

    if (employee.status !== "active") {
      return json({
        success: false,
        error: "employee_inactive",
        message: "This employee account is not active."
      }, 403);
    }

    // =========================================================
    // ATTENDANCE ACTIONS
    // =========================================================

    if (action === "attendance_today") {
      return await handleAttendanceToday(employee);
    }

    if (action === "start_work") {
      return await handleStartWork(employee);
    }

    if (action === "end_work") {
      return await handleEndWork(employee);
    }

    if (action === "start_break") {
      return await handleStartBreak(employee);
    }

    if (action === "end_break" || action === "resume_work") {
      return await handleEndBreak(employee);
    }

    if (action === "attendance_monthly") {
      return await handleAttendanceMonthly(employee, body);
    }

    if (action === "attendance_feed" || action === "attendance_punches" || action === "attendance_activity") {
      return await handleAttendanceFeed(body);
    }

    // =========================================================
    // LEAVE & HOLIDAYS
    // =========================================================

    if (action === "leave_history") {
      return await handleLeaveHistory(employee);
    }

    if (action === "leave_submit") {
      return await handleLeaveSubmit(employee, body);
    }

    if (action === "public_holidays") {
      return await handlePublicHolidays();
    }

    // =========================================================
    // SUPER ADMIN ACTIONS
    // =========================================================

    if (action === "update_employee_role") {
      return await handleUpdateEmployeeRole(employee, body);
    }

    // =========================================================
    // SEARCH ACTION
    // =========================================================

    if (action === "search") {
      return await handleGlobalSearch(body);
    }

    // =========================================================
    // UNKNOWN ACTION
    // =========================================================

    return json({
      success: false,
      error: "unsupported_action",
      message: `Unsupported action: ${action}`
    }, 400);

  } catch (error) {
    console.error("Unexpected error:", error);

    return json({
      success: false,
      error: "server_error",
      message: "An unexpected server error occurred."
    }, 500);
  }
});


// =============================================================
// LOGIN HANDLER
// =============================================================

async function handleLogin(body: any) {
  const employeeId = String(body.employeeId ?? "").trim();
  const password = String(body.password ?? "");

  if (!employeeId || !password) {
    return json({
      success: false,
      error: "missing_credentials",
      message: "Employee ID and password are required."
    }, 400);
  }

  const { data: employee, error: employeeError } =
    await adminClient
      .from("employees")
      .select(`
        employee_id,
        name,
        email,
        role,
        status,
        auth_user_id,
        department,
        department_id,
        work_shift_id,
        reporting_manager_id
      `)
      .eq("employee_id", employeeId)
      .maybeSingle();

  if (employeeError) {
    console.error("Employee lookup error:", employeeError);

    return json({
      success: false,
      error: "database_error",
      message: "Unable to verify employee."
    }, 500);
  }

  if (!employee) {
    return json({
      success: false,
      error: "invalid_credentials",
      message: "Invalid Employee ID or password."
    }, 401);
  }

  if (employee.status !== "active") {
    return json({
      success: false,
      error: "employee_inactive",
      message: "This employee account is not active."
    }, 403);
  }

  if (!employee.email || !employee.auth_user_id) {
    return json({
      success: false,
      error: "account_not_configured",
      message: "Employee authentication is not configured."
    }, 500);
  }

  const {
    data: authData,
    error: authError
  } = await authClient.auth.signInWithPassword({
    email: employee.email,
    password
  });

  if (authError || !authData.session || !authData.user) {
    console.error("Auth error:", authError);

    return json({
      success: false,
      error: "invalid_credentials",
      message: "Invalid Employee ID or password."
    }, 401);
  }

  if (authData.user.id !== employee.auth_user_id) {
    console.error(
      "Auth user mismatch:",
      authData.user.id,
      employee.auth_user_id
    );

    return json({
      success: false,
      error: "account_mismatch",
      message: "Employee authentication configuration is invalid."
    }, 500);
  }

  // Fetch organization data to populate dynamic fields
  // In a real app, you would join tables. Here we fetch the names.
  const { data: deptData } = await adminClient.from("departments").select("id, department_name").eq("id", employee.department_id).maybeSingle();
  const { data: shiftData } = await adminClient.from("work_shifts").select("id, shift_name").eq("id", employee.work_shift_id).maybeSingle();
  const { data: managerData } = await adminClient.from("employees").select("id, name").eq("id", employee.reporting_manager_id).maybeSingle();

  // Basic mock values for metrics for now, as calculating them dynamically would require complex queries
  // which might timeout or be too slow for login.
  const attendancePercent = "96.4%";
  const leaveQuota = "11 Days";
  const ytdOvertime = "+14h 30m";

  return json({
    success: true,
    message: "Login successful.",
    session: {
      token: authData.session.access_token,
      expiresInSeconds: authData.session.expires_in
    },
    employee: {
      employeeId: employee.employee_id,
      name: employee.name,
      role: employee.role,
      departmentName: deptData?.department_name || employee.department || "Operations",
      managerName: managerData?.name || "System Admin",
      workShiftName: shiftData?.shift_name || "Standard Shift",
      attendancePercent: attendancePercent,
      leaveQuota: leaveQuota,
      ytdOvertime: ytdOvertime
    }
  });
}


// =============================================================
// SUPER ADMIN HANDLERS
// =============================================================

function ensureSuperAdmin(employee: any) {
  if (!employee || employee.role !== "super_admin") {
    throw new Error("unauthorized_super_admin");
  }
}

async function handleUpdateEmployeeRole(employee: any, body: any) {
  try {
    ensureSuperAdmin(employee);
  } catch (error) {
    return json({
      success: false,
      error: "unauthorized",
      message: "You do not have permission to modify roles."
    }, 403);
  }

  const targetEmployeeId = String(body.targetEmployeeId ?? "").trim();
  const newRole = String(body.role ?? "").trim();

  if (!targetEmployeeId || !newRole) {
    return json({
      success: false,
      error: "missing_parameters",
      message: "Employee ID and new role are required."
    }, 400);
  }

  if (newRole !== "employee" && newRole !== "admin") {
    return json({
      success: false,
      error: "invalid_role",
      message: "Role must be 'employee' or 'admin'."
    }, 400);
  }

  if (targetEmployeeId === employee.employee_id) {
    return json({
      success: false,
      error: "self_modification",
      message: "You cannot change your own role."
    }, 400);
  }

  // Verify target employee
  const { data: targetEmployee, error: targetError } = await adminClient
    .from("employees")
    .select("id, role")
    .eq("employee_id", targetEmployeeId)
    .maybeSingle();

  if (targetError) {
    console.error("Target employee lookup error:", targetError);
    return json({
      success: false,
      error: "database_error",
      message: "Unable to verify target employee."
    }, 500);
  }

  if (!targetEmployee) {
    return json({
      success: false,
      error: "employee_not_found",
      message: "Target employee not found."
    }, 404);
  }

  if (targetEmployee.role === "super_admin") {
    return json({
      success: false,
      error: "cannot_modify_super_admin",
      message: "Cannot modify a super admin's role."
    }, 403);
  }

  const { error: updateError } = await adminClient
    .from("employees")
    .update({ role: newRole })
    .eq("employee_id", targetEmployeeId);

  if (updateError) {
    console.error("Update role error:", updateError);
    return json({
      success: false,
      error: "database_error",
      message: "Failed to update employee role."
    }, 500);
  }

  return json({
    success: true,
    message: `Successfully updated role to ${newRole}.`
  });
}


// =============================================================
// ATTENDANCE TODAY HANDLER
// =============================================================

async function handleAttendanceToday(employee: any) {
  const indiaToday = getIndiaTodayDate();

  const { data, error } = await adminClient
    .from("attendance")
    .select(`
      id,
      attendance_date,
      check_in,
      check_out,
      break_started_at,
      total_break_seconds,
      worked_minutes,
      break_minutes,
      status
    `)
    .eq("employee_id", employee.id)
    .eq("attendance_date", indiaToday)
    .maybeSingle();

  if (error) {
    console.error("attendance_today error:", error);

    return json(
      {
        success: false,
        message: "Unable to load today's attendance.",
        error: error.message
      },
      500
    );
  }

  if (!data) {
    return json({
      success: true,
      attendance: null
    });
  }

  // Check attendance_breaks for any active break or completed breaks
  const { data: breaks } = await adminClient
    .from("attendance_breaks")
    .select("id, break_start, break_end, break_minutes")
    .eq("attendance_id", data.id)
    .order("break_start", { ascending: false });

  let activeBreak: any = null;
  let totalBreakSeconds = 0;
  let totalBreakMinutes = data.break_minutes ?? 0;

  if (breaks && breaks.length > 0) {
    activeBreak = breaks.find((b: any) => !b.break_end);
    let computedSec = 0;
    let computedMin = 0;
    for (const b of breaks) {
      if (b.break_end && b.break_start) {
        computedSec += Math.floor(
          Math.max(0, new Date(b.break_end).getTime() - new Date(b.break_start).getTime()) / 1000
        );
        if (b.break_minutes != null) {
          computedMin += b.break_minutes;
        } else {
          computedMin += Math.floor(
            Math.max(0, new Date(b.break_end).getTime() - new Date(b.break_start).getTime()) / 60000
          );
        }
      }
    }
    totalBreakSeconds = computedSec;
    if (data.break_minutes == null) {
      totalBreakMinutes = computedMin;
    }
  }

  const isOnBreak = !!activeBreak;
  const breakStartedAt = activeBreak ? activeBreak.break_start : data.break_started_at;

  let currentStatus = data.status;
  if (data.check_out) {
    currentStatus = "ended";
  } else if (isOnBreak) {
    currentStatus = "on_break";
  } else if (data.check_in) {
    currentStatus = "working";
  }

  // Format hours representation (excluding breaks)
  let hoursDisplay = "0h 00m";
  if (data.worked_minutes != null) {
    hoursDisplay = formatDuration(data.worked_minutes);
  } else if (data.check_in && data.check_out) {
    const presenceMin = Math.floor(
      Math.max(0, new Date(data.check_out).getTime() - new Date(data.check_in).getTime()) / 60000
    );
    hoursDisplay = formatDuration(Math.max(0, presenceMin - totalBreakMinutes));
  } else if (data.check_in) {
    // Current live active time for today's session
    const currentEnd = activeBreak ? new Date(activeBreak.break_start).getTime() : Date.now();
    const presenceSec = Math.floor(
      Math.max(0, currentEnd - new Date(data.check_in).getTime()) / 1000
    );
    const activeSec = Math.max(0, presenceSec - totalBreakSeconds);
    hoursDisplay = formatDuration(Math.floor(activeSec / 60));
  }

  return json({
    success: true,
    attendance: {
      id: data.id,
      date: data.attendance_date,
      checkIn: data.check_in,
      checkOut: data.check_out,
      check_in: data.check_in,
      check_out: data.check_out,
      login: formatTime(data.check_in),
      logout: formatTime(data.check_out),
      hours: hoursDisplay,
      breakStartedAt: breakStartedAt,
      break_start: breakStartedAt,
      activeBreak: activeBreak ? {
        id: activeBreak.id,
        breakStart: activeBreak.break_start,
        break_start: activeBreak.break_start
      } : null,
      active_break: activeBreak ? {
        id: activeBreak.id,
        breakStart: activeBreak.break_start,
        break_start: activeBreak.break_start
      } : null,
      totalBreakSeconds: totalBreakSeconds || (data.total_break_seconds ?? 0),
      workedMinutes: data.worked_minutes,
      worked_minutes: data.worked_minutes,
      breakMinutes: totalBreakMinutes,
      break_minutes: totalBreakMinutes,
      status: currentStatus,
      isOnBreak: isOnBreak
    }
  });
}


// =============================================================
// START WORK HANDLER
// =============================================================

async function handleStartWork(employee: any) {
  const indiaToday = getIndiaTodayDate();

  // Check if today's attendance already exists
  const { data: existingAttendance, error: lookupError } = await adminClient
    .from("attendance")
    .select("id, attendance_date, check_in, check_out, status")
    .eq("employee_id", employee.id)
    .eq("attendance_date", indiaToday)
    .maybeSingle();

  if (lookupError) {
    console.error("Start work lookup error:", lookupError);
    return json({
      success: false,
      error: "database_error",
      message: "Unable to check today's attendance."
    }, 500);
  }

  if (existingAttendance && existingAttendance.check_in) {
    return json({
      success: false,
      error: "ALREADY_STARTED",
      message: "Work has already been started for today."
    }, 400);
  }

  const nowIso = new Date().toISOString();
  let attendanceRecord: any = null;

  if (existingAttendance) {
    const { data: updated, error: updateError } = await adminClient
      .from("attendance")
      .update({
        check_in: nowIso,
        status: "working",
        worked_minutes: 0,
        break_minutes: 0,
        total_break_seconds: 0,
        break_started_at: null
      })
      .eq("id", existingAttendance.id)
      .select()
      .single();

    if (updateError) {
      console.error("Start work update error:", updateError);
      return json({
        success: false,
        error: "start_work_error",
        message: updateError.message
      }, 500);
    }
    attendanceRecord = updated;
  } else {
    const { data: inserted, error: insertError } = await adminClient
      .from("attendance")
      .insert({
        employee_id: employee.id,
        attendance_date: indiaToday,
        check_in: nowIso,
        status: "working",
        worked_minutes: 0,
        break_minutes: 0,
        total_break_seconds: 0,
        break_started_at: null
      })
      .select()
      .single();

    if (insertError) {
      console.error("Start work insert error:", insertError);
      return json({
        success: false,
        error: "start_work_error",
        message: insertError.message
      }, 500);
    }
    attendanceRecord = inserted;
  }

  return json({
    success: true,
    message: "Work started successfully.",
    attendance: {
      date: attendanceRecord.attendance_date,
      employeeId: employee.employee_id,
      name: employee.name,
      login: formatTime(attendanceRecord.check_in),
      logout: null,
      hours: "0h 00m",
      status: "working",
      workedMinutes: 0,
      breakMinutes: 0,
      totalBreakSeconds: 0,
      breakStartedAt: null,
      isOnBreak: false
    }
  });
}


// =============================================================
// START BREAK HANDLER
// =============================================================

async function handleStartBreak(employee: any) {
  const indiaToday = getIndiaTodayDate();

  // 1. Authenticate employee & find today's attendance record
  const { data: attendance, error: attError } = await adminClient
    .from("attendance")
    .select("*")
    .eq("employee_id", employee.id)
    .eq("attendance_date", indiaToday)
    .maybeSingle();

  if (attError) {
    console.error("start_break attendance query error:", attError);
    return json({
      success: false,
      error: "database_error",
      message: "Unable to query today's attendance."
    }, 500);
  }

  // 2. Confirm employee has already started work
  if (!attendance || !attendance.check_in) {
    return json({
      success: false,
      error: "NOT_STARTED",
      message: "Cannot start a break before starting work."
    }, 400);
  }

  // Confirm work has not already ended
  if (attendance.check_out) {
    return json({
      success: false,
      error: "ALREADY_ENDED",
      message: "Cannot start a break after work has ended."
    }, 400);
  }

  // 3. Confirm employee is not already on a break
  const { data: activeBreaks, error: breakError } = await adminClient
    .from("attendance_breaks")
    .select("*")
    .eq("attendance_id", attendance.id)
    .is("break_end", null);

  if (breakError) {
    console.error("start_break active breaks error:", breakError);
    return json({
      success: false,
      error: "database_error",
      message: "Unable to check active breaks."
    }, 500);
  }

  if (activeBreaks && activeBreaks.length > 0) {
    return json({
      success: false,
      error: "ALREADY_ON_BREAK",
      message: "Cannot start another break while already on a break."
    }, 400);
  }

  // 4. Create an attendance_break record
  const nowIso = new Date().toISOString();
  const { data: newBreak, error: insertBreakError } = await adminClient
    .from("attendance_breaks")
    .insert({
      attendance_id: attendance.id,
      break_start: nowIso,
      break_end: null,
      break_minutes: null
    })
    .select()
    .single();

  if (insertBreakError) {
    console.error("start_break insert error:", insertBreakError);
    return json({
      success: false,
      error: "start_break_error",
      message: "Unable to record break start."
    }, 500);
  }

  // Update attendance table status & legacy break fields
  await adminClient
    .from("attendance")
    .update({
      status: "on_break",
      break_started_at: nowIso
    })
    .eq("id", attendance.id);

  // Compute existing completed breaks
  const { data: completedBreaks } = await adminClient
    .from("attendance_breaks")
    .select("break_start, break_end, break_minutes")
    .eq("attendance_id", attendance.id)
    .not("break_end", "is", null);

  let totalCompletedSeconds = 0;
  let totalCompletedMinutes = 0;
  for (const b of completedBreaks ?? []) {
    if (b.break_minutes != null) {
      totalCompletedMinutes += b.break_minutes;
    }
    if (b.break_start && b.break_end) {
      const diffSec = Math.floor(
        (new Date(b.break_end).getTime() - new Date(b.break_start).getTime()) / 1000
      );
      totalCompletedSeconds += Math.max(0, diffSec);
    }
  }

  return json({
    success: true,
    message: "Break started successfully.",
    attendance: {
      date: attendance.attendance_date,
      checkIn: attendance.check_in,
      checkOut: attendance.check_out,
      check_in: attendance.check_in,
      check_out: attendance.check_out,
      login: formatTime(attendance.check_in),
      logout: formatTime(attendance.check_out),
      breakStartedAt: nowIso,
      break_start: nowIso,
      activeBreak: newBreak ? {
        id: newBreak.id,
        breakStart: newBreak.break_start,
        break_start: newBreak.break_start
      } : null,
      active_break: newBreak ? {
        id: newBreak.id,
        breakStart: newBreak.break_start,
        break_start: newBreak.break_start
      } : null,
      totalBreakSeconds: totalCompletedSeconds,
      status: "on_break",
      isOnBreak: true,
      workedMinutes: attendance.worked_minutes ?? 0,
      worked_minutes: attendance.worked_minutes ?? 0,
      breakMinutes: totalCompletedMinutes,
      break_minutes: totalCompletedMinutes
    }
  });
}


// =============================================================
// END BREAK HANDLER (Supports action "end_break" and "resume_work")
// =============================================================

async function handleEndBreak(employee: any) {
  const indiaToday = getIndiaTodayDate();

  // 1. Authenticate employee & find today's attendance record
  const { data: attendance, error: attError } = await adminClient
    .from("attendance")
    .select("*")
    .eq("employee_id", employee.id)
    .eq("attendance_date", indiaToday)
    .maybeSingle();

  if (attError) {
    console.error("end_break attendance query error:", attError);
    return json({
      success: false,
      error: "database_error",
      message: "Unable to query today's attendance."
    }, 500);
  }

  if (!attendance || !attendance.check_in) {
    return json({
      success: false,
      error: "NOT_STARTED",
      message: "You have not started work today."
    }, 400);
  }

  if (attendance.check_out) {
    return json({
      success: false,
      error: "ALREADY_ENDED",
      message: "Work has already ended for today."
    }, 400);
  }

  // 2. Find active break for today's attendance
  const { data: activeBreaks, error: breakError } = await adminClient
    .from("attendance_breaks")
    .select("*")
    .eq("attendance_id", attendance.id)
    .is("break_end", null)
    .order("break_start", { ascending: false });

  if (breakError) {
    console.error("end_break active breaks error:", breakError);
    return json({
      success: false,
      error: "database_error",
      message: "Unable to query active break."
    }, 500);
  }

  // 3. Confirm an active break exists
  if (!activeBreaks || activeBreaks.length === 0) {
    return json({
      success: false,
      error: "NO_ACTIVE_BREAK",
      message: "Cannot end a break when no break is active."
    }, 400);
  }

  const activeBreak = activeBreaks[0];
  const now = new Date();
  const nowIso = now.toISOString();

  // 4 & 5. Set break_end & calculate break duration in minutes (authoritative backend calculation)
  const startMs = new Date(activeBreak.break_start).getTime();
  const endMs = now.getTime();
  const durationMs = Math.max(0, endMs - startMs);
  const breakMinutes = Math.floor(durationMs / 60000);

  // 6. Store duration in minutes
  const { error: updateBreakError } = await adminClient
    .from("attendance_breaks")
    .update({
      break_end: nowIso,
      break_minutes: breakMinutes,
      updated_at: nowIso
    })
    .eq("id", activeBreak.id);

  if (updateBreakError) {
    console.error("end_break update error:", updateBreakError);
    return json({
      success: false,
      error: "end_break_error",
      message: "Unable to record break completion."
    }, 500);
  }

  // Fetch all completed breaks for this attendance record
  const { data: allBreaks } = await adminClient
    .from("attendance_breaks")
    .select("break_start, break_end, break_minutes")
    .eq("attendance_id", attendance.id)
    .not("break_end", "is", null);

  let totalBreakMinutes = 0;
  let totalBreakSeconds = 0;
  for (const b of allBreaks ?? []) {
    if (b.break_minutes != null) {
      totalBreakMinutes += b.break_minutes;
    }
    if (b.break_start && b.break_end) {
      const diffSec = Math.floor(
        (new Date(b.break_end).getTime() - new Date(b.break_start).getTime()) / 1000
      );
      totalBreakSeconds += Math.max(0, diffSec);
    }
  }

  // Update attendance: status working, clear break_started_at, update break_minutes and total_break_seconds
  await adminClient
    .from("attendance")
    .update({
      status: "working",
      break_started_at: null,
      break_minutes: totalBreakMinutes,
      total_break_seconds: totalBreakSeconds
    })
    .eq("id", attendance.id);

  // 7. Return the updated attendance/break state
  return json({
    success: true,
    message: "Break ended successfully.",
    attendance: {
      date: attendance.attendance_date,
      checkIn: attendance.check_in,
      checkOut: attendance.check_out,
      check_in: attendance.check_in,
      check_out: attendance.check_out,
      login: formatTime(attendance.check_in),
      logout: formatTime(attendance.check_out),
      breakStartedAt: null,
      break_start: null,
      activeBreak: null,
      active_break: null,
      totalBreakSeconds: totalBreakSeconds,
      status: "working",
      isOnBreak: false,
      workedMinutes: attendance.worked_minutes ?? 0,
      worked_minutes: attendance.worked_minutes ?? 0,
      breakMinutes: totalBreakMinutes,
      break_minutes: totalBreakMinutes
    }
  });
}


// =============================================================
// END WORK HANDLER
// =============================================================

async function handleEndWork(employee: any) {
  const indiaToday = getIndiaTodayDate();

  // 1. Confirm the employee has started work
  const { data: attendance, error: attError } = await adminClient
    .from("attendance")
    .select("*")
    .eq("employee_id", employee.id)
    .eq("attendance_date", indiaToday)
    .maybeSingle();

  if (attError) {
    console.error("end_work attendance query error:", attError);
    return json({
      success: false,
      error: "database_error",
      message: "Unable to query today's attendance."
    }, 500);
  }

  if (!attendance || !attendance.check_in) {
    return json({
      success: false,
      error: "NOT_STARTED",
      message: "Cannot end work before starting work."
    }, 400);
  }

  if (attendance.check_out) {
    return json({
      success: false,
      error: "ALREADY_ENDED",
      message: "Work has already been ended for today."
    }, 400);
  }

  // 2. Confirm there is no active/unclosed break
  const { data: activeBreaks, error: activeBreakError } = await adminClient
    .from("attendance_breaks")
    .select("*")
    .eq("attendance_id", attendance.id)
    .is("break_end", null);

  if (activeBreakError) {
    console.error("end_work check active breaks error:", activeBreakError);
    return json({
      success: false,
      error: "database_error",
      message: "Unable to check active breaks."
    }, 500);
  }

  if (activeBreaks && activeBreaks.length > 0) {
    return json({
      success: false,
      error: "ACTIVE_BREAK",
      message: "Cannot end work while a break is still active. Please end your break first."
    }, 400);
  }

  // 3. Set check_out
  const checkOutIso = new Date().toISOString();

  // 4. Calculate total presence duration
  const startMs = new Date(attendance.check_in).getTime();
  const endMs = new Date(checkOutIso).getTime();
  const diffMs = Math.max(0, endMs - startMs);
  const presenceMinutes = Math.max(1, Math.round(diffMs / 60000));

  // 5. Sum all completed breaks for that attendance record
  const { data: breaks, error: breaksError } = await adminClient
    .from("attendance_breaks")
    .select("break_start, break_end, break_minutes")
    .eq("attendance_id", attendance.id)
    .not("break_end", "is", null);

  if (breaksError) {
    console.error("end_work fetch breaks error:", breaksError);
  }

  let totalBreakMinutes = 0;
  let totalBreakSeconds = 0;
  for (const b of breaks ?? []) {
    if (b.break_minutes != null) {
      totalBreakMinutes += b.break_minutes;
    } else if (b.break_start && b.break_end) {
      totalBreakMinutes += Math.floor(
        Math.max(0, new Date(b.break_end).getTime() - new Date(b.break_start).getTime()) / 60000
      );
    }
    if (b.break_start && b.break_end) {
      totalBreakSeconds += Math.floor(
        Math.max(0, new Date(b.break_end).getTime() - new Date(b.break_start).getTime()) / 1000
      );
    }
  }

  // 6. Calculate: worked_minutes = presence_minutes - break_minutes
  const workedMinutes = Math.max(1, presenceMinutes - totalBreakMinutes);

  // 7. Store attendance.worked_minutes and attendance.break_minutes
  const { data: updatedAttendance, error: updateError } = await adminClient
    .from("attendance")
    .update({
      check_out: checkOutIso,
      worked_minutes: workedMinutes,
      break_minutes: totalBreakMinutes,
      total_break_seconds: totalBreakSeconds,
      break_started_at: null,
      status: "ended"
    })
    .eq("id", attendance.id)
    .select()
    .single();

  if (updateError) {
    console.error("end_work update error:", updateError);
    return json({
      success: false,
      error: "end_work_error",
      message: "Unable to finalize attendance record."
    }, 500);
  }

  const hoursFormatted = formatDuration(workedMinutes);

  return json({
    success: true,
    message: "Work ended successfully.",
    attendance: {
      date: updatedAttendance.attendance_date,
      employeeId: employee.employee_id,
      name: employee.name,
      login: formatTime(updatedAttendance.check_in),
      logout: formatTime(updatedAttendance.check_out),
      checkIn: updatedAttendance.check_in,
      checkOut: updatedAttendance.check_out,
      check_in: updatedAttendance.check_in,
      check_out: updatedAttendance.check_out,
      hours: hoursFormatted,
      status: "ended",
      workedMinutes: workedMinutes,
      worked_minutes: workedMinutes,
      breakMinutes: totalBreakMinutes,
      break_minutes: totalBreakMinutes,
      totalBreakSeconds: totalBreakSeconds,
      isOnBreak: false,
      activeBreak: null,
      active_break: null,
      breakStartedAt: null,
      break_start: null
    }
  });
}


// =============================================================
// ATTENDANCE PUNCH FEED HANDLER (CHECK-IN & CHECK-OUT NOTIFICATIONS)
// =============================================================

async function handleAttendanceFeed(body: any) {
  const limit = Math.min(Math.max(Number(body?.limit ?? 50), 1), 200);
  const dateFilter = body?.date ? String(body.date) : null;

  let query = adminClient
    .from("attendance")
    .select(`
      id,
      employee_id,
      attendance_date,
      check_in,
      check_out,
      status,
      worked_minutes,
      break_minutes,
      created_at,
      employees (
        id,
        name,
        employee_id,
        profile_photo_url,
        designation,
        department_id
      )
    `)
    .not("check_in", "is", null)
    .order("check_in", { ascending: false })
    .limit(limit);

  if (dateFilter) {
    query = query.eq("attendance_date", dateFilter);
  }

  const { data: attendanceRows, error: attError } = await query;

  if (attError) {
    console.error("Attendance feed query error:", attError);
    return json({
      success: false,
      error: "database_error",
      message: "Failed to fetch attendance punch feed.",
      details: attError.message
    }, 500);
  }

  // Deconstruct rows into distinct check_in and check_out punch events
  const events: any[] = [];

  for (const row of attendanceRows ?? []) {
    const emp = row.employees || {};
    const employeeName = emp.name || "Employee";
    const employeeCode = emp.employee_id || "—";
    const avatar = emp.profile_photo_url || null;
    const designation = emp.designation || "Field Officer";

    // 1. Check-in event
    if (row.check_in) {
      const isLate = (row.status || "").toLowerCase() === "late";
      events.push({
        id: `cin-${row.id}`,
        attendanceId: row.id,
        type: "check_in",
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
        status: isLate ? "Late" : "On Time",
        badge: isLate ? "Late Check-in" : "Checked In",
        badgeColor: isLate ? "amber" : "emerald"
      });
    }

    // 2. Check-out event
    if (row.check_out) {
      let workedMins = row.worked_minutes;
      if ((workedMins == null || workedMins <= 0) && row.check_in && row.check_out) {
        const diffMs = Math.max(0, new Date(row.check_out).getTime() - new Date(row.check_in).getTime());
        const totalSec = Math.floor(diffMs / 1000);
        const breakSec = (row.break_minutes ?? 0) * 60;
        workedMins = Math.max(1, Math.round((totalSec - breakSec) / 60));
      }

      const durationText = formatWorkedDuration(
        row.check_in,
        row.check_out,
        workedMins,
        row.break_minutes
      );

      events.push({
        id: `cout-${row.id}`,
        attendanceId: row.id,
        type: "check_out",
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
        workedMinutes: workedMins ?? 0,
        workedDuration: durationText,
        status: "Shift Completed",
        badge: "Checked Out",
        badgeColor: "blue"
      });
    }
  }

  // Sort events chronologically descending (newest timestamp first)
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return json({
    success: true,
    total: events.length,
    events
  });
}


// =============================================================
// PUBLIC HOLIDAYS HANDLER
// =============================================================

async function handlePublicHolidays() {
  const { data, error } = await adminClient
    .from("public_holidays")
    .select(`
      id,
      date,
      name,
      category
    `)
    .order("date", { ascending: true });

  if (error) {
    console.error("Public holidays fetch error:", error);

    return json({
      success: false,
      error: "public_holidays_error",
      message: "Unable to retrieve public holidays.",
      details: error.message
    }, 500);
  }

  return json({
    success: true,
    message: "Public holidays retrieved successfully.",
    holidays: (data ?? []).map((h: any) => ({
      id: h.id,
      date: h.date,
      name: h.name,
      category: h.category ?? "Public Holiday"
    }))
  });
}


// =============================================================
// LEAVE HISTORY HANDLER
// =============================================================

async function handleLeaveHistory(employee: any) {
  const { data, error } = await adminClient
    .from("leaves")
    .select(`
      request_id,
      employee_id,
      from_date,
      to_date,
      leave_type,
      reason,
      status,
      leave_days,
      paid_leave_days,
      lop_days,
      manager_comment
    `)
    .eq("employee_id", employee.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Leave history error:", error);

    return json({
      success: false,
      error: "leave_history_error",
      message: "Unable to retrieve leave history.",
      details: error.message,
      code: error.code ?? null
    }, 500);
  }

  return json({
    success: true,
    message: "Leave history retrieved successfully.",
    leaves: (data ?? []).map((leave: any) => ({
      requestId: leave.request_id,
      employeeId: employee.employee_id,
      name: employee.name,
      from: leave.from_date,
      to: leave.to_date,
      type: leave.leave_type,
      reason: leave.reason,
      status: leave.status,
      leaveDays: leave.leave_days,
      paidLeaveDays: leave.paid_leave_days,
      lopDays: leave.lop_days,
      managerComment: leave.manager_comment
    }))
  });
}


// =============================================================
// LEAVE SUBMIT HANDLER
// =============================================================

async function handleLeaveSubmit(employee: any, body: any) {
  const from = String(body.from ?? "").trim();
  const to = String(body.to ?? "").trim();
  const type = String(body.type ?? "").trim();
  const reason = String(body.reason ?? "").trim();

  if (!from || !to) {
    return json({
      success: false,
      error: "INVALID_DATE",
      message: "Leave dates are required."
    }, 400);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return json({
      success: false,
      error: "INVALID_DATE",
      message: "Dates must use YYYY-MM-DD format."
    }, 400);
  }

  if (from > to) {
    return json({
      success: false,
      error: "INVALID_DATE",
      message: "From date cannot be after To date."
    }, 400);
  }

  if (!type) {
    return json({
      success: false,
      error: "INVALID_LEAVE_TYPE",
      message: "Leave type is required."
    }, 400);
  }

  if (reason.length < 3) {
    return json({
      success: false,
      error: "INVALID_REASON",
      message: "Please provide a valid reason."
    }, 400);
  }

  const { data: overlappingLeaves, error: overlapError } =
    await adminClient
      .from("leaves")
      .select("id, request_id, from_date, to_date, status")
      .eq("employee_id", employee.id)
      .in("status", ["pending", "approved"])
      .lte("from_date", to)
      .gte("to_date", from);

  if (overlapError) {
    console.error("Leave overlap check error:", overlapError);

    return json({
      success: false,
      error: "database_error",
      message: "Unable to validate leave dates.",
      details: overlapError.message,
      code: overlapError.code ?? null
    }, 500);
  }

  if (overlappingLeaves && overlappingLeaves.length > 0) {
    return json({
      success: false,
      error: "OVERLAPPING_LEAVE",
      message: "These dates overlap an existing leave request."
    }, 409);
  }

  const requestId =
    `LV-${new Date().getFullYear()}-${crypto.randomUUID()
      .replaceAll("-", "")
      .substring(0, 8)
      .toUpperCase()}`;

  let leaveDaysVal = 1;
  const startDate = new Date(from);
  const endDate = new Date(to);
  const diffDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  if (type.toLowerCase().includes("half day")) {
    leaveDaysVal = 0.5;
  } else {
    leaveDaysVal = diffDays > 0 ? diffDays : 1;
  }

  const { data: leave, error: insertError } =
    await adminClient
      .from("leaves")
      .insert({
        request_id: requestId,
        employee_id: employee.id,
        from_date: from,
        to_date: to,
        leave_type: type,
        reason: reason,
        status: "pending",
        leave_days: leaveDaysVal
      })
      .select(`
        id,
        request_id,
        employee_id,
        from_date,
        to_date,
        leave_type,
        reason,
        status,
        leave_days,
        paid_leave_days,
        lop_days,
        approved_by,
        approved_at,
        manager_comment,
        created_at,
        updated_at
      `)
      .single();

  if (insertError) {
    console.error("Leave insert error:", insertError);

    return json({
      success: false,
      error: "leave_submit_error",
      message: "Unable to submit leave request.",
      details: insertError.message,
      code: insertError.code ?? null
    }, 500);
  }

  return json({
    success: true,
    message: "Leave request submitted successfully.",
    leave: {
      id: leave.id,
      requestId: leave.request_id,
      employeeId: employee.employee_id,
      from: leave.from_date,
      to: leave.to_date,
      type: leave.leave_type,
      reason: leave.reason,
      status: leave.status,
      leaveDays: leave.leave_days,
      paidLeaveDays: leave.paid_leave_days,
      lopDays: leave.lop_days,
      approvedBy: leave.approved_by,
      approvedAt: leave.approved_at,
      managerComment: leave.manager_comment,
      createdAt: leave.created_at,
      updatedAt: leave.updated_at
    }
  });
}


// =============================================================
// MONTHLY ATTENDANCE HANDLER
// Calculates SUM(worked_minutes) for completed attendance records,
// strictly excluding break time.
// Exposes totalWorkedMinutes and totalBreakMinutes in JSON.
// =============================================================

async function handleAttendanceMonthly(
  employee: any,
  body: any
) {
  try {
    const month = String(body?.month ?? "").trim();

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return json(
        {
          success: false,
          message: "Invalid month. Expected format YYYY-MM."
        },
        400
      );
    }

    const [yearString, monthString] = month.split("-");
    const year = Number(yearString);
    const monthNumber = Number(monthString);

    if (
      !Number.isInteger(year) ||
      !Number.isInteger(monthNumber) ||
      monthNumber < 1 ||
      monthNumber > 12
    ) {
      return json(
        {
          success: false,
          message: "Invalid month."
        },
        400
      );
    }

    const lastDay = new Date(
      Date.UTC(year, monthNumber, 0)
    );

    const startDate = `${yearString}-${monthString}-01`;

    const endDate =
      `${yearString}-${monthString}-${String(
        lastDay.getUTCDate()
      ).padStart(2, "0")}`;

    const indiaToday = getIndiaTodayDate();

    let calculationEndDate: string | null = endDate;

    if (month > indiaToday.substring(0, 7)) {
      calculationEndDate = null;
    } else if (month === indiaToday.substring(0, 7)) {
      calculationEndDate = indiaToday;
    }

    const { data: attendanceRows, error: attendanceError } =
      await adminClient
        .from("attendance")
        .select(`
          id,
          employee_id,
          attendance_date,
          check_in,
          check_out,
          status,
          worked_minutes,
          break_minutes,
          break_started_at
        `)
        .eq("employee_id", employee.id)
        .gte("attendance_date", startDate)
        .lte("attendance_date", endDate)
        .order("attendance_date", { ascending: true });

    if (attendanceError) {
      console.error(
        "Monthly attendance query error:",
        attendanceError
      );

      return json(
        {
          success: false,
          message: "Unable to load monthly attendance.",
          error: attendanceError.message
        },
        500
      );
    }

    const { data: leaveRows, error: leaveError } =
      await adminClient
        .from("leaves")
        .select(`
          id,
          from_date,
          to_date,
          status
        `)
        .eq("employee_id", employee.id)
        .in("status", ["pending", "approved"])
        .lte("from_date", endDate)
        .gte("to_date", startDate);

    if (leaveError) {
      console.error(
        "Monthly leave query error:",
        leaveError
      );

      return json(
        {
          success: false,
          message: "Unable to load monthly leave.",
          error: leaveError.message
        },
        500
      );
    }

    const leaveDates = new Set<string>();

    for (const leave of leaveRows ?? []) {
      if (!leave.from_date || !leave.to_date) {
        continue;
      }

      let leaveStart = new Date(
        `${leave.from_date}T00:00:00Z`
      );

      let leaveEnd = new Date(
        `${leave.to_date}T00:00:00Z`
      );

      const rangeStart = new Date(
        `${startDate}T00:00:00Z`
      );

      const rangeEnd = new Date(
        `${endDate}T00:00:00Z`
      );

      if (leaveStart < rangeStart) {
        leaveStart = rangeStart;
      }

      if (leaveEnd > rangeEnd) {
        leaveEnd = rangeEnd;
      }

      if (
        calculationEndDate !== null &&
        leaveEnd >
          new Date(`${calculationEndDate}T00:00:00Z`)
      ) {
        leaveEnd = new Date(
          `${calculationEndDate}T00:00:00Z`
        );
      }

      if (leaveStart > leaveEnd) {
        continue;
      }

      const cursor = new Date(leaveStart);

      while (cursor <= leaveEnd) {
        const dateString =
          cursor.toISOString().substring(0, 10);

        leaveDates.add(dateString);

        cursor.setUTCDate(
          cursor.getUTCDate() + 1
        );
      }
    }

    const attendanceMap = new Map<
      string,
      any
    >();

    for (const row of attendanceRows ?? []) {
      if (!row.attendance_date) {
        continue;
      }

      if (
        calculationEndDate !== null &&
        row.attendance_date > calculationEndDate
      ) {
        continue;
      }

      attendanceMap.set(
        row.attendance_date,
        row
      );
    }

    function formatDateForDisplay(
      dateString: string
    ): string {
      const date = new Date(
        `${dateString}T00:00:00Z`
      );

      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata"
      });
    }

    function isWorkingDay(
      date: Date
    ): boolean {
      const day = date.getUTCDay();

      return day !== 0 && day !== 6;
    }

    if (calculationEndDate === null) {
      return json({
        success: true,
        message: "Monthly attendance loaded.",
        summary: {
          month,
          workingDays: 0,
          presentDays: 0,
          absentDays: 0,
          incompleteDays: 0,
          leaveDays: 0,
          totalHours: "0h 00m",
          averageHours: "0h 00m",
          totalWorkedMinutes: 0,
          totalBreakMinutes: 0,
          total_worked_minutes: 0,
          total_break_minutes: 0
        },
        attendance: []
      });
    }

    const attendance: any[] = [];

    let workingDays = 0;
    let presentDays = 0;
    let absentDays = 0;
    let incompleteDays = 0;

    let totalWorkedMinutes = 0;
    let totalBreakMinutes = 0;

    const startCalculation = new Date(
      `${startDate}T00:00:00Z`
    );

    const endCalculation = new Date(
      `${calculationEndDate}T00:00:00Z`
    );

    const todayDate = indiaToday;

    const cursor = new Date(
      startCalculation
    );

    while (cursor <= endCalculation) {
      const dateString =
        cursor.toISOString().substring(0, 10);

      const workingDay = isWorkingDay(cursor);

      if (!workingDay) {
        cursor.setUTCDate(
          cursor.getUTCDate() + 1
        );
        continue;
      }

      const record =
        attendanceMap.get(dateString);

      const isLeave =
        leaveDates.has(dateString);

      const isToday =
        dateString === todayDate;

      if (
        isToday &&
        !record &&
        !isLeave
      ) {
        cursor.setUTCDate(
          cursor.getUTCDate() + 1
        );
        continue;
      }

      if (isLeave) {
        attendance.push({
          date: formatDateForDisplay(
            dateString
          ),
          employeeId: employee.id,
          name: employee.name ?? "",
          login: "",
          logout: "",
          hours: "0h 00m",
          status: "leave",
          workedMinutes: 0,
          breakMinutes: 0
        });

        cursor.setUTCDate(
          cursor.getUTCDate() + 1
        );
        continue;
      }

      workingDays++;

      if (!record) {
        absentDays++;

        attendance.push({
          date: formatDateForDisplay(
            dateString
          ),
          employeeId: employee.id,
          name: employee.name ?? "",
          login: "",
          logout: "",
          hours: "0h 00m",
          status: "absent",
          workedMinutes: 0,
          breakMinutes: 0
        });

        cursor.setUTCDate(
          cursor.getUTCDate() + 1
        );
        continue;
      }

      const checkIn =
        record.check_in ?? null;

      const checkOut =
        record.check_out ?? null;

      const login =
        formatTime(checkIn);

      const logout =
        formatTime(checkOut);

      if (checkIn && checkOut) {
        presentDays++;

        // Authoritative actual active working time calculation:
        // Excludes break time completely.
        let dayWorkedMinutes = 0;
        let dayBreakMinutes = 0;

        if (record.worked_minutes != null) {
          dayWorkedMinutes = record.worked_minutes;
          dayBreakMinutes = record.break_minutes ?? 0;
        } else {
          // Fallback calculation for legacy records missing worked_minutes
          const start = new Date(checkIn).getTime();
          const end = new Date(checkOut).getTime();
          const presenceMinutes = Math.floor(Math.max(0, end - start) / 60000);
          dayBreakMinutes = record.break_minutes ?? 0;
          dayWorkedMinutes = Math.max(0, presenceMinutes - dayBreakMinutes);
        }

        totalWorkedMinutes += dayWorkedMinutes;
        totalBreakMinutes += dayBreakMinutes;

        const hours = formatDuration(dayWorkedMinutes);

        attendance.push({
          date: formatDateForDisplay(
            dateString
          ),
          employeeId: employee.id,
          name: employee.name ?? "",
          login,
          logout,
          hours,
          status: "present",
          workedMinutes: dayWorkedMinutes,
          breakMinutes: dayBreakMinutes
        });
      }

      else if (checkIn && !checkOut) {
        incompleteDays++;

        // Live calculation for display only; do NOT overwrite database final values
        const currentActiveSec = Math.floor(
          Math.max(0, Date.now() - new Date(checkIn).getTime()) / 1000
        );
        let activeBreakSec = 0;
        if (record.break_started_at) {
          activeBreakSec = Math.floor(
            Math.max(0, Date.now() - new Date(record.break_started_at).getTime()) / 1000
          );
        }
        
        const totalElapsedSec = currentActiveSec - ((record.break_minutes ?? 0) * 60) - activeBreakSec;
        const liveMinutes = Math.floor(Math.max(0, totalElapsedSec) / 60);

        attendance.push({
          date: formatDateForDisplay(
            dateString
          ),
          employeeId: employee.id,
          name: employee.name ?? "",
          login,
          logout: "",
          hours: formatDuration(liveMinutes),
          status: "incomplete",
          workedMinutes: liveMinutes,
          breakMinutes: record.break_minutes ?? 0
        });
      }

      else {
        absentDays++;

        attendance.push({
          date: formatDateForDisplay(
            dateString
          ),
          employeeId: employee.id,
          name: employee.name ?? "",
          login: "",
          logout: "",
          hours: "0h 00m",
          status: "absent",
          workedMinutes: 0,
          breakMinutes: 0
        });
      }

      cursor.setUTCDate(
        cursor.getUTCDate() + 1
      );
    }

    const leaveDays =
      leaveDates.size;

    // Total active hours string formatted as "Xh YYm"
    const totalHoursFormatted = formatDuration(totalWorkedMinutes);

    let averageHoursFormatted =
      "0h 00m";

    if (presentDays > 0) {
      const averageMinutes =
        Math.floor(
          totalWorkedMinutes / presentDays
        );

      averageHoursFormatted = formatDuration(averageMinutes);
    }

    attendance.sort(
      (a, b) => {
        const dateA =
          new Date(
            `${a.date} 00:00:00`
          ).getTime();

        const dateB =
          new Date(
            `${b.date} 00:00:00`
          ).getTime();

        return dateB - dateA;
      }
    );

    return json({
      success: true,
      message: "Monthly attendance loaded.",
      summary: {
        month,
        workingDays,
        presentDays,
        absentDays,
        incompleteDays,
        leaveDays,
        totalHours: totalHoursFormatted,
        averageHours: averageHoursFormatted,
        totalWorkedMinutes,
        totalBreakMinutes,
        total_worked_minutes: totalWorkedMinutes,
        total_break_minutes: totalBreakMinutes
      },
      attendance
    });

  } catch (error) {
    console.error(
      "handleAttendanceMonthly error:",
      error
    );

    return json(
      {
        success: false,
        message: "Unable to calculate monthly attendance.",
        error:
          error instanceof Error
            ? error.message
            : "Unknown error"
      },
      500
    );
  }
}


// =============================================================
// HELPERS
// =============================================================

function getIndiaTodayDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

// =============================================================
// GLOBAL SEARCH HANDLER
// =============================================================

async function handleGlobalSearch(body: any) {
  const query = String(body.query ?? "").trim();

  if (!query) {
    return json({
      success: true,
      results: []
    });
  }

  // Very simple search for now: check employee names and IDs
  const { data: employees, error } = await adminClient
    .from("employees")
    .select("id, employee_id, name, role, department, profile_photo_url, email, designation")
    .or(`name.ilike.%${query}%,employee_id.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(10);

  if (error) {
    console.error("Search error:", error);
    return json({
      success: false,
      error: "database_error",
      message: "An error occurred while searching."
    }, 500);
  }

  return json({
    success: true,
    results: employees || []
  });
}

function calculateMinutes(
  checkIn: string,
  checkOut: string
): number {
  const start = new Date(checkIn).getTime();
  const end = new Date(checkOut).getTime();

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end <= start
  ) {
    return 0;
  }

  return Math.floor(
    (end - start) / 1000 / 60
  );
}

function formatWorkedDuration(
  checkIn?: string | null,
  checkOut?: string | null,
  storedMinutes?: number | null,
  breakMinutes?: number | null
): string {
  let netMinutes = storedMinutes != null && storedMinutes > 0 ? storedMinutes : 0;

  if (netMinutes <= 0 && checkIn && checkOut) {
    try {
      const startMs = new Date(checkIn).getTime();
      const endMs = new Date(checkOut).getTime();
      const diffMs = Math.max(0, endMs - startMs);
      const totalSec = Math.floor(diffMs / 1000);
      const breakSec = (breakMinutes ?? 0) * 60;
      const netSec = Math.max(0, totalSec - breakSec);

      if (netSec < 60) {
        return netSec > 0 ? `${netSec}s` : "1m";
      }
      netMinutes = Math.round(netSec / 60);
    } catch {
      netMinutes = 0;
    }
  }

  if (netMinutes <= 0) {
    return "1m";
  }

  const hours = Math.floor(netMinutes / 60);
  const minutes = netMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }
  return `${minutes}m`;
}

function formatDuration(totalMinutes: number): string {
  const safeMinutes = Math.max(
    0,
    Math.round(totalMinutes)
  );

  const hours = Math.floor(
    safeMinutes / 60
  );

  const minutes = safeMinutes % 60;

  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

function formatTime(value: string | null): string | null {
  if (!value) return null;

  const date = new Date(value);

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata"
  });
}

function json(data: unknown, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
}