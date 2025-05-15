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
    // Try to get the real client IP from the x-forwarded-for header
    const clientIP = event.headers['x-forwarded-for']?.split(',')[0] || '';
    const geoUrl = clientIP
      ? `https://get.geojs.io/v1/ip/geo/${clientIP}.json`
      : 'https://get.geojs.io/v1/ip/geo.json';

    const resp = await fetch(geoUrl);
    if (!resp.ok) {
      // Return a graceful error JSON
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: true, message: 'Failed to fetch from geojs', status: resp.status, city: null, country_name: null })
      };
    }
    const data = await resp.json();
    // Normalize to match expected keys
    const normalized = {
      city: data.city || null,
      country_name: data.country || null,
      ...data
    };
    // Cache the result
    cache[ip] = { data: normalized, timestamp: now };
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(normalized)
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
