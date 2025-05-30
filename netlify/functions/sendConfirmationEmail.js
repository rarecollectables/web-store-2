const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendConfirmationEmail({ to, order }) {
  if (!to) throw new Error('Recipient email required');
  const msg = {
    to,
    bcc: process.env.ORDER_BCC_EMAIL ? [process.env.ORDER_BCC_EMAIL] : undefined,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL || 'no-reply@rarecollectables.com',
      name: 'Rare Collectables'
    },
    subject: 'Order Confirmation - Rare Collectables',
    text: `Thank you for your purchase!\n\nOrder Details:\nAmount: £${(order.amount/100).toFixed(2)}\nQuantity: ${order.quantity || 1}\nDate: ${(order.created_at ? new Date(order.created_at).toLocaleString('en-GB') : new Date().toLocaleString('en-GB'))}\n${order.shipping_address ? `Shipping Address: ${order.shipping_address.line1}, ${order.shipping_address.city}, ${order.shipping_address.postcode || ''}` : ''}\n\nWe will keep you updated with your order status. If you have any questions, our concierge team is here to help.\n\nBest regards,\nRare Collectables Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; border-radius: 10px; border: 1px solid #eee; box-shadow: 0 2px 10px #eee; overflow: hidden;">
        <div style="background: #BFA054; color: #fff; padding: 18px 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; letter-spacing: 1px;">Rare Collectables</h1>
        </div>
        <div style="padding: 24px 24px 12px 24px; background: #fff;">
          <h2 style="color: #38a169; margin-top: 0;">Thank you for your purchase!</h2>
          <p style="font-size: 17px; color: #333;">Your order has been received and is now being processed. We will keep you updated with your order status. If you have any questions, our concierge team is here to help.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 18px 0;" />
          <h3 style="color: #BFA054;">Order Summary</h3>
          <div style="text-align: center; margin-bottom: 16px;">
            <img src="${order.product_image || 'https://rarecollectables.co.uk/default-product-image.jpg'}" alt="Product Image" style="max-width: 180px; max-height: 180px; object-fit: contain; border-radius: 12px; border: 1px solid #eee; box-shadow: 0 2px 8px #eee; margin-bottom: 8px;" />
          </div>
          <table style="width: 100%; font-size: 16px; margin-bottom: 12px;">
            <tr>
              <td style="font-weight: bold;">Amount:</td>
              <td>£${(order.amount/100).toFixed(2)}</td>
            </tr>
            <tr>
              <td style="font-weight: bold;">Quantity:</td>
              <td>${order.quantity || 1}</td>
            </tr>
            <tr>
              <td style="font-weight: bold;">Date:</td>
              <td>${order.created_at ? new Date(order.created_at).toLocaleString('en-GB') : new Date().toLocaleString('en-GB')}</td>
            </tr>
            ${order.shipping_address ? `
            <tr>
              <td style="font-weight: bold;">Shipping Address:</td>
              <td>${order.shipping_address.line1}, ${order.shipping_address.city}${order.shipping_address.postcode ? ', ' + order.shipping_address.postcode : ''}</td>
            </tr>` : ''}
          </table>
          <div style="margin-top: 18px; font-size: 15px; color: #444;">
            If you have any questions or need assistance, simply reply to this email or contact our concierge team.
          </div>
          <div style="margin-top: 30px; color: #888; font-size: 13px; text-align: center;">
            &copy; ${new Date().getFullYear()} Rare Collectables. All rights reserved.
          </div>
        </div>
      </div>
    `
  };
  return sgMail.send(msg);
}

module.exports = sendConfirmationEmail;
