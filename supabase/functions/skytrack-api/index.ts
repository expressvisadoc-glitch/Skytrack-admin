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
// CORS CONFIGURATION & HELPERS
// =============================================================

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    const host = url.hostname.toLowerCase();

    // 1. Localhost development
    if (host === "localhost" || host === "127.0.0.1") {
      return true;
    }

    // 2. Cloudflare Pages & Workers (*.pages.dev, *.workers.dev)
    if (host.endsWith(".pages.dev") || host.endsWith(".workers.dev")) {
      return true;
    }

    // 3. Organization domains & subdomains
    if (
      host.includes("skytrack") ||
      host.includes("skypass") ||
      host.includes("expressvisa")
    ) {
      return true;
    }

    // 4. Custom origins via environment variable
    const envAllowed = Deno.env.get("ALLOWED_ORIGINS");
    if (envAllowed) {
      const list = envAllowed.split(",").map((s) => s.trim().toLowerCase());
      if (list.includes(origin.toLowerCase()) || list.includes(host)) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || req.headers.get("Origin") || "";
  const allowed = isAllowedOrigin(origin);
  const originHeader = allowed ? origin : (origin || "http://localhost:5173");

  return {
    "Access-Control-Allow-Origin": originHeader,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, accept",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

// =============================================================
// MAIN SERVER
// =============================================================

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // 1. Handle CORS preflight before method validation or request body parsing
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // 2. Delegate to request handler
  try {
    const response = await handleRequest(req);

    // 3. Ensure CORS headers are attached to all normal and error responses
    for (const [key, value] of Object.entries(corsHeaders)) {
      response.headers.set(key, value);
    }

    return response;
  } catch (err) {
    console.error("Unhandled Edge Function error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: "server_error",
        message: err instanceof Error ? err.message : "Internal server error"
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }
});

// =============================================================
// ORGANIZATION RESOLVERS (MANAGER, DEPARTMENT, WORK SHIFT)
// =============================================================

async function resolveReportingManagerName(reportingManagerId: string | null | undefined): Promise<string | null> {
  if (!reportingManagerId) return null;
  try {
    const trimmed = String(reportingManagerId).trim();
    if (
      !trimmed ||
      trimmed.toLowerCase() === "null" ||
      trimmed.toLowerCase() === "undefined" ||
      trimmed.toLowerCase() === "not assigned" ||
      trimmed.toLowerCase() === "not_assigned"
    ) {
      return null;
    }
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);
    let q = adminClient.from("employees").select("name, employee_id");
    if (isUuid) {
      q = q.eq("id", trimmed);
    } else {
      q = q.ilike("employee_id", trimmed);
    }
    const { data: mgr, error } = await q.maybeSingle();
    if (!error && mgr?.name && String(mgr.name).trim()) {
      return String(mgr.name).trim();
    }
    // Fallback if UUID was stored as employee_id or vice versa
    const fallbackQ = isUuid 
      ? adminClient.from("employees").select("name").ilike("employee_id", trimmed)
      : adminClient.from("employees").select("name").eq("id", trimmed);
    const { data: fallbackMgr } = await fallbackQ.maybeSingle();
    if (fallbackMgr?.name && String(fallbackMgr.name).trim()) {
      return String(fallbackMgr.name).trim();
    }

    // Fallback: match auth_user_id in case auth user ID was saved
    if (isUuid) {
      const { data: authMgr } = await adminClient.from("employees").select("name").eq("auth_user_id", trimmed).maybeSingle();
      if (authMgr?.name && String(authMgr.name).trim()) {
        return String(authMgr.name).trim();
      }
    }

    // Fallback: match name directly in case manager name was saved in reporting_manager_id
    const { data: nameMgr } = await adminClient.from("employees").select("name").ilike("name", trimmed).maybeSingle();
    if (nameMgr?.name && String(nameMgr.name).trim()) {
      return String(nameMgr.name).trim();
    }

    // Fallback: If trimmed contains letters and spaces (e.g. "Dinesh Pillai" or "John Doe"), it's already a name
    if (!isUuid && /^[a-zA-Z\s\.\,\'-]+$/.test(trimmed) && trimmed.length > 2) {
      return trimmed;
    }

    // Fallback: If it's a manager code like SKY001 (not a UUID), return it so client displays the assigned code
    if (!isUuid && trimmed.length >= 2) {
      return trimmed;
    }

    return null;
  } catch (err) {
    console.warn("Failed to resolve reporting manager name:", err);
    return null;
  }
}

async function resolveDepartmentName(deptId: string | null | undefined, fallbackDept?: string | null): Promise<string | null> {
  if (fallbackDept && String(fallbackDept).trim()) return String(fallbackDept).trim();
  if (!deptId) return null;
  try {
    const trimmed = String(deptId).trim();
    if (!trimmed) return null;
    const { data, error } = await adminClient.from("departments").select("department_name").eq("id", trimmed).maybeSingle();
    if (!error && data?.department_name) return String(data.department_name).trim();
    return null;
  } catch (err) {
    return null;
  }
}

async function resolveWorkShiftName(shiftId: string | null | undefined): Promise<string | null> {
  if (!shiftId) return null;
  try {
    const trimmed = String(shiftId).trim();
    if (!trimmed) return null;
    const { data, error } = await adminClient.from("work_shifts").select("shift_name, start_time, end_time").eq("id", trimmed).maybeSingle();
    if (!error && data?.shift_name) {
      const name = String(data.shift_name).trim();
      if (data.start_time && data.end_time) {
        return `${name} (${String(data.start_time).slice(0, 5)} - ${String(data.end_time).slice(0, 5)})`;
      }
      return name;
    }
    return null;
  } catch (err) {
    return null;
  }
}

async function handleRequest(req: Request): Promise<Response> {
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
    const action = String(body.action ?? body.a ?? "").trim().toLowerCase();

    // =========================================================
    // LOGIN & PUBLIC ACCESS
    // =========================================================

    if (action === "login" || (!action && (body.employeeId || body.employee_id || body.b) && (body.password || body.c))) {
      return await handleLogin(body);
    }

    if (action === "public_holidays") {
      return await handlePublicHolidays();
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
      data: employeeData,
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
        auth_user_id,
        created_at,
        joining_date,
        profile_photo_url,
        reporting_manager_id,
        department_id,
        work_shift_id,
        department
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

    let employee = employeeData;
    if (!employee && user.email) {
      const { data: empByEmail } = await adminClient
        .from("employees")
        .select(`
          id,
          employee_id,
          name,
          email,
          role,
          status,
          auth_user_id,
          created_at,
          joining_date,
          profile_photo_url,
          reporting_manager_id,
          department_id,
          work_shift_id,
          department
        `)
        .ilike("email", user.email)
        .maybeSingle();

      if (empByEmail) {
        employee = empByEmail;
        await adminClient
          .from("employees")
          .update({ auth_user_id: user.id })
          .eq("id", empByEmail.id);
      }
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
      return await handleStartWork(employee, body);
    }

    if (action === "end_work") {
      return await handleEndWork(employee, body);
    }

    if (action === "start_break") {
      return await handleStartBreak(employee, body);
    }

    if (action === "resume_work" || action === "end_break") {
      return await handleResumeWork(employee, body);
    }

    // =========================================================
    // OFFICE GEOFENCE
    // =========================================================

    if (action === "geofence_config") {
      return await handleGeofenceConfig();
    }

    if (action === "admin_geofence_settings") {
      return await handleAdminGeofenceSettings(employee);
    }

    if (action === "admin_payroll_policy") {
      return await handleAdminPayrollPolicy(employee);
    }

    if (action === "admin_save_payroll_policy") {
      return await handleAdminSavePayrollPolicy(employee, body);
    }

    if (action === "admin_save_geofence_settings") {
      return await handleAdminSaveGeofenceSettings(employee, body);
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

    if (action === "admin_undo_checkout") {
      return await handleAdminUndoCheckout(employee, body);
    }

    if (action === "admin_manual_attendance" || action === "admin_update_attendance") {
      return await handleAdminManualAttendance(employee, body);
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

    if (action === "cancel_leave") {
      return await handleCancelLeave(
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

    if (action === "seed_public_holidays") {
      return await handleSeedPublicHolidays(employee);
    }

    if (action === "delete_public_holiday" || action === "admin_delete_holiday") {
      return await handleDeletePublicHoliday(employee, body);
    }

    if (action === "save_public_holiday" || action === "upsert_public_holiday") {
      return await handleSavePublicHoliday(employee, body);
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

    if (action === "update_employee_id") {
      return await handleUpdateEmployeeId(employee, body);
    }

    if (action === "delete_employee") {
      return await handleDeleteEmployee(employee, body, user);
    }

    if (action === "super_admin_change_employee_password") {
      return await handleSuperAdminChangeEmployeePassword(employee, body, user);
    }

    if (action === "update_profile_photo") {
      return await handleUpdateProfilePhoto(employee, body);
    }

    if (action === "get_profile") {
      return await handleGetProfile(employee);
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
}

// =============================================================
// LOGIN
// =============================================================

async function handleLogin(body: any) {
  const employeeId =
    String(body.employeeId ?? body.employee_id ?? body.b ?? "").trim();

  const password =
    String(body.password ?? body.c ?? "");

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

  // Find employee: safely check by email if it contains '@', else by employee_id then email
  let employee: any = null;
  let employeeError: any = null;

  if (employeeId.includes("@")) {
    const res = await adminClient
      .from("employees")
      .select(`
        id,
        employee_id,
        name,
        email,
        role,
        status,
        auth_user_id,
        created_at,
        joining_date,
        profile_photo_url,
        reporting_manager_id,
        department_id,
        work_shift_id,
        department
      `)
      .ilike("email", employeeId)
      .maybeSingle();
    employee = res.data;
    employeeError = res.error;
  } else {
    const res = await adminClient
      .from("employees")
      .select(`
        id,
        employee_id,
        name,
        email,
        role,
        status,
        auth_user_id,
        created_at,
        joining_date,
        profile_photo_url,
        reporting_manager_id,
        department_id,
        work_shift_id,
        department
      `)
      .ilike("employee_id", employeeId)
      .maybeSingle();
    employee = res.data;
    employeeError = res.error;

    if (!employee && !employeeError) {
      const emailRes = await adminClient
        .from("employees")
        .select(`
          id,
          employee_id,
          name,
          email,
          role,
          status,
          auth_user_id,
          created_at,
          joining_date,
          profile_photo_url,
          reporting_manager_id,
          department_id,
          work_shift_id,
          department
        `)
        .ilike("email", employeeId)
        .maybeSingle();
      employee = emailRes.data;
      employeeError = emailRes.error;
    }
  }

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

  let targetEmail = employee.email ? employee.email.trim().toLowerCase() : null;
  if (!targetEmail && employee.employee_id) {
    targetEmail = `${employee.employee_id.trim().toLowerCase()}@skytrack.internal`;
    try {
      await adminClient.from("employees").update({ email: targetEmail }).eq("id", employee.id);
      employee.email = targetEmail;
    } catch (e) {
      console.warn("Could not set fallback email on employee:", e);
    }
  }

  if (!targetEmail) {
    return json(
      {
        success: false,
        error: "account_not_configured",
        message:
          "Employee authentication is not configured (missing email)."
      },
      500
    );
  }

  let {
    data: authData,
    error: authError
  } =
    await authClient.auth.signInWithPassword({
      email: targetEmail,
      password
    });

  // Self-healing 1: Auto-confirm email if required by Supabase Auth project
  if (authError?.message?.toLowerCase().includes("email not confirmed")) {
    console.log("Auto-confirming email for", targetEmail);
    try {
      let uidToConfirm = employee.auth_user_id;
      if (!uidToConfirm) {
        const { data: userList } = await adminClient.auth.admin.listUsers();
        const found = userList?.users?.find(
          (u: any) => u.email?.toLowerCase() === targetEmail
        );
        if (found) {
          uidToConfirm = found.id;
        }
      }
      if (uidToConfirm) {
        await adminClient.auth.admin.updateUserById(uidToConfirm, { email_confirm: true });
        const retry = await authClient.auth.signInWithPassword({
          email: targetEmail,
          password
        });
        authData = retry.data;
        authError = retry.error;
      }
    } catch (e) {
      console.warn("Could not auto-confirm email:", e);
    }
  }

  // Self-healing 2: If auth user in auth.users has a different email, try that email
  if (authError && employee.auth_user_id) {
    try {
      const { data: authUserObj } = await adminClient.auth.admin.getUserById(employee.auth_user_id);
      const actualAuthEmail = authUserObj?.user?.email?.trim().toLowerCase();
      if (actualAuthEmail && actualAuthEmail !== targetEmail) {
        console.log("Retrying login with actual auth email:", actualAuthEmail);
        const retry = await authClient.auth.signInWithPassword({
          email: actualAuthEmail,
          password
        });
        if (retry.data?.session) {
          authData = retry.data;
          authError = null;
          await adminClient.from("employees").update({ email: actualAuthEmail }).eq("id", employee.id);
        }
      }
    } catch (e) {
      console.warn("Could not check auth user by id:", e);
    }
  }

  // Self-healing 3: Try internal fallback email if different
  if (authError && employee.employee_id) {
    const internalFallback = `${employee.employee_id.trim().toLowerCase()}@skytrack.internal`;
    if (targetEmail !== internalFallback) {
      try {
        const retry = await authClient.auth.signInWithPassword({
          email: internalFallback,
          password
        });
        if (retry.data?.session) {
          authData = retry.data;
          authError = null;
          await adminClient.from("employees").update({ email: internalFallback }).eq("id", employee.id);
        }
      } catch (e) {
        console.warn("Could not retry with internal fallback:", e);
      }
    }
  }

  if (
    authError ||
    !authData?.session ||
    !authData?.user
  ) {
    console.error(
      "Auth error for",
      employee.employee_id,
      targetEmail,
      ":",
      authError?.message || authError
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

  // Self-healing 4: Sync auth_user_id if not set or mismatched
  if (
    authData.user.id !==
    employee.auth_user_id
  ) {
    console.log(
      "Syncing auth_user_id for employee",
      employee.id,
      "to",
      authData.user.id
    );

    await adminClient
      .from("employees")
      .update({ auth_user_id: authData.user.id })
      .eq("id", employee.id);
    employee.auth_user_id = authData.user.id;
  }

  const [managerName, departmentName, workShiftName] = await Promise.all([
    resolveReportingManagerName(employee.reporting_manager_id),
    resolveDepartmentName(employee.department_id, employee.department),
    resolveWorkShiftName(employee.work_shift_id)
  ]);

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
      id: employee.id,
      employeeId:
        employee.employee_id,
      name:
        employee.name,
      email:
        employee.email,
      role:
        employee.role,
      createdAt:
        employee.created_at,
      joiningDate:
        employee.joining_date,
      profilePhotoUrl:
        employee.profile_photo_url || null,
      avatar:
        employee.profile_photo_url || null,
      managerName: managerName || null,
      manager_name: managerName || null,
      reportingManager: managerName || null,
      reporting_manager_name: managerName || null,
      reportingManagerId: employee.reporting_manager_id || null,
      reporting_manager_id: employee.reporting_manager_id || null,
      departmentName: departmentName || employee.department || null,
      department: departmentName || employee.department || null,
      workShiftName: workShiftName || null,
      work_shift_name: workShiftName || null
    }
  });
}

// =============================================================
// ATTENDANCE TODAY
// =============================================================

async function handleAttendanceToday(
  employee: any
) {
  const today =
    getUtcToday();

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
      today
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
  employee: any,
  body: any
) {
  const {
    data,
    error,
    rejection
  } = await callAttendanceActionRpc(
    employee,
    "start_work",
    body
  );

  if (rejection) {
    return rejection;
  }

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
  employee: any,
  body: any
) {
  const {
    data,
    error,
    rejection
  } = await callAttendanceActionRpc(
    employee,
    "end_work",
    body
  );

  if (rejection) {
    return rejection;
  }

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
  employee: any,
  body: any
) {
  const {
    data,
    error,
    rejection
  } = await callAttendanceActionRpc(
    employee,
    "start_break",
    body
  );

  if (rejection) {
    return rejection;
  }

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
  employee: any,
  body: any
) {
  const {
    data,
    error,
    rejection
  } = await callAttendanceActionRpc(
    employee,
    "resume_work",
    body
  );

  if (rejection) {
    return rejection;
  }

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
// OFFICE GEOFENCE
// The office location, radius and accuracy policy live in public.office_geofence_settings
// and are read by public.attendance_action_with_location inside the same transaction as
// the attendance state change. Clients only ever submit their own location fix.
// =============================================================

const GEOFENCE_LIMITS = {
  radiusMeters: { min: 10, max: 5000, default: 100 },
  maxAccuracyMeters: { min: 5, max: 500, default: 50 },
  maxLocationAgeSeconds: { min: 10, max: 600, default: 120 },
  officeNameMaxLength: 120
};

const GEOFENCE_CONFIG_ERRORS = new Set([
  "geofence_not_configured",
  "geofence_inactive"
]);

type AttendanceLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: string;
  ageMs: number | null;
  isMock: boolean | null;
  platform: string | null;
};

function toFiniteNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  if (typeof value === "string" && /^\s*-?\d+(\.\d+)?\s*$/.test(value)) return Number(value);
  return NaN;
}

function parseAttendanceLocation(body: any): { location: AttendanceLocation | null; invalid: boolean } {
  const raw = body?.location;
  if (raw === undefined || raw === null) {
    return { location: null, invalid: false };
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { location: null, invalid: true };
  }

  const latitude = toFiniteNumber(raw.latitude ?? raw.lat);
  const longitude = toFiniteNumber(raw.longitude ?? raw.lng ?? raw.lon);
  const accuracy = toFiniteNumber(raw.accuracy ?? raw.accuracyMeters ?? raw.accuracy_m);

  const rawCapturedAt = raw.capturedAt ?? raw.captured_at ?? raw.timestamp;
  const capturedMs = typeof rawCapturedAt === "number"
    ? rawCapturedAt
    : typeof rawCapturedAt === "string"
      ? Date.parse(rawCapturedAt)
      : NaN;

  const rawAge = raw.ageMs ?? raw.age_ms;
  const ageMs = rawAge === undefined || rawAge === null ? null : toFiniteNumber(rawAge);
  const rawMock = raw.isMock ?? raw.is_mock;
  const platform = typeof raw.platform === "string"
    ? raw.platform.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 20) || null
    : null;

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    !Number.isFinite(accuracy) ||
    !Number.isFinite(capturedMs) ||
    (ageMs !== null && !Number.isFinite(ageMs)) ||
    (rawMock !== undefined && rawMock !== null && typeof rawMock !== "boolean")
  ) {
    return { location: null, invalid: true };
  }

  return {
    location: {
      latitude,
      longitude,
      accuracy,
      capturedAt: new Date(capturedMs).toISOString(),
      ageMs: ageMs === null ? null : Math.round(ageMs),
      isMock: typeof rawMock === "boolean" ? rawMock : null,
      platform
    },
    invalid: false
  };
}

function geofenceRejectionMessage(action: string, code: string, result: any): string {
  const verb = action === "end_work" ? "check out" : "check in";
  const distance = Number(result?.distance_m);
  const radius = Number(result?.radius_m);
  const accuracy = Number(result?.accuracy_m);
  const maxAccuracy = Number(result?.max_accuracy_m);
  const maxAge = Number(result?.max_location_age_s);

  switch (code) {
    case "geofence_not_configured":
      return `The office location has not been configured, so you cannot ${verb} right now. Please contact your administrator.`;
    case "geofence_inactive":
      return `Office location verification is currently disabled by your administrator, so you cannot ${verb} right now. Please contact your administrator.`;
    case "location_required":
      return `Your current location is required to ${verb}. Please allow location access and try again. If you are using an older version of SkyTrack, please update the app.`;
    case "invalid_location":
      return `The location received from your device is invalid. Please refresh your location and try again.`;
    case "location_timestamp_invalid":
      return `Your location reading has a timestamp ahead of the server time. Make sure your device date and time are set automatically, then try again.`;
    case "location_stale":
      return `Your location reading is out of date (older than ${Number.isFinite(maxAge) ? maxAge : 120} seconds). Please refresh your location and try again.`;
    case "location_accuracy_too_low":
      return `Your location accuracy${Number.isFinite(accuracy) ? ` (±${Math.round(accuracy)} m)` : ""} is too low to ${verb}; ±${Number.isFinite(maxAccuracy) ? maxAccuracy : 50} m or better is required. Move near a window or outdoors, turn on Wi-Fi, and try again.`;
    case "mock_location_detected":
      return `A simulated (mock) location was detected. Disable any mock location apps and try again.`;
    case "outside_geofence":
      return `You are about ${Number.isFinite(distance) ? Math.round(distance) : "?"} m from the office, outside the permitted ${Number.isFinite(radius) ? radius : "?"} m radius. Move closer to the office and try again.`;
    default:
      return `Unable to verify your location to ${verb}. Please try again.`;
  }
}

function geofenceRejectionResponse(action: string, code: string, result: any): Response {
  return json(
    {
      success: false,
      error: code,
      message: geofenceRejectionMessage(action, code, result),
      geofence: {
        locationStatus: result?.location_status ?? null,
        distanceMeters: result?.distance_m === null || result?.distance_m === undefined
          ? null
          : Math.round(Number(result.distance_m)),
        radiusMeters: result?.radius_m ?? null,
        accuracyMeters: result?.accuracy_m ?? null,
        maxAccuracyMeters: result?.max_accuracy_m ?? null,
        maxLocationAgeSeconds: result?.max_location_age_s ?? null,
        receivedAt: result?.received_at ?? null
      }
    },
    GEOFENCE_CONFIG_ERRORS.has(code) ? 409 : 422
  );
}

/**
 * Runs an attendance action through public.attendance_action_with_location, which enforces the
 * office geofence for start_work / end_work, records location evidence for every action and calls
 * the existing attendance RPC in the same transaction. Returns the attendance row in the same
 * `data` array shape the existing RPCs returned, or a ready-made `rejection` response.
 */
async function callAttendanceActionRpc(
  employee: any,
  action: "start_work" | "end_work" | "start_break" | "resume_work",
  body: any
): Promise<{ data: any[] | null; error: any; rejection: Response | null }> {
  const enforced = action === "start_work" || action === "end_work";
  const { location, invalid } = parseAttendanceLocation(body);

  if (invalid && enforced) {
    return {
      data: null,
      error: null,
      rejection: geofenceRejectionResponse(action, "invalid_location", null)
    };
  }

  const { data, error } = await adminClient.rpc(
    "attendance_action_with_location",
    {
      p_employee_id: employee.id,
      p_action: action,
      p_latitude: location?.latitude ?? null,
      p_longitude: location?.longitude ?? null,
      p_accuracy_m: location?.accuracy ?? null,
      p_captured_at: location?.capturedAt ?? null,
      p_location_age_ms: location?.ageMs ?? null,
      p_is_mock: location?.isMock ?? null,
      p_client_platform: location?.platform ?? null
    }
  );

  if (error) {
    return { data: null, error, rejection: null };
  }

  if (!data?.ok) {
    return {
      data: null,
      error: null,
      rejection: geofenceRejectionResponse(action, String(data?.error ?? "location_verification_failed"), data)
    };
  }

  return {
    data: data.attendance ? [data.attendance] : [],
    error: null,
    rejection: null
  };
}

function formatGeofenceSettings(row: any) {
  if (!row) {
    return {
      configured: false,
      isActive: false,
      officeName: null,
      latitude: null,
      longitude: null,
      radiusMeters: GEOFENCE_LIMITS.radiusMeters.default,
      maxAccuracyMeters: GEOFENCE_LIMITS.maxAccuracyMeters.default,
      maxLocationAgeSeconds: GEOFENCE_LIMITS.maxLocationAgeSeconds.default,
      updatedAt: null
    };
  }

  return {
    configured: true,
    isActive: row.is_active === true,
    officeName: row.office_name ?? null,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    radiusMeters: Number(row.radius_m),
    maxAccuracyMeters: Number(row.max_accuracy_m),
    maxLocationAgeSeconds: Number(row.max_location_age_s),
    updatedAt: row.updated_at ?? null
  };
}

async function fetchGeofenceSettingsRow() {
  return await adminClient
    .from("office_geofence_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
}

// Employee-facing: used by the Android app for in-app guidance only.
// The backend re-reads the settings for every check-in / check-out.
async function handleGeofenceConfig(): Promise<Response> {
  const { data, error } = await fetchGeofenceSettingsRow();

  if (error) {
    console.error("geofence_config error:", error);
    return json({
      success: false,
      error: "database_error",
      message: "Unable to load the office location settings."
    }, 500);
  }

  const settings = formatGeofenceSettings(data);
  return json({
    success: true,
    geofence: {
      configured: settings.configured,
      active: settings.isActive,
      officeName: settings.officeName,
      latitude: settings.latitude,
      longitude: settings.longitude,
      radiusMeters: settings.radiusMeters,
      maxAccuracyMeters: settings.maxAccuracyMeters,
      maxLocationAgeSeconds: settings.maxLocationAgeSeconds,
      updatedAt: settings.updatedAt
    }
  });
}

function geofenceForbiddenResponse(): Response {
  return json({
    success: false,
    error: "forbidden",
    message: "Only administrators can manage office geofence settings."
  }, 403);
}

function isAdminRole(employee: any): boolean {
  const role = String(employee?.role || "").toLowerCase();
  return role === "admin" || role === "super_admin";
}

async function handleAdminGeofenceSettings(employee: any): Promise<Response> {
  if (!isAdminRole(employee)) {
    return geofenceForbiddenResponse();
  }

  const { data, error } = await fetchGeofenceSettingsRow();
  if (error) {
    console.error("admin_geofence_settings error:", error);
    return json({
      success: false,
      error: "database_error",
      message: "Unable to load the office location settings."
    }, 500);
  }

  const { data: historyRows, error: historyError } = await adminClient
    .from("office_geofence_settings_history")
    .select("*")
    .order("changed_at", { ascending: false })
    .limit(10);

  if (historyError) {
    console.error("admin_geofence_settings history error:", historyError);
  }

  const adminIds = Array.from(new Set(
    [data?.updated_by, ...(historyRows ?? []).map((h: any) => h.changed_by)].filter(Boolean)
  ));
  const adminsById = new Map<string, any>();
  if (adminIds.length > 0) {
    const { data: admins } = await adminClient
      .from("employees")
      .select("id, employee_id, name")
      .in("id", adminIds);
    for (const admin of admins ?? []) {
      adminsById.set(admin.id, admin);
    }
  }

  const describeAdmin = (id: string | null | undefined) => {
    if (!id) return null;
    const admin = adminsById.get(id);
    return {
      id,
      employeeId: admin?.employee_id ?? null,
      name: admin?.name ?? null
    };
  };

  return json({
    success: true,
    settings: {
      ...formatGeofenceSettings(data),
      updatedBy: describeAdmin(data?.updated_by)
    },
    history: (historyRows ?? []).map((h: any) => ({
      id: h.id,
      officeName: h.office_name ?? null,
      latitude: Number(h.latitude),
      longitude: Number(h.longitude),
      radiusMeters: Number(h.radius_m),
      isActive: h.is_active === true,
      maxAccuracyMeters: Number(h.max_accuracy_m),
      maxLocationAgeSeconds: Number(h.max_location_age_s),
      changedAt: h.changed_at,
      changedBy: describeAdmin(h.changed_by)
    })),
    limits: GEOFENCE_LIMITS
  });
}

function validateGeofenceSettingsInput(body: any): { errors: string[]; value: any } {
  const errors: string[] = [];
  const input = body?.settings && typeof body.settings === "object" ? body.settings : body;

  const latitude = toFiniteNumber(input?.latitude);
  const longitude = toFiniteNumber(input?.longitude);
  const radius = toFiniteNumber(input?.radiusMeters ?? input?.radius_m);
  const maxAccuracy = toFiniteNumber(input?.maxAccuracyMeters ?? input?.max_accuracy_m ?? GEOFENCE_LIMITS.maxAccuracyMeters.default);
  const maxAge = toFiniteNumber(input?.maxLocationAgeSeconds ?? input?.max_location_age_s ?? GEOFENCE_LIMITS.maxLocationAgeSeconds.default);
  const isActive = input?.isActive ?? input?.is_active;
  const officeName = input?.officeName ?? input?.office_name ?? null;

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    errors.push("Latitude must be a number between -90 and 90.");
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    errors.push("Longitude must be a number between -180 and 180.");
  }
  if (latitude === 0 && longitude === 0) {
    errors.push("Latitude 0, longitude 0 is not a valid office location.");
  }

  const integerInRange = (value: number, label: string, unit: string, limits: { min: number; max: number }) => {
    if (!Number.isInteger(value) || value < limits.min || value > limits.max) {
      errors.push(`${label} must be a whole number between ${limits.min} and ${limits.max} ${unit}.`);
    }
  };
  integerInRange(radius, "Radius", "metres", GEOFENCE_LIMITS.radiusMeters);
  integerInRange(maxAccuracy, "Maximum location accuracy", "metres", GEOFENCE_LIMITS.maxAccuracyMeters);
  integerInRange(maxAge, "Maximum location age", "seconds", GEOFENCE_LIMITS.maxLocationAgeSeconds);

  if (typeof isActive !== "boolean") {
    errors.push("Active status must be true or false.");
  }
  if (officeName !== null && typeof officeName !== "string") {
    errors.push("Office name must be text.");
  } else if (typeof officeName === "string" && officeName.trim().length > GEOFENCE_LIMITS.officeNameMaxLength) {
    errors.push(`Office name must be at most ${GEOFENCE_LIMITS.officeNameMaxLength} characters.`);
  }

  return {
    errors,
    value: {
      latitude,
      longitude,
      radius,
      maxAccuracy,
      maxAge,
      isActive,
      officeName: typeof officeName === "string" ? officeName.trim() : null
    }
  };
}

async function handleAdminSaveGeofenceSettings(employee: any, body: any): Promise<Response> {
  if (!isAdminRole(employee)) {
    return geofenceForbiddenResponse();
  }

  const { errors, value } = validateGeofenceSettingsInput(body);
  if (errors.length > 0) {
    return json({
      success: false,
      error: "invalid_geofence_settings",
      message: errors.join(" "),
      errors
    }, 400);
  }

  const { data, error } = await adminClient.rpc(
    "save_office_geofence_settings",
    {
      p_admin_id: employee.id,
      p_office_name: value.officeName,
      p_latitude: value.latitude,
      p_longitude: value.longitude,
      p_radius_m: value.radius,
      p_is_active: value.isActive,
      p_max_accuracy_m: value.maxAccuracy,
      p_max_location_age_s: value.maxAge
    }
  );

  if (error) {
    console.error("admin_save_geofence_settings error:", error);
    if (error.code === "42501") {
      return geofenceForbiddenResponse();
    }
    if (error.code === "23514") {
      return json({
        success: false,
        error: "invalid_geofence_settings",
        message: "The office location settings are outside the allowed ranges."
      }, 400);
    }
    return json({
      success: false,
      error: "database_error",
      message: "Unable to save the office location settings."
    }, 500);
  }

  const row = Array.isArray(data) ? data[0] : data;
  return json({
    success: true,
    message: "Office location settings saved. They apply to all check-in and check-out attempts from now on.",
    settings: {
      ...formatGeofenceSettings(row),
      updatedBy: {
        id: employee.id,
        employeeId: employee.employee_id ?? null,
        name: employee.name ?? null
      }
    }
  });
}

// =============================================================
// PAYROLL SETTINGS (docs/PAYROLL_PLAN.md)
// Week-off days, late grace / conversion and the office timezone live in
// public.payroll_policy. Late marks are decided by the attendance_late_mark trigger.
// =============================================================

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const PAYROLL_POLICY_LIMITS = {
  lateGraceMinutes: { min: 0, max: 240 },
  lateMarksPerUnit: { min: 1, max: 31 },
  lateLopDaysPerUnit: { min: 0.01, max: 1 },
  maxWeekOffDays: 6
};

async function getWeekOffDays(): Promise<number[]> {
  const { data, error } = await adminClient
    .from("payroll_policy")
    .select("week_off_days")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) {
    // Keeps the previous Sunday-only behaviour if the settings row is unavailable
    console.error("payroll_policy lookup failed, using Sunday:", error);
    return [0];
  }
  return (data.week_off_days ?? []).map(Number);
}

function formatPayrollPolicy(row: any) {
  const weekOffDays = (row?.week_off_days ?? []).map(Number);
  return {
    weekOffDays,
    weekOffDayNames: weekOffDays.map((d: number) => WEEKDAY_NAMES[d]),
    lateGraceMinutes: Number(row?.late_grace_minutes),
    lateMarksPerUnit: Number(row?.late_marks_per_unit),
    lateLopDaysPerUnit: Number(row?.late_lop_days_per_unit),
    officeTimezone: row?.office_timezone ?? null,
    updatedAt: row?.updated_at ?? null
  };
}

function payrollForbiddenResponse(): Response {
  return json({
    success: false,
    error: "forbidden",
    message: "Only administrators can manage payroll settings."
  }, 403);
}

async function describeEmployees(ids: (string | null | undefined)[]) {
  const unique = Array.from(new Set(ids.filter(Boolean))) as string[];
  const byId = new Map<string, any>();
  if (unique.length > 0) {
    const { data } = await adminClient
      .from("employees")
      .select("id, employee_id, name")
      .in("id", unique);
    for (const row of data ?? []) {
      byId.set(row.id, row);
    }
  }
  return (id: string | null | undefined) => {
    if (!id) return null;
    const row = byId.get(id);
    return { id, employeeId: row?.employee_id ?? null, name: row?.name ?? null };
  };
}

async function handleAdminPayrollPolicy(employee: any): Promise<Response> {
  if (!isAdminRole(employee)) {
    return payrollForbiddenResponse();
  }

  const { data, error } = await adminClient
    .from("payroll_policy")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) {
    console.error("admin_payroll_policy error:", error);
    return json({
      success: false,
      error: error ? "database_error" : "payroll_policy_missing",
      message: "Unable to load the payroll settings."
    }, 500);
  }

  const { data: historyRows, error: historyError } = await adminClient
    .from("payroll_policy_history")
    .select("*")
    .order("changed_at", { ascending: false })
    .limit(10);

  if (historyError) {
    console.error("admin_payroll_policy history error:", historyError);
  }

  const describe = await describeEmployees([
    data.updated_by,
    ...(historyRows ?? []).map((h: any) => h.changed_by)
  ]);

  return json({
    success: true,
    policy: {
      ...formatPayrollPolicy(data),
      updatedBy: describe(data.updated_by)
    },
    history: (historyRows ?? []).map((h: any) => ({
      id: h.id,
      ...formatPayrollPolicy(h),
      changedAt: h.changed_at,
      changedBy: describe(h.changed_by)
    })),
    limits: PAYROLL_POLICY_LIMITS
  });
}

function isKnownTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function validatePayrollPolicyInput(body: any): { errors: string[]; value: any } {
  const errors: string[] = [];
  const input = body?.policy && typeof body.policy === "object" ? body.policy : body;

  const rawDays = input?.weekOffDays ?? input?.week_off_days;
  let weekOffDays: number[] = [];
  if (!Array.isArray(rawDays) || rawDays.some((d: unknown) => !Number.isInteger(d) || (d as number) < 0 || (d as number) > 6)) {
    errors.push("Week-off days must be a list of day numbers from 0 (Sunday) to 6 (Saturday).");
  } else {
    weekOffDays = Array.from(new Set(rawDays as number[])).sort((a, b) => a - b);
    if (weekOffDays.length > PAYROLL_POLICY_LIMITS.maxWeekOffDays) {
      errors.push("At least one day of the week must be a working day.");
    }
  }

  const grace = toFiniteNumber(input?.lateGraceMinutes ?? input?.late_grace_minutes);
  const marksPerUnit = toFiniteNumber(input?.lateMarksPerUnit ?? input?.late_marks_per_unit);
  const lopPerUnit = toFiniteNumber(input?.lateLopDaysPerUnit ?? input?.late_lop_days_per_unit);
  const timezone = input?.officeTimezone ?? input?.office_timezone;

  const { lateGraceMinutes, lateMarksPerUnit, lateLopDaysPerUnit } = PAYROLL_POLICY_LIMITS;
  if (!Number.isInteger(grace) || grace < lateGraceMinutes.min || grace > lateGraceMinutes.max) {
    errors.push(`Late grace must be a whole number from ${lateGraceMinutes.min} to ${lateGraceMinutes.max} minutes.`);
  }
  if (!Number.isInteger(marksPerUnit) || marksPerUnit < lateMarksPerUnit.min || marksPerUnit > lateMarksPerUnit.max) {
    errors.push(`Late marks per deduction must be a whole number from ${lateMarksPerUnit.min} to ${lateMarksPerUnit.max}.`);
  }
  if (
    !Number.isFinite(lopPerUnit) ||
    lopPerUnit < lateLopDaysPerUnit.min ||
    lopPerUnit > lateLopDaysPerUnit.max ||
    Math.round(lopPerUnit * 100) !== lopPerUnit * 100
  ) {
    errors.push("LOP days per deduction must be between 0.01 and 1 with at most two decimals.");
  }
  if (typeof timezone !== "string" || !timezone.trim() || !isKnownTimezone(timezone.trim())) {
    errors.push("Office timezone must be a valid IANA timezone such as Asia/Kolkata.");
  }

  return {
    errors,
    value: {
      weekOffDays,
      grace,
      marksPerUnit,
      lopPerUnit,
      timezone: typeof timezone === "string" ? timezone.trim() : null
    }
  };
}

async function handleAdminSavePayrollPolicy(employee: any, body: any): Promise<Response> {
  if (!isAdminRole(employee)) {
    return payrollForbiddenResponse();
  }

  const { errors, value } = validatePayrollPolicyInput(body);
  if (errors.length > 0) {
    return json({
      success: false,
      error: "invalid_payroll_policy",
      message: errors.join(" "),
      errors
    }, 400);
  }

  const { data, error } = await adminClient.rpc(
    "save_payroll_policy",
    {
      p_admin_id: employee.id,
      p_week_off_days: value.weekOffDays,
      p_late_grace_minutes: value.grace,
      p_late_marks_per_unit: value.marksPerUnit,
      p_late_lop_days_per_unit: value.lopPerUnit,
      p_office_timezone: value.timezone
    }
  );

  if (error) {
    console.error("admin_save_payroll_policy error:", error);
    if (error.code === "42501") {
      return payrollForbiddenResponse();
    }
    if (error.code === "23514" || error.code === "22023") {
      return json({
        success: false,
        error: "invalid_payroll_policy",
        message: "The payroll settings are outside the allowed values."
      }, 400);
    }
    return json({
      success: false,
      error: "database_error",
      message: "Unable to save the payroll settings."
    }, 500);
  }

  const row = Array.isArray(data) ? data[0] : data;
  return json({
    success: true,
    message: "Payroll settings saved. Late-mark rules apply to check-ins from now on; past days are not changed.",
    policy: {
      ...formatPayrollPolicy(row),
      updatedBy: {
        id: employee.id,
        employeeId: employee.employee_id ?? null,
        name: employee.name ?? null
      }
    }
  });
}

function isPast1159(dateString: string): boolean {
  const todayIndia = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
  const dateOnly = String(dateString).slice(0, 10);
  if (dateOnly < todayIndia) return true;
  if (dateOnly > todayIndia) return false;
  const now = new Date();
  const indiaTimeStr = now.toLocaleTimeString("en-US", {
    timeZone: "Asia/Kolkata",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit"
  });
  const [h, m] = indiaTimeStr.split(":").map(Number);
  return h === 23 && m >= 59;
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
    const isPast1159Date = isPast1159(row.attendance_date);
    const [y, m, d] = String(row.attendance_date).slice(0, 10).split("-").map(Number);
    const autoCheckoutUtc = new Date(Date.UTC(y, m - 1, d, 12, 30, 0)).toISOString();
    const effectiveCheckOut = row.check_out || (isPast1159Date ? autoCheckoutUtc : null);

    if (effectiveCheckOut) {
      let workedMins = row.worked_minutes;
      const breakSec = row.total_break_seconds ?? ((row.break_minutes ?? 0) * 60);

      if ((workedMins == null || workedMins <= 0) && row.check_in) {
        const diffMs = Math.max(0, new Date(effectiveCheckOut).getTime() - new Date(row.check_in).getTime());
        const totalSec = Math.floor(diffMs / 1000);
        workedMins = Math.max(1, Math.round((totalSec - breakSec) / 60));
      }

      const durationText = formatWorkedDuration(
        row.check_in,
        effectiveCheckOut,
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
        timestamp: effectiveCheckOut,
        checkInTime: row.check_in,
        checkOutTime: effectiveCheckOut,
        timeFormatted: formatTime(effectiveCheckOut),
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

const MANDATORY_INDIAN_KERALA_HOLIDAYS = [
  // 2026 Mandatory Indian & Kerala Public Holidays
  { code: 'HOL-IN-2026-001', name: 'Republic Day', date: '2026-01-26', type: 'gazetted', notes: 'Mandatory central statutory closure across operations (Republic Day)' },
  { code: 'HOL-IN-2026-002', name: 'Maha Shivratri', date: '2026-02-15', type: 'gazetted', notes: 'Gazetted holiday for Maha Shivratri' },
  { code: 'HOL-IN-2026-003', name: 'Id-ul-Fitr (Ramzan)', date: '2026-03-20', type: 'gazetted', notes: 'Mandatory statutory closure in Kerala (Id-ul-Fitr)' },
  { code: 'HOL-IN-2026-004', name: 'Good Friday', date: '2026-04-03', type: 'gazetted', notes: 'Mandatory statutory closure in Kerala (Good Friday)' },
  { code: 'HOL-IN-2026-005', name: 'Dr. B.R. Ambedkar Jayanti / Vishu', date: '2026-04-14', type: 'gazetted', notes: 'Mandatory statutory closure in Kerala (Vishu / Ambedkar Jayanti)' },
  { code: 'HOL-IN-2026-006', name: 'May Day (International Workers\' Day)', date: '2026-05-01', type: 'gazetted', notes: 'Mandatory statutory closure across Kerala and operations (May Day)' },
  { code: 'HOL-IN-2026-007', name: 'Bakrid (Id-ul-Zuha)', date: '2026-05-27', type: 'gazetted', notes: 'Mandatory statutory closure in Kerala (Bakrid)' },
  { code: 'HOL-IN-2026-008', name: 'Muharram', date: '2026-06-26', type: 'gazetted', notes: 'Gazetted holiday for Muharram' },
  { code: 'HOL-IN-2026-009', name: 'Independence Day', date: '2026-08-15', type: 'gazetted', notes: 'Mandatory central statutory closure across operations (Independence Day)' },
  { code: 'HOL-IN-2026-010', name: 'First Onam', date: '2026-08-25', type: 'gazetted', notes: 'Kerala State festival holiday (First Onam)' },
  { code: 'HOL-IN-2026-011', name: 'Thiruvonam', date: '2026-08-26', type: 'gazetted', notes: 'Mandatory statutory closure in Kerala (Thiruvonam)' },
  { code: 'HOL-IN-2026-012', name: 'Third Onam / Milad-un-Nabi', date: '2026-08-27', type: 'gazetted', notes: 'Kerala State festival / Gazetted holiday (Third Onam / Prophet\'s Birthday)' },
  { code: 'HOL-IN-2026-013', name: 'Fourth Onam / Sree Narayana Guru Jayanti', date: '2026-08-28', type: 'gazetted', notes: 'Kerala State festival holiday (Sree Narayana Guru Jayanti)' },
  { code: 'HOL-IN-2026-014', name: 'Sree Narayana Guru Samadhi', date: '2026-09-21', type: 'gazetted', notes: 'Kerala State holiday (Sree Narayana Guru Samadhi)' },
  { code: 'HOL-IN-2026-015', name: 'Mahatma Gandhi Jayanti', date: '2026-10-02', type: 'gazetted', notes: 'Mandatory central statutory closure across operations (Gandhi Jayanti)' },
  { code: 'HOL-IN-2026-016', name: 'Mahanavami (Ayudha Pooja)', date: '2026-10-19', type: 'gazetted', notes: 'Kerala State / Gazetted holiday for Mahanavami' },
  { code: 'HOL-IN-2026-017', name: 'Vijayadashami (Dussehra)', date: '2026-10-20', type: 'gazetted', notes: 'Kerala State / Gazetted holiday for Vijayadashami' },
  { code: 'HOL-IN-2026-018', name: 'Deepavali (Diwali)', date: '2026-11-08', type: 'gazetted', notes: 'Gazetted festival holiday for Deepavali' },
  { code: 'HOL-IN-2026-019', name: 'Christmas', date: '2026-12-25', type: 'gazetted', notes: 'Mandatory statutory closure across operations (Christmas)' },

  // 2027 Upcoming Mandatory Indian & Kerala Public Holidays
  { code: 'HOL-IN-2027-001', name: 'New Year\'s Day', date: '2027-01-01', type: 'restricted', notes: 'Optional roster choice for regional hubs (New Year\'s Day)' },
  { code: 'HOL-IN-2027-002', name: 'Republic Day', date: '2027-01-26', type: 'gazetted', notes: 'Mandatory central statutory closure across operations (Republic Day)' },
  { code: 'HOL-IN-2027-003', name: 'Maha Shivratri', date: '2027-03-06', type: 'gazetted', notes: 'Gazetted holiday for Maha Shivratri' },
  { code: 'HOL-IN-2027-004', name: 'Id-ul-Fitr (Ramzan)', date: '2027-03-10', type: 'gazetted', notes: 'Mandatory statutory closure in Kerala (Id-ul-Fitr)' },
  { code: 'HOL-IN-2027-005', name: 'Good Friday', date: '2027-03-26', type: 'gazetted', notes: 'Mandatory statutory closure in Kerala (Good Friday)' },
  { code: 'HOL-IN-2027-006', name: 'Dr. B.R. Ambedkar Jayanti / Vishu', date: '2027-04-14', type: 'gazetted', notes: 'Mandatory statutory closure in Kerala (Vishu / Ambedkar Jayanti)' },
  { code: 'HOL-IN-2027-007', name: 'May Day (International Workers\' Day)', date: '2027-05-01', type: 'gazetted', notes: 'Mandatory statutory closure across Kerala and operations (May Day)' },
  { code: 'HOL-IN-2027-008', name: 'Bakrid (Id-ul-Zuha)', date: '2027-05-16', type: 'gazetted', notes: 'Mandatory statutory closure in Kerala (Bakrid)' },
  { code: 'HOL-IN-2027-009', name: 'Muharram', date: '2027-07-16', type: 'gazetted', notes: 'Gazetted holiday for Muharram' },
  { code: 'HOL-IN-2027-010', name: 'Independence Day', date: '2027-08-15', type: 'gazetted', notes: 'Mandatory central statutory closure across operations (Independence Day)' },
  { code: 'HOL-IN-2027-011', name: 'Thiruvonam (Onam)', date: '2027-09-13', type: 'gazetted', notes: 'Mandatory statutory closure in Kerala (Thiruvonam)' },
  { code: 'HOL-IN-2027-012', name: 'Third Onam / Sree Narayana Guru Jayanti', date: '2027-09-14', type: 'gazetted', notes: 'Kerala State festival holiday (Sree Narayana Guru Jayanti)' },
  { code: 'HOL-IN-2027-013', name: 'Sree Narayana Guru Samadhi', date: '2027-09-21', type: 'gazetted', notes: 'Kerala State holiday (Sree Narayana Guru Samadhi)' },
  { code: 'HOL-IN-2027-014', name: 'Mahatma Gandhi Jayanti', date: '2027-10-02', type: 'gazetted', notes: 'Mandatory central statutory closure across operations (Gandhi Jayanti)' },
  { code: 'HOL-IN-2027-015', name: 'Mahanavami (Ayudha Pooja)', date: '2027-10-09', type: 'gazetted', notes: 'Kerala State / Gazetted holiday for Mahanavami' },
  { code: 'HOL-IN-2027-016', name: 'Vijayadashami (Dussehra)', date: '2027-10-10', type: 'gazetted', notes: 'Kerala State / Gazetted holiday for Vijayadashami' },
  { code: 'HOL-IN-2027-017', name: 'Deepavali (Diwali)', date: '2027-10-29', type: 'gazetted', notes: 'Gazetted festival holiday for Deepavali' },
  { code: 'HOL-IN-2027-018', name: 'Christmas', date: '2027-12-25', type: 'gazetted', notes: 'Mandatory statutory closure across operations (Christmas)' },
];

async function seedHolidaysInternal() {
  for (const item of MANDATORY_INDIAN_KERALA_HOLIDAYS) {
    const { data: existing } = await adminClient
      .from("public_holidays")
      .select("id")
      .eq("holiday_date", item.date)
      .maybeSingle();

    if (!existing) {
      const { data: inserted, error } = await adminClient
        .from("public_holidays")
        .insert({
          holiday_code: item.code,
          holiday_name: item.name,
          holiday_date: item.date,
          holiday_type: item.type,
          is_paid: true,
          status: "published",
          notes: item.notes
        })
        .select()
        .single();

      if (!error && inserted?.id) {
        const branches = ["dl", "mh", "ka", "kl", "ts"].map(b => ({
          holiday_id: inserted.id,
          branch_code: b
        }));
        await adminClient.from("public_holiday_branches").insert(branches);
      }
    }
  }
}

async function handleSeedPublicHolidays(employee: any) {
  try {
    await ensureAdmin(employee);
    await seedHolidaysInternal();
    return await handlePublicHolidays();
  } catch (err: any) {
    return json({ success: false, message: err.message }, 500);
  }
}

async function handleDeletePublicHoliday(employee: any, body: any) {
  try {
    await ensureAdmin(employee);

    const id = body.id || body.holiday_id || body.holidayId;
    const date = body.date || body.holiday_date || body.holidayDate;
    const code = body.code || body.holiday_code || body.holidayCode;
    const name = body.name || body.holiday_name || body.holidayName;

    if (!id && !date && !code && !name) {
      return json(
        {
          success: false,
          error: "missing_parameter",
          message: "Please specify the holiday ID, date, code, or name to delete."
        },
        400
      );
    }

    const idsToDelete = new Set<string>();

    if (id && typeof id === "string" && id.includes("-")) {
      idsToDelete.add(id);
    }

    // Search by ID, code, or date
    let query = adminClient.from("public_holidays").select("id, holiday_code, holiday_date, holiday_name");
    if (id) {
      query = query.eq("id", id);
    } else if (code) {
      query = query.eq("holiday_code", code);
    } else if (date) {
      query = query.eq("holiday_date", date);
    }

    const { data: matched } = await query;
    if (matched && Array.isArray(matched)) {
      for (const m of matched) {
        if (m.id) idsToDelete.add(m.id);
      }
    }

    // Also match by date if available
    if (date) {
      const { data: dateMatches } = await adminClient
        .from("public_holidays")
        .select("id")
        .eq("holiday_date", date);
      if (dateMatches) {
        for (const m of dateMatches) {
          if (m.id) idsToDelete.add(m.id);
        }
      }
    }

    // 1. Delete associated branches first
    for (const hid of idsToDelete) {
      await adminClient
        .from("public_holiday_branches")
        .delete()
        .eq("holiday_id", hid);
    }

    // 2. Delete from public_holidays
    if (idsToDelete.size > 0) {
      await adminClient
        .from("public_holidays")
        .delete()
        .in("id", Array.from(idsToDelete));
    }

    // Fallback: direct delete by date or code or id
    if (date) {
      await adminClient
        .from("public_holidays")
        .delete()
        .eq("holiday_date", date);
    }
    if (code) {
      await adminClient
        .from("public_holidays")
        .delete()
        .eq("holiday_code", code);
    }
    if (id) {
      await adminClient
        .from("public_holidays")
        .delete()
        .eq("id", id);
    }

    // 3. Delete from official_public_holidays if table exists
    try {
      if (id) {
        await adminClient.from("official_public_holidays").delete().eq("id", id);
      }
      if (date) {
        await adminClient.from("official_public_holidays").delete().eq("holiday_date", date);
      }
      if (code) {
        await adminClient.from("official_public_holidays").delete().eq("holiday_code", code);
      }
    } catch (_) {
      // Table may not exist
    }

    return json({
      success: true,
      message: `Holiday ${name ? `"${name}" ` : ""}deleted successfully.`
    });
  } catch (err: any) {
    return json({ success: false, message: err.message }, 500);
  }
}

async function handleSavePublicHoliday(employee: any, body: any) {
  try {
    await ensureAdmin(employee);

    const id = body.id || body.holiday_id || body.holidayId;
    const name = (body.name || body.holiday_name || body.holidayName || "").trim();
    const date = body.date || body.holiday_date || body.holidayDate;
    const type = body.type || body.holiday_type || body.holidayType || "gazetted";
    const notes = body.notes || (type === "gazetted" ? "Mandatory central statutory closure across operations" : "Optional roster choice for regional hubs");
    const branches = body.branches || ["dl", "mh", "ka", "kl", "ts"];

    if (!name || !date) {
      return json({ success: false, message: "Holiday name and date are required." }, 400);
    }

    if (id) {
      // Update existing holiday
      const { error: updateErr } = await adminClient
        .from("public_holidays")
        .update({
          holiday_name: name,
          holiday_date: date,
          holiday_type: type,
          notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (updateErr) throw updateErr;

      // Update branch mappings
      if (Array.isArray(branches) && branches.length > 0) {
        await adminClient.from("public_holiday_branches").delete().eq("holiday_id", id);
        const branchRecords = branches.filter((b: string) => b !== "pan-india").map((b: string) => ({
          holiday_id: id,
          branch_code: b
        }));
        if (branchRecords.length > 0) {
          await adminClient.from("public_holiday_branches").insert(branchRecords);
        }
      }

      return json({ success: true, message: `Updated "${name}" successfully.` });
    } else {
      // Insert new holiday
      const currentYear = new Date(date).getFullYear() || new Date().getFullYear();
      const code = body.code || body.holiday_code || `HOL-IN-${currentYear}-${Date.now().toString().slice(-4)}`;

      const { data: inserted, error: insertErr } = await adminClient
        .from("public_holidays")
        .insert({
          holiday_code: code,
          holiday_name: name,
          holiday_date: date,
          holiday_type: type,
          is_paid: true,
          status: "published",
          notes: notes
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      if (inserted?.id) {
        const branchList = Array.isArray(branches) && branches.length > 0
          ? branches.filter((b: string) => b !== "pan-india")
          : ["dl", "mh", "ka", "kl", "ts"];
        const branchRecords = branchList.map((b: string) => ({
          holiday_id: inserted.id,
          branch_code: b
        }));
        if (branchRecords.length > 0) {
          await adminClient.from("public_holiday_branches").insert(branchRecords);
        }
      }

      return json({ success: true, message: `Created "${name}" successfully.`, holiday: inserted });
    }
  } catch (err: any) {
    return json({ success: false, message: err.message }, 500);
  }
}

async function handlePublicHolidays() {
  let {
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

  // Auto-seed mandatory holidays if database is empty
  if (!companyHolidays || companyHolidays.length === 0) {
    try {
      await seedHolidaysInternal();
      const refetched = await adminClient
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
        .order("holiday_date", { ascending: true });

      if (refetched.data) {
        companyHolidays = refetched.data;
      }
    } catch (seedErr) {
      console.error("Auto-seeding mandatory holidays failed:", seedErr);
    }
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

  const managerName = await resolveReportingManagerName(employee.reporting_manager_id);

  return json({
    success: true,
    message:
      "Leave history retrieved successfully.",

    leaves:
      (data ?? []).map(
        formatLeave
      ),
    managerName: managerName || null,
    manager_name: managerName || null,
    reportingManager: managerName || null,
    reporting_manager_name: managerName || null,
    reportingManagerId: employee.reporting_manager_id || null,
    reporting_manager_id: employee.reporting_manager_id || null
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

  let canonicalLeaveType = type.trim();
  const lowerLt = canonicalLeaveType.toLowerCase();
  if (lowerLt.includes("sick")) {
    canonicalLeaveType = "sick";
  } else if (lowerLt.includes("casual")) {
    canonicalLeaveType = "casual";
  } else if (lowerLt.includes("lop") || lowerLt.includes("loss") || lowerLt.includes("pay") || lowerLt.includes("unpaid")) {
    canonicalLeaveType = "lop";
  }

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
        canonicalLeaveType,

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

    // 1. Fetch leave request by UUID or request_id
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId);
    let leaveReq: any = null;
    let fetchErr: any = null;

    if (isUuid) {
      const res = await adminClient
        .from("leaves")
        .select("*")
        .eq("id", requestId)
        .maybeSingle();
      leaveReq = res.data;
      fetchErr = res.error;
    }

    if (!leaveReq && !fetchErr) {
      const res = await adminClient
        .from("leaves")
        .select("*")
        .eq("request_id", requestId)
        .maybeSingle();
      leaveReq = res.data;
      fetchErr = res.error;
    }

    if (fetchErr) {
      return json({
        success: false,
        error: "database_error",
        message: fetchErr.message
      }, 500);
    }

    if (!leaveReq) {
      return json({
        success: false,
        error: "leave_not_found",
        message: "Leave request not found."
      }, 404);
    }

    // 2. Normalize leave type to avoid check constraint violations on employee_leave_balances
    const rawType = String(leaveReq.leave_type ?? "").toLowerCase();
    const isHalfDay = rawType.includes("half");
    let canonicalType: "casual" | "sick" | "lop" = "casual";
    if (rawType.includes("sick")) {
      canonicalType = "sick";
    } else if (rawType.includes("lop") || rawType.includes("loss") || rawType.includes("pay") || rawType.includes("unpaid")) {
      canonicalType = "lop";
    } else {
      canonicalType = "casual";
    }

    // Sync normalized type to leaves row if it differed
    if (leaveReq.leave_type !== canonicalType) {
      await adminClient
        .from("leaves")
        .update({ leave_type: canonicalType })
        .eq("id", leaveReq.id);
      leaveReq.leave_type = canonicalType;
    }

    // 3. Try standard RPC if it's casual or sick
    let rpcSuccess = false;
    let rpcData: any = null;
    if (canonicalType === "casual" || canonicalType === "sick") {
      try {
        const { data, error } = await adminClient.rpc(
          "approve_leave_request",
          {
            p_request_id: leaveReq.request_id || leaveReq.id,
            p_approved_by: employee.id,
            p_manager_comment: managerComment
          }
        );
        if (!error && data) {
          rpcSuccess = true;
          rpcData = data;
        } else if (error) {
          console.warn("approve_leave_request RPC returned error, using direct approval fallback:", error.message);
        }
      } catch (rpcErr) {
        console.warn("approve_leave_request RPC threw exception, using direct approval fallback:", rpcErr);
      }
    }

    if (rpcSuccess && rpcData) {
      return json({
        success: true,
        message: "Leave request approved successfully.",
        leave: formatLeave(rpcData)
      });
    }

    // 4. Safe Direct Approval Fallback (Guarantees zero constraint violation)
    let daysCount = Number(leaveReq.leave_days ?? 0);
    if (!daysCount || daysCount <= 0) {
      if (isHalfDay) {
        daysCount = 0.5;
      } else if (leaveReq.from_date && leaveReq.to_date) {
        const fromD = new Date(leaveReq.from_date);
        const toD = new Date(leaveReq.to_date);
        let count = 0;
        const cur = new Date(fromD);
        while (cur <= toD) {
          if (cur.getUTCDay() !== 0) {
            count++;
          }
          cur.setUTCDate(cur.getUTCDate() + 1);
        }
        daysCount = count > 0 ? count : 1;
      } else {
        daysCount = 1;
      }
    }

    const paidDays = canonicalType === "lop" ? 0 : daysCount;
    const lopDays = canonicalType === "lop" ? daysCount : 0;

    const { data: updatedLeave, error: leaveUpdateErr } = await adminClient
      .from("leaves")
      .update({
        status: "approved",
        approved_by: employee.id,
        approved_at: new Date().toISOString(),
        manager_comment: managerComment ?? leaveReq.manager_comment,
        leave_days: daysCount,
        paid_leave_days: paidDays,
        lop_days: lopDays,
        updated_at: new Date().toISOString()
      })
      .eq("id", leaveReq.id)
      .select()
      .single();

    if (leaveUpdateErr) {
      return json({
        success: false,
        error: "leave_approval_failed",
        message: leaveUpdateErr.message
      }, 500);
    }

    // Update employee_leave_balances only for paid leave ('casual' or 'sick')
    if (canonicalType === "casual" || canonicalType === "sick") {
      try {
        const { data: existingBal } = await adminClient
          .from("employee_leave_balances")
          .select("*")
          .eq("employee_id", leaveReq.employee_id)
          .eq("leave_type", canonicalType)
          .maybeSingle();

        if (existingBal) {
          const newUsed = Number(existingBal.used_days ?? 0) + paidDays;
          await adminClient
            .from("employee_leave_balances")
            .update({
              used_days: newUsed,
              updated_at: new Date().toISOString()
            })
            .eq("id", existingBal.id);
        } else {
          const alloc = canonicalType === "casual" ? 12 : 6;
          await adminClient
            .from("employee_leave_balances")
            .insert({
              employee_id: leaveReq.employee_id,
              leave_type: canonicalType,
              allocated_days: alloc,
              used_days: paidDays,
              adjusted_days: 0
            });
        }
      } catch (balErr) {
        console.warn("Could not update employee leave balance:", balErr);
      }
    }

    return json({
      success: true,
      message: "Leave request approved successfully.",
      leave: formatLeave(updatedLeave || leaveReq)
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
// LEAVE CANCELLATION
// =============================================================

async function handleCancelLeave(
  employee: any,
  body: any
): Promise<Response> {
  try {
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

    const { data: requestIdLeave } = await adminClient
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
        status,
        manager_comment
      `)
      .eq("request_id", suppliedId)
      .maybeSingle();

    if (requestIdLeave) {
      leaveRecord = requestIdLeave;
    }

    if (!leaveRecord) {
      const { data: uuidLeave } = await adminClient
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
          status,
          manager_comment
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

    const currentStatus = String(leaveRecord.status ?? "").toLowerCase();

    if (currentStatus === "cancelled") {
      return json({
        success: false,
        error: "already_cancelled",
        message: "This leave request is already cancelled.",
        status: leaveRecord.status
      }, 400);
    }

    const role = String(employee?.role ?? "").toLowerCase();
    const isAdmin = role === "admin" || role === "super_admin" || employee?.is_admin === true;
    const isOwner = employee.id === leaveRecord.employee_id;

    if (!isAdmin && !isOwner) {
      return json({
        success: false,
        error: "forbidden",
        message: "You are not authorized to cancel this leave request."
      }, 403);
    }

    // Employees can only cancel their own leaves when in pending state
    if (!isAdmin && isOwner && currentStatus !== "pending") {
      return json({
        success: false,
        error: "leave_not_pending",
        message: `Only pending leave requests can be cancelled by an employee. This request is already ${leaveRecord.status}.`,
        status: leaveRecord.status
      }, 400);
    }

    // Admins can cancel leaves in pending or approved state
    if (isAdmin && currentStatus !== "pending" && currentStatus !== "approved") {
      return json({
        success: false,
        error: "invalid_status",
        message: `Leave request in status '${leaveRecord.status}' cannot be cancelled.`,
        status: leaveRecord.status
      }, 400);
    }

    // If the leave was approved, refund the deducted paid leave days from employee's leave balance
    if (currentStatus === "approved") {
      const refundDays = Number(leaveRecord.paid_leave_days ?? leaveRecord.leave_days ?? 0);
      const leaveType = String(leaveRecord.leave_type ?? "").toLowerCase();

      if (refundDays > 0 && (leaveType === "casual" || leaveType === "sick")) {
        const { data: balanceRecord } = await adminClient
          .from("employee_leave_balances")
          .select("*")
          .eq("employee_id", leaveRecord.employee_id)
          .eq("leave_type", leaveType)
          .maybeSingle();

        if (balanceRecord) {
          const currentUsed = Number(balanceRecord.used_days ?? 0);
          const newUsed = Math.max(0, currentUsed - refundDays);

          await adminClient
            .from("employee_leave_balances")
            .update({
              used_days: newUsed,
              updated_at: new Date().toISOString()
            })
            .eq("id", balanceRecord.id);
        }
      }
    }

    // Update leave status to cancelled
    const finalComment = managerComment ?? (isAdmin ? "Cancelled by Administrator" : "Cancelled by Employee");
    const { data: updatedLeave, error: updateError } = await adminClient
      .from("leaves")
      .update({
        status: "cancelled",
        manager_comment: finalComment,
        updated_at: new Date().toISOString()
      })
      .eq("id", leaveRecord.id)
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

    if (updateError) {
      return json({
        success: false,
        error: "cancel_leave_failed",
        message: updateError.message
      }, 500);
    }

    return json({
      success: true,
      message: "Leave request cancelled successfully.",
      leave: formatLeave(updatedLeave)
    });

  } catch (error) {
    return json({
      success: false,
      error: "cancel_leave_failed",
      message: error instanceof Error ? error.message : "Failed to cancel leave request."
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

  const managerName = await resolveReportingManagerName(employee.reporting_manager_id);

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
    },
    managerName: managerName || null,
    manager_name: managerName || null,
    reportingManager: managerName || null,
    reporting_manager_name: managerName || null,
    reportingManagerId: employee.reporting_manager_id || null,
    reporting_manager_id: employee.reporting_manager_id || null
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

    let targetEmployee = employee;
    const requestedEmpId = String(body?.employeeId ?? body?.employee_id ?? "").trim();
    if (requestedEmpId) {
      const isReqUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedEmpId);
      let empQuery = adminClient.from("employees").select("*");
      if (isReqUuid) {
        empQuery = empQuery.or(`id.eq.${requestedEmpId},employee_id.eq.${requestedEmpId}`);
      } else {
        empQuery = empQuery.eq("employee_id", requestedEmpId);
      }
      const { data: foundEmp } = await empQuery.maybeSingle();
      if (foundEmp) {
        targetEmployee = foundEmp;
      }
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

    // Week-off days come from the payroll settings (0 = Sunday … 6 = Saturday)
    const weekOffDays = await getWeekOffDays();

    function isWeekOff(dateString: string): boolean {
      const [year, monthNumber, day] = dateString.split("-").map(Number);
      const date = new Date(Date.UTC(year, monthNumber - 1, day));
      return weekOffDays.includes(date.getUTCDay());
    }

    const monthStart = getMonthStart(month);
    const nextMonthStart = getNextMonthStart(month);
    const todayDate = getUtcToday();

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
      .eq("employee_id", targetEmployee.id)
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

    // Auto-close any unclosed past shifts past 11:59 directly in database
    for (const row of attendanceRows ?? []) {
      const rowDate = String(row.attendance_date).slice(0, 10);
      if (row.check_in && !row.check_out && isPast1159(rowDate)) {
        const [y, m, d] = rowDate.split("-").map(Number);
        const autoCheckoutUtc = new Date(Date.UTC(y, m - 1, d, 12, 30, 0)).toISOString();
        const checkInTime = new Date(row.check_in).getTime();
        const totalBreakSec = Math.max(0, Number(row.total_break_seconds ?? ((row.break_minutes ?? 0) * 60)));
        let workedMinutes = 0;
        if (Number.isFinite(checkInTime)) {
          const grossSec = Math.max(0, Math.floor((new Date(autoCheckoutUtc).getTime() - checkInTime) / 1000));
          workedMinutes = Math.max(1, Math.round((grossSec - totalBreakSec) / 60));
        }
        adminClient
          .from("attendance")
          .update({
            check_out: autoCheckoutUtc,
            worked_minutes: workedMinutes,
            status: row.status === "late" || row.status === "half_day" ? row.status : "present",
            updated_at: new Date().toISOString()
          })
          .eq("id", row.id)
          .then();

        row.check_out = autoCheckoutUtc;
        row.worked_minutes = workedMinutes;
      }
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
      .eq("employee_id", targetEmployee.id)
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
      if (attDate === todayDate) {
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
      // Employee checked in on a past day but forgot to check out.
      // Credit hours from check-in up to shift end (18:00 IST / 12:30 UTC on that date) minus total break seconds.
      const [year, month, day] = attDate.split("-").map(Number);
      // 18:00 IST corresponds to 12:30 UTC
      const shiftEndUtc = Date.UTC(year, month - 1, day, 12, 30, 0);
      const grossEnd = Math.max(shiftEndUtc, checkInTime + 3600 * 1000);
      const elapsedSeconds = Math.max(0, Math.floor((grossEnd - checkInTime) / 1000));
      const netSeconds = Math.max(0, elapsedSeconds - totalBreakSec);
      return netSeconds > 0 ? netSeconds : 60;
    }

    const daily: any[] = [];
    const attendanceList: any[] = [];

    const employeeCreatedDate = (targetEmployee.joining_date || targetEmployee.created_at
      ? String(targetEmployee.joining_date || targetEmployee.created_at).slice(0, 10)
      : "1970-01-01");

    let totalActiveSeconds = 0;
    let totalBreakSecondsAll = 0;
    let requiredWorkingDays = 0;
    let elapsedRequiredWorkingDays = 0;
    let approvedLeaveDays = 0;
    let publicHolidayDays = 0;
    let sundayDays = 0;
    let completedAttendanceDays = 0;
    let incompleteAttendanceDays = 0;

    let currentDate = monthStart;

    while (currentDate < nextMonthStart) {
      // 1. Skip any dates before the employee was created / joined
      if (currentDate < employeeCreatedDate) {
        currentDate = addDays(currentDate, 1);
        continue;
      }

      const sunday = isWeekOff(currentDate); // week-off day (response keys keep the "sunday" names)
      const isApprovedLeave = approvedLeaveDates.has(currentDate);
      const isPublicHoliday = publicHolidayDates.has(currentDate);
      const att = attendanceMap.get(currentDate) ?? null;
      const isPastOrToday = currentDate <= todayDate;

      if (sunday) sundayDays++;
      if (isApprovedLeave) approvedLeaveDays++;
      if (isPublicHoliday && !sunday) publicHolidayDays++;

      const isRequiredWorkingDay = !sunday && !isApprovedLeave && !isPublicHoliday;
      if (isRequiredWorkingDay) {
        requiredWorkingDays++;
        if (isPastOrToday) {
          elapsedRequiredWorkingDays++;
        }
      }

      const activeSeconds = calculateActiveSeconds(att, currentDate);
      totalActiveSeconds += activeSeconds;

      const rowBreakSec = att ? Math.max(0, Number(att.total_break_seconds ?? (att.break_minutes ? att.break_minutes * 60 : 0))) : 0;
      totalBreakSecondsAll += rowBreakSec;

      const hasPunch = Boolean(att?.check_in);
      const isPast1159Date = isPast1159(currentDate);
      const [y, m, d] = currentDate.split("-").map(Number);
      const autoCheckoutUtc = new Date(Date.UTC(y, m - 1, d, 12, 30, 0)).toISOString();
      const effectiveCheckOut = att?.check_out ?? (hasPunch && isPast1159Date ? autoCheckoutUtc : null);

      const isCompleted = Boolean(hasPunch && effectiveCheckOut);
      const isWorking = hasPunch && !effectiveCheckOut && currentDate === todayDate;

      if (isCompleted) {
        completedAttendanceDays++;
      }
      if (isWorking) {
        incompleteAttendanceDays++;
      }

      const activeMinutes = Math.round(activeSeconds / 60);
      const activeHours = Math.floor(activeSeconds / 3600);
      const activeRemainingMinutes = Math.floor((activeSeconds % 3600) / 60);

      // Prioritize actual punches: if employee punched in, mark as present/working
      const statusStr = isCompleted
        ? (att?.status || "present")
        : (isWorking
            ? "working"
            : (hasPunch
                ? (att?.status || "present")
                : (isApprovedLeave
                    ? "leave"
                    : (sunday
                        ? "weekend"
                        : (isPublicHoliday
                            ? "holiday"
                            : (isPastOrToday ? "absent" : "upcoming"))))));

      // 1. Android DTO item - ONLY include past or today's dates (NO future dates)
      if (isPastOrToday) {
        attendanceList.push({
          date: currentDate,
          attendanceDate: currentDate,
          attendance_date: currentDate,
          employeeId: targetEmployee.employee_id,
          employee_id: targetEmployee.employee_id,
          name: targetEmployee.name ?? "",
          login: formatTime(att?.check_in ?? null),
          logout: formatTime(effectiveCheckOut ?? null),
          check_in: att?.check_in ?? null,
          check_out: effectiveCheckOut ?? null,
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
          check_out: effectiveCheckOut ?? null,
          break_started_at: att?.break_started_at ?? null,
          total_break_seconds: rowBreakSec,
          status: att?.status ?? statusStr,
          active_seconds: Math.round(activeSeconds),
          active_minutes: activeMinutes,
          active_hours: activeHours,
          active_remaining_minutes: activeRemainingMinutes,
          attendance_complete: isCompleted,
          attendance_incomplete: isWorking
        });
      }

      currentDate = addDays(currentDate, 1);
    }

    const requiredSeconds = requiredWorkingDays * dailyRequiredSeconds;
    const differenceSeconds = totalActiveSeconds - requiredSeconds;
    const remainingRequiredSeconds = Math.max(0, requiredSeconds - totalActiveSeconds);
    const overtimeSeconds = Math.max(0, totalActiveSeconds - requiredSeconds);

    const totalActiveMins = Math.floor(totalActiveSeconds / 60);
    const totalHoursFormatted = formatDuration(totalActiveMins);

    let averageHoursFormatted = "0h 00m";
    const effectivePresentDays = completedAttendanceDays + incompleteAttendanceDays;
    if (effectivePresentDays > 0) {
      const avgMins = Math.floor(totalActiveMins / effectivePresentDays);
      averageHoursFormatted = formatDuration(avgMins);
    }

    const absentDaysCount = Math.max(0, elapsedRequiredWorkingDays - effectivePresentDays);
    const presentPercent = requiredWorkingDays > 0 ? Math.round((effectivePresentDays / requiredWorkingDays) * 100) : 0;

    // Sort attendance descending (newest dates first) for Android timeline
    attendanceList.sort((a, b) => b.date.localeCompare(a.date));

    return json({
      success: true,
      message: "Monthly attendance loaded.",
      month,
      employee: {
        id: targetEmployee.id,
        employee_id: targetEmployee.employee_id,
        name: targetEmployee.name,
        created_at: targetEmployee.created_at,
        joining_date: targetEmployee.joining_date
      },
      summary: {
        month,
        workingDays: requiredWorkingDays,
        working_days: requiredWorkingDays,
        required_working_days: requiredWorkingDays,
        presentDays: effectivePresentDays,
        present_days: effectivePresentDays,
        presentPercent: presentPercent,
        present_percent: presentPercent,
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
        overtimeFormatted: overtimeSeconds > 0 ? formatDuration(Math.round(overtimeSeconds / 60)) : "0h 00m",
        difference_seconds: Math.round(differenceSeconds),
        difference_formatted: differenceSeconds >= 0
          ? `+${formatDuration(Math.round(differenceSeconds / 60))}`
          : `-${formatDuration(Math.round(Math.abs(differenceSeconds) / 60))}`,
        differenceFormatted: differenceSeconds >= 0
          ? `+${formatDuration(Math.round(differenceSeconds / 60))}`
          : `-${formatDuration(Math.round(Math.abs(differenceSeconds) / 60))}`
      },
      attendance: attendanceList,
      daily,
      calculation_rules: {
        weekly_off: weekOffDays.map((d) => WEEKDAY_NAMES[d]).join(", ") || "None",
        week_off_days: weekOffDays,
        saturday_is_working_day: !weekOffDays.includes(6),
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

// Attendance rows are dated with the UTC date (the attendance RPCs use current_date on a UTC
// database), so every "today" lookup uses the UTC date as well. Clients convert times for display.
function getUtcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

// =============================================================
// ORGANIZATION DATA HANDLER
// =============================================================

async function handleOrganizationData(employee: any): Promise<Response> {
  try {
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

    let departmentName: string | null = null;
    if (departmentId) {
      const { data: deptData } = await adminClient
        .from("departments")
        .select("department_name")
        .eq("id", departmentId)
        .maybeSingle();
      if (deptData?.department_name) {
        departmentName = deptData.department_name;
      }
    } else if (body.department) {
      departmentName = String(body.department).trim();
    }

    const updateFields: Record<string, any> = {
      reporting_manager_id: reportingManagerId,
      department_id: departmentId,
      work_shift_id: workShiftId,
      updated_at: new Date().toISOString()
    };
    if (departmentName !== null) {
      updateFields.department = departmentName;
    }

    const isEmpUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(employeeId);
    let updateQuery = adminClient.from("employees").update(updateFields);
    if (isEmpUuid) {
      updateQuery = updateQuery.eq("id", employeeId);
    } else {
      updateQuery = updateQuery.ilike("employee_id", employeeId);
    }
    const { data: updatedEmployee, error: updateError } = await updateQuery
      .select(`
        id,
        employee_id,
        name,
        email,
        role,
        status,
        department,
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

async function handleUpdateEmployeeId(employee: any, body: any): Promise<Response> {
  try {
    await ensureAdmin(employee);

    const targetId = String(body.targetId || "").trim();
    const newEmployeeId = String(body.newEmployeeId || "").trim();

    if (!targetId) {
      return json({ success: false, message: "Target employee UUID is required." }, 400);
    }

    if (!newEmployeeId) {
      return json({ success: false, message: "New Employee ID is required." }, 400);
    }

    const { data: existing, error: checkError } = await adminClient
      .from("employees")
      .select("id")
      .eq("employee_id", newEmployeeId)
      .maybeSingle();

    if (checkError) {
      return json({ success: false, message: checkError.message }, 500);
    }

    if (existing && existing.id !== targetId) {
      return json({ success: false, message: "Employee ID is already assigned to another employee." }, 400);
    }

    const { data: targetEmployee, error: targetError } = await adminClient
      .from("employees")
      .select("id, employee_id")
      .eq("id", targetId)
      .maybeSingle();

    if (targetError || !targetEmployee) {
      return json({ success: false, message: "Employee not found." }, 404);
    }

    const { error: updateError } = await adminClient
      .from("employees")
      .update({
        employee_id: newEmployeeId,
        updated_at: new Date().toISOString()
      })
      .eq("id", targetId);

    if (updateError) {
      return json({ success: false, message: updateError.message }, 500);
    }

    return json({
      success: true,
      message: "Employee ID updated successfully.",
      employee: {
        id: targetId,
        employee_id: newEmployeeId
      }
    });
  } catch (error) {
    return json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to update Employee ID."
    }, 500);
  }
}

async function handleDeleteEmployee(caller: any, body: any, authUser: any): Promise<Response> {
  try {
    ensureAdmin(caller);

    const targetEmployeeId = String(body.targetEmployeeId ?? body.employeeId ?? body.targetId ?? "").trim();
    const password = String(body.password ?? "").trim();

    if (!targetEmployeeId) {
      return json({
        success: false,
        error: "missing_target_id",
        message: "Target employee ID is required."
      }, 400);
    }

    if (!password) {
      return json({
        success: false,
        error: "missing_password",
        message: "Administrator password is required."
      }, 400);
    }

    // 1. Prevent deleting self
    if (caller.id === targetEmployeeId || caller.employee_id === targetEmployeeId) {
      return json({
        success: false,
        error: "cannot_delete_self",
        message: "You cannot delete your own account."
      }, 400);
    }

    // 2. Fetch the target employee
    const { data: targetEmployee, error: targetError } = await adminClient
      .from("employees")
      .select("id, name, employee_id, role, auth_user_id")
      .eq("id", targetEmployeeId)
      .maybeSingle();

    if (targetError) {
      return json({
        success: false,
        error: "database_error",
        message: targetError.message
      }, 500);
    }

    if (!targetEmployee) {
      return json({
        success: false,
        error: "employee_not_found",
        message: "Employee not found."
      }, 404);
    }

    // 3. Super Admin accounts are protected and cannot be deleted
    if (targetEmployee.role === "super_admin") {
      return json({
        success: false,
        error: "forbidden",
        message: "Super Admin accounts are protected and cannot be deleted."
      }, 403);
    }

    // 4. Verify calling admin / super admin password
    const adminEmail = caller.email || authUser?.email;
    if (!adminEmail) {
      return json({
        success: false,
        error: "admin_email_missing",
        message: "Administrator email not found for authentication."
      }, 500);
    }

    const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
      email: adminEmail,
      password: password
    });

    if (authError || !authData.user) {
      return json({
        success: false,
        error: "invalid_password",
        message: "The password is wrong."
      }, 401);
    }

    // 5. Password is verified! Perform deletion:
    // Nullify reporting manager references pointing to target
    await adminClient
      .from("employees")
      .update({ reporting_manager_id: null })
      .eq("reporting_manager_id", targetEmployee.id);

    // Delete attendance records
    await adminClient
      .from("attendance")
      .delete()
      .eq("employee_id", targetEmployee.id);

    // Update leaves approved by this employee to null
    await adminClient
      .from("leaves")
      .update({ approved_by: null })
      .eq("approved_by", targetEmployee.id);

    // Delete leaves records
    await adminClient
      .from("leaves")
      .delete()
      .eq("employee_id", targetEmployee.id);

    // Delete leave balance records
    await adminClient
      .from("leave_balance_transactions")
      .delete()
      .eq("employee_id", targetEmployee.id);

    await adminClient
      .from("leave_accruals")
      .delete()
      .eq("employee_id", targetEmployee.id);

    await adminClient
      .from("employee_leave_balances")
      .delete()
      .eq("employee_id", targetEmployee.id);

    // Delete the employee record from public.employees
    const { error: deleteError } = await adminClient
      .from("employees")
      .delete()
      .eq("id", targetEmployee.id);

    if (deleteError) {
      return json({
        success: false,
        error: "delete_failed",
        message: deleteError.message
      }, 500);
    }

    // If the employee has an auth user, delete from auth.users
    if (targetEmployee.auth_user_id) {
      try {
        await adminClient.auth.admin.deleteUser(targetEmployee.auth_user_id);
      } catch (authDelErr) {
        console.warn("Could not delete auth user:", authDelErr);
      }
    }

    return json({
      success: true,
      message: `Employee "${targetEmployee.name}" has been permanently deleted.`
    });

  } catch (error) {
    return json({
      success: false,
      error: "delete_employee_failed",
      message: error instanceof Error ? error.message : "Failed to delete employee."
    }, 500);
  }
}

async function handleSuperAdminChangeEmployeePassword(
  caller: any,
  body: any,
  authUser?: any
) {
  try {
    const role = String(caller?.role ?? "").toLowerCase();
    const isSuperAdmin = role === "super_admin";

    // 1. Strict Super Admin role enforcement
    if (!isSuperAdmin) {
      return json({
        success: false,
        error: "forbidden",
        message: "Only Super Admins have permission to change employee passwords."
      }, 403);
    }

    const targetEmployeeId = String(body.targetEmployeeId ?? body.target_employee_id ?? "").trim();
    const newPassword = String(body.newPassword ?? body.new_password ?? "").trim();
    const adminPassword = String(body.adminPassword ?? body.admin_password ?? body.password ?? "").trim();

    if (!targetEmployeeId) {
      return json({
        success: false,
        error: "missing_target_employee_id",
        message: "Target employee ID is required."
      }, 400);
    }

    if (!newPassword || newPassword.length < 6) {
      return json({
        success: false,
        error: "invalid_new_password",
        message: "New password must be at least 6 characters."
      }, 400);
    }

    if (!adminPassword) {
      return json({
        success: false,
        error: "missing_admin_password",
        message: "Super Admin password is required for 2FA verification."
      }, 400);
    }

    // 2. Fetch target employee (safely checks UUID id, employee_id, and email without throwing PostgREST uuid format errors)
    let targetEmployee: any = null;
    let targetError: any = null;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetEmployeeId);
    if (isUuid) {
      const res = await adminClient
        .from("employees")
        .select("id, name, employee_id, email, auth_user_id, role")
        .eq("id", targetEmployeeId)
        .maybeSingle();
      targetEmployee = res.data;
      targetError = res.error;
    }

    if (!targetEmployee && !targetError) {
      const res = await adminClient
        .from("employees")
        .select("id, name, employee_id, email, auth_user_id, role")
        .ilike("employee_id", targetEmployeeId)
        .maybeSingle();
      targetEmployee = res.data;
      targetError = res.error;
    }

    if (!targetEmployee && !targetError && targetEmployeeId.includes("@")) {
      const res = await adminClient
        .from("employees")
        .select("id, name, employee_id, email, auth_user_id, role")
        .ilike("email", targetEmployeeId)
        .maybeSingle();
      targetEmployee = res.data;
      targetError = res.error;
    }

    if (targetError) {
      return json({
        success: false,
        error: "database_error",
        message: targetError.message
      }, 500);
    }

    if (!targetEmployee) {
      return json({
        success: false,
        error: "employee_not_found",
        message: "Target employee not found."
      }, 404);
    }

    // 3. 2FA Verification: Verify calling super admin's password against Supabase auth
    const adminEmail = caller.email || authUser?.email;
    if (!adminEmail) {
      return json({
        success: false,
        error: "admin_email_missing",
        message: "Super Admin email not found for authentication."
      }, 500);
    }

    const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
      email: adminEmail.trim().toLowerCase(),
      password: adminPassword
    });

    if (authError || !authData.user) {
      return json({
        success: false,
        error: "invalid_password",
        message: "The password is wrong."
      }, 401);
    }

    // 4. Update the target employee's password in Supabase Auth
    let finalEmail = String(targetEmployee.email ?? "").trim().toLowerCase();
    if (!finalEmail && targetEmployee.employee_id) {
      finalEmail = `${targetEmployee.employee_id.trim().toLowerCase()}@skytrack.internal`;
    }

    let authUserId = targetEmployee.auth_user_id;
    let authUserRecord: any = null;

    if (authUserId) {
      try {
        const { data: existingUser } = await adminClient.auth.admin.getUserById(authUserId);
        if (existingUser?.user) {
          authUserRecord = existingUser.user;
        }
      } catch {
        authUserRecord = null;
      }
    }

    // If auth_user_id was missing or not found in auth.users, search by email
    if (!authUserRecord && finalEmail) {
      try {
        const { data: userList } = await adminClient.auth.admin.listUsers();
        const existingAuth = userList?.users?.find(
          (u: any) => u.email?.toLowerCase() === finalEmail
        );
        if (existingAuth) {
          authUserRecord = existingAuth;
          authUserId = existingAuth.id;
        }
      } catch (e) {
        console.warn("Could not search auth users by email:", e);
      }
    }

    if (authUserRecord && authUserId) {
      const updatePayload: any = {
        password: newPassword,
        email_confirm: true
      };
      if (finalEmail) {
        updatePayload.email = finalEmail;
      }

      const { error: updateError } = await adminClient.auth.admin.updateUserById(
        authUserId,
        updatePayload
      );

      if (updateError) {
        console.warn("Error updating user with email, trying password only:", updateError);
        const { error: retryError } = await adminClient.auth.admin.updateUserById(
          authUserId,
          {
            password: newPassword,
            email_confirm: true
          }
        );

        if (retryError) {
          return json({
            success: false,
            error: "password_update_failed",
            message: retryError.message
          }, 500);
        }
      }

      await adminClient
        .from("employees")
        .update({
          auth_user_id: authUserId,
          email: finalEmail || targetEmployee.email
        })
        .eq("id", targetEmployee.id);
    } else {
      // Create new auth user
      const { data: newAuth, error: createError } = await adminClient.auth.admin.createUser({
        email: finalEmail,
        password: newPassword,
        email_confirm: true
      });

      if (createError || !newAuth?.user) {
        return json({
          success: false,
          error: "auth_user_creation_failed",
          message: createError?.message || "Failed to create authentication user."
        }, 500);
      }

      await adminClient
        .from("employees")
        .update({
          auth_user_id: newAuth.user.id,
          email: finalEmail
        })
        .eq("id", targetEmployee.id);
    }

    return json({
      success: true,
      message: `Password for ${targetEmployee.name || targetEmployee.employee_id} has been updated successfully.`
    });

  } catch (error) {
    console.error("Super Admin change password error:", error);
    return json({
      success: false,
      error: "change_password_failed",
      message: error instanceof Error ? error.message : "Failed to change employee password."
    }, 500);
  }
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
// PROFILE PHOTO MANAGEMENT
// =============================================================

async function handleUpdateProfilePhoto(employee: any, body: any) {
  try {
    const rawPhoto = body.photo ?? body.profilePhoto ?? body.profile_photo_url ?? null;
    const photo = typeof rawPhoto === "string" && rawPhoto.trim().length > 0 ? rawPhoto.trim() : null;

    // Reject uncompressed payloads larger than 500KB to protect DB storage
    if (photo && photo.length > 500000) {
      return json(
        {
          success: false,
          error: "payload_too_large",
          message: "Profile photo is too large. Image must be compressed before saving."
        },
        400
      );
    }

    const { error: updateError } = await adminClient
      .from("employees")
      .update({
        profile_photo_url: photo,
        updated_at: new Date().toISOString()
      })
      .eq("id", employee.id);

    if (updateError) {
      console.error("Profile photo update error:", updateError);
      return json(
        {
          success: false,
          error: "database_error",
          message: "Failed to update profile photo in database.",
          details: updateError.message
        },
        500
      );
    }

    return json({
      success: true,
      message: photo ? "Profile photo updated successfully." : "Profile photo removed.",
      profilePhotoUrl: photo
    });
  } catch (err) {
    console.error("Unexpected error updating profile photo:", err);
    return json(
      {
        success: false,
        error: "server_error",
        message: err instanceof Error ? err.message : "An unexpected server error occurred."
      },
      500
    );
  }
}

async function handleGetProfile(employee: any) {
  try {
    const { data: emp, error } = await adminClient
      .from("employees")
      .select(`
        id,
        employee_id,
        name,
        email,
        role,
        status,
        created_at,
        joining_date,
        profile_photo_url,
        reporting_manager_id,
        department_id,
        work_shift_id,
        department
      `)
      .eq("id", employee.id)
      .maybeSingle();

    if (error || !emp) {
      return json(
        {
          success: false,
          error: "not_found",
          message: "Employee profile not found."
        },
        404
      );
    }

    const [managerName, departmentName, workShiftName] = await Promise.all([
      resolveReportingManagerName(emp.reporting_manager_id),
      resolveDepartmentName(emp.department_id, emp.department),
      resolveWorkShiftName(emp.work_shift_id)
    ]);

    return json({
      success: true,
      employee: {
        id: emp.id,
        employeeId: emp.employee_id,
        name: emp.name,
        email: emp.email,
        role: emp.role,
        createdAt: emp.created_at,
        joiningDate: emp.joining_date,
        profilePhotoUrl: emp.profile_photo_url || null,
        avatar: emp.profile_photo_url || null,
        managerName: managerName || null,
        manager_name: managerName || null,
        reportingManager: managerName || null,
        reporting_manager_name: managerName || null,
        reportingManagerId: emp.reporting_manager_id || null,
        reporting_manager_id: emp.reporting_manager_id || null,
        departmentName: departmentName || emp.department || null,
        department: departmentName || emp.department || null,
        workShiftName: workShiftName || null,
        work_shift_name: workShiftName || null
      }
    });
  } catch (err) {
    return json(
      {
        success: false,
        error: "server_error",
        message: "Failed to fetch profile."
      },
      500
    );
  }
}

// =============================================================
// ADMIN ATTENDANCE MANAGEMENT (UNDO CHECKOUT & MANUAL PUNCH)
// =============================================================

async function handleAdminUndoCheckout(employee: any, body: any): Promise<Response> {
  try {
    ensureAdmin(employee);

    const targetEmployeeId = String(body.employeeId ?? body.employee_id ?? "").trim();
    const date = String(body.date ?? body.attendance_date ?? getUtcToday()).trim();

    if (!targetEmployeeId) {
      return json({
        success: false,
        error: "missing_employee_id",
        message: "Employee ID is required."
      }, 400);
    }

    let employeeDbId = targetEmployeeId;
    const isReqUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetEmployeeId);
    if (!isReqUuid) {
      const { data: empRecord } = await adminClient
        .from("employees")
        .select("id")
        .eq("employee_id", targetEmployeeId)
        .maybeSingle();
      if (empRecord?.id) {
        employeeDbId = empRecord.id;
      }
    }

    const { data: attendance, error: findError } = await adminClient
      .from("attendance")
      .select("*")
      .eq("employee_id", employeeDbId)
      .eq("attendance_date", date)
      .maybeSingle();

    if (findError) {
      return json({
        success: false,
        error: "database_error",
        message: findError.message
      }, 500);
    }

    if (!attendance) {
      return json({
        success: false,
        error: "attendance_not_found",
        message: "No attendance record found for this employee on the specified date."
      }, 404);
    }

    // Restore status based on check_in
    let restoredStatus = attendance.status;
    if (attendance.check_in) {
      if (restoredStatus === "absent" || !restoredStatus) {
        restoredStatus = "present";
      }
    }

    const { data: updated, error: updateError } = await adminClient
      .from("attendance")
      .update({
        check_out: null,
        worked_minutes: null,
        status: restoredStatus,
        updated_at: new Date().toISOString()
      })
      .eq("id", attendance.id)
      .select()
      .single();

    if (updateError) {
      return json({
        success: false,
        error: "update_failed",
        message: updateError.message
      }, 500);
    }

    return json({
      success: true,
      message: "Check-out undone successfully. Employee is now marked in progress.",
      attendance: updated
    });
  } catch (error) {
    console.error("handleAdminUndoCheckout error:", error);
    return json({
      success: false,
      error: "server_error",
      message: error instanceof Error ? error.message : "Failed to undo check-out."
    }, 500);
  }
}

async function handleAdminManualAttendance(employee: any, body: any): Promise<Response> {
  try {
    ensureAdmin(employee);

    const targetEmployeeId = String(body.employeeId ?? body.employee_id ?? "").trim();
    const date = String(body.date ?? body.attendance_date ?? getUtcToday()).trim();
    const rawCheckIn = body.checkIn ?? body.check_in;
    const rawCheckOut = body.checkOut ?? body.check_out;

    if (!targetEmployeeId) {
      return json({
        success: false,
        error: "missing_employee_id",
        message: "Employee ID is required."
      }, 400);
    }

    let employeeDbId = targetEmployeeId;
    const isReqUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetEmployeeId);
    if (!isReqUuid) {
      const { data: empRecord } = await adminClient
        .from("employees")
        .select("id")
        .eq("employee_id", targetEmployeeId)
        .maybeSingle();
      if (empRecord?.id) {
        employeeDbId = empRecord.id;
      }
    }

    const { data: existing } = await adminClient
      .from("attendance")
      .select("*")
      .eq("employee_id", employeeDbId)
      .eq("attendance_date", date)
      .maybeSingle();

    const finalCheckIn = rawCheckIn !== undefined ? rawCheckIn : existing?.check_in ?? null;
    const finalCheckOut = rawCheckOut !== undefined ? rawCheckOut : existing?.check_out ?? null;

    let workedMinutes: number | null = null;
    if (finalCheckIn && finalCheckOut) {
      const breakSec = existing?.total_break_seconds ?? (existing?.break_minutes ? existing.break_minutes * 60 : 0);
      const inMs = new Date(finalCheckIn).getTime();
      const outMs = new Date(finalCheckOut).getTime();
      if (outMs > inMs) {
        workedMinutes = Math.max(0, Math.floor((outMs - inMs) / 60000) - Math.round(breakSec / 60));
      }
    }

    // Late / on-time is decided in the database (attendance_late_mark trigger) from the
    // employee's shift whenever the check-in is set or changed.
    let status = body.status || existing?.status || "present";
    if (finalCheckIn && status === "absent") {
      status = "present";
    }

    let resultRecord: any;
    if (existing) {
      const { data: updated, error: updateError } = await adminClient
        .from("attendance")
        .update({
          check_in: finalCheckIn,
          check_out: finalCheckOut,
          worked_minutes: workedMinutes,
          status,
          updated_at: new Date().toISOString()
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (updateError) {
        return json({ success: false, error: "update_failed", message: updateError.message }, 500);
      }
      resultRecord = updated;
    } else {
      const { data: inserted, error: insertError } = await adminClient
        .from("attendance")
        .insert({
          employee_id: employeeDbId,
          attendance_date: date,
          check_in: finalCheckIn,
          check_out: finalCheckOut,
          worked_minutes: workedMinutes,
          status: status || "present",
          break_minutes: 0,
          total_break_seconds: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        return json({ success: false, error: "insert_failed", message: insertError.message }, 500);
      }
      resultRecord = inserted;
    }

    // Re-read so the response includes the status set by the late-mark trigger
    const { data: refreshed } = await adminClient
      .from("attendance")
      .select("*")
      .eq("id", resultRecord.id)
      .maybeSingle();

    return json({
      success: true,
      message: "Attendance recorded successfully.",
      attendance: refreshed ?? resultRecord
    });
  } catch (error) {
    console.error("handleAdminManualAttendance error:", error);
    return json({
      success: false,
      error: "server_error",
      message: error instanceof Error ? error.message : "Failed to record attendance."
    }, 500);
  }
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