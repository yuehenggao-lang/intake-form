// Proxies client document uploads (one base64-encoded file per POST) to the
// Google Apps Script upload web app. See intake.js for rationale.
//
// File size note: client-upload.html caps each file at 4 MB before base64
// encoding (~5.4 MB encoded), well under Netlify's 6 MB synchronous-function
// payload limit.

const GAS_URL = 'https://script.google.com/macros/s/AKfycbw588dUZO-67p5pVapZ7kx9dN2-cGzfv1CkaK2QEICZDyT1aj61BCWB81aXsLC68lMU_w/exec';

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
