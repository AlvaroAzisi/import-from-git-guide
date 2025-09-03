import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vswctyplzrwjgnwxplhg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzd2N0eXBsenJ3amdud3hwbGhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2ODMyNTgsImV4cCI6MjA2NzI1OTI1OH0.eOPAUSyhLj8m9DPDcP1PASDqUP3PXWu9C5h8v1-07JM'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)