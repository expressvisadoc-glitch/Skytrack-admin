import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getPublicHolidaysList, type PublicHolidayItem, isSessionExpiredError } from '../../lib/api'
import { 
  Search, 
  Sparkles, 
  Clock, 
  AlertCircle,
  Flag,
  CalendarDays
} from 'lucide-react'

export function EmployeeHolidays() {
  const { token, logout } = useAuth()
  const [holidays, setHolidays] = useState<PublicHolidayItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'gazetted' | 'restricted'>('all')

  useEffect(() => {
    async function loadHolidays() {
      if (!token) return
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const res = await getPublicHolidaysList(token)
        if (res && res.success && Array.isArray(res.holidays)) {
          // Sort chronologically by date
          const sorted = [...res.holidays].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
          setHolidays(sorted)
        } else {
          setHolidays([])
        }
      } catch (err: any) {
        console.error('Failed to load public holidays:', err)
        if (isSessionExpiredError(err)) {
          logout()
          return
        }
        setErrorMessage(err?.message || 'Unable to retrieve holiday schedule.')
      } finally {
        setIsLoading(false)
      }
    }

    loadHolidays()
  }, [token, logout])

  // Failsafe: if an expired session error is somehow set, navigate to login
  useEffect(() => {
    if (isSessionExpiredError(errorMessage)) {
      logout()
    }
  }, [errorMessage, logout])

  // Filter holidays
  const filteredHolidays = holidays.filter((h) => {
    const q = searchQuery.toLowerCase().trim()
    const matchesSearch = !q || h.name.toLowerCase().includes(q) || h.date.includes(q)
    const matchesType = typeFilter === 'all' || String(h.type || '').toLowerCase().includes(typeFilter)
    return matchesSearch && matchesType
  })

  // Metric counts
  const gazettedCount = holidays.filter((h) => String(h.type || '').toLowerCase().includes('gazetted')).length
  const restrictedCount = holidays.filter((h) => String(h.type || '').toLowerCase().includes('restricted')).length

  // Next upcoming holiday
  const todayStr = new Date().toISOString().slice(0, 10)
  const upcomingHolidays = holidays.filter((h) => h.date >= todayStr)
  const nextHoliday = upcomingHolidays.length > 0 ? upcomingHolidays[0] : null

  // Calculate days remaining to next holiday
  const daysToNext = nextHoliday ? Math.max(0, Math.ceil((new Date(nextHoliday.date).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24))) : null

  // Format date display: e.g. "Friday, Oct 2, 2026"
  const formatDateFull = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="pt-24 px-4 sm:px-8 pb-12 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-red-50 text-red-600 border border-red-100">
            Official Roster
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Public Holidays Schedule
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Review official statutory Gazetted and Restricted holidays observed by Skypass Visa Services.
        </p>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3 text-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Notice: </span>
            {errorMessage}
          </div>
        </div>
      )}

      {/* Bento Metric Pods */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Pod 1: Gazetted Holidays */}
        <div className="glass-card rounded-3xl p-6 shadow-xs border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Gazetted Holidays</span>
            <span className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <Flag className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-mono">
            {gazettedCount}
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Mandatory closed days across all hubs
          </p>
        </div>

        {/* Pod 2: Restricted / Optional Holidays */}
        <div className="glass-card rounded-3xl p-6 shadow-xs border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Restricted Holidays</span>
            <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-purple-700 font-mono">
            {restrictedCount}
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Optional observances per policy
          </p>
        </div>

        {/* Pod 3: Next Upcoming Holiday */}
        <div className="glass-card rounded-3xl p-6 shadow-xs border border-slate-200/80 space-y-2 relative overflow-hidden bg-gradient-to-br from-white via-white to-red-50/30">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-600">Next Upcoming</span>
            <span className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-extrabold text-slate-900 truncate">
            {nextHoliday ? nextHoliday.name : 'None Scheduled'}
          </div>
          <div className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
            {nextHoliday ? (
              <>
                <span>{formatDateFull(nextHoliday.date)}</span>
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                  In {daysToNext} {daysToNext === 1 ? 'day' : 'days'}
                </span>
              </>
            ) : (
              <span>All holidays for this cycle have completed</span>
            )}
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="glass-card rounded-3xl p-6 sm:p-7 shadow-xs border border-slate-200/80 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search holiday name or date..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all"
            />
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            {(['all', 'gazetted', 'restricted'] as const).map((filter) => {
              const isActive = typeFilter === filter
              const label = filter === 'all' ? 'All Holidays' : filter === 'gazetted' ? 'Gazetted' : 'Restricted'
              return (
                <button
                  key={filter}
                  onClick={() => setTypeFilter(filter)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Holidays Table / List */}
        {isLoading ? (
          <div className="py-16 text-center flex flex-col items-center justify-center space-y-3">
            <span className="w-8 h-8 rounded-full bg-red-500 animate-ping"></span>
            <p className="text-xs font-bold text-slate-500">Loading Holiday Calendar...</p>
          </div>
        ) : filteredHolidays.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
              <CalendarDays className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-700">No Holidays Found</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              No matching public holidays found for the selected filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-3">Holiday Name</th>
                  <th className="py-3 px-3">Date &amp; Day</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredHolidays.map((holiday) => {
                  const isPast = holiday.date < todayStr
                  const isToday = holiday.date === todayStr
                  const isGazetted = String(holiday.type || '').toLowerCase().includes('gazetted')

                  return (
                    <tr key={holiday.id || holiday.date} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-3">
                        <span className="font-extrabold text-slate-900 text-sm">{holiday.name}</span>
                      </td>

                      <td className="py-3.5 px-3 text-slate-700 font-medium">
                        {formatDateFull(holiday.date)}
                      </td>

                      <td className="py-3.5 px-3">
                        {isGazetted ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                            Gazetted National
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            Restricted / Optional
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        {isToday ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Today
                          </span>
                        ) : isPast ? (
                          <span className="text-[11px] font-semibold text-slate-400">
                            Passed
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Upcoming
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
