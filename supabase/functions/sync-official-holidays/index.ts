import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.109.0"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

serve(async (req) => {
  try {
    const { year = new Date().getFullYear(), jurisdiction = 'kerala' } = await req.json().catch(() => ({}))
    
    // Using Nager.Date as the simulated official source for holidays
    const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/IN`)
    if (!response.ok) throw new Error('Failed to fetch official holidays')
    const holidays = await response.json()
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    const records = holidays.map((h: any, index: number) => ({
      holiday_code: `OFF-${jurisdiction.toUpperCase()}-${year}-${String(index + 1).padStart(3, '0')}`,
      holiday_name: h.localName || h.name,
      holiday_date: h.date,
      holiday_type: 'gazetted',
      jurisdiction,
      country_code: 'IN',
      source_name: 'Nager.Date API',
      source_url: `https://date.nager.at/api/v3/PublicHolidays/${year}/IN`,
      source_year: year,
      is_paid: true,
      notes: 'Imported from official source',
      is_read_only: true
    }))
    
    // Upsert or insert ignoring duplicates
    const { data, error } = await supabase
      .from('official_public_holidays')
      .upsert(records, { onConflict: 'holiday_date,jurisdiction,source_year' })
      
    if (error) throw error
    
    return new Response(JSON.stringify({ success: true, count: records.length, message: 'Successfully synced official holidays' }), { headers: { 'Content-Type': 'application/json' } })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
