import { supabase } from './supabase/client';

// Utility to get device info
function getDeviceInfo() {
  return navigator.userAgent;
}

// NEW IMPLEMENTATION: Completely avoid any network requests to prevent fetch2 errors
// This function returns a static location object without making any network requests
async function getLocationInfo() {
  // Return a simple static location object
  // This avoids any potential issues with fetch or XMLHttpRequest
  return {
    city: 'Unknown',
    country_name: 'Unknown',
    ip: '0.0.0.0',
    error: false,
    message: 'Static location data'
  };

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

/**
 * Enhanced GA4-compliant event tracking function.
 * @param {Object} params
 * @param {string} params.eventType - Event type (use GA4 standard names if possible)
 * @param {string} [params.productId]
 * @param {number} [params.quantity]
 * @param {string} [params.userId]
 * @param {Object} [params.metadata]
 * @param {Array} [params.items] - Array of product items (for cart, checkout, purchase)
 * @param {number} [params.value] - Total value (for purchase, add_to_cart, etc)
 * @param {string} [params.currency] - Currency code
 * @param {string} [params.transaction_id] - Transaction/order ID (for purchase)
 */
export async function trackEvent({
  eventType,
  productId = null,
  quantity = null,
  userId = null,
  metadata = null,
  items = null,
  value = null,
  currency = 'GBP',
  transaction_id = null
}) {
  // Require eventType to be a non-empty, non-whitespace string
  if (!eventType || typeof eventType !== 'string' || eventType.trim() === '') {
    console.error('trackEvent: eventType is required and must be a non-empty string! Not sending event.');
    return;
  }
  // Map custom event names to GA4 standard names
  const ga4EventMap = {
    'product_view': 'view_item',
    'add_to_cart': 'add_to_cart',
    'cart_view': 'view_cart',
    'begin_checkout': 'begin_checkout',
    'checkout_payment_started': 'begin_checkout',
    'order_completed': 'purchase',
    'checkout_payment_success': 'purchase',
    'purchase': 'purchase',
    // Add more mappings as needed
  };
  const safeEventType = ga4EventMap[eventType.trim()] || eventType.trim();
  const device = getDeviceInfo();
  const location = await getLocationInfo();
  const user_agent = device;
  const referrer = getReferrer();
  let guest_session_id = null;
  if (!userId) {
    guest_session_id = getGuestSessionId();
  }

  // Merge event-specific fields into metadata
  const mergedMetadata = {
    ...(metadata || {}),
    ...(items ? { items } : {}),
    ...(value !== null && value !== undefined ? { value } : {}),
    ...(currency ? { currency } : {}),
    ...(transaction_id ? { transaction_id } : {})
  };

  const eventPayload = {
    user_id: userId,
    event_type: safeEventType,
    product_id: productId,
    quantity,
    device,
    location,
    user_agent,
    referrer,
    guest_session_id,
    metadata: Object.keys(mergedMetadata).length > 0 ? mergedMetadata : null
    // No items, value, currency, transaction_id at top level
  };

  // Helper to format items for GA4
  const formatGA4Items = (itemsArr) => {
    if (!Array.isArray(itemsArr)) return [];
    return itemsArr.map(item => ({
      item_id: item.id || item.productId || '',
      item_name: item.name || item.productName || '',
      quantity: item.quantity || 1,
      price: item.price || 0,
      currency: item.currency || currency,
      ...item
    }));
  };

  // Google Analytics 4 (gtag.js) event tracking
  if (
    typeof window !== 'undefined' &&
    typeof window.gtag === 'function' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    try {
      // Build GA4 payload
      let gaPayload = {
        user_id: userId || guest_session_id,
        currency,
        ...metadata
      };
      if (safeEventType === 'view_item' && items && items.length) {
        gaPayload.items = formatGA4Items(items);
      } else if (safeEventType === 'add_to_cart' && items && items.length) {
        gaPayload.items = formatGA4Items(items);
        gaPayload.value = value;
      } else if (safeEventType === 'begin_checkout' && items && items.length) {
        gaPayload.items = formatGA4Items(items);
        gaPayload.value = value;
      } else if (safeEventType === 'purchase' && items && items.length) {
        gaPayload.items = formatGA4Items(items);
        gaPayload.value = value;
        gaPayload.transaction_id = transaction_id;
      } else {
        // Fallback for other events
        gaPayload = {
          ...gaPayload,
          event_label: productId || undefined,
          value: value || quantity || 1
        };
        // Remove any parameters with a leading underscore (GA4 does not allow these)
        Object.keys(gaPayload).forEach((key) => {
          if (key.startsWith('_')) {
            delete gaPayload[key];
          }
        });
      }
      window.gtag('event', safeEventType, gaPayload);
    } catch (err) {
      console.warn('gtag event tracking failed:', err);
    }
  }

  const { error } = await supabase.from('user_events').insert([eventPayload]);
  if (error) {
    console.error('Supabase user_events insert error:', error, eventPayload);
  }
}
