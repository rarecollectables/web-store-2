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
    // Validate Stripe API key
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      console.error('Stripe secret key is not set');
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
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

    // Create Payment Intent
    const customer = await stripe.customers.create({
      email: customer_email,
      metadata: {
        shipping_address: shipping_address ? JSON.stringify(shipping_address) : null,
        cart: JSON.stringify(cart)
      }
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: total,
      currency: 'gbp',
      customer: customer.id,
      metadata: {
        customer_email,
        shipping_address: shipping_address ? JSON.stringify(shipping_address) : null,
        cart: JSON.stringify(cart)
      }
    });

    // Create ephemeral key for the customer
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: paymentIntent.customer },
      { stripe_version: '2022-11-15' }
    );

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        customerId: paymentIntent.customer,
        ephemeralKey: ephemeralKey.secret
      })
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
