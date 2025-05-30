const Stripe = require('stripe');

exports.handler = async (event) => {
  // Handle CORS preflight requests
  // Only allow trusted origins (production and local dev)
  const allowedOrigins = [
    'https://rarecollectables1.netlify.app',
    'http://localhost:8081',
    'http://127.0.0.1:8081'
  ];
  const origin = event.headers.origin || event.headers.Origin || '';
  const isAllowedOrigin = allowedOrigins.includes(origin);

  const headers = {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
  };

  // Respond to preflight OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    // Validate request origin
    const allowedOrigins = ['http://localhost:8081', 'https://rarecollectables.co.uk', 'http://127.0.0.1:8081'];
    const origin = event.headers.origin || event.headers.Origin;
    if (!allowedOrigins.includes(origin)) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          error: 'Invalid origin',
          requestId: event.requestId
        })
      };
    }



    // Validate Stripe API key
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('Stripe secret key is not set');
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          error: 'Stripe secret key is not configured',
          details: 'Please set STRIPE_SECRET_KEY in Netlify environment variables'
        })
      };
    }

    // Validate Stripe key format
    if (!process.env.STRIPE_SECRET_KEY.startsWith('sk_')) {
      console.error('Invalid Stripe key format:', process.env.STRIPE_SECRET_KEY);
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          error: 'Invalid Stripe secret key format',
          details: 'Stripe key must start with sk_test_ or sk_live_'
        })
      };
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2022-11-15', // Using a more stable API version
    });

    // Parse request body
    const { cart, contact, address } = JSON.parse(event.body);

    // Log incoming request data
    console.log('Received checkout request:', {
      cartCount: cart.length,
      hasContact: !!contact,
      hasAddress: !!address,
      shippingCountries: address ? ['GB', 'US', 'CA', 'IE', 'AU', 'FR', 'DE', 'NG'] : []
    });

    // Validate input data
    if (!Array.isArray(cart) || cart.length === 0) {
      console.error('Invalid cart:', cart);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Cart is empty or invalid' })
      };
    }

    // Calculate total amount in cents
    const total = cart.reduce((sum, item) => {
      return sum + (item.price * 100 * item.quantity);
    }, 0);

    // Validate cart
    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      console.error('Invalid cart array:', cart);
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ 
          error: 'Invalid cart array',
          details: 'Cart must be a non-empty array of items'
        })
      };
    }

    // Validate each item in cart
    for (const item of cart) {
      if (!item.price || !item.quantity) {
        console.error('Invalid cart item:', item);
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ 
            error: 'Invalid cart item',
            details: 'Each item must have price and quantity'
          })
        };
      }
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

    // Create Payment Intent with proper validation
    const customer = await stripe.customers.create({
      email: contact.email,
      metadata: {
        shipping_address: address ? JSON.stringify({
          line1: address.line1,
          city: address.city,
          postal_code: address.zip,
          country: address.country || 'GB'
        }) : null
      }
    });

    // Create payment intent with simplified metadata
    const paymentIntent = await stripe.paymentIntents.create({
      amount: total,
      currency: 'gbp',
      customer: customer.id,
      metadata: {
        contact_email: contact.email,
        shipping_address: address ? JSON.stringify({
          line1: address.line1,
          city: address.city,
          postal_code: address.zip,
          country: address.country || 'GB'
        }) : null
      }
    });

    // Add additional metadata about the cart for tracking purposes
    const cartMetadata = cart.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity
    }));

    // Add cart metadata to the payment intent after creation
    await stripe.paymentIntents.update(paymentIntent.id, {
      metadata: {
        ...paymentIntent.metadata,
        cart_items: JSON.stringify(cartMetadata)
      }
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret
      })
    };

  } catch (error) {
    console.error('Error creating checkout session:', {
      error: error.message,
      stack: error.stack,
      type: error.type,
      code: error.code
    });

    const statusCode = error.statusCode || 500;
    const response = {
      error: error.message || 'An unexpected error occurred',
      code: error.code,
      type: error.type,
      details: error.details
    };

    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response)
    };
  }
};
