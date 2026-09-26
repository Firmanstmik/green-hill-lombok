// Supabase Edge Function entry point. SUPABASE_URL, SUPABASE_ANON_KEY and
// SUPABASE_SERVICE_ROLE_KEY are provided by Supabase at run time; the service
// key is never sent to the browser or stored in this repository.
import { handle } from './handler.ts';

Deno.serve((request) =>
  handle(request, {
    url: Deno.env.get('SUPABASE_URL') ?? '',
    anonKey: Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  }),
);
