// Cloudflare Worker — email signup handler
// KV Namespace binding: SIGNUPS

const ALLOWED_ORIGIN = 'https://holdoversoftware.com';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : '',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Only handle /notify
    if (url.pathname !== '/notify') {
      return new Response('Not Found', { status: 404 });
    }

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request.headers.get('Origin')),
      });
    }

    // Only accept POST
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const origin = request.headers.get('Origin') || '';
    const redirectBase = origin || ALLOWED_ORIGIN;

    try {
      // Parse form body
      const contentType = request.headers.get('Content-Type') || '';
      let email = '';

      if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        email = (formData.get('email') || '').trim().toLowerCase();
      } else if (contentType.includes('application/json')) {
        const json = await request.json();
        email = (json.email || '').trim().toLowerCase();
      } else {
        // Try form data as default (browser forms send this)
        const formData = await request.formData();
        email = (formData.get('email') || '').trim().toLowerCase();
      }

      // Validate email format
      if (!email || !EMAIL_REGEX.test(email)) {
        return Response.redirect(`${redirectBase}/?error=invalid`, 303);
      }

      // Check for duplicate — if exists, still return success (don't reveal existence)
      const existing = await env.SIGNUPS.get(email);
      if (!existing) {
        // Store email with metadata
        const value = JSON.stringify({
          email: email,
          timestamp: new Date().toISOString(),
          source: request.headers.get('Referer') || 'direct',
          ip_country: request.cf?.country || 'unknown',
        });

        await env.SIGNUPS.put(email, value);
      }

      // Redirect back to site with success indicator
      return Response.redirect(`${redirectBase}/?subscribed=true`, 303);

    } catch (err) {
      // On unexpected error, redirect with generic error
      return Response.redirect(`${redirectBase}/?error=server`, 303);
    }
  },
};
