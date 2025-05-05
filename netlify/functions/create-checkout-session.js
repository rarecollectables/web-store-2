const Stripe = require('stripe');

exports.handler = async (event) => {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });

    const { cart, customer_email, shipping_address } = JSON.parse(event.body);
    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Cart is empty.' }),
      };
    }

    // Map cart items to Stripe line items
    const line_items = cart.map(item => ({
      price_data: {
        currency: 'gbp',
        product_data: {
          name: item.title || item.name,
          description: item.description || '',
          images: item.images ? [item.images[0]] : undefined,
        },
        unit_amount: Math.round((typeof item.price === 'number' ? item.price : parseFloat(item.price)) * 100),
      },
      quantity: item.quantity || 1,
    }));

    // Create the Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'apple_pay', 'google_pay'],
      mode: 'payment',
      line_items,
      customer_email: customer_email || undefined,
      shipping_address_collection: shipping_address ? { 
        allowed_countries: ['GB', 'US', 'CA', 'IE', 'AU', 'FR', 'DE', 'NG'],
        shipping_rate_data: {
          type: 'fixed_amount',
          fixed_amount: { amount: 0, currency: 'gbp' },
          display_name: 'Free Shipping',
          delivery_estimate: {
            minimum: { unit: 'business_day', value: 3 },
            maximum: { unit: 'business_day', value: 5 },
          },
        },
      } : undefined,
      automatic_tax: { enabled: true },
      success_url: `${process.env.SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CANCEL_URL}`,
      metadata: {
        customer_email: customer_email,
      },
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
