export async function GET(req) {
  let ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.ip || null;
  if (ip === '::1' || ip === '127.0.0.1') {
    ip = '8.8.8.8'; // fallback for local dev
  }

  // Get the token from environment variables
  const token = process.env.IPINFO_TOKEN;
  if (!token) {
    return new Response(JSON.stringify({ error: 'ipinfo.io token not set' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  const url = `https://ipinfo.io/${ip}/json?token=${token}`;

  try {
    const geoRes = await fetch(url);
    if (!geoRes.ok) {
      return new Response(JSON.stringify({ error: 'Location not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    const geo = await geoRes.json();
    const [lat, lon] = geo.loc ? geo.loc.split(',') : [null, null];

    return new Response(JSON.stringify({
      ip,
      city: geo.city || null,
      country: geo.country || null,
      region: geo.region || null,
      ll: lat && lon ? [parseFloat(lat), parseFloat(lon)] : null,
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
