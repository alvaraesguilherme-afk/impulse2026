import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wdzyqmzetsvkedjjsjwi.supabase.co'
const supabaseKey = 'sb_publishable_mNqt1dukSdq-ZFG6DQHEfw_n9gjuf0z'

export const supabase = createClient(supabaseUrl, supabaseKey)