const fetch = require('node-fetch');

exports.handler = async function(event) {
  try {
    const resp = await fetch('https://ipapi.co/json/');
    if (!resp.ok) {
      return {
        statusCode: resp.status,
        body: JSON.stringify({ error: 'Failed to fetch from ipapi.co', status: resp.status })
      };
    }
    const data = await resp.json();
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(data)
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
