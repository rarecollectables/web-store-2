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
      const fromEmail = process.env.SENDGRID_FROM_EMAIL;
      const { name, email, message } = payload;
      console.log('SENDGRID_FROM_EMAIL:', fromEmail);
      console.log('SENDGRID_API_KEY exists:', !!process.env.SENDGRID_API_KEY);
      if (!email) {
        console.error('User email from contact form is missing. Email will not be sent.');
      } else {
        await sgMail.send({
          to: email,
          from: fromEmail || email, // Prefer fromEmail if set
          subject: `Thank you for contacting Rare Collectables` ,
          text: `Dear ${name || 'Customer'},\n\nThank you for reaching out to Rare Collectables. We have received your message and will get back to you as soon as possible.\n\nYour message:\n${message}\n\nBest regards,\nRare Collectables Team`,
          html: `<h2>Thank you for contacting Rare Collectables</h2><p>Dear ${name || 'Customer'},</p><p>We have received your message and will get back to you as soon as possible.</p><p><strong>Your message:</strong><br/>${message}</p><p>Best regards,<br/>Rare Collectables Team</p>`
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
