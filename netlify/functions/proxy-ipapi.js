const fetch = require('node-fetch');

// In-memory cache (per serverless instance)
const cache = {};
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in ms

exports.handler = async function(event) {
  try {
    // Get client IP address
    const ip = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
    const now = Date.now();
    // Serve from cache if available and fresh
    if (cache[ip] && (now - cache[ip].timestamp < CACHE_TTL)) {
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(cache[ip].data)
      };
    }
    // Fetch from ipapi.co
    const resp = await fetch('https://ipapi.co/json/');
    if (!resp.ok) {
      // Return a graceful error JSON
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: true, message: 'Failed to fetch from ipapi.co', status: resp.status, city: null, country_name: null })
      };
    }
    const data = await resp.json();
    // Cache the result
    cache[ip] = { data, timestamp: now };
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(data)
    };
  } catch (err) {
    // Always return a valid JSON error
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: true, message: err.message, city: null, country_name: null })
    };
  }
};
