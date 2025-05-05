import { supabase } from './supabase/client';

// Utility to get device info
function getDeviceInfo() {
  return navigator.userAgent;
}

// Utility to get location info from your own backend
async function getLocationInfo() {
  try {
    const res = await fetch('/api/geo');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Utility to get referrer
function getReferrer() {
  return document.referrer || null;
}

// Utility to get or generate a guest session ID
function getGuestSessionId() {
  let sessionId = localStorage.getItem('guest_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem('guest_session_id', sessionId);
  }
  return sessionId;
}

// Main event tracking function
export async function trackEvent({
  eventType,
  productId = null,
  quantity = null,
  userId = null,
  metadata = null
}) {
  const device = getDeviceInfo();
  const location = await getLocationInfo();
  const user_agent = device;
  const referrer = getReferrer();
  let guest_session_id = null;
  if (!userId) {
    guest_session_id = getGuestSessionId();
  }

  await supabase.from('user_events').insert([
    {
      user_id: userId,
      event_type: eventType,
      product_id: productId,
      quantity,
      device,
      location,
      user_agent,
      referrer,
      metadata,
      guest_session_id
    }
  ]);
}
