const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY // use service role key for full access
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const payload = JSON.parse(event.body);

    // Insert the payload into the contact_form_submissions table
    const { data, error } = await supabase
      .from('contact_form_submissions')
      .insert([payload]);

    if (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message }),
      };
    }

    // Send notification email using SendGrid
    try {
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      const toEmail = process.env.SENDGRID_TO_EMAIL;
      const fromEmail = process.env.SENDGRID_FROM_EMAIL;
      const { name, email, message } = payload;
      console.log('SENDGRID_TO_EMAIL:', toEmail);
      console.log('SENDGRID_FROM_EMAIL:', fromEmail);
      console.log('SENDGRID_API_KEY exists:', !!process.env.SENDGRID_API_KEY);
      if (!toEmail) {
        console.error('SENDGRID_TO_EMAIL environment variable is missing. Email will not be sent.');
      } else {
        await sgMail.send({
          to: toEmail,
          from: fromEmail || toEmail, // Prefer fromEmail if set
          subject: `New Contact Form Submission from ${name || 'Unknown'}`,
          text: `You received a new contact form submission.\n\nName: ${name}\nEmail: ${email}\nMessage: ${message}`,
          html: `<h2>New Contact Form Submission</h2><p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Message:</strong><br/>${message}</p>`
        });
      }
    } catch (mailErr) {
      // Log but do not fail the function if email fails
      console.error('SendGrid email error:', mailErr);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ data }),
    };
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
