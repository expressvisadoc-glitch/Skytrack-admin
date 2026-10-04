import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// =============================================================
// SUPABASE CLIENTS
// =============================================================

const adminClient = createClient(
  supabaseUrl,
  supabaseServiceRoleKey
);

const authClient = createClient(
  supabaseUrl,
  supabaseAnonKey
);

// =============================================================
// MAIN SERVER
// =============================================================

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return json(
        {
          success: false,
          error: "method_not_allowed",
          message: "Only POST requests are allowed."
        },
        405
      );
    }

    const body = await req.json();
    const action = String(body.action ?? "").trim();

    // =========================================================
    // LOGIN
    // =========================================================

    if (action === "login") {
      return await handleLogin(body);
    }

    // =========================================================
    // AUTHENTICATION
    // =========================================================

    const authHeader = req.headers.get("Authorization");

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      return json(
        {
          success: false,
          error: "unauthorized",
          message: "Authorization token is required."
        },
        401
      );
    }

    const accessToken =
      authHeader.replace("Bearer ", "").trim();

    const {
      data: { user },
      error: userError
    } = await authClient.auth.getUser(accessToken);

    if (userError || !user) {
      return json(
        {
          success: false,
          error: "invalid_session",
          message: "Your session is invalid or expired."
        },
        401
      );
    }

    // =========================================================
    // FIND EMPLOYEE
    // =========================================================

    const {
      data: employee,
      error: employeeError
    } = await adminClient
      .from("employees")
      .select(`
        id,
        employee_id,
        name,
        email,
        role,
        status,
        auth_user_id
      `)
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (employeeError) {
      console.error(
        "Employee lookup error:",
        employeeError
      );

      return json(
        {
          success: false,
          error: "database_error",
          message: "Unable to find employee account."
        },
        500
      );
    }

    if (!employee) {
      return json(
        {
          success: false,
          error: "employee_not_found",
          message: "Employee account was not found."
        },
        404
      );
    }

    if (employee.status !== "active") {
      return json(
        {
          success: false,
          error: "employee_inactive",
          message: "This employee account is not active."
        },
        403
      );
    }

    // =========================================================
    // ATTENDANCE
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

    if (action === "resume_work" || action === "end_break") {
      return await handleResumeWork(employee);
    }

    if (action === "attendance_monthly") {
      return await handleAttendanceMonthly(
        employee,
        body
      );
    }

    if (action === "attendance_feed" || action === "attendance_punches" || action === "attendance_activity") {
      return await handleAttendanceFeed(body);
    }

    // =========================================================
    // LEAVE
    // =========================================================

    if (action === "leave_history") {
      return await handleLeaveHistory(employee);
    }

    if (action === "leave_balance") {
      return await handleLeaveBalance(employee);
    }

    if (action === "leave_submit") {
      return await handleLeaveSubmit(
        employee,
        body
      );
    }

    if (action === "approve_leave") {
      return await handleApproveLeave(
        employee,
        body
      );
    }

    if (action === "reject_leave") {
      return await handleRejectLeave(
        employee,
        body
      );
    }

    if (action === "leave_balance_adjustment") {
      return await handleLeaveBalanceAdjustment(
        employee,
        body
      );
    }

    if (action === "create_employee") {
      return await handleCreateEmployee(employee, body);
    }

    if (action === "update_employee_role") {
      return await handleUpdateEmployeeRole(employee, body);
    }

    // =========================================================
    // PUBLIC HOLIDAYS
    // =========================================================

    if (action === "public_holidays") {
      return await handlePublicHolidays();
    }

    if (action === "organization_data") {
      return await handleOrganizationData(employee);
    }

    if (action === "update_employee_organization") {
      return await handleUpdateEmployeeOrganization(
        employee,
        body
      );
    }

    // =========================================================
    // UNKNOWN ACTION
    // =========================================================

    return json(
      {
        success: false,
        error: "unsupported_action",
        message: `Unsupported action: ${action}`
      },
      400
    );

  } catch (error) {
    console.error(
      "Unexpected error:",
      error
    );

    return json(
      {
        success: false,
        error: "server_error",
        message:
          error instanceof Error
            ? error.message
            : "An unexpected server error occurred."
      },
      500
    );
  }
});

// =============================================================
// LOGIN
// =============================================================

async function handleLogin(body: any) {
  const employeeId =
    String(body.employeeId ?? "").trim();

  const password =
    String(body.password ?? "");

  if (!employeeId || !password) {
    return json(
      {
        success: false,
        error: "missing_credentials",
        message:
          "Employee ID and password are required."
      },
      400
    );
  }

  const {
    data: employee,
    error: employeeError
  } = await adminClient
    .from("employees")
    .select(`
      id,
      employee_id,
      name,
      email,
      role,
      status,
      auth_user_id
    `)
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (employeeError) {
    console.error(
      "Employee lookup error:",
      employeeError
    );

    return json(
      {
        success: false,
        error: "database_error",
        message: "Unable to verify employee."
      },
      500
    );
  }

  if (!employee) {
    return json(
      {
        success: false,
        error: "invalid_credentials",
        message:
          "Invalid Employee ID or password."
      },
      401
    );
  }

  if (employee.status !== "active") {
    return json(
      {
        success: false,
        error: "employee_inactive",
        message:
          "This employee account is not active."
      },
      403
    );
  }

  if (
    !employee.email ||
    !employee.auth_user_id
  ) {
    return json(
      {
        success: false,
        error: "account_not_configured",
        message:
          "Employee authentication is not configured."
      },
      500
    );
  }

  const {
    data: authData,
    error: authError
  } =
    await authClient.auth.signInWithPassword({
      email: employee.email,
      password
    });

  if (
    authError ||
    !authData.session ||
    !authData.user
  ) {
    console.error(
      "Auth error:",
      authError
    );

    return json(
      {
        success: false,
        error: "invalid_credentials",
        message:
          "Invalid Employee ID or password."
      },
      401
    );
  }

  if (
    authData.user.id !==
    employee.auth_user_id
  ) {
    console.error(
      "Auth user mismatch:",
      authData.user.id,
      employee.auth_user_id
    );

    return json(
      {
        success: false,
        error: "account_mismatch",
        message:
          "Employee authentication configuration is invalid."
      },
      500
    );
  }

  return json({
    success: true,
    message: "Login successful.",

    session: {
      token:
        authData.session.access_token,
      expiresInSeconds:
        authData.session.expires_in
    },

    employee: {
      employeeId:
        employee.employee_id,
      name:
        employee.name,
      role:
        employee.role
    }
  });
}

// =============================================================
// ATTENDANCE TODAY
// =============================================================

async function handleAttendanceToday(
  employee: any
) {
  const indiaToday =
    getIndiaToday();

  const {
    data,
    error
  } = await adminClient
    .from("attendance")
    .select(`
      attendance_date,
      check_in,
      check_out,
      break_started_at,
      total_break_seconds,
      break_minutes,
      worked_minutes,
      status
    `)
    .eq("employee_id", employee.id)
    .eq(
      "attendance_date",
      indiaToday
    )
    .maybeSingle();

  if (error) {
    console.error(
      "attendance_today error:",
      error
    );

    return json(
      {
        success: false,
        message:
          "Unable to load today's attendance.",
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

  const totalBreakSec = data.total_break_seconds ?? (data.break_minutes ? data.break_minutes * 60 : 0);

  return json({
    success: true,

    attendance: {
      date:
        data.attendance_date,

      checkIn:
        data.check_in,

      checkOut:
        data.check_out,

      breakStartedAt:
        data.break_started_at,

      totalBreakSeconds:
        totalBreakSec,

      status:
        data.status,

      hours:
        calculateHours(
          data.check_in,
          data.check_out,
          totalBreakSec,
          data.break_started_at
        )
    }
  });
}

// =============================================================
// START WORK
// =============================================================

async function handleStartWork(
  employee: any
) {
  const {
    data,
    error
  } = await adminClient.rpc(
    "start_work",
    {
      p_employee_id:
        employee.id
    }
  );

  if (error) {
    console.error(
      "Start work RPC error:",
      error
    );

    return json(
      {
        success: false,
        error: "start_work_error",
        message: error.message,
        details:
          error.details ?? null,
        hint:
          error.hint ?? null,
        code:
          error.code ?? null
      },
      500
    );
  }

  const attendance =
    data?.[0] ?? null;

  if (!attendance) {
    return json(
      {
        success: false,
        error:
          "attendance_not_created",
        message:
          "Unable to create today's attendance."
      },
      500
    );
  }

  const totalBreakSec = attendance.total_break_seconds ?? (attendance.break_minutes ? attendance.break_minutes * 60 : 0);

  return json({
    success: true,
    message:
      "Work started successfully.",

    attendance: {
      date:
        attendance.attendance_date,

      employeeId:
        employee.employee_id,

      name:
        employee.name,

      login:
        formatTime(
          attendance.check_in
        ),

      logout:
        formatTime(
          attendance.check_out
        ),

      hours:
        calculateHours(
          attendance.check_in,
          attendance.check_out,
          totalBreakSec,
          attendance.break_started_at ?? null
        ),

      status:
        attendance.status
    }
  });
}

// =============================================================
// END WORK
// =============================================================

async function handleEndWork(
  employee: any
) {
  const {
    data,
    error
  } = await adminClient.rpc(
    "end_work",
    {
      p_employee_id:
        employee.id
    }
  );

  if (error) {
    console.error(
      "End work RPC error:",
      error
    );

    return json(
      {
        success: false,
        error:
          "end_work_error",
        message:
          error.message,
        details:
          error.details ?? null,
        hint:
          error.hint ?? null,
        code:
          error.code ?? null
      },
      500
    );
  }

  const attendance =
    data?.[0] ?? null;

  if (!attendance) {
    return json(
      {
        success: false,
        error:
          "attendance_not_found",
        message:
          "No attendance record found for today."
      },
      404
    );
  }

  if (!attendance.check_out) {
    return json(
      {
        success: false,
        error:
          "attendance_not_ended",
        message:
          "Unable to end today's work."
      },
      500
    );
  }

  const totalBreakSec = attendance.total_break_seconds ?? (attendance.break_minutes ? attendance.break_minutes * 60 : 0);

  return json({
    success: true,
    message:
      "Work ended successfully.",

    attendance: {
      date:
        attendance.attendance_date,

      employeeId:
        employee.employee_id,

      name:
        employee.name,

      login:
        formatTime(
          attendance.check_in
        ),

      logout:
        formatTime(
          attendance.check_out
        ),

      hours:
        calculateHours(
          attendance.check_in,
          attendance.check_out,
          totalBreakSec,
          attendance.break_started_at ?? null
        ),

      status:
        attendance.status
    }
  });
}

// =============================================================
// START BREAK
// =============================================================

async function handleStartBreak(
  employee: any
) {
  const {
    data,
    error
  } = await adminClient.rpc(
    "start_break",
    {
      p_employee_id:
        employee.id
    }
  );

  if (error) {
    console.error(
      "start_break error:",
      error
    );

    return json(
      {
        success: false,
        message:
          error.message
      },
      400
    );
  }

  const attendance =
    data?.[0];

  if (!attendance) {
    return json(
      {
        success: false,
        message:
          "Unable to start break."
      },
      400
    );
  }

  const totalBreakSec = attendance.total_break_seconds ?? (attendance.break_minutes ? attendance.break_minutes * 60 : 0);

  return json({
    success: true,
    message:
      "Break started.",

    attendance: {
      date:
        attendance.attendance_date,

      checkIn:
        attendance.check_in,

      checkOut:
        attendance.check_out,

      breakStartedAt:
        attendance.break_started_at,

      totalBreakSeconds:
        totalBreakSec,

      status:
        attendance.status
    }
  });
}

// =============================================================
// RESUME WORK
// =============================================================

async function handleResumeWork(
  employee: any
) {
  const {
    data,
    error
  } = await adminClient.rpc(
    "resume_work",
    {
      p_employee_id:
        employee.id
    }
  );

  if (error) {
    console.error(
      "resume_work error:",
      error
    );

    return json(
      {
        success: false,
        message:
          error.message
      },
      400
    );
  }

  const attendance =
    data?.[0];

  if (!attendance) {
    return json(
      {
        success: false,
        message:
          "Unable to resume work."
      },
      400
    );
  }

  const totalBreakSec = attendance.total_break_seconds ?? (attendance.break_minutes ? attendance.break_minutes * 60 : 0);

  return json({
    success: true,
    message:
      "Work resumed.",

    attendance: {
      date:
        attendance.attendance_date,

      checkIn:
        attendance.check_in,

      checkOut:
        attendance.check_out,

      breakStartedAt:
        attendance.break_started_at,

      totalBreakSeconds:
        totalBreakSec,

      status:
        attendance.status
    }
  });
}

// =============================================================
// ATTENDANCE FEED / PUNCH FEED (FOR NOTIFICATION PANEL)
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
      total_break_seconds,
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
      const breakSec = row.total_break_seconds ?? ((row.break_minutes ?? 0) * 60);

      if ((workedMins == null || workedMins <= 0) && row.check_in && row.check_out) {
        const diffMs = Math.max(0, new Date(row.check_out).getTime() - new Date(row.check_in).getTime());
        const totalSec = Math.floor(diffMs / 1000);
        workedMins = Math.max(1, Math.round((totalSec - breakSec) / 60));
      }

      const durationText = formatWorkedDuration(
        row.check_in,
        row.check_out,
        workedMins,
        Math.round(breakSec / 60)
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

  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return json({
    success: true,
    total: events.length,
    events
  });
}

// =============================================================
// PUBLIC HOLIDAYS
// =============================================================

async function handlePublicHolidays() {
  const {
    data: companyHolidays,
    error: companyError
  } = await adminClient
    .from("public_holidays")
    .select(`
      id,
      holiday_code,
      holiday_name,
      holiday_date,
      holiday_type,
      status
    `)
    .eq("status", "published")
    .order(
      "holiday_date",
      {
        ascending: true
      }
    );

  if (companyError) {
    console.error(
      "Public holidays fetch error:",
      companyError
    );

    return json(
      {
        success: false,
        error:
          "public_holidays_error",
        message:
          "Unable to retrieve public holidays.",
        details:
          companyError.message
      },
      500
    );
  }

  const {
    data: officialHolidays,
    error: officialError
  } = await adminClient
    .from("official_public_holidays")
    .select(`
      id,
      holiday_code,
      holiday_name,
      holiday_date,
      holiday_type
    `)
    .order(
      "holiday_date",
      {
        ascending: true
      }
    );

  if (officialError) {
    console.warn(
      "Official holidays query failed:",
      officialError
    );
  }

  const combined = [
    ...(officialHolidays ?? []),
    ...(companyHolidays ?? [])
  ];

  const uniqueMap =
    new Map<string, any>();

  for (const holiday of combined) {
    if (
      !holiday?.holiday_date
    ) {
      continue;
    }

    if (
      !uniqueMap.has(
        holiday.holiday_date
      )
    ) {
      uniqueMap.set(
        holiday.holiday_date,
        holiday
      );
    }
  }

  const holidays =
    Array.from(
      uniqueMap.values()
    )
      .sort(
        (a, b) =>
          a.holiday_date.localeCompare(
            b.holiday_date
          )
      )
      .map(
        (holiday: any) => ({
          id:
            holiday.id,

          date:
            holiday.holiday_date,

          name:
            holiday.holiday_name,

          category:
            holiday.holiday_type ===
            "gazetted"
              ? "Gazetted Holiday"
              : "Restricted Holiday"
        })
      );

  return json({
    success: true,
    message:
      "Public holidays retrieved successfully.",
    holidays
  });
}

// =============================================================
// LEAVE HISTORY
// =============================================================

async function handleLeaveHistory(
  employee: any
) {
  const {
    data,
    error
  } = await adminClient
    .from("leaves")
    .select(`
      id,
      request_id,
      employee_id,
      from_date,
      to_date,
      leave_type,
      reason,
      leave_days,
      paid_leave_days,
      lop_days,
      status,
      approved_by,
      approved_at,
      manager_comment,
      created_at,
      updated_at
    `)
    .eq(
      "employee_id",
      employee.id
    )
    .order(
      "created_at",
      {
        ascending: false
      }
    );

  if (error) {
    console.error(
      "Leave history error:",
      error
    );

    return json(
      {
        success: false,
        error:
          "leave_history_error",
        message:
          "Unable to retrieve leave history.",
        details:
          error.message,
        code:
          error.code ?? null
      },
      500
    );
  }

  return json({
    success: true,
    message:
      "Leave history retrieved successfully.",

    leaves:
      (data ?? []).map(
        formatLeave
      )
  });
}

// =============================================================
// LEAVE SUBMIT
// =============================================================

async function handleLeaveSubmit(
  employee: any,
  body: any
) {
  const from =
    String(
      body.from ??
      body.fromDate ??
      ""
    ).trim();

  const to =
    String(
      body.to ??
      body.toDate ??
      ""
    ).trim();

  const type =
    String(
      body.type ??
      body.leaveType ??
      ""
    ).trim();

  const reason =
    String(
      body.reason ?? ""
    ).trim();

  if (!from || !to) {
    return json(
      {
        success: false,
        error:
          "INVALID_DATE",
        message:
          "Leave dates are required."
      },
      400
    );
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(from) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(to)
  ) {
    return json(
      {
        success: false,
        error:
          "INVALID_DATE",
        message:
          "Dates must use YYYY-MM-DD format."
      },
      400
    );
  }

  if (from > to) {
    return json(
      {
        success: false,
        error:
          "INVALID_DATE",
        message:
          "From date cannot be after To date."
      },
      400
    );
  }

  if (!type) {
    return json(
      {
        success: false,
        error:
          "INVALID_LEAVE_TYPE",
        message:
          "Leave type is required."
      },
      400
    );
  }

  if (reason.length < 3) {
    return json(
      {
        success: false,
        error:
          "INVALID_REASON",
        message:
          "Please provide a valid reason."
      },
      400
    );
  }

  const {
    data: overlappingLeaves,
    error: overlapError
  } = await adminClient
    .from("leaves")
    .select(`
      id,
      request_id,
      from_date,
      to_date,
      status
    `)
    .eq(
      "employee_id",
      employee.id
    )
    .in(
      "status",
      [
        "pending",
        "approved"
      ]
    )
    .lte(
      "from_date",
      to
    )
    .gte(
      "to_date",
      from
    );

  if (overlapError) {
    console.error(
      "Leave overlap check error:",
      overlapError
    );

    return json(
      {
        success: false,
        error:
          "database_error",
        message:
          "Unable to validate leave dates.",
        details:
          overlapError.message,
        code:
          overlapError.code ?? null
      },
      500
    );
  }

  if (
    overlappingLeaves &&
    overlappingLeaves.length > 0
  ) {
    return json(
      {
        success: false,
        error:
          "OVERLAPPING_LEAVE",
        message:
          "These dates overlap an existing leave request."
      },
      409
    );
  }

  const requestId =
    `LV-${new Date().getFullYear()}-${crypto
      .randomUUID()
      .replaceAll("-", "")
      .substring(0, 8)
      .toUpperCase()}`;

  const {
    data: leave,
    error: insertError
  } = await adminClient
    .from("leaves")
    .insert({
      request_id:
        requestId,

      employee_id:
        employee.id,

      from_date:
        from,

      to_date:
        to,

      leave_type:
        type,

      reason:
        reason,

      status:
        "pending"
    })
    .select(`
      id,
      request_id,
      employee_id,
      from_date,
      to_date,
      leave_type,
      reason,
      leave_days,
      paid_leave_days,
      lop_days,
      status,
      approved_by,
      approved_at,
      manager_comment,
      created_at,
      updated_at
    `)
    .single();

  if (insertError) {
    console.error(
      "Leave insert error:",
      insertError
    );

    return json(
      {
        success: false,
        error:
          "leave_submit_error",
        message:
          "Unable to submit leave request.",
        details:
          insertError.message,
        code:
          insertError.code ?? null
      },
      500
    );
  }

  return json({
    success: true,
    message:
      "Leave request submitted successfully.",
    leave:
      formatLeave(leave)
  });
}

// =============================================================
// LEAVE APPROVAL
// =============================================================

async function handleApproveLeave(
  employee: any,
  body: any
): Promise<Response> {
  try {
    await ensureAdmin(employee);

    const requestId = String(
      body.requestId ??
      body.request_id ??
      ""
    ).trim();

    const managerComment =
      body.managerComment ??
      body.manager_comment ??
      null;

    if (!requestId) {
      return json({
        success: false,
        error: "missing_request_id",
        message: "Leave request ID is required."
      }, 400);
    }

    const { data, error } = await adminClient.rpc(
      "approve_leave_request",
      {
        p_request_id: requestId,
        p_approved_by: employee.id,
        p_manager_comment: managerComment
      }
    );

    if (error) {
      return json({
        success: false,
        error: "approve_leave_request_failed",
        message: error.message,
        code: error.code ?? null,
        details: error.details ?? null,
        hint: error.hint ?? null
      }, 400);
    }

    return json({
      success: true,
      message: "Leave request approved successfully.",
      leave: formatLeave(data)
    });

  } catch (error) {
    return json({
      success: false,
      error: "approve_leave_failed",
      message:
        error instanceof Error
          ? error.message
          : "Failed to approve leave request."
    }, 500);
  }
}

// =============================================================
// LEAVE REJECTION
// =============================================================

async function handleRejectLeave(
  employee: any,
  body: any
): Promise<Response> {
  try {
    await ensureAdmin(employee);

    const suppliedId = String(
      body.requestId ??
      body.request_id ??
      body.id ??
      ""
    ).trim();

    const managerComment =
      body.managerComment ??
      body.manager_comment ??
      null;

    if (!suppliedId) {
      return json({
        success: false,
        error: "missing_request_id",
        message: "Leave request ID is required."
      }, 400);
    }

    let leaveRecord: any = null;

    const {
      data: requestIdLeave,
      error: requestIdError
    } = await adminClient
      .from("leaves")
      .select(`
        id,
        request_id,
        employee_id,
        leave_type,
        from_date,
        to_date,
        status
      `)
      .eq("request_id", suppliedId)
      .maybeSingle();

    if (requestIdLeave) {
      leaveRecord = requestIdLeave;
    }

    if (!leaveRecord) {
      const {
        data: uuidLeave,
        error: uuidError
      } = await adminClient
        .from("leaves")
        .select(`
          id,
          request_id,
          employee_id,
          leave_type,
          from_date,
          to_date,
          status
        `)
        .eq("id", suppliedId)
        .maybeSingle();

      if (uuidLeave) {
        leaveRecord = uuidLeave;
      }
    }

    if (!leaveRecord) {
      return json({
        success: false,
        error: "leave_not_found",
        message: "Leave request could not be found.",
        suppliedId
      }, 404);
    }

    if (leaveRecord.status !== "pending") {
      return json({
        success: false,
        error: "leave_not_pending",
        message: `This leave request is already ${leaveRecord.status}.`,
        requestId: leaveRecord.request_id,
        status: leaveRecord.status
      }, 400);
    }

    const requestId = leaveRecord.request_id;

    const { data, error } = await adminClient.rpc(
      "reject_leave_request",
      {
        p_request_id: requestId,
        p_approved_by: employee.id,
        p_manager_comment: managerComment
      }
    );

    if (error) {
      return json({
        success: false,
        error: "reject_leave_request_failed",
        message: error.message,
        code: error.code ?? null,
        details: error.details ?? null,
        hint: error.hint ?? null,
        requestId
      }, 400);
    }

    return json({
      success: true,
      message: "Leave request rejected successfully.",
      leave: formatLeave(data)
    });

  } catch (error) {
    return json({
      success: false,
      error: "reject_leave_failed",
      message:
        error instanceof Error
          ? error.message
          : "Failed to reject leave request."
    }, 500);
  }
}

// =============================================================
// LEAVE BALANCE
// =============================================================

async function handleLeaveBalance(
  employee: any
) {
  const {
    data,
    error
  } = await adminClient
    .from("employee_leave_balances")
    .select(`
      leave_type,
      allocated_days,
      adjusted_days,
      used_days,
      balance_days
    `)
    .eq(
      "employee_id",
      employee.id
    );

  if (error) {
    return json(
      {
        success: false,
        error:
          "leave_balance_error",
        message:
          "Unable to load leave balance.",
        details:
          error.message
      },
      500
    );
  }

  const casual =
    data?.find(
      item =>
        item.leave_type ===
        "casual"
    );

  const sick =
    data?.find(
      item =>
        item.leave_type ===
        "sick"
    );

  return json({
    success: true,

    balance: {
      casual:
        formatLeaveBalance(
          casual
        ),

      sick:
        formatLeaveBalance(
          sick
        )
    }
  });
}

// =============================================================
// LEAVE BALANCE ADJUSTMENT
// =============================================================

async function handleLeaveBalanceAdjustment(
  employee: any,
  body: any
) {
  ensureAdmin(employee);

  const targetEmployeeId =
    String(
      body.employeeId ?? ""
    ).trim();

  const leaveType =
    String(
      body.leaveType ?? ""
    ).trim();

  const adjustment =
    Number(body.days);

  const reason =
    String(
      body.reason ?? ""
    ).trim();

  if (!targetEmployeeId) {
    return json(
      {
        success: false,
        error:
          "missing_employee_id",
        message:
          "Employee ID is required."
      },
      400
    );
  }

  if (
    leaveType !== "casual" &&
    leaveType !== "sick"
  ) {
    return json(
      {
        success: false,
        error:
          "invalid_leave_type",
        message:
          "Leave type must be casual or sick."
      },
      400
    );
  }

  if (
    !Number.isFinite(
      adjustment
    ) ||
    adjustment === 0
  ) {
    return json(
      {
        success: false,
        error:
          "invalid_adjustment",
        message:
          "Adjustment must be a non-zero number."
      },
      400
    );
  }

  if (!reason) {
    return json(
      {
        success: false,
        error:
          "missing_reason",
        message:
          "Adjustment reason is required."
      },
      400
    );
  }

  const {
    data: existing,
    error: findError
  } = await adminClient
    .from("employee_leave_balances")
    .select("*")
    .eq(
      "employee_id",
      targetEmployeeId
    )
    .eq(
      "leave_type",
      leaveType
    )
    .maybeSingle();

  if (findError) {
    return json(
      {
        success: false,
        error:
          "leave_balance_error",
        message:
          "Unable to find employee leave balance."
      },
      500
    );
  }

  let balance =
    existing;

  if (!balance) {
    const {
      data: created,
      error: createError
    } = await adminClient
      .from(
        "employee_leave_balances"
      )
      .insert({
        employee_id:
          targetEmployeeId,

        leave_type:
          leaveType
      })
      .select()
      .single();

    if (createError) {
      return json(
        {
          success: false,
          error:
            "leave_balance_create_error",
          message:
            "Unable to create employee leave balance."
        },
        500
      );
    }

    balance =
      created;
  }

  const currentAdjusted =
    Number(
      balance.adjusted_days ?? 0
    );

  const allocated =
    Number(
      balance.allocated_days ?? 0
    );

  const used =
    Number(
      balance.used_days ?? 0
    );

  const newAdjustedDays =
    currentAdjusted +
    adjustment;

  const rawBalance =
    allocated +
    newAdjustedDays -
    used;

  if (rawBalance < 0) {
    return json(
      {
        success: false,
        error:
          "negative_balance",
        message:
          "Adjustment would make the leave balance negative."
      },
      400
    );
  }

  const {
    data: updated,
    error: updateError
  } = await adminClient
    .from(
      "employee_leave_balances"
    )
    .update({
      adjusted_days:
        newAdjustedDays,

      updated_at:
        new Date().toISOString()
    })
    .eq(
      "id",
      balance.id
    )
    .select()
    .single();

  if (updateError) {
    return json(
      {
        success: false,
        error:
          "leave_balance_update_error",
        message:
          "Unable to update leave balance."
      },
      500
    );
  }

  await adminClient
    .from(
      "leave_balance_transactions"
    )
    .insert({
      employee_id:
        targetEmployeeId,

      leave_type:
        leaveType,

      transaction_type:
        "manual_adjustment",

      days:
        adjustment,

      reason:
        reason,

      created_by:
        employee.id
    });

  return json({
    success: true,

    balance: {
      allocated:
        Number(
          updated.allocated_days ?? 0
        ),

      adjusted:
        Number(
          updated.adjusted_days ?? 0
        ),

      used:
        Number(
          updated.used_days ?? 0
        ),

      balance:
        Math.max(
          0,
          Number(
            updated.balance_days ??
            rawBalance
          )
        )
    }
  });
}

// =============================================================
// CREATE EMPLOYEE
// =============================================================

async function handleCreateEmployee(
  creator: any,
  body: any
) {
  ensureAdmin(creator);

  const name = String(
    body.name ?? ""
  ).trim();

  const email = String(
    body.email ?? ""
  ).trim()
  .toLowerCase();

  const password = String(
    body.password ?? ""
  );

  if (!name) {
    return json({
      success: false,
      error: "missing_name",
      message: "Employee name is required."
    }, 400);
  }

  if (!email) {
    return json({
      success: false,
      error: "missing_email",
      message: "Email is required."
    }, 400);
  }

  if (!password || password.length < 6) {
    return json({
      success: false,
      error: "invalid_password",
      message: "Password must be at least 6 characters."
    }, 400);
  }

  const { data: existingEmail, error: emailCheckError } =
    await adminClient
      .from("employees")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

  if (emailCheckError) {
    return json({
      success: false,
      error: "email_check_failed",
      message: "Unable to verify the email address."
    }, 500);
  }

  if (existingEmail) {
    return json({
      success: false,
      error: "email_exists",
      message: "This email is already assigned to an employee."
    }, 409);
  }

  const {
    data: latestEmployee,
    error: latestEmployeeError
  } = await adminClient
    .from("employees")
    .select("employee_id")
    .like("employee_id", "SKY%")
    .order("employee_id", {
      ascending: false
    })
    .limit(1)
    .maybeSingle();

  let nextNumber = 1;

  if (latestEmployee?.employee_id) {
    const match =
      String(latestEmployee.employee_id)
        .match(/^SKY(\d+)$/);

    if (match) {
      nextNumber =
        Number(match[1]) + 1;
    }
  }

  const employeeId =
    `SKY${String(nextNumber).padStart(3, "0")}`;

  const {
    data: authData,
    error: authError
  } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (authError || !authData.user) {
    return json({
      success: false,
      error: "auth_user_creation_failed",
      message:
        authError?.message ??
        "Unable to create authentication account."
    }, 500);
  }

  const authUserId = authData.user.id;

  const {
    data: newEmployee,
    error: employeeError
  } = await adminClient
    .from("employees")
    .insert({
      employee_id: employeeId,
      name,
      email,
      auth_user_id: authUserId,
      role: "employee",
      status: "active"
    })
    .select(`
      id,
      employee_id,
      name,
      email,
      role,
      status,
      auth_user_id
    `)
    .single();

  if (employeeError) {
    await adminClient.auth.admin.deleteUser(authUserId);

    return json({
      success: false,
      error: "employee_creation_failed",
      message:
        "Employee record could not be created."
    }, 500);
  }

  return json({
    success: true,
    message: "Employee created successfully.",
    employee: {
      id: newEmployee.id,
      employeeId: newEmployee.employee_id,
      name: newEmployee.name,
      email: newEmployee.email,
      role: newEmployee.role,
      status: newEmployee.status
    }
  });
}

// =============================================================
// MONTHLY ATTENDANCE (FULL COMPATIBILITY FOR ANDROID & ADMIN)
// =============================================================

async function handleAttendanceMonthly(
  employee: any,
  body: any
): Promise<Response> {
  try {
    const month = String(body?.month ?? "").trim();

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return json({
        success: false,
        error: "invalid_month",
        message: "Month must be in YYYY-MM format."
      }, 400);
    }

    function getIndiaDateString(date = new Date()): string {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(date);
    }

    function getMonthStart(monthValue: string): string {
      return `${monthValue}-01`;
    }

    function getNextMonthStart(monthValue: string): string {
      const [year, monthNumber] = monthValue.split("-").map(Number);
      const date = new Date(Date.UTC(year, monthNumber, 1));
      return date.toISOString().slice(0, 10);
    }

    function addDays(dateString: string, days: number): string {
      const [year, monthNumber, day] = dateString.split("-").map(Number);
      const date = new Date(Date.UTC(year, monthNumber - 1, day));
      date.setUTCDate(date.getUTCDate() + days);
      return date.toISOString().slice(0, 10);
    }

    function isSunday(dateString: string): boolean {
      const [year, monthNumber, day] = dateString.split("-").map(Number);
      const date = new Date(Date.UTC(year, monthNumber - 1, day));
      return date.getUTCDay() === 0;
    }

    const monthStart = getMonthStart(month);
    const nextMonthStart = getNextMonthStart(month);
    const todayIndia = getIndiaDateString();

    const configuredDailyMinutes = Number(
      Deno.env.get("SKYTRACK_DAILY_REQUIRED_MINUTES") ?? "480"
    );

    const dailyRequiredMinutes =
      Number.isFinite(configuredDailyMinutes) &&
      configuredDailyMinutes > 0
        ? configuredDailyMinutes
        : 480;

    const dailyRequiredSeconds = dailyRequiredMinutes * 60;

    // 1. Fetch attendance records
    const {
      data: attendanceRows,
      error: attendanceError
    } = await adminClient
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
        break_started_at,
        total_break_seconds,
        notes
      `)
      .eq("employee_id", employee.id)
      .gte("attendance_date", monthStart)
      .lt("attendance_date", nextMonthStart)
      .order("attendance_date", { ascending: true });

    if (attendanceError) {
      console.error("Attendance monthly query failed:", attendanceError);
      return json({
        success: false,
        error: "attendance_monthly_failed",
        message: attendanceError.message
      }, 500);
    }

    // 2. Fetch approved leaves
    const {
      data: leaveRows
    } = await adminClient
      .from("leaves")
      .select(`
        id,
        request_id,
        employee_id,
        leave_type,
        from_date,
        to_date,
        leave_days,
        paid_leave_days,
        lop_days,
        status
      `)
      .eq("employee_id", employee.id)
      .eq("status", "approved")
      .lte("from_date", addDays(nextMonthStart, -1))
      .gte("to_date", monthStart);

    const approvedLeaveDates = new Set<string>();
    for (const leave of leaveRows ?? []) {
      if (!leave.from_date || !leave.to_date) continue;
      let cur = leave.from_date;
      while (cur <= leave.to_date) {
        if (cur >= monthStart && cur < nextMonthStart) {
          approvedLeaveDates.add(cur);
        }
        cur = addDays(cur, 1);
      }
    }

    // 3. Fetch public holidays
    const {
      data: holidayRows
    } = await adminClient
      .from("public_holidays")
      .select(`
        id,
        holiday_name,
        holiday_date,
        holiday_type,
        status
      `)
      .eq("status", "published")
      .gte("holiday_date", monthStart)
      .lt("holiday_date", nextMonthStart);

    const publicHolidayDates = new Set<string>();
    for (const holiday of holidayRows ?? []) {
      if (holiday.holiday_date) {
        publicHolidayDates.add(String(holiday.holiday_date).slice(0, 10));
      }
    }

    // 4. Map attendance by date
    const attendanceMap = new Map<string, any>();
    for (const row of attendanceRows ?? []) {
      const date = String(row.attendance_date).slice(0, 10);
      attendanceMap.set(date, row);
    }

    // 5. Robust calculateActiveSeconds function
    function calculateActiveSeconds(
      att: any,
      attDate: string
    ): number {
      if (!att?.check_in) {
        return 0;
      }

      const totalBreakSec = Math.max(
        0,
        Number(att.total_break_seconds ?? (att.break_minutes ? att.break_minutes * 60 : 0))
      );

      // If worked_minutes is already calculated and > 0, use it
      if (att.worked_minutes != null && att.worked_minutes > 0) {
        return att.worked_minutes * 60;
      }

      const checkInTime = new Date(att.check_in).getTime();
      if (!Number.isFinite(checkInTime)) {
        return 0;
      }

      // CASE 1: Completed attendance
      if (att.check_out) {
        const checkOutTime = new Date(att.check_out).getTime();
        if (!Number.isFinite(checkOutTime)) {
          return 0;
        }

        const elapsedSeconds = Math.max(0, Math.floor((checkOutTime - checkInTime) / 1000));
        const netSeconds = Math.max(0, elapsedSeconds - totalBreakSec);
        if (netSeconds <= 0 && checkOutTime > checkInTime) {
          return 60; // Guarantee minimum 1 minute
        }
        return netSeconds;
      }

      // CASE 2: Currently open attendance for TODAY
      if (attDate === todayIndia) {
        let endTime = Date.now();
        if (att.break_started_at) {
          const breakStarted = new Date(att.break_started_at).getTime();
          if (Number.isFinite(breakStarted)) {
            endTime = breakStarted;
          }
        }
        const elapsedSeconds = Math.max(0, Math.floor((endTime - checkInTime) / 1000));
        return Math.max(0, elapsedSeconds - totalBreakSec);
      }

      // CASE 3: Historical attendance missing checkout
      return 0;
    }

    const daily: any[] = [];
    const attendanceList: any[] = [];

    let totalActiveSeconds = 0;
    let totalBreakSecondsAll = 0;
    let requiredWorkingDays = 0;
    let approvedLeaveDays = 0;
    let publicHolidayDays = 0;
    let sundayDays = 0;
    let completedAttendanceDays = 0;
    let incompleteAttendanceDays = 0;

    let currentDate = monthStart;

    while (currentDate < nextMonthStart) {
      const sunday = isSunday(currentDate);
      const isApprovedLeave = approvedLeaveDates.has(currentDate);
      const isPublicHoliday = publicHolidayDates.has(currentDate);
      const att = attendanceMap.get(currentDate) ?? null;

      if (sunday) sundayDays++;
      if (isApprovedLeave) approvedLeaveDays++;
      if (isPublicHoliday && !sunday) publicHolidayDays++;

      const isRequiredWorkingDay = !sunday && !isApprovedLeave && !isPublicHoliday;
      if (isRequiredWorkingDay) {
        requiredWorkingDays++;
      }

      const activeSeconds = calculateActiveSeconds(att, currentDate);
      totalActiveSeconds += activeSeconds;

      const rowBreakSec = att ? Math.max(0, Number(att.total_break_seconds ?? (att.break_minutes ? att.break_minutes * 60 : 0))) : 0;
      totalBreakSecondsAll += rowBreakSec;

      if (att?.check_in && att?.check_out) {
        completedAttendanceDays++;
      }
      if (att?.check_in && !att?.check_out && currentDate < todayIndia) {
        incompleteAttendanceDays++;
      }

      const activeMinutes = Math.round(activeSeconds / 60);
      const activeHours = Math.floor(activeSeconds / 3600);
      const activeRemainingMinutes = Math.floor((activeSeconds % 3600) / 60);

      const statusStr = isApprovedLeave
        ? "leave"
        : (att?.check_out
            ? "present"
            : (att?.check_in
                ? (currentDate === todayIndia ? "working" : "incomplete")
                : (isRequiredWorkingDay && currentDate < todayIndia ? "absent" : (isPublicHoliday ? "holiday" : "weekend"))));

      // 1. Android DTO item (for attendance: List<MonthlyAttendanceDto>)
      attendanceList.push({
        date: currentDate,
        attendanceDate: currentDate,
        attendance_date: currentDate,
        employeeId: employee.employee_id,
        employee_id: employee.employee_id,
        name: employee.name ?? "",
        login: formatTime(att?.check_in ?? null),
        logout: formatTime(att?.check_out ?? null),
        check_in: att?.check_in ?? null,
        check_out: att?.check_out ?? null,
        hours: formatDuration(activeMinutes),
        active_formatted: formatDuration(activeMinutes),
        breakFormatted: formatDuration(Math.round(rowBreakSec / 60)),
        break_formatted: formatDuration(Math.round(rowBreakSec / 60)),
        status: statusStr,
        workedMinutes: activeMinutes,
        worked_minutes: activeMinutes,
        breakMinutes: Math.round(rowBreakSec / 60),
        break_minutes: Math.round(rowBreakSec / 60)
      });

      // 2. Daily analytics item
      daily.push({
        attendance_date: currentDate,
        is_sunday: sunday,
        is_public_holiday: isPublicHoliday,
        is_approved_leave: isApprovedLeave,
        is_required_working_day: isRequiredWorkingDay,
        check_in: att?.check_in ?? null,
        check_out: att?.check_out ?? null,
        break_started_at: att?.break_started_at ?? null,
        total_break_seconds: rowBreakSec,
        status: att?.status ?? statusStr,
        active_seconds: Math.round(activeSeconds),
        active_minutes: activeMinutes,
        active_hours: activeHours,
        active_remaining_minutes: activeRemainingMinutes,
        attendance_complete: Boolean(att?.check_in && att?.check_out),
        attendance_incomplete: Boolean(att?.check_in && !att?.check_out)
      });

      currentDate = addDays(currentDate, 1);
    }

    const requiredSeconds = requiredWorkingDays * dailyRequiredSeconds;
    const differenceSeconds = totalActiveSeconds - requiredSeconds;
    const remainingRequiredSeconds = Math.max(0, requiredSeconds - totalActiveSeconds);
    const overtimeSeconds = Math.max(0, totalActiveSeconds - requiredSeconds);

    const totalActiveMins = Math.floor(totalActiveSeconds / 60);
    const totalHoursFormatted = formatDuration(totalActiveMins);

    let averageHoursFormatted = "0h 00m";
    const effectivePresentDays = completedAttendanceDays + (attendanceMap.get(todayIndia)?.check_in ? 1 : 0);
    if (effectivePresentDays > 0) {
      const avgMins = Math.floor(totalActiveMins / effectivePresentDays);
      averageHoursFormatted = formatDuration(avgMins);
    }

    const absentDaysCount = Math.max(0, requiredWorkingDays - effectivePresentDays);

    // Sort attendance descending (newest dates first) for Android timeline
    attendanceList.sort((a, b) => b.date.localeCompare(a.date));

    return json({
      success: true,
      message: "Monthly attendance loaded.",
      month,
      employee: {
        id: employee.id,
        employee_id: employee.employee_id,
        name: employee.name
      },
      summary: {
        month,
        workingDays: requiredWorkingDays,
        working_days: requiredWorkingDays,
        required_working_days: requiredWorkingDays,
        presentDays: effectivePresentDays,
        present_days: effectivePresentDays,
        completed_attendance_days: completedAttendanceDays,
        absentDays: absentDaysCount,
        absent_days: absentDaysCount,
        incompleteDays: incompleteAttendanceDays,
        incomplete_days: incompleteAttendanceDays,
        incomplete_attendance_days: incompleteAttendanceDays,
        leaveDays: approvedLeaveDays,
        leave_days: approvedLeaveDays,
        approved_leave_days: approvedLeaveDays,
        public_holiday_days: publicHolidayDays,
        sunday_days: sundayDays,
        totalHours: totalHoursFormatted,
        total_hours: totalHoursFormatted,
        total_active_formatted: totalHoursFormatted,
        averageHours: averageHoursFormatted,
        average_hours: averageHoursFormatted,
        average_active_formatted: averageHoursFormatted,
        totalWorkedMinutes: totalActiveMins,
        total_worked_minutes: totalActiveMins,
        total_active_minutes: totalActiveMins,
        totalBreakMinutes: Math.floor(totalBreakSecondsAll / 60),
        total_break_minutes: Math.floor(totalBreakSecondsAll / 60),
        total_active_seconds: Math.round(totalActiveSeconds),
        total_active_hours: Math.floor(totalActiveSeconds / 3600),
        total_active_hours_decimal: Math.round((totalActiveSeconds / 3600) * 100) / 100,
        daily_required_minutes: dailyRequiredMinutes,
        required_seconds: requiredSeconds,
        required_hours: requiredWorkingDays * (dailyRequiredMinutes / 60),
        required_hours_decimal: Math.round((requiredWorkingDays * (dailyRequiredMinutes / 60)) * 100) / 100,
        required_hours_formatted: formatDuration(Math.round(requiredSeconds / 60)),
        targetHoursFormatted: formatDuration(Math.round(requiredSeconds / 60)),
        target_hours_formatted: formatDuration(Math.round(requiredSeconds / 60)),
        remaining_required_seconds: remainingRequiredSeconds,
        remaining_required_formatted: formatDuration(Math.round(remainingRequiredSeconds / 60)),
        overtime_seconds: overtimeSeconds,
        overtime_formatted: formatDuration(Math.round(overtimeSeconds / 60)),
        difference_seconds: Math.round(differenceSeconds),
        difference_formatted: differenceSeconds >= 0
          ? `+${formatDuration(Math.round(differenceSeconds / 60))}`
          : `-${formatDuration(Math.round(Math.abs(differenceSeconds) / 60))}`
      },
      attendance: attendanceList,
      daily,
      calculation_rules: {
        weekly_off: "Sunday only",
        saturday_is_working_day: true,
        daily_required_minutes: dailyRequiredMinutes,
        approved_leave_excluded: true,
        public_holidays_excluded: true,
        pending_leave_excluded: true,
        rejected_leave_excluded: true,
        historical_missing_checkout: "excluded_from_active_hours",
        today_missing_checkout: "calculated_until_current_time",
        break_time_deducted: true
      }
    });

  } catch (error) {
    console.error("handleAttendanceMonthly error:", error);
    return json({
      success: false,
      error: "attendance_monthly_failed",
      message: error instanceof Error ? error.message : "Failed to calculate monthly attendance."
    }, 500);
  }
}

// =============================================================
// FORMAT LEAVE
// =============================================================

function formatLeave(leave: any) {
  if (!leave) return null;

  return {
    id: leave.id,
    requestId: leave.request_id,
    employeeId: leave.employee_id,
    fromDate: leave.from_date,
    toDate: leave.to_date,
    leaveType: leave.leave_type,
    reason: leave.reason ?? null,
    leaveDays: Number(leave.leave_days ?? 0),
    paidLeaveDays: Number(leave.paid_leave_days ?? 0),
    lopDays: Number(leave.lop_days ?? 0),
    status: leave.status,
    approvedBy: leave.approved_by ?? null,
    approvedAt: leave.approved_at ?? null,
    managerComment: leave.manager_comment ?? null,
    createdAt: leave.created_at,
    updatedAt: leave.updated_at
  };
}

// =============================================================
// SUPER ADMIN CHECK
// =============================================================

function ensureSuperAdmin(employee: any) {
  if (!employee || employee.role !== "super_admin") {
    throw new Error("Super admin access required");
  }
}

// =============================================================
// ADMIN CHECK
// =============================================================

function ensureAdmin(employee: any) {
  const role = String(employee?.role || "").toLowerCase();
  if (role !== "admin" && role !== "super_admin") {
    throw new Error("You are not authorized to perform this action");
  }
}

// =============================================================
// LEAVE BALANCE FORMAT
// =============================================================

function formatLeaveBalance(balance: any) {
  const allocated = Number(balance?.allocated_days ?? 0);
  const adjusted = Number(balance?.adjusted_days ?? 0);
  const used = Number(balance?.used_days ?? 0);
  const calculatedBalance = allocated + adjusted - used;

  return {
    allocated,
    adjusted,
    used,
    balance: Math.max(0, Number(balance?.balance_days ?? calculatedBalance))
  };
}

// =============================================================
// DATE HELPERS
// =============================================================

function getIndiaToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function getIndiaTodayDate(): string {
  return getIndiaToday();
}

// =============================================================
// ORGANIZATION DATA HANDLER
// =============================================================

async function handleOrganizationData(employee: any): Promise<Response> {
  try {
    await ensureAdmin(employee);

    const [
      departmentsResult,
      shiftsResult,
      managersResult
    ] = await Promise.all([
      adminClient
        .from("departments")
        .select(`
          id,
          department_name,
          department_code,
          description,
          status
        `)
        .eq("status", "active")
        .order("department_name", { ascending: true }),

      adminClient
        .from("work_shifts")
        .select(`
          id,
          shift_name,
          shift_code,
          start_time,
          end_time,
          break_minutes,
          working_minutes,
          status
        `)
        .eq("status", "active")
        .order("start_time", { ascending: true }),

      adminClient
        .from("employees")
        .select(`
          id,
          employee_id,
          name,
          role,
          status
        `)
        .in("role", ["admin", "super_admin"])
        .eq("status", "active")
        .order("name", { ascending: true })
    ]);

    if (departmentsResult.error) throw departmentsResult.error;
    if (shiftsResult.error) throw shiftsResult.error;
    if (managersResult.error) throw managersResult.error;

    return json({
      success: true,
      departments: departmentsResult.data ?? [],
      work_shifts: shiftsResult.data ?? [],
      managers: managersResult.data ?? []
    });

  } catch (error) {
    return json({
      success: false,
      error: "organization_data_failed",
      message: error instanceof Error ? error.message : "Failed to load organization data."
    }, 500);
  }
}

async function handleUpdateEmployeeOrganization(employee: any, body: any): Promise<Response> {
  try {
    await ensureAdmin(employee);

    const employeeId = String(body.employeeId ?? body.employee_id ?? "").trim();
    const reportingManagerId = body.reportingManagerId ?? body.reporting_manager_id ?? null;
    const departmentId = body.departmentId ?? body.department_id ?? null;
    const workShiftId = body.workShiftId ?? body.work_shift_id ?? null;

    if (!employeeId) {
      return json({
        success: false,
        error: "missing_employee_id",
        message: "Employee ID is required."
      }, 400);
    }

    const { data: updatedEmployee, error: updateError } = await adminClient
      .from("employees")
      .update({
        reporting_manager_id: reportingManagerId,
        department_id: departmentId,
        work_shift_id: workShiftId,
        updated_at: new Date().toISOString()
      })
      .eq("id", employeeId)
      .select(`
        id,
        employee_id,
        name,
        email,
        role,
        status,
        reporting_manager_id,
        department_id,
        work_shift_id
      `)
      .single();

    if (updateError) {
      return json({
        success: false,
        error: "employee_organization_update_failed",
        message: updateError.message
      }, 400);
    }

    return json({
      success: true,
      message: "Employee organization details updated successfully.",
      employee: updatedEmployee
    });

  } catch (error) {
    return json({
      success: false,
      error: "employee_organization_update_failed",
      message: error instanceof Error ? error.message : "Failed to update employee organization details."
    }, 500);
  }
}

async function handleUpdateEmployeeRole(employee: any, body: any) {
  ensureSuperAdmin(employee);

  const { employeeId, role } = body;

  if (!employeeId) {
    throw new Error("Employee ID is required");
  }

  if (!["employee", "admin"].includes(role)) {
    throw new Error("Invalid role");
  }

  const { data: targetEmployee, error: targetError } = await adminClient
    .from("employees")
    .select("id, employee_id, name, email, role, status")
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (targetError) throw new Error(targetError.message);
  if (!targetEmployee) throw new Error("Employee not found");
  if (targetEmployee.id === employee.id) throw new Error("You cannot change your own role");
  if (targetEmployee.role === "super_admin") throw new Error("Super admin role cannot be changed here");

  const { data, error } = await adminClient
    .from("employees")
    .update({
      role,
      updated_at: new Date().toISOString()
    })
    .eq("id", targetEmployee.id)
    .select(`
      id,
      employee_id,
      name,
      email,
      role,
      status
    `)
    .single();

  if (error) throw new Error(error.message);

  return json({
    success: true,
    employee: data
  });
}

// =============================================================
// ATTENDANCE / TIME HELPERS
// =============================================================

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
  const safeMinutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

function formatTime(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata"
  });
}

function calculateHours(
  checkIn: string | null,
  checkOut: string | null,
  totalBreakSeconds = 0,
  breakStartedAt: string | null = null
): string {
  if (!checkIn) return "0h 00m";

  const start = new Date(checkIn).getTime();
  if (!Number.isFinite(start)) return "0h 00m";

  let end = checkOut ? new Date(checkOut).getTime() : Date.now();

  if (breakStartedAt && !checkOut) {
    const breakStart = new Date(breakStartedAt).getTime();
    if (Number.isFinite(breakStart)) {
      end = breakStart;
    }
  }

  if (!Number.isFinite(end)) return "0h 00m";

  const elapsedSeconds = Math.max(0, Math.floor((end - start) / 1000));
  const netSeconds = Math.max(0, elapsedSeconds - Math.max(0, Number(totalBreakSeconds)));
  const totalMinutes = Math.floor(netSeconds / 60);

  return formatDuration(totalMinutes);
}

// =============================================================
// JSON RESPONSE
// =============================================================

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}