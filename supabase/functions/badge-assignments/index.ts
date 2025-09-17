import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  console.log('Badge assignment function triggered:', await req.json());
  return new Response(
    JSON.stringify({ message: 'Badge assignments processed' }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
