import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ipnffgyvfwtrtxskwlxp.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwbmZmZ3l2Znd0cnR4c2t3bHhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMzk3MDUsImV4cCI6MjA2ODcxNTcwNX0.5VpgBqKetQeFE7qQ_aZOeQyBj7h3YjRgDAhaOJvMFZM'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)