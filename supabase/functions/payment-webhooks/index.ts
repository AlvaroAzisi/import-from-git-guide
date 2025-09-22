import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// This is a stub function for the MVP. It simulates processing a payment webhook.
serve(async (req) => {
  console.log('Payment webhook received:', await req.json());
  return new Response(
    JSON.stringify({ message: 'Payment webhook processed' }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
