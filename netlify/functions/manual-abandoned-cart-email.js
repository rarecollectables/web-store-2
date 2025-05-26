// netlify/functions/manual-abandoned-cart-email.js
// Run manually to send a test abandoned cart email to a chosen address
const { createClient } = require('@supabase/supabase-js');
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

const LOGO_URL = 'https://rarecollectables.co.uk/assets/images/rare%20collectables%20horizontal%20logo.png'; // Make sure this is the correct public URL

exports.handler = async function(event) {
  // Get the to_email from query or environment for manual test
  const to_email = process.env.ORDER_BCC_EMAIL || (event.queryStringParameters && event.queryStringParameters.to_email);
  if (!to_email) {
    return { statusCode: 400, body: 'Missing to_email' };
  }

  // Find one checkout_attempts row with a non-empty cart (for testing)
  const { data: attempts, error } = await supabase
    .from('checkout_attempts')
    .select('*')
    .not('cart', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10);

  // Find the first row with at least one item in cart
  let attempt = null;
  if (Array.isArray(attempts)) {
    attempt = attempts.find(a => Array.isArray(a.cart) && a.cart.length > 0);
  }

  if (!attempt) {
    return { statusCode: 404, body: 'No abandoned checkout attempts found (with non-empty cart).' };
  }

  // Compose a nice email
  // Fetch cart products details from Supabase for accurate image/name/link
  const cartIds = (attempt.cart || []).map(item => item.id);
  let cartProducts = [];
  if (cartIds.length) {
    const { data: cartDetails } = await supabase
      .from('products')
      .select('id, name, image_url')
      .in('id', cartIds);
    cartProducts = cartDetails || [];
  }
  // Render cart items as featured
  const cartHtml = cartProducts.map(prod => `
    <td style="padding:0 12px 12px 0;text-align:center;vertical-align:top;">
      <a href="https://rarecollectables.co.uk/product/${prod.id}" style="text-decoration:none;color:#222;">
        <img src="${prod.image_url || ''}" alt="${prod.name || ''}" style="width:120px;height:auto;border-radius:8px;box-shadow:0 2px 8px #eee;display:block;margin:0 auto 8px;" />
        <div style="font-size:16px;font-weight:600;">${prod.name || 'Product'}</div>
      </a>
    </td>
  `).join('');

  // Fetch 3 related products (not in cart, must have image_url)
  const { data: related } = await supabase
    .from('products')
    .select('id, name, image_url')
    .not('id', 'in', `(${cartIds.join(',')})`)
    .not('image_url', 'is', null)
    .order('RANDOM()', { ascending: true })
    .limit(3);

  const relatedHtml = (related || []).map(prod => `
    <td style="padding:0 12px 12px 0;text-align:center;">
      <a href="https://rarecollectables.co.uk/product/${prod.id}" style="text-decoration:none;color:#222;">
        <img src="${prod.image_url}" alt="${prod.name}" style="width:120px;height:auto;border-radius:8px;box-shadow:0 2px 8px #eee;display:block;margin:0 auto 8px;" />
        <div style="font-size:15px;font-weight:500;">${prod.name}</div>
      </a>
    </td>
  `).join('');

  const html = `
  <div style="background:#faf8f4;padding:0;margin:0;font-family:'Segoe UI',Arial,sans-serif;">
    <div style="max-width:520px;background:#fff;margin:32px auto 0 auto;border-radius:14px;box-shadow:0 4px 24px #e7e7e7;overflow:hidden;">
      <div style="background:#fff;padding:32px 32px 18px 32px;text-align:center;border-bottom:1px solid #f0e6dc;">
        <img src="${LOGO_URL}" alt="Rare Collectables" style="width:260px;max-width:90%;margin-bottom:18px;" />
        <h2 style="color:#bfa054;font-size:26px;margin:0 0 2px 0;letter-spacing:0.5px;">Did you forget something?</h2>
        <p style="color:#222;font-size:18px;margin:0 0 12px 0;">You left these item(s) in your cart:</p>
        <table width="100%" style="border:none;border-collapse:collapse;margin:0 auto 18px auto;"><tr>${cartHtml}</tr></table>
        <a href="https://rarecollectables.co.uk/checkout?session=${attempt.guest_session_id}" style="display:inline-block;background:#bfa054;color:#fff;text-decoration:none;font-size:17px;padding:12px 28px;border-radius:7px;font-weight:600;box-shadow:0 2px 8px #e7e7e7;margin-bottom:12px;">Resume your order</a>
        <p style="font-size:15px;color:#666;margin:12px 0 0 0;">If you have any questions, just reply to this email!</p>
      </div>
      <div style="padding:24px 32px 16px 32px;background:#f7f5f1;">
        <h3 style="font-size:19px;color:#bfa054;margin:0 0 16px 0;text-align:center;">You may also like</h3>
        <table width="100%" style="border:none;border-collapse:collapse;margin:0 auto 10px auto;"><tr>${relatedHtml}</tr></table>
      </div>
      <div style="background:#fff;text-align:center;padding:18px 0 12px 0;font-size:12px;color:#bfa054;letter-spacing:1px;">&copy; ${new Date().getFullYear()} Rare Collectables</div>
    </div>
  </div>
  `;

  await sgMail.send({
    to: to_email,
    from: 'no-reply@rarecollectables.co.uk',
    subject: 'You left something in your cart! 🛒',
    html
  });

  return { statusCode: 200, body: `Sent abandoned cart email to ${to_email}` };
};
