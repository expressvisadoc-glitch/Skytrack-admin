/**
 * Opens an admin screen focused on one employee, e.g. /attendance?emp=SKY001 (Monthly Audit Trail) or
 * /employees?emp=SKY001&section=salary (Employee Details, scrolled to Salary). App switches the tab from the
 * URL on popstate, and the target screen reads ?emp=.
 */
export type EmployeeScreen = 'employees' | 'attendance'

export function openEmployeeScreen(screen: EmployeeScreen, employeeId: string, section?: 'salary'): void {
  const params = new URLSearchParams({ emp: employeeId })
  if (section) params.set('section', section)
  window.history.pushState(null, '', `/${screen}?${params.toString()}`)
  window.dispatchEvent(new PopStateEvent('popstate'))
  window.scrollTo({ top: 0 })
}
