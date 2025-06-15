// Test script to send an order update email using sendOrderUpdateEmail.js
require('dotenv').config({ path: '../../.env' });
const sendOrderUpdateEmail = require('./sendOrderUpdateEmail');
const { createClient } = require('@supabase/supabase-js');
const config = require('../../config/supabaseConfig');

(async () => {
  // Initialize Supabase client
  const supabase = createClient(config.url, config.anonKey);

  // Fetch product details for the specified IDs
  const productIds = ['2-bracelets', '3-bracelets'];
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, price, image_url')
    .in('id', productIds);

  if (error) {
    console.error('Failed to fetch products:', error);
    return;
  }

  // Construct order items from fetched products
  // Clean price and ensure image for each item
  const items = products.map(product => ({
    name: product.name,
    quantity: 1,
    // Remove any non-numeric characters (e.g., £, $, etc.) before parsing
    price: parseFloat((product.price || '').replace(/[^\d.]/g, '')) || 0,
    image: product.image_url
  }));

  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Fetch related products (exclude ordered products)
  const { data: allProducts, error: relatedError } = await supabase
    .from('products')
    .select('id, name, price, image_url')
    .not('id', 'in', '(' + productIds.map(id => `'${id}'`).join(',') + ')');

  let relatedProducts = [];
  if (!relatedError && allProducts && allProducts.length > 0) {
    // Shuffle and take up to 2 related products
    relatedProducts = allProducts.sort(() => 0.5 - Math.random()).slice(0, 2).map(product => ({
      name: product.name,
      image: product.image_url,
      url: `https://yourdomain.com/products/${product.id}`
    }));
  }

  try {
    await sendOrderUpdateEmail({
      to: 'kolamegagreen@gmail.com', // <-- CHANGE THIS to your email for testing
      order: {
        customerName: 'Test User',
        id: 'ORDER-DELIVERY-001',
        items,
        total,
        shipping_address: {
          name: 'Test User',
          line1: '123 Main St',
          city: 'London',
          postcode: 'SW1A 1AA'
        }
      },
      trackingCode: 'C00HHA0575528845',
      trackingUrl: 'https://www.evri.com/track/parcel/C00HHA0575528845/details',
      relatedProducts
    });
    console.log('Order delivery confirmation email sent!');
  } catch (err) {
    console.error('Failed to send order delivery confirmation email:', err);
  }
})();
