const Stripe = require('stripe');

exports.handler = async (event) => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: '',
    };
  }
  // Initialize Stripe with proper API version
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const stripe = new Stripe(stripeKey, {
    apiVersion: '2024-02-14', // Updated to latest stable version
    appInfo: {
      name: 'Rare Collectables Store',
      version: '1.0.0'
    }
  });

  try {
    // Validate Stripe API key
    if (!stripeKey) {
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
    if (!stripeKey.startsWith('sk_')) {
      console.error('Invalid Stripe key format:', stripeKey);
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

    // Validate Stripe key format
    if (!stripeKey.startsWith('sk_')) {
      console.error('Invalid Stripe key format:', stripeKey);
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
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

    const { cart, customer_email, shipping_address } = JSON.parse(event.body);

    // Log incoming request data
    console.log('Received checkout request:', {
      cartCount: cart.length,
      hasCustomerEmail: !!customer_email,
      hasShippingAddress: !!shipping_address,
      shippingCountries: shipping_address ? ['GB', 'US', 'CA', 'IE', 'AU', 'FR', 'DE', 'NG'] : []
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
      email: customer_email,
      metadata: {
        shipping_address: shipping_address ? JSON.stringify({
          line1: shipping_address.line1,
          city: shipping_address.city,
          postal_code: shipping_address.zip,
          country: shipping_address.country || 'GB'
        }) : null
      }
    });

    // Create payment intent with simplified metadata
    const paymentIntent = await stripe.paymentIntents.create({
      amount: total,
      currency: 'gbp',
      customer: customer.id,
      metadata: {
        customer_email,
        shipping_address: shipping_address ? JSON.stringify({
          line1: shipping_address.line1,
          city: shipping_address.city,
          postal_code: shipping_address.zip,
          country: shipping_address.country || 'GB'
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

    // Create ephemeral key for the customer
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { stripe_version: '2022-11-15' }
    );

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        customerId: customer.id,
        ephemeralKey: ephemeralKey.secret
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
