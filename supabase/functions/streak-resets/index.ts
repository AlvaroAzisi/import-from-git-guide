import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  console.log('Streak reset function triggered:', await req.json());
  return new Response(
    JSON.stringify({ message: 'Streak resets processed' }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
