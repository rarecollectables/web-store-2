require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const sendOrderDeliveredEmail = require('./sendOrderDeliveredEmail');
const { createClient } = require('@supabase/supabase-js');
const config = require('../../config/supabaseConfig');

(async () => {
  // Example product IDs for the delivered order
  const productIds = ['2-bracelets', '3-bracelets'];
  const supabase = createClient(config.url, config.anonKey);

  // Fetch ordered products
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, price, image_url')
    .in('id', productIds);
  if (error) throw error;

  const items = products.map(product => ({
    name: product.name,
    quantity: 1,
    price: parseFloat((product.price || '').replace(/[^\d.]/g, '')) || 0,
    image: product.image_url
  }));

  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Fetch related products (exclude ordered)
  const { data: allProducts, error: relatedError } = await supabase
    .from('products')
    .select('id, name, price, image_url')
    .not('id', 'in', '(' + productIds.map(id => `'${id}'`).join(',') + ')');
  let relatedProducts = [];
  if (!relatedError && allProducts && allProducts.length > 0) {
    // Filter for bracelets only (case-insensitive)
    const braceletProducts = allProducts.filter(product =>
      product.name && product.name.toLowerCase().includes('bracelet')
    );
    relatedProducts = braceletProducts.sort(() => 0.5 - Math.random()).slice(0, 4).map(product => ({
      name: product.name,
      image: product.image_url,
      url: `https://rarecollectables.co.uk/product/${product.id}`,
      price: product.price
        ? parseFloat((product.price + '').replace(/[^\d.]/g, '')).toFixed(2)
        : null
    }));
  }

  // Example shipping address
  const shipping_address = {
    name: 'Nailla Naveed',
    line1: '8 Worcester street',
    city: 'Rochdale',
    postcode: 'OL11 3QE'
  };

  try {
    await sendOrderDeliveredEmail({
      to: 'afolabiabdulrasheed1@gmail.com', // <-- change to your email for testing
      order: {
        id: 'ORDER45',
        customerName: 'Nailla Naveed',
        items,
        total: total.toFixed(2),
        shipping_address
      },
      relatedProducts
    });
    console.log('Order delivered confirmation email sent!');
  } catch (err) {
    console.error('Failed to send delivered email:', err);
  }
})();
