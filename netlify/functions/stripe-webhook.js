const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

// Set up Supabase client
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`,
    };
  }

  // Only handle payment_intent.succeeded for now
  if (stripeEvent.type === 'payment_intent.succeeded') {
    const paymentIntent = stripeEvent.data.object;
    const metadata = paymentIntent.metadata || {};
    let orderData = {
      payment_intent_id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      contact_email: metadata.contact_email || null,
      shipping_address: metadata.shipping_address ? JSON.parse(metadata.shipping_address) : null,
      created_at: new Date().toISOString(),
    };

    try {
      // Insert order into Supabase 'orders' table
      const { data, error } = await supabase
        .from('orders')
        .insert([orderData]);
      if (error) {
        console.error('Failed to insert order into Supabase:', error);
        return { statusCode: 500, body: 'Failed to save order' };
      }
      console.log('Order saved to Supabase:', data);
    } catch (err) {
      console.error('Supabase insert error:', err);
      return { statusCode: 500, body: 'Supabase error' };
    }
  }

  // Respond to Stripe to acknowledge receipt
  return { statusCode: 200, body: 'success' };
};
