// Proxies the client intake form submission to the Google Apps Script web app.
// Why: script.google.com is unreachable from mainland China; this Netlify
// Function is hosted on the customer-facing domain and forwards the body
// through Netlify's outbound network to GAS.

const GAS_URL = 'https://script.google.com/macros/s/AKfycbycvR7nQQkyKgagVUO0RE-8k9MLZFb6POYOBiBr77abyLj_9IwL_g_fqfecWmwh3viZ/exec';

exports.handler = async (event) => {
  // CORS preflight (in case we ever switch the frontend off no-cors)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders(),
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: 'Method Not Allowed' };
  }

  try {
    const resp = await fetch(GAS_URL, {
      method: 'POST',
      // GAS web apps accept text/plain to avoid CORS preflight; same as the
      // original browser request (which used no-cors and got text/plain).
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: event.body,
      redirect: 'follow'
    });
    const text = await resp.text();
    return {
      statusCode: resp.status,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      body: text || '{"ok":true}'
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: corsHeaders(),
      body: JSON.stringify({ ok: false, error: String(err && err.message || err) })
    };
  }
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}
