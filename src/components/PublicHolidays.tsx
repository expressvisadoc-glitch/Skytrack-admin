import { useState, useMemo, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface PublicHolidayItem {
  id: string
  code: string
  name: string
  date: string // YYYY-MM-DD
  dayOfWeek: string
  monthShort: string
  dayNum: string
  type: 'gazetted' | 'restricted'
  typeLabel: string
  notes: string
  subtext: string
  branches: string[]
  branchCoverageLabel: string
  coveragePercent: number
  isPaid: boolean
  circularRef: string
  isDraft?: boolean
  sourceType?: 'official' | 'company'
}

const INITIAL_HOLIDAYS: PublicHolidayItem[] = [
  {
    id: '1',
    code: 'HOL-IN-2026-001',
    name: 'Makar Sankranti / Pongal',
    date: '2026-01-14',
    dayOfWeek: 'Wednesday',
    monthShort: 'Jan',
    dayNum: '14',
    type: 'restricted',
    typeLabel: 'Restricted Holiday',
    notes: 'Harvest festival & solstice observance',
    subtext: 'Optional Roster Choice',
    branches: ['mh', 'ka', 'kl', 'ts'],
    branchCoverageLabel: '4 Hubs Active (80%)',
    coveragePercent: 80,
    isPaid: true,
    circularRef: 'Ministry of Personnel circular F.No.12/2/2025-JCA',
  },
  {
    id: '2',
    code: 'HOL-IN-2026-002',
    name: 'Republic Day',
    date: '2026-01-26',
    dayOfWeek: 'Monday',
    monthShort: 'Jan',
    dayNum: '26',
    type: 'gazetted',
    typeLabel: 'Gazetted National',
    notes: 'National Holiday • Central Gazetted • All pan-India operations closed',
    subtext: 'Mandatory Statutory Closure',
    branches: ['pan-india', 'dl', 'mh', 'ka', 'kl', 'ts'],
    branchCoverageLabel: 'All India Branches (100%)',
    coveragePercent: 100,
    isPaid: true,
    circularRef: 'Ministry of Personnel circular F.No.12/2/2025-JCA',
  },
  {
    id: '3',
    code: 'HOL-IN-2026-003',
    name: 'Maha Shivratri',
    date: '2026-02-16',
    dayOfWeek: 'Monday',
    monthShort: 'Feb',
    dayNum: '16',
    type: 'restricted',
    typeLabel: 'Restricted Holiday',
    notes: 'Religious observance across northern & western hubs',
    subtext: 'Optional Roster Choice',
    branches: ['dl', 'mh', 'ka', 'ts'],
    branchCoverageLabel: '4 Hubs Active (80%)',
    coveragePercent: 80,
    isPaid: true,
    circularRef: 'Ministry of Personnel circular F.No.12/2/2025-JCA',
  },
  {
    id: '4',
    code: 'HOL-IN-2026-004',
    name: 'Holi (Festival of Colours)',
    date: '2026-03-03',
    dayOfWeek: 'Tuesday',
    monthShort: 'Mar',
    dayNum: '03',
    type: 'gazetted',
    typeLabel: 'Gazetted Holiday',
    notes: 'Spring festival observance • Essential visa desks on standby roster',
    subtext: 'Regional Observance Hubs',
    branches: ['dl', 'mh', 'ka', 'ts'],
    branchCoverageLabel: '4 Hubs Active (80%)',
    coveragePercent: 80,
    isPaid: true,
    circularRef: 'Ministry of Personnel circular F.No.12/2/2025-JCA',
  },
  {
    id: '5',
    code: 'HOL-IN-2026-005',
    name: 'Id-ul-Fitr (Ramzan)',
    date: '2026-03-20',
    dayOfWeek: 'Friday',
    monthShort: 'Mar',
    dayNum: '20',
    type: 'gazetted',
    typeLabel: 'Gazetted Holiday',
    notes: 'Gazetted lunar calendar observance • Subject to state moon sighting',
    subtext: 'Pan-India Mandatory',
    branches: ['pan-india', 'dl', 'mh', 'ka', 'kl', 'ts'],
    branchCoverageLabel: 'All India Branches (Mandatory)',
    coveragePercent: 100,
    isPaid: true,
    circularRef: 'Ministry of Personnel circular F.No.12/2/2025-JCA',
  },
  {
    id: '6',
    code: 'HOL-IN-2026-006',
    name: 'Ram Navami',
    date: '2026-03-26',
    dayOfWeek: 'Thursday',
    monthShort: 'Mar',
    dayNum: '26',
    type: 'restricted',
    typeLabel: 'Restricted Holiday',
    notes: 'Spring festive observance for northern & central desks',
    subtext: 'Optional Roster Choice',
    branches: ['dl', 'mh', 'ts'],
    branchCoverageLabel: '3 Hubs Active (60%)',
    coveragePercent: 60,
    isPaid: true,
    circularRef: 'Ministry of Personnel circular F.No.12/2/2025-JCA',
  },
  {
    id: '7',
    code: 'HOL-IN-2026-007',
    name: 'Mahavir Jayanti',
    date: '2026-03-31',
    dayOfWeek: 'Tuesday',
    monthShort: 'Mar',
    dayNum: '31',
    type: 'gazetted',
    typeLabel: 'Gazetted Holiday',
    notes: 'Central statutory observance across operations',
    subtext: 'Pan-India Coverage',
    branches: ['pan-india', 'dl', 'mh', 'ka', 'kl', 'ts'],
    branchCoverageLabel: 'All India Branches (100%)',
    coveragePercent: 100,
    isPaid: true,
    circularRef: 'Ministry of Personnel circular F.No.12/2/2025-JCA',
  },
  {
    id: '8',
    code: 'HOL-IN-2026-008',
    name: 'Good Friday',
    date: '2026-04-03',
    dayOfWeek: 'Friday',
    monthShort: 'Apr',
    dayNum: '03',
    type: 'gazetted',
    typeLabel: 'Gazetted National',
    notes: 'Christian holy day • Pan-India statutory holiday',
    subtext: 'Pan-India Mandatory',
    branches: ['pan-india', 'dl', 'mh', 'ka', 'kl', 'ts'],
    branchCoverageLabel: 'All India Branches (100%)',
    coveragePercent: 100,
    isPaid: true,
    circularRef: 'Ministry of Personnel circular F.No.12/2/2025-JCA',
  },
  {
    id: '9',
    code: 'HOL-IN-2026-009',
    name: 'Dr. B.R. Ambedkar Jayanti',
    date: '2026-04-14',
    dayOfWeek: 'Tuesday',
    monthShort: 'Apr',
    dayNum: '14',
    type: 'gazetted',
    typeLabel: 'Gazetted National',
    notes: 'National observance of Constitution architect birthday',
    subtext: 'Pan-India Statutory',
    branches: ['pan-india', 'dl', 'mh', 'ka', 'kl', 'ts'],
    branchCoverageLabel: 'All India Branches (100%)',
    coveragePercent: 100,
    isPaid: true,
    circularRef: 'Ministry of Personnel circular F.No.12/2/2025-JCA',
  },
  {
    id: '10',
    code: 'HOL-IN-2026-010',
    name: 'Buddha Purnima / May Day',
    date: '2026-05-01',
    dayOfWeek: 'Friday',
    monthShort: 'May',
    dayNum: '01',
    type: 'gazetted',
    typeLabel: 'Gazetted Holiday',
    notes: 'International Workers Day & Buddhist festival observance',
    subtext: 'Pan-India Statutory',
    branches: ['pan-india', 'dl', 'mh', 'ka', 'kl', 'ts'],
    branchCoverageLabel: 'All India Branches (100%)',
    coveragePercent: 100,
    isPaid: true,
    circularRef: 'Ministry of Personnel circular F.No.12/2/2025-JCA',
  },
  {
    id: '11',
    code: 'HOL-IN-2026-011',
    name: 'Id-ul-Zuha (Bakrid)',
    date: '2026-05-27',
    dayOfWeek: 'Wednesday',
    monthShort: 'May',
    dayNum: '27',
    type: 'gazetted',
    typeLabel: 'Gazetted Holiday',
    notes: 'Islamic feast of sacrifice • Pan-India gazetted closure',
    subtext: 'Pan-India Mandatory',
    branches: ['pan-india', 'dl', 'mh', 'ka', 'kl', 'ts'],
    branchCoverageLabel: 'All India Branches (100%)',
    coveragePercent: 100,
    isPaid: true,
    circularRef: 'Ministry of Personnel circular F.No.12/2/2025-JCA',
  },
  {
    id: '12',
    code: 'HOL-IN-2026-012',
    name: 'Muharram',
    date: '2026-06-26',
    dayOfWeek: 'Friday',
    monthShort: 'Jun',
    dayNum: '26',
    type: 'gazetted',
    typeLabel: 'Gazetted Holiday',
    notes: 'Gazetted religious observance • Subject to state declaration',
    subtext: 'Pan-India Coverage',
    branches: ['pan-india', 'dl', 'mh', 'ka', 'kl', 'ts'],
    branchCoverageLabel: 'All India Branches (100%)',
    coveragePercent: 100,
    isPaid: true,
    circularRef: 'Ministry of Personnel circular F.No.12/2/2025-JCA',
  },
  {
    id: '13',
    code: 'HOL-IN-2026-013',
    name: 'Independence Day',
    date: '2026-08-15',
    dayOfWeek: 'Saturday',
    monthShort: 'Aug',
    dayNum: '15',
    type: 'gazetted',
    typeLabel: 'Gazetted National',
    notes: 'National Day commemoration • Flag hosting protocol active',
    subtext: 'Pan-India Statutory',
    branches: ['pan-india', 'dl', 'mh', 'ka', 'kl', 'ts'],
    branchCoverageLabel: 'All India Branches (Mandatory)',
    coveragePercent: 100,
    isPaid: true,
    circularRef: 'Ministry of Personnel circular F.No.12/2/2025-JCA',
  },
  {
    id: '14',
    code: 'HOL-IN-2026-014',
    name: 'Milad-un-Nabi (Id-e-Milad)',
    date: '2026-08-26',
    dayOfWeek: 'Wednesday',
    monthShort: 'Aug',
    dayNum: '26',
    type: 'gazetted',
    typeLabel: 'Gazetted Holiday',
    notes: 'Birthday of Prophet Muhammad (PBUH)',
    subtext: 'Pan-India Coverage',
    branches: ['pan-india', 'dl', 'mh', 'ka', 'kl', 'ts'],
    branchCoverageLabel: 'All India Branches (100%)',
    coveragePercent: 100,
    isPaid: true,
    circularRef: 'Ministry of Personnel circular F.No.12/2/2025-JCA',
  },
  {
    id: '15',
    code: 'HOL-IN-2026-015',
    name: 'Raksha Bandhan',
    date: '2026-08-28',
    dayOfWeek: 'Friday',
    monthShort: 'Aug',
    dayNum: '28',
    type: 'restricted',
    typeLabel: 'Restricted Holiday',
    notes: 'Optional cultural observance for northern & central hubs',
    subtext: 'Optional Roster Choice',
    branches: ['dl', 'mh'],
    branchCoverageLabel: '2 Hubs Active (40%)',
    coveragePercent: 40,
    isPaid: true,
    circularRef: 'Ministry of Personnel circular F.No.12/2/2025-JCA',
  },
  {
    id: '16',
    code: 'HOL-IN-2026-016',
    name: 'Janmashtami (Vaishnava)',
    date: '2026-09-04',
    dayOfWeek: 'Friday',
    monthShort: 'Sep',
    dayNum: '04',
    type: 'restricted',
    typeLabel: 'Restricted Holiday',
    notes: 'Religious holiday observance • Optional roster allocation',
    subtext: 'Regional Observance Hubs',
    branches: ['dl', 'mh', 'ka'],
    branchCoverageLabel: '3 Hubs Active (60%)',
    coveragePercent: 60,
    isPaid: true,
    circularRef: 'Ministry of Personnel circular F.No.12/2/2025-JCA',
  },
  {
    id: '17',
    code: 'HOL-IN-2026-017',
    name: 'Ganesh Chaturthi',
    date: '2026-09-15',
    dayOfWeek: 'Tuesday',
    monthShort: 'Sep',
    dayNum: '15',
    type: 'restricted',
    typeLabel: 'Restricted Holiday',
    notes: 'Festival observance for western and regional operations',
    subtext: 'Optional Roster Choice',
    branches: ['mh', 'ka'],
    branchCoverageLabel: '2 Hubs Active (40%)',
    coveragePercent: 40,
    isPaid: true,
    circularRef: 'Ministry of Personnel circular F.No.12/2/2025-JCA',
  },
  {
    id: '18',
    code: 'HOL-IN-2026-018',
    name: 'Mahatma Gandhi Jayanti',
    date: '2026-10-02',
    dayOfWeek: 'Friday',
    monthShort: 'Oct',
    dayNum: '02',
    type: 'gazetted',
    typeLabel: 'Gazetted National',
    notes: 'National Holiday observance • All dispatch consulates offline',
    subtext: 'Pan-India Statutory',
    branches: ['pan-india', 'dl', 'mh', 'ka', 'kl', 'ts'],
    branchCoverageLabel: 'All India Branches (Mandatory)',
    coveragePercent: 100,
    isPaid: true,
    circularRef: 'Ministry of Personnel circular F.No.12/2/2025-JCA',
  },
  {
    id: '19',
    code: 'HOL-IN-2026-019',
    name: 'Dussehra (Vijay Dashami)',
    date: '2026-10-20',
    dayOfWeek: 'Tuesday',
    monthShort: 'Oct',
    dayNum: '20',
    type: 'gazetted',
    typeLabel: 'Gazetted Holiday',
    notes: 'Gazetted cultural holiday • Celebrated across state branches',
    subtext: 'Pan-India Coverage',
    branches: ['pan-india', 'dl', 'mh', 'ka', 'kl', 'ts'],
    branchCoverageLabel: 'All India Branches (100%)',
    coveragePercent: 100,
    isPaid: true,
    circularRef: 'Ministry of Personnel circular F.No.12/2/2025-JCA',
  },
  {
    id: '20',
    code: 'HOL-IN-2026-020',
    name: 'Maha Saptami / Durga Puja',
    date: '2026-10-21',
    dayOfWeek: 'Wednesday',
    monthShort: 'Oct',
    dayNum: '21',
    type: 'restricted',
    typeLabel: 'Restricted Holiday',
    notes: 'Extended festive celebration observance for regional teams',
    subtext: 'Optional Roster Choice',
    branches: ['dl', 'mh', 'ts'],
    branchCoverageLabel: '3 Hubs Active (60%)',
    coveragePercent: 60,
    isPaid: true,
    circularRef: 'Ministry of Personnel circular F.No.12/2/2025-JCA',
  },
  {
    id: '21',
    code: 'HOL-IN-2026-021',
    name: 'Karva Chauth',
    date: '2026-11-01',
    dayOfWeek: 'Sunday',
    monthShort: 'Nov',
    dayNum: '01',
    type: 'restricted',
    typeLabel: 'Restricted Holiday',
    notes: 'Cultural observance for northern branch workforce',
    subtext: 'Optional Roster Choice',
    branches: ['dl'],
    branchCoverageLabel: '1 Hub Active (20%)',
    coveragePercent: 20,
    isPaid: true,
    circularRef: 'Ministry of Personnel circular F.No.12/2/2025-JCA',
  },
  {
    id: '22',
    code: 'HOL-IN-2026-022',
    name: 'Diwali (Deepavali)',
    date: '2026-11-08',
    dayOfWeek: 'Sunday',
    monthShort: 'Nov',
    dayNum: '08',
    type: 'gazetted',
    typeLabel: 'Gazetted Holiday',
    notes: 'National Festival of Lights • Central Gazetted holiday',
    subtext: 'Pan-India Coverage',
    branches: ['pan-india', 'dl', 'mh', 'ka', 'kl', 'ts'],
    branchCoverageLabel: 'All India Branches (100%)',
    coveragePercent: 100,
    isPaid: true,
    circularRef: 'Ministry of Personnel circular F.No.12/2/2025-JCA',
  },
  {
    id: '23',
    code: 'HOL-IN-2026-023',
    name: 'Govardhan Puja',
    date: '2026-11-09',
    dayOfWeek: 'Monday',
    monthShort: 'Nov',
    dayNum: '09',
    type: 'restricted',
    typeLabel: 'Restricted Holiday',
    notes: 'Post-Diwali observance • Regional holiday options',
    subtext: 'Optional Roster Choice',
    branches: ['dl', 'mh'],
    branchCoverageLabel: '2 Hubs Active (40%)',
    coveragePercent: 40,
    isPaid: true,
    circularRef: 'Ministry of Personnel circular F.No.12/2/2025-JCA',
  },
  {
    id: '24',
    code: 'HOL-IN-2026-024',
    name: 'Bhai Dooj',
    date: '2026-11-11',
    dayOfWeek: 'Wednesday',
    monthShort: 'Nov',
    dayNum: '11',
    type: 'restricted',
    typeLabel: 'Restricted Holiday',
    notes: 'Cultural observance for northern operations',
    subtext: 'Optional Roster Choice',
    branches: ['dl', 'ts'],
    branchCoverageLabel: '2 Hubs Active (40%)',
    coveragePercent: 40,
    isPaid: true,
    circularRef: 'Ministry of Personnel circular F.No.12/2/2025-JCA',
  },
  {
    id: '25',
    code: 'HOL-IN-2026-025',
    name: 'Guru Nanak Jayanti',
    date: '2026-11-24',
    dayOfWeek: 'Tuesday',
    monthShort: 'Nov',
    dayNum: '24',
    type: 'gazetted',
    typeLabel: 'Gazetted Holiday',
    notes: 'Religious holiday observance • Major northern & western hub observance',
    subtext: 'Major Node Closure',
    branches: ['dl', 'mh', 'ka', 'ts'],
    branchCoverageLabel: '4 Hubs Active (80%)',
    coveragePercent: 80,
    isPaid: true,
    circularRef: 'Ministry of Personnel circular F.No.12/2/2025-JCA',
  },
  {
    id: '26',
    code: 'HOL-IN-2026-026',
    name: 'Christmas Day',
    date: '2026-12-25',
    dayOfWeek: 'Friday',
    monthShort: 'Dec',
    dayNum: '25',
    type: 'gazetted',
    typeLabel: 'Gazetted National',
    notes: 'Christian celebration • Pan-India statutory closure',
    subtext: 'Pan-India Mandatory',
    branches: ['pan-india', 'dl', 'mh', 'ka', 'kl', 'ts'],
    branchCoverageLabel: 'All India Branches (100%)',
    coveragePercent: 100,
    isPaid: true,
    circularRef: 'Ministry of Personnel circular F.No.12/2/2025-JCA',
  },
]

export function PublicHolidays() {
  const currentYear = new Date().getFullYear()

  const [holidays, setHolidays] = useState<PublicHolidayItem[]>([])
  const [_loading, setLoading] = useState(true)

  const [activeTab, setActiveTab] = useState<
    'all' | 'gazetted' | 'restricted' | 'regional' | 'matrix'
  >('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [selectedHolidayId, setSelectedHolidayId] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10))
  const [formClassification, setFormClassification] = useState<'gazetted' | 'restricted'>('gazetted')

  const formSectionRef = useRef<HTMLDivElement>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 4000)
  }

  const loadHolidays = async () => {
    setLoading(true)
    try {
      // 1. Fetch official holidays
      let officialData: any[] | null = null
      let officialError: any = null

      try {
        const result = await supabase
          .from('official_public_holidays')
          .select('*')
          .eq('source_year', currentYear)
          .eq('jurisdiction', 'kerala')

        officialData = result.data
        officialError = result.error
      } catch (e) {
        officialError = e
      }

      if (officialError) {
        // PGRST205 means table doesn't exist yet, handle gracefully
        if (officialError.code === 'PGRST205') {
          console.warn('official_public_holidays table not found. Falling back to static data.')
          officialData = []
        } else {
          throw officialError
        }
      }

      // Automatically sync if missing
      if (!officialData || officialData.length === 0) {
        console.log('No official holidays found for current year. Attempting to sync...')
        try {
          await supabase.functions.invoke('sync-official-holidays', {
            body: { year: currentYear, jurisdiction: 'kerala' }
          })

          const retry = await supabase
            .from('official_public_holidays')
            .select('*')
            .eq('source_year', currentYear)
            .eq('jurisdiction', 'kerala')

          if (!retry.error && retry.data) {
            officialData = retry.data
          }
        } catch (syncError) {
          console.error('Failed to automatically sync official holidays:', syncError)
        }
      }

      // 2. Fetch company holidays
      const startDate = `${currentYear}-01-01`
      const endDate = `${currentYear}-12-31`

      let companyData: any[] | null = null
      let companyError: any = null

      try {
        const result = await supabase
          .from('public_holidays')
          .select(`
            *,
            public_holiday_branches (branch_code)
          `)
          .gte('holiday_date', startDate)
          .lte('holiday_date', endDate)
          .order('holiday_date', { ascending: true })

        companyData = result.data
        companyError = result.error
      } catch (e) {
        companyError = e
      }

      if (companyError) {
        if (companyError.code === 'PGRST205') {
          console.warn('public_holidays table not found. Falling back to static data.')
          companyData = []
        } else {
          throw companyError
        }
      }

      // 3. Map official holidays
      const mappedOfficial: PublicHolidayItem[] = (officialData || []).map(h => {
        const d = new Date(`${h.holiday_date}T00:00:00`)
        return {
          id: h.id,
          code: h.holiday_code,
          name: h.holiday_name,
          date: h.holiday_date,
          dayOfWeek: d.toLocaleDateString('en-US', { weekday: 'long' }),
          monthShort: d.toLocaleDateString('en-US', { month: 'short' }),
          dayNum: String(d.getDate()).padStart(2, '0'),
          type: h.holiday_type as 'gazetted' | 'restricted',
          typeLabel: h.holiday_type === 'gazetted' ? 'Gazetted National' : 'Restricted Holiday',
          notes: h.notes || '',
          subtext: h.holiday_type === 'gazetted' ? 'Mandatory Statutory Closure' : 'Optional Roster Choice',
          branches: ['kl'],
          branchCoverageLabel: 'All India Branches (100%)',
          coveragePercent: 100,
          isPaid: h.is_paid,
          circularRef: h.source_url || h.source_name || '',
          isDraft: false,
          sourceType: 'official'
        }
      })

      // 4. Map company holidays
      const mappedCompany: PublicHolidayItem[] = (companyData || []).map(h => {
        const d = new Date(`${h.holiday_date}T00:00:00`)

        let branches: string[] = []
        if (h.public_holiday_branches && Array.isArray(h.public_holiday_branches)) {
          branches = h.public_holiday_branches.map((b: any) => b.branch_code)
        }

        const ALL_BRANCHES = ['dl', 'mh', 'ka', 'kl', 'ts']
        const hasAll = ALL_BRANCHES.every(b => branches.includes(b))
        if (hasAll) branches.push('pan-india')

        const validCount = branches.filter(b => b !== 'pan-india').length
        const coveragePercent = (validCount / 5) * 100

        let branchCoverageLabel = 'No Branches Assigned (0%)'
        if (validCount === 5) branchCoverageLabel = 'All India Branches (100%)'
        else if (validCount > 0) branchCoverageLabel = `${validCount} Hubs Active (${coveragePercent}%)`
        else if (validCount === 1) branchCoverageLabel = `1 Hub Active (20%)`

        return {
          id: h.id,
          code: h.holiday_code || '',
          name: h.holiday_name,
          date: h.holiday_date,
          dayOfWeek: d.toLocaleDateString('en-US', { weekday: 'long' }),
          monthShort: d.toLocaleDateString('en-US', { month: 'short' }),
          dayNum: String(d.getDate()).padStart(2, '0'),
          type: h.holiday_type as 'gazetted' | 'restricted',
          typeLabel: h.holiday_type === 'gazetted' ? 'Gazetted National' : 'Restricted Holiday',
          notes: h.notes || '',
          subtext: h.holiday_type === 'gazetted' ? 'Mandatory Statutory Closure' : 'Optional Roster Choice',
          branches,
          branchCoverageLabel,
          coveragePercent,
          isPaid: h.is_paid,
          circularRef: '',
          isDraft: h.status === 'draft',
          sourceType: 'company'
        }
      })

      const combined = [...mappedOfficial, ...mappedCompany].sort((a, b) => a.date.localeCompare(b.date))

      const uniqueHolidays: PublicHolidayItem[] = []
      const seen = new Set()

      for (const h of combined) {
        const key = `${h.date}-${h.name.toLowerCase()}`
        if (!seen.has(key)) {
          seen.add(key)
          uniqueHolidays.push(h)
        } else {
          if (h.sourceType === 'official') {
            const existingIdx = uniqueHolidays.findIndex(existing => `${existing.date}-${existing.name.toLowerCase()}` === key)
            if (existingIdx !== -1 && uniqueHolidays[existingIdx].sourceType === 'company') {
              uniqueHolidays[existingIdx] = h
            }
          }
        }
      }

      const finalHolidays = uniqueHolidays.length > 0
        ? uniqueHolidays
        : INITIAL_HOLIDAYS.map(h => ({ ...h, sourceType: 'official' } as PublicHolidayItem))

      setHolidays(finalHolidays)
      if (finalHolidays.length > 0 && !selectedHolidayId) {
        setSelectedHolidayId(finalHolidays[0].id)
      }
    } catch (err: any) {
      console.error(err)
      showToast('Error loading holidays.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHolidays()
  }, [currentYear])

  const formDayOfWeek = useMemo(() => {
    if (!formDate) return 'Select Date'
    try {
      const parsed = new Date(`${formDate}T00:00:00`)
      return parsed.toLocaleDateString('en-US', { weekday: 'long' })
    } catch {
      return 'Unknown'
    }
  }, [formDate])

  const stats = useMemo(() => {
    const total = holidays.length
    const gazettedCount = holidays.filter((h) => h.type === 'gazetted').length
    const restrictedCount = holidays.filter((h) => h.type === 'restricted').length

    const todayStr = new Date().toISOString().slice(0, 10)
    const upcoming =
      holidays
        .filter((h) => h.date >= todayStr)
        .sort((a, b) => a.date.localeCompare(b.date))[0] || holidays[17]

    let daysRemaining = 0
    if (upcoming) {
      const targetTime = new Date(`${upcoming.date}T00:00:00`).getTime()
      const nowTime = new Date(`${todayStr}T00:00:00`).getTime()
      daysRemaining = Math.max(
        0,
        Math.ceil((targetTime - nowTime) / (1000 * 60 * 60 * 24))
      )
    }

    return {
      total,
      gazettedCount,
      restrictedCount,
      upcoming,
      daysRemaining: daysRemaining || 0,
    }
  }, [holidays])

  const filteredHolidays = useMemo(() => {
    return holidays.filter((item) => {
      if (activeTab === 'gazetted' && item.type !== 'gazetted') return false
      if (activeTab === 'restricted' && item.type !== 'restricted') return false

      if (activeTab === 'regional' && item.coveragePercent === 100) {
        return false
      }

      if (typeFilter && item.type !== typeFilter) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesName = item.name.toLowerCase().includes(q)
        const matchesCode = item.code.toLowerCase().includes(q)
        const matchesDate = item.date.includes(q)
        const matchesNotes = item.notes.toLowerCase().includes(q)
        const matchesType = item.typeLabel.toLowerCase().includes(q)

        if (
          !matchesName &&
          !matchesCode &&
          !matchesDate &&
          !matchesNotes &&
          !matchesType
        ) {
          return false
        }
      }

      return true
    })
  }, [holidays, activeTab, typeFilter, searchQuery])

  const totalPages = Math.max(
    1,
    Math.ceil(filteredHolidays.length / itemsPerPage)
  )

  const paginatedHolidays = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredHolidays.slice(start, start + itemsPerPage)
  }, [filteredHolidays, currentPage, itemsPerPage])

  const handleStartEdit = (item: PublicHolidayItem) => {
    if (item.sourceType === 'official') return
    setEditingId(item.id)
    setFormName(item.name)
    setFormDate(item.date)
    setFormClassification(item.type)
    setSelectedHolidayId(item.id)

    formSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleResetForm = () => {
    setEditingId(null)
    setFormName('')
    setFormDate(new Date().toISOString().slice(0, 10))
    setFormClassification('gazetted')
  }

  const handleSubmitHoliday = async () => {
    if (!formName.trim()) {
      showToast('Please specify a valid Holiday Name / Occasion.')
      return
    }

    if (!formDate) {
      showToast('Please select a valid date for the holiday.')
      return
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from('public_holidays')
          .update({
            holiday_name: formName.trim(),
            holiday_date: formDate,
            holiday_type: formClassification,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId)

        if (error) throw error
        showToast(`Successfully updated ${formName.trim()}!`)
      } else {
        const companyHolidays = holidays.filter(h => h.sourceType === 'company')
        const newCodeNum = companyHolidays.length + 1
        const newCode = `HOL-IN-${currentYear}-${String(newCodeNum).padStart(3, '0')}`

        const { data: inserted, error } = await supabase
          .from('public_holidays')
          .insert({
            holiday_code: newCode,
            holiday_name: formName.trim(),
            holiday_date: formDate,
            holiday_type: formClassification,
            is_paid: true,
            status: 'published',
            notes: formClassification === 'gazetted' ? 'Mandatory central statutory closure across operations' : 'Optional roster choice for regional hubs'
          })
          .select()
          .single()

        if (error) throw error

        const ALL_BRANCHES = ['dl', 'mh', 'ka', 'kl', 'ts']
        const branchRecords = ALL_BRANCHES.map(b => ({
          holiday_id: inserted.id,
          branch_code: b
        }))

        const { error: branchesError } = await supabase
          .from('public_holiday_branches')
          .insert(branchRecords)

        if (branchesError) throw branchesError

        showToast(`Successfully declared & published "${formName.trim()}"!`)
      }

      handleResetForm()
      await loadHolidays()

    } catch (error: any) {
      console.error(error)
      showToast('An error occurred while saving the holiday.')
    }
  }

  const handleExportSchedule = () => {
    const header = [
      'Code',
      'Name',
      'Date',
      'Day',
      'Classification',
      'Branches Covered',
      'Paid Status',
      'Gazetted Circular Ref',
    ]

    const csvRows = [header.join(',')]

    holidays.forEach((h) => {
      const row = [
        `"${h.code}"`,
        `"${h.name}"`,
        `"${h.date}"`,
        `"${h.dayOfWeek}"`,
        `"${h.typeLabel}"`,
        `"${h.branchCoverageLabel}"`,
        `"${h.isPaid ? 'Paid' : 'Unpaid'}"`,
        `"${h.circularRef.replace(/"/g, '""')}"`,
      ]

      csvRows.push(row.join(','))
    })

    const blob = new Blob(
      [csvRows.join('\n')],
      { type: 'text/csv;charset=utf-8;' }
    )

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute(
      'download',
      `SkyTrack_Indian_Public_Holidays_${currentYear}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    showToast(
      `Exported official ${currentYear} Holiday Schedule (CSV) successfully.`
    )
  }

  return (
    <main className="relative w-full pt-28 px-8 pb-16 min-h-screen">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <span className="material-symbols-outlined text-emerald-400 text-xl">
            check_circle
          </span>
          <span className="text-xs font-semibold">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">
              close
            </span>
          </button>
        </div>
      )}

      <div className="flex flex-col w-full gap-8 max-w-[1600px] mx-auto">
        {/* Page Header & Action Buttons */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-brand-600 font-bold text-xs uppercase tracking-wider mb-1.5">
              <span className="material-symbols-outlined text-[18px]">
                verified
              </span>
              <span>
                Skypass Visa Global Operations • Workforce Compliance
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Public Holidays Management
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-0.5">
              Configure and publish gazetted national holidays, regional
              festival observances, and restricted holidays for Indian
              branches &amp; operations ({currentYear} calendar year).
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleExportSchedule}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/90 hover:bg-white text-slate-700 font-semibold text-xs border border-slate-200/80 shadow-sm transition-all cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px] text-slate-500">
                calendar_month
              </span>
              <span>Export Holiday Schedule</span>
            </button>

            <button
              onClick={() => {
                handleResetForm()
                formSectionRef.current?.scrollIntoView({
                  behavior: 'smooth',
                })
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-semibold text-xs shadow-glow-red transition-all cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">
                add_circle
              </span>
              <span>Declare New Holiday</span>
            </button>
          </div>
        </div>

        {/* Bento Metric Glass Pods (3-Card Style matching updated specification) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Gazetted Holidays */}
          <div className="relative overflow-hidden bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-glass border border-white/80 flex flex-col justify-between group hover:shadow-floating transition-all">
            <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-brand-500/10 blur-xl pointer-events-none"></div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-600">
                Gazetted Holidays
              </span>

              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-500"></span>
              </span>
            </div>

            <div className="my-4 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                {stats.gazettedCount}
              </span>
              <span className="text-sm font-semibold text-slate-400">
                Mandatory Closed Days
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-brand-600 text-xs font-semibold bg-brand-50 border border-brand-100/70 px-3 py-1.5 rounded-xl">
              <span className="material-symbols-outlined text-[16px]">
                priority_high
              </span>
              <span>
                Mandatory central leave compliance across all India nodes
              </span>
            </div>
          </div>

          {/* Card 2: Restricted / Optional */}
          <div className="relative overflow-hidden bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-glass border border-white/80 flex flex-col justify-between hover:shadow-floating transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Restricted / Optional
              </span>

              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">
                  check_circle
                </span>
              </div>
            </div>

            <div className="my-4 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                {stats.restrictedCount}
              </span>
              <span className="text-sm font-medium text-slate-400">
                Optional Roster Choices
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Max 2 selectable per employee roster</span>

              <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: '50%' }}
                ></div>
              </div>
            </div>
          </div>

          {/* Card 3: Upcoming Holiday */}
          <div className="relative overflow-hidden bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-glass border border-white/80 flex flex-col justify-between hover:shadow-floating transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Upcoming Holiday
              </span>

              <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">
                  event_upcoming
                </span>
              </div>
            </div>

            <div className="my-4 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                {stats.upcoming
                  ? `${stats.upcoming.monthShort} ${stats.upcoming.dayNum}`
                  : 'Oct 02'}
              </span>

              <span className="text-sm font-bold text-slate-700 truncate max-w-[140px]">
                {stats.upcoming?.name || 'Gandhi Jayanti'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>
                {stats.upcoming?.typeLabel || 'National Holiday'}
              </span>

              <span className="px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-600 font-bold text-[11px] border border-brand-100">
                {stats.daysRemaining} days remaining
              </span>
            </div>
          </div>
        </div>

        {/* Modern Tabs & Filter Bar */}
        <div className="flex flex-col gap-4">
          {/* Sleek Pill Tabs */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="inline-flex items-center p-1.5 bg-[#181d27] rounded-full shadow-dock">
              <button
                onClick={() => {
                  setActiveTab('all')
                  setCurrentPage(1)
                }}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${activeTab === 'all'
                    ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-glow-red'
                    : 'text-slate-300 hover:text-white'
                  }`}
                type="button"
              >
                <span>All Holidays</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${activeTab === 'all'
                      ? 'bg-white text-brand-600'
                      : 'bg-slate-700 text-slate-200'
                    }`}
                >
                  {stats.total}
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('gazetted')
                  setCurrentPage(1)
                }}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${activeTab === 'gazetted'
                    ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-glow-red font-bold'
                    : 'text-slate-300 hover:text-white'
                  }`}
                type="button"
              >
                <span>Gazetted National</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'gazetted'
                      ? 'bg-white text-brand-600 font-extrabold'
                      : 'bg-slate-700 text-slate-200'
                    }`}
                >
                  {stats.gazettedCount}
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('restricted')
                  setCurrentPage(1)
                }}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${activeTab === 'restricted'
                    ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-glow-red font-bold'
                    : 'text-slate-300 hover:text-white'
                  }`}
                type="button"
              >
                <span>Restricted / Optional</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'restricted'
                      ? 'bg-white text-brand-600 font-extrabold'
                      : 'bg-slate-700 text-slate-200'
                    }`}
                >
                  {stats.restrictedCount}
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('regional')
                  setCurrentPage(1)
                }}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${activeTab === 'regional'
                    ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-glow-red font-bold'
                    : 'text-slate-300 hover:text-white'
                  }`}
                type="button"
              >
                <span>Regional Observances</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('matrix')
                  setCurrentPage(1)
                }}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${activeTab === 'matrix'
                    ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-glow-red font-bold'
                    : 'text-slate-300 hover:text-white'
                  }`}
                type="button"
              >
                <span>Holiday Calendar Matrix</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-200/60 shadow-sm">
              <span className="material-symbols-outlined text-[16px] text-emerald-500">
                verified_user
              </span>
              <span>
                Auto-synced with Indian Gazetted Holiday &amp; State Labor
                Circulars 2026
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider ml-1">
                Verified Active
              </span>
            </div>
          </div>

          {/* Glass Filter Toolbar */}
          <div className="p-3 bg-white/80 backdrop-blur-xl rounded-2xl border border-white/80 shadow-glass flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 rounded-xl flex-1 max-w-md border border-slate-200/60 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 transition-all">
              <span className="material-symbols-outlined text-slate-400 text-[18px]">
                search
              </span>

              <input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="bg-transparent w-full focus:outline-none text-xs font-medium text-slate-800 placeholder:text-slate-400"
                placeholder="Search holiday name, date (e.g. Diwali, Republic Day, 2026-10-20)..."
                type="text"
              />

              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">
                    close
                  </span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="relative">
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="appearance-none bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 text-slate-700 pl-3.5 pr-8 py-2 rounded-xl text-xs font-semibold focus:outline-none cursor-pointer transition-colors"
                >
                  <option value="">Type: All Types</option>
                  <option value="gazetted">
                    Gazetted National (Mandatory)
                  </option>
                  <option value="restricted">
                    Restricted Holiday (Optional)
                  </option>
                </select>

                <span className="material-symbols-outlined absolute right-2.5 top-2.5 pointer-events-none text-slate-400 text-[16px]">
                  expand_more
                </span>
              </div>

              {(searchQuery || typeFilter) && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setTypeFilter('')
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition-colors cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    clear_all
                  </span>
                  <span>Clear Filters</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Calendar Matrix View Mode */}
        {activeTab === 'matrix' ? (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-7 shadow-glass border border-white/80 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {currentYear} Annual Indian Public Holiday Matrix
                </h3>

                <p className="text-xs text-slate-500 mt-0.5">
                  Chronological distribution of gazetted statutory closures
                  and optional roster days across quarters.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-500"></span>
                  Gazetted (Mandatory)
                </span>

                <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  Restricted / Optional
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                'Q1 (Jan - Mar)',
                'Q2 (Apr - Jun)',
                'Q3 (Jul - Sep)',
                'Q4 (Oct - Dec)',
              ].map((quarter, qIdx) => {
                const qMonths = [
                  ['01', '02', '03'],
                  ['04', '05', '06'],
                  ['07', '08', '09'],
                  ['10', '11', '12'],
                ][qIdx]

                const qHolidays = holidays.filter((h) =>
                  qMonths.includes(h.date.split('-')[1])
                )

                return (
                  <div
                    key={quarter}
                    className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70 flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                      <span className="text-xs font-bold text-slate-800">
                        {quarter}
                      </span>

                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                        {qHolidays.length} Days
                      </span>
                    </div>

                    <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
                      {qHolidays.map((h) => (
                        <div
                          key={h.id}
                          onClick={() => setSelectedHolidayId(h.id)}
                          className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${selectedHolidayId === h.id
                              ? 'bg-brand-50 border-brand-300 ring-2 ring-brand-500/20'
                              : 'bg-white border-slate-200/60 hover:bg-slate-100/70'
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 truncate">
                              {h.name}
                            </span>

                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${h.type === 'gazetted'
                                  ? 'bg-brand-100 text-brand-700'
                                  : 'bg-emerald-100 text-emerald-700'
                                }`}
                            >
                              {h.monthShort} {h.dayNum}
                            </span>
                          </div>

                          <span className="text-[11px] text-slate-400 block mt-0.5 truncate">
                            {h.dayOfWeek} • {h.branchCoverageLabel}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}

        {/* Primary Workspace */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          {/* Left Column: Schedule Table */}
          <div className="xl:col-span-8 bg-white/80 backdrop-blur-xl rounded-3xl shadow-glass border border-white/80 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-base font-bold text-slate-900">
                  Official Indian Holiday Schedule ({currentYear})
                </span>

                <span className="px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-600 border border-brand-100 text-xs font-bold">
                  {stats.gazettedCount} Gazetted • {stats.restrictedCount} Restricted
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <span>Sort by:</span>
                <span className="text-brand-600 font-bold flex items-center">
                  Earliest Upcoming
                  <span className="material-symbols-outlined text-[16px]">
                    arrow_drop_down
                  </span>
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Date / Code</th>
                    <th className="px-4 py-3.5">Holiday Details</th>
                    <th className="px-4 py-3.5">Classification &amp; Notes</th>
                    <th className="px-4 py-3.5">Branch Coverage</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100/80">
                  {paginatedHolidays.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-slate-400"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <span className="material-symbols-outlined text-4xl text-slate-300">
                            event_busy
                          </span>

                          <span className="text-sm font-semibold text-slate-600">
                            No holidays found matching your filters.
                          </span>

                          <button
                            onClick={() => {
                              setSearchQuery('')
                              setTypeFilter('')
                              setActiveTab('all')
                            }}
                            className="mt-1 text-xs text-brand-600 font-bold hover:underline cursor-pointer"
                          >
                            Reset filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedHolidays.map((holiday) => {
                      const isSelected = selectedHolidayId === holiday.id
                      const isGazetted = holiday.type === 'gazetted'

                      return (
                        <tr
                          key={holiday.id}
                          onClick={() => setSelectedHolidayId(holiday.id)}
                          className={`transition-colors cursor-pointer ${isSelected
                              ? 'bg-brand-50/40 hover:bg-brand-50/70'
                              : 'hover:bg-slate-50/70'
                            }`}
                        >
                          <td className="px-6 py-4 align-top">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center font-bold flex-shrink-0 ${isGazetted
                                    ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-glow-red'
                                    : 'bg-slate-100 text-slate-800'
                                  }`}
                              >
                                <span className="text-[10px] uppercase leading-none font-bold">
                                  {holiday.monthShort}
                                </span>

                                <span className="text-sm font-extrabold leading-none mt-0.5">
                                  {holiday.dayNum}
                                </span>
                              </div>

                              <div className="flex flex-col">
                                <span
                                  className={`font-bold font-mono text-xs ${isSelected
                                      ? 'text-brand-600'
                                      : 'text-slate-700'
                                    }`}
                                >
                                  {holiday.code}
                                </span>

                                <span className="text-slate-400 mt-0.5 text-[11px]">
                                  {holiday.dayOfWeek}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4 align-top">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 text-sm leading-tight">
                                {holiday.name}
                                {holiday.isDraft && (
                                  <span className="ml-2 px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                                    Draft
                                  </span>
                                )}
                              </span>

                              <span className="text-slate-400 text-xs font-medium mt-0.5">
                                {holiday.notes}
                              </span>

                              <span className="text-slate-500 font-semibold text-[11px] mt-0.5">
                                {holiday.circularRef}
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-4 align-top">
                            <div className="flex flex-col gap-1">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold w-fit ${holiday.type === 'gazetted'
                                    ? 'bg-brand-100 text-brand-700'
                                    : 'bg-slate-100 text-slate-700'
                                  }`}
                              >
                                {holiday.typeLabel}
                              </span>

                              <span className="text-slate-500 text-[11px]">
                                {holiday.subtext}
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-4 align-top">
                            <div className="flex flex-col gap-1.5 min-w-[140px]">
                              <div
                                className={`flex items-center justify-between text-[11px] font-semibold ${holiday.coveragePercent === 100
                                    ? 'text-emerald-700'
                                    : 'text-slate-600'
                                  }`}
                              >
                                <span className="flex items-center gap-1">
                                  {holiday.coveragePercent === 100 && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  )}
                                  {holiday.branchCoverageLabel}
                                </span>

                                {holiday.coveragePercent < 100 && (
                                  <span className="text-slate-400">
                                    {Math.round(
                                      (holiday.coveragePercent / 100) * 5
                                    )}
                                    /5
                                  </span>
                                )}
                              </div>

                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${holiday.coveragePercent === 100
                                      ? 'bg-emerald-500'
                                      : 'bg-brand-500'
                                    }`}
                                  style={{
                                    width: `${holiday.coveragePercent}%`,
                                  }}
                                ></div>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4 align-top text-right">
                            <div
                              className="flex items-center justify-end gap-1.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => { if (holiday.sourceType !== 'official') handleStartEdit(holiday); }}
                                className="p-2 rounded-xl bg-white border border-slate-200/70 hover:bg-slate-50 text-slate-600 transition-colors shadow-sm cursor-pointer"
                                title="Edit Holiday"
                                type="button"
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  edit
                                </span>
                              </button>

                              <button
                                onClick={() => {
                                  if (holiday.sourceType === 'official') return;
                                  if (window.confirm(`Are you sure you want to remove "${holiday.name}" from the ${currentYear} holiday calendar?`)) {
                                    supabase.from('public_holidays').delete().eq('id', holiday.id).then(({ error }) => {
                                      if (error) {
                                        showToast('Error deleting holiday.');
                                      } else {
                                        showToast(`Removed "${holiday.name}".`);
                                        loadHolidays();
                                      }
                                    });
                                  }
                                }}
                                className="p-2 rounded-xl bg-white border border-slate-200/70 hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={holiday.sourceType === 'official'}
                                title="Delete Holiday"
                                type="button"
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  delete
                                </span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 bg-slate-50/60 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
              <span>
                Showing{' '}
                {filteredHolidays.length === 0
                  ? 0
                  : (currentPage - 1) * itemsPerPage + 1}{' '}
                to{' '}
                {Math.min(
                  currentPage * itemsPerPage,
                  filteredHolidays.length
                )}{' '}
                of {filteredHolidays.length} declared holidays
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-7 h-7 rounded-lg bg-white border border-slate-200/70 text-slate-400 flex items-center justify-center hover:text-slate-700 disabled:opacity-40 cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    chevron_left
                  </span>
                </button>

                {Array.from({ length: totalPages }).map((_, i) => {
                  const pNum = i + 1
                  const isCurrent = pNum === currentPage

                  return (
                    <button
                      key={pNum}
                      onClick={() => setCurrentPage(pNum)}
                      className={`w-7 h-7 rounded-lg font-bold flex items-center justify-center transition-colors cursor-pointer ${isCurrent
                          ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-sm'
                          : 'bg-white border border-slate-200/70 text-slate-600 hover:bg-slate-100 font-semibold'
                        }`}
                      type="button"
                    >
                      {pNum}
                    </button>
                  )
                })}

                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="w-7 h-7 rounded-lg bg-white border border-slate-200/70 text-slate-400 flex items-center justify-center hover:text-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    chevron_right
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Declare / Edit Public Holiday Form */}
          <div
            ref={formSectionRef}
            className="xl:col-span-4 flex flex-col gap-5"
          >
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-glass border border-white/80 flex flex-col gap-4">
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">
                      {editingId ? 'edit_note' : 'add_circle'}
                    </span>
                  </div>

                  <span className="text-sm font-bold text-slate-900">
                    {editingId
                      ? 'Edit Public Holiday'
                      : 'Declare Public Holiday'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {editingId && (
                    <button
                      onClick={handleResetForm}
                      className="text-[11px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer underline"
                    >
                      Cancel Edit
                    </button>
                  )}

                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px] font-bold">
                    Compliance Ready
                  </span>
                </div>
              </div>

              {/* Form Elements */}
              <div className="space-y-3.5">
                {/* Holiday Name */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Holiday Name / Occasion
                  </label>

                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/70 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all placeholder:text-slate-400"
                    placeholder="e.g. Makar Sankranti / Pongal"
                    type="text"
                  />
                </div>

                {/* Date Selector & Auto Day */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Date
                    </label>

                    <input
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200/70 px-3 py-2 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 cursor-pointer"
                      type="date"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Day of Week
                    </label>

                    <div className="bg-slate-100/90 border border-slate-200/60 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 flex items-center h-[38px]">
                      {formDayOfWeek}
                    </div>
                  </div>
                </div>

                {/* Classification Segmented Control */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Holiday Classification
                  </label>

                  <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
                    <button
                      onClick={() => setFormClassification('gazetted')}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-bold truncate transition-all cursor-pointer ${formClassification === 'gazetted'
                          ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 font-semibold'
                        }`}
                      type="button"
                    >
                      Gazetted
                    </button>

                    <button
                      onClick={() => setFormClassification('restricted')}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-bold truncate transition-all cursor-pointer ${formClassification === 'restricted'
                          ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 font-semibold'
                        }`}
                      type="button"
                    >
                      Restricted
                    </button>
                  </div>
                </div>
              </div>

              {/* Primary Action Button */}
              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  onClick={handleSubmitHoliday}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-bold text-xs shadow-glow-red hover:shadow-floating transition-all flex items-center justify-center gap-2 cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    publish
                  </span>

                  <span>
                    {editingId
                      ? 'Save Holiday Changes'
                      : 'Publish Public Holiday'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
