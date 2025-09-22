import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Import the function to test
import '../functions/payment-webhooks/index.ts';

Deno.test('Payment webhook test', async () => {
  const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({ test: 'data' }) });
  const res = await serve(req);
  const json = await res.json();

  assertEquals(res.status, 200);
  assertEquals(json.message, 'Payment webhook processed');
});
