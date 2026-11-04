import { useTheme } from '../lib/theme'

/** Header button that switches between the light and dark theme. */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const label = isDark ? 'Switch to light theme' : 'Switch to dark theme'
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      aria-pressed={isDark}
      className="relative p-2.5 rounded-2xl border border-slate-200/70 bg-white text-slate-500 hover:text-slate-800 shadow-xs hover:shadow-sm transition-all cursor-pointer"
    >
      <span
        className={`material-symbols-outlined text-[20px] block transition-transform duration-300 ${isDark ? 'rotate-0 text-amber-300' : '-rotate-12'}`}
      >
        {isDark ? 'light_mode' : 'dark_mode'}
      </span>
    </button>
  )
}
