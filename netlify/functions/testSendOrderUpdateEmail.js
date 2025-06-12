// Test script to send an order update email using sendOrderUpdateEmail.js
require('dotenv').config({ path: '../../.env' });
const sendOrderUpdateEmail = require('./sendOrderUpdateEmail');

(async () => {
  try {
    await sendOrderUpdateEmail({
      to: 'kolamegagreen@gmail.com', // <-- CHANGE THIS to your email for testing
      order: {
        customerName: 'Test User',
        id: 'ORDER123',
        items: [
          { name: 'Gold Necklace', quantity: 1, price: 120 },
          { name: 'Emerald Ring', quantity: 2, price: 75 }
        ],
        total: 270,
        shipping_address: {
          name: 'Test User',
          line1: '123 Main St',
          city: 'London',
          postcode: 'SW1A 1AA'
        }
      },
      trackingCode: 'TRACK123456',
      trackingUrl: 'https://tracking.example.com/TRACK123456',
      relatedProducts: [
        { name: 'Silver Bracelet', image: 'https://yourdomain.com/silver-bracelet.jpg', url: 'https://yourdomain.com/products/silver-bracelet' },
        { name: 'Pearl Earrings', image: 'https://yourdomain.com/pearl-earrings.jpg', url: 'https://yourdomain.com/products/pearl-earrings' }
      ]
    });
    console.log('Order update test email sent!');
  } catch (err) {
    console.error('Failed to send test order update email:', err);
  }
})();
