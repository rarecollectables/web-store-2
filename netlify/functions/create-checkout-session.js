const Stripe = require('stripe');

exports.handler = async (event) => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:8081',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: '',
    };
  }
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });

    const { cart, customer_email, shipping_address } = JSON.parse(event.body);

    // Validate cart
    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      console.error('Invalid cart array:', cart);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid cart array' })
      };
    }

    // Map cart items to Stripe line items
    const line_items = cart.map((item, index) => {
      // Log the raw item for debugging
      console.log(`Processing cart item ${index + 1}:`, item);

      // Get the product name from either name or title
      const productName = item.name || item.title || `Product ${index + 1}`;
      
      // Validate required fields
      if (!productName || !item.price || !item.quantity) {
        console.error('Invalid cart item:', {
          index,
          item,
          missing: {
            name: !productName,
            price: !item.price,
            quantity: !item.quantity
          }
        });
        throw new Error(`Invalid cart item ${index + 1}: Missing required fields`);
      }

      // Convert price to number if it's a string
      const price = typeof item.price === 'number' ? item.price : parseFloat(item.price);
      if (isNaN(price)) {
        console.error('Invalid price format:', {
          index,
          item,
          price: item.price
        });
        throw new Error(`Invalid price format for item ${index + 1}`);
      }

      return {
        price_data: {
          currency: 'gbp',
          product_data: {
            name: productName,
            description: item.description || '',
            images: item.image_path ? [item.image_path] : undefined,
          },
          unit_amount: Math.round(price * 100),
        },
        quantity: item.quantity || 1,
      };
    });

    // Log the processed line items
    console.log('Processed line items:', line_items);

    // Log line items before creating session
    console.log('Creating checkout session with items:', line_items);

    // Create the Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'apple_pay', 'google_pay'],
      mode: 'payment',
      line_items,
      customer_email: customer_email || undefined,
      shipping_address_collection: shipping_address ? { 
        allowed_countries: ['GB', 'US', 'CA', 'IE', 'AU', 'FR', 'DE', 'NG'],
        shipping_rate_data: {
          type: 'fixed_amount',
          fixed_amount: { amount: 0, currency: 'gbp' },
          display_name: 'Free Shipping',
          delivery_estimate: {
            minimum: { unit: 'business_day', value: 3 },
            maximum: { unit: 'business_day', value: 5 },
          },
        },
      } : undefined,
      automatic_tax: { enabled: true },
      success_url: `${process.env.SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CANCEL_URL}`,
      metadata: {
        customer_email: customer_email,
      },
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
