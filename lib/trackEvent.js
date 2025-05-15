import { supabase } from './supabase/client';

// Utility to get device info
function getDeviceInfo() {
  return navigator.userAgent;
}

// Utility to get location info from your own backend
async function getLocationInfo() {
  try {
    const res = await fetch('/api/proxy-ipapi');
    if (!res.ok) {
      let errorText;
      try {
        errorText = await res.text();
      } catch {
        errorText = '<unreadable>';
      }
      console.error('getLocationInfo: fetch failed', res.status, errorText);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error('getLocationInfo: fetch error', err);
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
export { getLocationInfo };

export async function trackEvent({
  eventType,
  productId = null,
  quantity = null,
  userId = null,
  metadata = null
}) {
  // Require eventType to be a non-empty, non-whitespace string
  if (!eventType || typeof eventType !== 'string' || eventType.trim() === '') {
    console.error('trackEvent: eventType is required and must be a non-empty string! Not sending event.');
    return;
  }
  const safeEventType = eventType.trim();
  const device = getDeviceInfo();
  const location = await getLocationInfo();
  console.log('trackEvent: location info', location);
  const user_agent = device;
  const referrer = getReferrer();
  let guest_session_id = null;
  if (!userId) {
    guest_session_id = getGuestSessionId();
  }

  const eventPayload = {
    user_id: userId,
    event_type: safeEventType,
    product_id: productId,
    quantity,
    device,
    location,
    user_agent,
    referrer,
    metadata,
    guest_session_id
  };

  // Google Analytics 4 (gtag.js) event tracking
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    try {
      window.gtag('event', safeEventType, {
        event_category: 'engagement',
        event_label: productId || undefined,
        value: quantity || 1,
        user_id: userId || guest_session_id,
        ...metadata
      });
    } catch (err) {
      console.warn('gtag event tracking failed:', err);
    }
  }

  const { error } = await supabase.from('user_events').insert([eventPayload]);
  if (error) {
    console.error('Supabase user_events insert error:', error, eventPayload);
  }
}
