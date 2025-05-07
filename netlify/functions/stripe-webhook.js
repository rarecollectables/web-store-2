const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');
const sendConfirmationEmail = require('./sendConfirmationEmail');
const errorHandler = require('./utils/errorHandler');

// Set up Supabase client
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

exports.handler = async (event) => {
  // For error context
  const context = { requestId: event.headers['x-request-id'] || undefined };

  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    errorHandler.logError(err, { ...context, stage: 'signature_verification' });
    return errorHandler.createErrorResponse(err, context);
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
        errorHandler.logError(error, { ...context, stage: 'supabase_insert', orderData });
        return errorHandler.createErrorResponse(error, context);
      }
      console.log('Order saved to Supabase:', data);

      // Send confirmation email if contact_email is present
      if (orderData.contact_email) {
        try {
          await sendConfirmationEmail({ to: orderData.contact_email, order: orderData });
          console.log('Confirmation email sent to', orderData.contact_email);
        } catch (emailErr) {
          errorHandler.logError(emailErr, { ...context, stage: 'send_email', to: orderData.contact_email });
          // Do not fail the webhook for email errors
        }
      }
      // TODO: Add fulfillment trigger here if needed
    } catch (err) {
      errorHandler.logError(err, { ...context, stage: 'supabase_insert_catch' });
      return errorHandler.createErrorResponse(err, context);
    }
  }

  // Respond to Stripe to acknowledge receipt
  return { statusCode: 200, body: 'success' };
};
