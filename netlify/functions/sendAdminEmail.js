// Netlify function to handle sending admin-triggered emails
require('dotenv').config({ path: '../../.env' });
const sendOrderUpdateEmail = require('./sendOrderUpdateEmail');
const sgMail = require('@sendgrid/mail');

// You can add more templates here as needed
const TEMPLATES = {
  'order-confirmation': {
    subject: 'Your Order Confirmation from Rare Collectables',
    handler: sendOrderUpdateEmail,
  },
  'order-update': {
    subject: 'Your Order Update from Rare Collectables',
    handler: sendOrderUpdateEmail,
  },
  'enquiry-reply': {
    subject: 'Reply to Your Enquiry from Rare Collectables',
    handler: async ({ to, subject, data }) => {
      // Simple direct SendGrid send for enquiry replies
      return sgMail.send({
        to,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL || 'no-reply@rarecollectables.com',
          name: 'Rare Collectables'
        },
        subject: subject || 'Reply to Your Enquiry',
        html: data.html || data.message || 'Thank you for contacting us.',
        text: data.text || data.message || 'Thank you for contacting us.'
      });
    }
  }
};

exports.handler = async function(event) {
  const logs = [];
  function log(msg, obj) {
    if (obj !== undefined) {
      logs.push(msg + ' ' + JSON.stringify(obj));
    } else {
      logs.push(msg);
    }
  }
  if (event.httpMethod !== 'POST') {
    log('Method not allowed');
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    log('Incoming event.body:', event.body);
    const { to, template, subject, data } = JSON.parse(event.body);
    log('Parsed payload:', { to, template, subject, data });
    if (!to || !template || !TEMPLATES[template]) {
      log('Missing required fields or unknown template.');
      return { statusCode: 400, body: 'Missing required fields or unknown template.' };
    }
    const handler = TEMPLATES[template].handler;
    const emailSubject = subject || TEMPLATES[template].subject;
    log('Using template:', template);
    let sendResult = null;
    // For order templates, pass data as order/orderData
    if (template === 'order-confirmation' || template === 'order-update') {
      sendResult = await handler({
        to,
        order: data,
        subject: emailSubject,
        trackingCode: data.trackingCode,
        trackingUrl: data.trackingUrl,
        relatedProducts: data.relatedProducts || []
      });
      log('Order email send result:', sendResult);
    } else if (template === 'enquiry-reply') {
      sendResult = await handler({ to, subject: emailSubject, data });
      log('Enquiry email send result:', sendResult);
    }
    return { statusCode: 200, body: JSON.stringify({ success: true, logs }) };
  } catch (err) {
    log('Error:', err.message);
    log('Stack:', err.stack);
    return { statusCode: 500, body: JSON.stringify({ error: err.message, logs }) };
  }
};
