import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://iatekohuyrttjohwvdfx.supabase.co'
const supabaseKey = 'sb_publishable_ziVh0AQQ47RGQ59SMiJDew_EYegmPYD'

export const supabase = createClient(supabaseUrl, supabaseKey)