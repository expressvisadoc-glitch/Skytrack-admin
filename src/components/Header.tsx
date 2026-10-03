import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { NotificationPanel } from './NotificationPanel'
import { searchGlobal } from '../lib/api'

export function Header({ onSelectTab }: { onSelectTab?: (tab: string) => void }) {
  const { session } = useAuth()
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [actionableCount, setActionableCount] = useState<number>(0)
  const [currentDate, setCurrentDate] = useState(new Date())

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!searchQuery.trim() || !session?.token) {
      setSearchResults([])
      return
    }

    const delay = setTimeout(async () => {
      setIsSearching(true)
      try {
        const data = await searchGlobal(session.token, searchQuery)
        if (data.success) {
          setSearchResults(data.results || [])
        }
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setIsSearching(false)
      }
    }, 400)

    return () => clearTimeout(delay)
  }, [searchQuery, session?.token])

  const formattedDate = currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  return (
    <header className="fixed top-0 left-72 right-0 h-20 bg-white/75 backdrop-blur-xl border-b border-slate-200/70 z-40 flex items-center justify-between px-8 transition-all">
      {/* Brand / Search Bar */}
      <div className="flex items-center gap-6 w-full max-w-xl">
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="font-bold text-base text-slate-900 tracking-tight">SkyTrack Admin</span>
        </div>
        <div ref={searchRef} className="relative w-full">
          <div className="flex items-center gap-3 px-4 py-2 bg-slate-100/80 hover:bg-slate-100 rounded-2xl w-full border border-slate-200/50 transition-all focus-within:ring-2 focus-within:ring-red-500/20 focus-within:border-red-500/40">
            <span className="material-symbols-outlined text-slate-400 text-[20px]">search</span>
            <input
              className="bg-transparent w-full focus:outline-none text-sm text-slate-700 placeholder:text-slate-400 font-medium"
              placeholder="Search staff, attendance, records..."
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setShowResults(true)
              }}
              onFocus={() => setShowResults(true)}
            />
            {isSearching ? (
              <span className="w-4 h-4 rounded-full border-2 border-red-500/30 border-t-red-500 animate-spin"></span>
            ) : (
              <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold text-slate-400 bg-white rounded-md border border-slate-200 shadow-2xs">
                ⌘K
              </kbd>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showResults && searchQuery.trim().length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200/70 shadow-xl overflow-hidden z-50 max-h-96 overflow-y-auto">
              <div className="p-2">
                <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Staff
                </div>
                {isSearching && searchResults.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-slate-500 text-center">Searching...</div>
                ) : searchResults.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-slate-500 text-center">No results found for "{searchQuery}"</div>
                ) : (
                  searchResults.map((result) => (
                    <div key={result.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors">
                      {result.profile_photo_url ? (
                        <img src={result.profile_photo_url} alt={result.name} className="w-10 h-10 rounded-full object-cover bg-slate-100 shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm shrink-0">
                          {result.name ? result.name.charAt(0).toUpperCase() : '?'}
                        </div>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-slate-800 truncate">{result.name}</span>
                        <span className="text-xs text-slate-500 truncate">{result.employee_id} • {result.designation || result.department || result.role}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Header Utilities */}
      <div className="flex items-center gap-4">
        {/* Operational Date Pill */}
        <div className="hidden xl:flex items-center gap-2 text-slate-600 px-3.5 py-1.5 bg-white/80 rounded-full border border-slate-200/70 shadow-xs">
          <span className="material-symbols-outlined text-[17px] text-red-500">calendar_today</span>
          <span className="text-xs font-semibold text-slate-700">{formattedDate}</span>
        </div>

        {/* Operational Live Pill */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Operational</span>
        </div>

        {/* Notification Bell */}
        <button
          className={`relative p-2.5 text-slate-500 hover:text-slate-800 rounded-2xl border transition-all cursor-pointer ${isNotificationOpen ? 'bg-slate-50 border-slate-300 shadow-inner' : 'bg-white border-slate-200/70 shadow-xs hover:shadow-sm'}`}
          type="button"
          onClick={() => setIsNotificationOpen(!isNotificationOpen)}
          aria-label="View notifications and admin attention items"
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          {actionableCount > 0 ? (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
              {actionableCount > 9 ? '9+' : actionableCount}
            </span>
          ) : null}
        </button>

        {/* Admin Profile Pill */}
        {/* <div className="flex items-center gap-3 pl-2">
          <div className="flex flex-col text-right hidden sm:flex">
            <span className="text-xs font-bold text-slate-800 truncate max-w-[140px]">{displayName}</span>
            <span className="text-[11px] font-medium text-slate-400 truncate max-w-[140px]">{department}</span>
          </div>
          <div className="relative">
            <img
              alt="Profile"
              className="w-10 h-10 rounded-2xl object-cover ring-2 ring-white shadow-xs"
              src={employee?.avatar_url || "https://lh3.googleusercontent.com/aida/AEtjO1Wbv4ZJJ2bENB7yUzu3f8yZLJ3qoMa2or3jLPezI8ERPUU2A5ONrhGUb23Z30Un6TSiTcHcS5BshPCKR6W7RiFdB0ZewKxmmfsHNh5DPPOrF6mpDNvVLt3ptzz4YXrkVDIv8I-MXNNJB59lGVF8wDPuQE61FsE4jUt5IZFgGvBMNIkx3Z7FmG2AnKblADKv1CStQzk6kpA-NLCEsKEPOFct-ToNPg5xN8R69N99SqUrVY_cpQEF2UbebLGa"}
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white"></span>
          </div>
        </div> */}
      </div>
      <NotificationPanel
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        onSelectTab={onSelectTab}
        onCountUpdate={setActionableCount}
      />
    </header>
  )
}
