const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');
const sendConfirmationEmail = require('./sendConfirmationEmail');
const errorHandler = require('./utils/errorHandler');

// Set up Supabase client
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY // use service role key for full database access
);

exports.handler = async (event) => {
  console.log('[WEBHOOK DEBUG] stripe-webhook triggered', { headers: event.headers, body: event.body });
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
    console.log('[WEBHOOK DEBUG] payment_intent metadata:', metadata);
    let orderData = {
      payment_intent_id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      contact_email: metadata.contact_email || null,
      shipping_address: metadata.shipping_address ? JSON.parse(metadata.shipping_address) : null,
      created_at: new Date().toISOString(),
    };
    console.log('[WEBHOOK DEBUG] orderData:', orderData);

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
          console.log('[EMAIL DEBUG] Attempting to send confirmation email', {
            to: orderData.contact_email,
            order: orderData
          });
          const emailResult = await sendConfirmationEmail({ to: orderData.contact_email, order: orderData });
          console.log('[EMAIL DEBUG] Confirmation email send result:', emailResult);
          console.log('Confirmation email sent to', orderData.contact_email);
        } catch (emailErr) {
          console.error('[EMAIL DEBUG] Failed to send confirmation email:', {
            error: emailErr,
            to: orderData.contact_email,
            order: orderData
          });
          errorHandler.logError(emailErr, { ...context, stage: 'send_email', to: orderData.contact_email });
          // Do not fail the webhook for email errors
        }
      }
      // TODO: Add fulfillment trigger here if needed
      // Always return 200 after successful processing so Stripe does not retry
      return {
        statusCode: 200,
        body: JSON.stringify({ received: true })
      };
    } catch (err) {
      errorHandler.logError(err, { ...context, stage: 'supabase_insert_catch' });
      return errorHandler.createErrorResponse(err, context);
    }
  }
  // Return 200 for all other event types (or you can filter as needed)
  return {
    statusCode: 200,
    body: JSON.stringify({ received: true })
  };
};
