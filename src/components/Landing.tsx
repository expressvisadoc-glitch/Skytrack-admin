import { GlassBackdrop } from './GlassBackdrop'
import { ThemeToggle } from './ThemeToggle'

/**
 * Public landing page shown at "/" to signed-out visitors. "Log in" opens the existing login screen (/login).
 * Content describes only what SkyTrack does today.
 */

const FEATURES = [
  {
    icon: 'my_location',
    title: 'Office-verified check-in',
    text: 'Check-in and check-out only work inside your office radius. Accuracy limits and mock-location detection keep it honest.',
  },
  {
    icon: 'free_breakfast',
    title: 'Breaks and live status',
    text: 'See who is working, on a break, late or absent right now, with hours worked and break time for every employee.',
  },
  {
    icon: 'event_available',
    title: 'Leave and holidays',
    text: 'Employees apply from the app, admins approve in one click. Balances, unpaid days and your holiday calendar stay in sync.',
  },
  {
    icon: 'payments',
    title: 'Payroll and payslips',
    text: 'Absences, unpaid leave and late marks flow into each month’s salary. Lock the month and payslips are ready to download.',
  },
  {
    icon: 'notifications_active',
    title: 'Timely reminders',
    text: 'Shift reminders, missed check-outs, leave decisions and payslip alerts reach employees as push notifications.',
  },
  {
    icon: 'monitoring',
    title: 'Admin insights',
    text: 'A live dashboard, monthly audit trails, exception alerts and CSV export give admins the full picture.',
  },
]

const STEPS = [
  { icon: 'domain', title: 'Set up your office', text: 'Pin the office on the map, choose the allowed radius, and add shifts, holidays and payroll rules.' },
  { icon: 'smartphone', title: 'Employees check in', text: 'Staff use the SkyTrack app to check in, take breaks and request leave. Location is verified each time.' },
  { icon: 'task_alt', title: 'Close the month', text: 'Review attendance and deductions, lock the month and share payslips, with every change on record.' },
]

const PREVIEW_ROWS = [
  { initials: 'PN', name: 'Priya Nair', meta: 'Checked in 09:52 AM', status: 'Present', tone: 'emerald' },
  { initials: 'AM', name: 'Arjun Menon', meta: 'Checked in 10:14 AM · 14m late', status: 'Late', tone: 'red' },
  { initials: 'FK', name: 'Fatima Khan', meta: 'On break · 12m', status: 'On Break', tone: 'amber' },
]

function goToLogin() {
  window.history.pushState(null, '', '/login')
  window.dispatchEvent(new PopStateEvent('popstate'))
  window.scrollTo({ top: 0 })
}

function LoginButton({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return (
    <button
      type="button"
      onClick={goToLogin}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl font-bold text-white bg-gradient-to-r from-red-500 to-rose-600 shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer ${
        size === 'lg' ? 'px-7 py-3.5 text-sm' : 'px-5 py-2.5 text-sm'
      }`}
    >
      <span className="material-symbols-outlined text-[18px]">login</span>
      Log in
    </button>
  )
}

export function Landing() {
  return (
    <div className="app-bg isolate min-h-screen bg-white text-slate-800 antialiased selection:bg-red-500 selection:text-white">
      <GlassBackdrop />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/75 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto h-18 px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-3" aria-label="SkyTrack home">
            <span className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 shadow-md shadow-red-500/25 text-white font-extrabold">
              S
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="font-extrabold text-slate-900 tracking-tight">SkyTrack</span>
              <span className="hidden sm:block text-[11px] font-medium text-slate-400">Workforce attendance platform</span>
            </span>
          </a>
          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-500" aria-label="Page sections">
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">How it works</a>
            <a href="#roles" className="hover:text-slate-900 transition-colors">For teams</a>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <LoginButton />
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20 lg:pt-24 lg:pb-28 grid lg:grid-cols-2 gap-14 items-center">
          <div className="flex flex-col gap-6">
            <span className="self-start inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200/70 text-[12px] font-bold text-red-600">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Attendance, leave and payroll in one place
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-extrabold tracking-tight text-slate-900 leading-[1.08]">
              Know who’s at work.
              <span className="block bg-gradient-to-r from-red-500 to-rose-600 bg-clip-text text-transparent">Pay them right.</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-500 leading-relaxed max-w-xl">
              SkyTrack verifies every check-in at your office, tracks breaks and leave, and turns attendance into accurate
              monthly payroll, with an app for employees and a portal for admins.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <LoginButton size="lg" />
              <a
                href="#features"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold text-slate-700 glass-panel hover:-translate-y-0.5 transition-all"
              >
                See what’s inside
                <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
              </a>
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-[13px] font-semibold text-slate-500">
              {['Android app for employees', 'Web portal for admins', 'Office geofencing'].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-emerald-500">check_circle</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Product preview (illustrative) */}
          <div className="relative" aria-label="Illustration of the SkyTrack dashboard">
            <div className="glass-panel rounded-3xl p-5 sm:p-6 flex flex-col gap-4 sm:rotate-[-1deg]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Today’s attendance</p>
                  <p className="text-lg font-extrabold text-slate-900">Head Office</p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500 text-white text-[11px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  Live
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {[['Present', '24', 'text-emerald-600'], ['Late', '3', 'text-red-500'], ['On leave', '2', 'text-violet-600']].map(([label, value, tone]) => (
                  <div key={label} className="rounded-2xl bg-white/70 border border-slate-200/70 p-3">
                    <p className="text-[11px] font-semibold text-slate-400">{label}</p>
                    <p className={`text-2xl font-extrabold ${tone}`}>{value}</p>
                  </div>
                ))}
              </div>
              <ul className="flex flex-col gap-2">
                {PREVIEW_ROWS.map((row) => (
                  <li key={row.name} className="flex items-center gap-3 rounded-2xl bg-white/70 border border-slate-200/70 px-3 py-2.5">
                    <span className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">{row.initials}</span>
                    <span className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-bold text-slate-900 truncate">{row.name}</span>
                      <span className="text-[11px] text-slate-400 truncate">{row.meta}</span>
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                      row.tone === 'emerald' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : row.tone === 'red' ? 'bg-red-50 text-red-600 border-red-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {row.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Floating geofence card */}
            <div className="hidden sm:flex absolute -left-8 -bottom-20 glass-panel rounded-2xl p-3.5 items-center gap-3 rotate-[2deg]">
              <span className="relative w-12 h-12 flex items-center justify-center">
                <span className="absolute inset-0 rounded-full bg-red-500/15" />
                <span className="absolute inset-2.5 rounded-full bg-red-500/20" />
                <span className="relative w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" />
              </span>
              <span className="flex flex-col">
                <span className="text-xs font-bold text-slate-900">Inside the office</span>
                <span className="text-[11px] text-slate-400">18 m from centre · ±6 m</span>
              </span>
            </div>

            {/* Floating notification */}
            <div className="hidden sm:flex absolute right-16 -top-16 glass-panel rounded-2xl px-3.5 py-3 items-center gap-2.5 rotate-[3deg]">
              <span className="w-8 h-8 rounded-xl bg-red-500 text-white flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">notifications</span>
              </span>
              <span className="flex flex-col">
                <span className="text-xs font-bold text-slate-900">Shift starting soon</span>
                <span className="text-[11px] text-slate-400">Your shift starts at 10:00 AM</span>
              </span>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-24 max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="max-w-2xl mb-10">
            <p className="text-[12px] font-bold uppercase tracking-wider text-red-500">Features</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">Everything from check-in to payslip</h2>
            <p className="mt-3 text-slate-500">One system for the whole workday, so attendance, leave and salary always agree.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <article key={f.title} className="hover-magnify glass-panel rounded-3xl p-6 flex flex-col gap-3">
                <span className="w-11 h-11 rounded-2xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">{f.icon}</span>
                </span>
                <h3 className="text-base font-bold text-slate-900">{f.title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{f.text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-24 max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="max-w-2xl mb-10">
            <p className="text-[12px] font-bold uppercase tracking-wider text-red-500">How it works</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">Up and running in three steps</h2>
          </div>
          <ol className="grid md:grid-cols-3 gap-5">
            {STEPS.map((step, i) => (
              <li key={step.title} className="glass-panel rounded-3xl p-6 flex flex-col gap-3">
                <span className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-slate-900 text-white text-sm font-extrabold flex items-center justify-center">{i + 1}</span>
                  <span className="material-symbols-outlined text-[22px] text-red-500">{step.icon}</span>
                </span>
                <h3 className="text-base font-bold text-slate-900">{step.title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Roles */}
        <section id="roles" className="scroll-mt-24 max-w-6xl mx-auto px-4 sm:px-6 py-16 grid md:grid-cols-2 gap-5">
          {[
            {
              icon: 'admin_panel_settings',
              title: 'For admins',
              points: ['Live dashboard of today’s attendance', 'Approve leave and correct attendance', 'Office geofence and payroll settings', 'Lock months and issue payslips'],
            },
            {
              icon: 'badge',
              title: 'For employees',
              points: ['Check in and out from the office', 'Breaks, hours and monthly records', 'Apply for leave and track balances', 'Salary estimate and payslip downloads'],
            },
          ].map((role) => (
            <div key={role.title} className="glass-panel rounded-3xl p-7 flex flex-col gap-4">
              <span className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">{role.icon}</span>
                </span>
                <h3 className="text-xl font-extrabold text-slate-900">{role.title}</h3>
              </span>
              <ul className="flex flex-col gap-2.5">
                {role.points.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="material-symbols-outlined text-[18px] text-emerald-500">check_circle</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        {/* Final call to action */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="rounded-3xl p-8 sm:p-12 bg-gradient-to-br from-red-500 to-rose-600 text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl shadow-red-500/20">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Ready to get started?</h2>
              <p className="mt-2 text-white/80">Admins and employees sign in with their SkyTrack account.</p>
            </div>
            <button
              type="button"
              onClick={goToLogin}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-white text-red-600 font-bold text-sm shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">login</span>
              Log in
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <span>© {new Date().getFullYear()} SkyTrack. All rights reserved.</span>
          <span>Attendance · Leave · Payroll</span>
        </div>
      </footer>
    </div>
  )
}
