const Stripe = require('stripe');

exports.handler = async function(event, context) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    
    // Parse the request body
    const { cart, customer_email, shipping_address } = JSON.parse(event.body);

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Cart is empty.' })
      };
    }

    // Create line items from cart
    const line_items = cart.map(item => ({
      price_data: {
        currency: 'gbp',
        product_data: { name: item.title || item.name },
        unit_amount: Math.round((typeof item.price === 'number' ? item.price : parseFloat(item.price)) * 100),
      },
      quantity: item.quantity || 1,
    }));

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'apple_pay', 'google_pay'],
      mode: 'payment',
      line_items,
      customer_email: customer_email || undefined,
      shipping_address_collection: shipping_address ? { allowed_countries: ['GB', 'US', 'CA', 'IE', 'AU', 'FR', 'DE', 'NG'] } : undefined,
      success_url: `${process.env.SUCCESS_URL || 'https://rarecollectables1.netlify.app/confirmation'}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CANCEL_URL || 'https://rarecollectables1.netlify.app/cart'}`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
      headers: { 'Content-Type': 'application/json' }
    };
  } catch (error) {
    console.error('Error in checkout:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};
