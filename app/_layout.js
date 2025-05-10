import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider } from '../context/store';
import { Provider as PaperProvider } from 'react-native-paper';

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'web') {
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
    }
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
