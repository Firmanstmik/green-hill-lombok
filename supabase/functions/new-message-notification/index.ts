// Supabase Edge Function: new-message-notification
// Triggered by database webhook on INSERT into messages
// Sends email notification to the recipient (not the sender)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  type: 'INSERT';
  table: string;
  record: {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    created_at: string;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify service role authorization
    const authHeader = req.headers.get('Authorization');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!authHeader || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const token = authHeader.replace('Bearer ', '');
    if (token !== serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const payload: WebhookPayload = await req.json();
    const { conversation_id, sender_id } = payload.record;

    // Create admin Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch conversation details
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('buyer_id, seller_id, listing_id')
      .eq('id', conversation_id)
      .single();

    if (convError || !conversation) {
      console.error('Conversation not found:', convError);
      return new Response(
        JSON.stringify({ error: 'Conversation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Determine recipient (not sender)
    const recipientId = sender_id === conversation.buyer_id
      ? conversation.seller_id
      : conversation.buyer_id;

    // Rate limiting: check if we recently notified this recipient for this conversation
    // Using a simple approach: check last_message_at vs 5 min threshold
    const { data: recentMessages } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', conversation_id)
      .neq('sender_id', recipientId)
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(2);

    // If there are multiple messages in the last 5 minutes (not just this one), skip email
    if (recentMessages && recentMessages.length > 1) {
      return new Response(
        JSON.stringify({ skipped: true, reason: 'Rate limited — active conversation' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Fetch recipient email
    const { data: { user: recipientUser }, error: userError } = await supabase.auth.admin.getUserById(recipientId);

    if (userError || !recipientUser?.email) {
      console.error('Recipient not found:', userError);
      return new Response(
        JSON.stringify({ error: 'Recipient not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Fetch listing title
    const { data: property } = await supabase
      .from('properties')
      .select('title')
      .eq('id', conversation.listing_id)
      .single();

    const listingTitle = property?.title || 'a listing';

    // Determine login link based on recipient role
    const isSeller = recipientId === conversation.seller_id;
    const loginUrl = isSeller
      ? 'https://example.com/en/dashboard'
      : 'https://example.com/en/account';

    // Send email
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (resendApiKey) {
      // Send via Resend
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Green Hill <notifications@example.com>',
          to: [recipientUser.email],
          subject: `New message regarding ${listingTitle}`,
          text: `You have received a new message on Green Hill regarding "${listingTitle}".\n\nLog in to view and respond:\n${loginUrl}\n\n— Green Hill`,
        }),
      });

      if (!emailResponse.ok) {
        const errorBody = await emailResponse.text();
        console.error('Resend API error:', errorBody);
        return new Response(
          JSON.stringify({ error: 'Email delivery failed' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    } else {
      console.warn('RESEND_API_KEY not configured — email notification skipped');
    }

    return new Response(
      JSON.stringify({ success: true, recipient: recipientUser.email }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
