// Proxies the consultation intake form (周三免费咨询) submission to the Google
// Apps Script web app. Why: script.google.com is unreachable from mainland
// China; this Netlify Function is hosted on the customer-facing domain and
// forwards the body through Netlify's outbound network to GAS.
//
// SET GAS_URL below to the consult-intake-gas.js Web App deployment URL.

const GAS_URL = 'https://script.google.com/macros/s/AKfycbzsyvXscO2KIhkl-2e0gFPAV4CznjDAbfwqac3hlktEgc-jWtblKceB5ZHyNFEdyiyQdA/exec';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: 'Method Not Allowed' };
  }
  try {
    const resp = await fetch(GAS_URL, {
      method: 'POST',
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
