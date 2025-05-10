export async function GET(req) {
  let ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.ip || null;
  if (ip === '::1' || ip === '127.0.0.1') {
    ip = '8.8.8.8'; // fallback for local dev
  }

  // Use ipapi.co for geo lookup
  const url = `https://ipapi.co/${ip}/json/`;

  try {
    const geoRes = await fetch(url);
    if (!geoRes.ok) {
      return new Response(JSON.stringify({ error: 'Location lookup failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const geo = await geoRes.json();
    return new Response(JSON.stringify({
      ip,
      city: geo.city || null,
      country: geo.country || null,
      region: geo.region || null,
      latitude: geo.latitude || null,
      longitude: geo.longitude || null
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Location lookup failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
