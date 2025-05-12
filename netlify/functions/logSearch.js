const { createClient } = require('@supabase/supabase-js');

// Environment variables for Supabase URL and Key
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const data = JSON.parse(event.body);
    const { query, user_id } = data;
    const ip_address = event.headers['x-forwarded-for'] || event.headers['client-ip'] || null;
    const user_agent = event.headers['user-agent'] || null;

    if (!query || typeof query !== 'string' || query.trim() === '') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing or invalid search query' })
      };
    }

    const { error } = await supabase.from('search_logs').insert([
      {
        query,
        user_id: user_id || null,
        ip_address,
        user_agent
      }
    ]);

    if (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
