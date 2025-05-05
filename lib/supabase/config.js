const config = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL,
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
};

if (!config.url || !config.anonKey) {
  throw new Error('Supabase configuration is missing required environment variables');
}

export default config;
