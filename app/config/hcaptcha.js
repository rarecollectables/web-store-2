export const HCAPTCHA_CONTAINER_ID = 'hcaptcha-container';

// Get the current environment
export const isDevelopment = process.env.NODE_ENV === 'development';

// Get the correct site key based on environment
export const getHCaptchaSiteKey = () => {
  // For development, use the test site key
  if (isDevelopment) {
    return '10000000-ffff-ffff-ffff-000000000001'; // hCaptcha test site key
  }
  
  // For production, get the site key from environment variables
  const siteKey = process.env.EXPO_PUBLIC_HCAPTCHA_SITE_KEY || 
                  process.env.HCAPTCHA_SITE_KEY ||
                  Constants.expoConfig?.extra?.HCAPTCHA_SITE_KEY;

  if (!siteKey) {
    console.error('hCaptcha site key is not configured. Please set HCAPTCHA_SITE_KEY in your environment variables.');
    return '10000000-ffff-ffff-ffff-000000000001'; // Fall back to test key
  }
  
  return siteKey;
};
