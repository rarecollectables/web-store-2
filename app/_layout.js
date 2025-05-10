import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider } from '../context/store';
import { Provider as PaperProvider } from 'react-native-paper';
import { trackEvent } from '../lib/trackEvent';
import { getLocationInfo } from '../lib/trackEvent';


export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Inject Microsoft Clarity
      if (!document.getElementById('clarity-script')) {
        const script = document.createElement('script');
        script.id = 'clarity-script';
        script.type = 'text/javascript';
        script.async = true;
        script.innerHTML = `
          (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "qydxxehxd0");
        `;
        document.head.appendChild(script);
      }
      // Inject Google Analytics 4 (gtag.js)
      if (!document.getElementById('ga4-gtag-js')) {
        const gaScript = document.createElement('script');
        gaScript.id = 'ga4-gtag-js';
        gaScript.async = true;
        gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-PX5Q4F56NV';
        document.head.appendChild(gaScript);
      }
      if (!document.getElementById('ga4-inline')) {
        const inlineScript = document.createElement('script');
        inlineScript.id = 'ga4-inline';
        inlineScript.innerHTML = `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-PX5Q4F56NV');
        `;
        document.head.appendChild(inlineScript);
      }
    }
  }, []);

  // Print country and track home page visit
  useEffect(() => {
    (async () => {
      // Try to get location info and print country
      let country = null;
      try {
        await getLocationInfo(); // Optionally keep this if you want to fetch location, but do not log
      } catch (err) {
        // Optionally handle error silently
      }
      trackEvent({ eventType: 'home_page_visit' });
    })();
  }, []);

  return (
    <PaperProvider>
      <StoreProvider>
        <SafeAreaProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="product/[id]"
              options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="cart"
              options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="checkout"
              options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="checkout-success"
              options={{ presentation: 'card', animation: 'fade' }}
            />
            <Stack.Screen
              name="chat"
              options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }}
            />
          </Stack>
        </SafeAreaProvider>
      </StoreProvider>
    </PaperProvider>
  );
}
