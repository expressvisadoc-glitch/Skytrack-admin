import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://cwtrrtbodqctntkpnjlv.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_hvKs5JBFtNafLUmmsD0WHw_6mWC6oEc'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
