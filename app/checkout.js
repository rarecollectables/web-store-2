import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator, Linking, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore } from '../context/store';
import { colors, fontFamily, spacing, borderRadius, shadows } from '../theme';
import { z } from 'zod';
import { storeOrder } from './components/orders-modal';
import { trackEvent } from '../lib/trackEvent';
import Constants from 'expo-constants';

// Netlify function endpoint for Stripe Checkout
const NETLIFY_STRIPE_FUNCTION_URL = Constants.expoConfig?.extra?.NETLIFY_STRIPE_FUNCTION_URL || 'https://rarecollectables1.netlify.app/.netlify/functions/create-checkout-session';

const contactSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Enter a valid email'),
});
const addressSchema = z.object({
  line1: z.string().min(3, 'Address required'),
  city: z.string().min(2, 'City required'),
  zip: z.string().min(3, 'ZIP required'),
});

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { cart, removeFromCart } = useStore();
  const [step, setStep] = useState(0);
  const [contact, setContact] = useState({ name: '', email: '' });
  const [address, setAddress] = useState({ line1: '', city: '', zip: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);

  const subtotal = cart.reduce((sum, item) => sum + (typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0) * (item.quantity || 1), 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  function validateAndNext() {
    if (step === 0) {
      const result1 = contactSchema.safeParse(contact);
      const result2 = addressSchema.safeParse(address);
      if (!result1.success || !result2.success) {
        setErrors({
          ...(!result1.success && result1.error.flatten().fieldErrors),
          ...(!result2.success && result2.error.flatten().fieldErrors),
        });
        return;
      }
    }
    setErrors({});
    setStep(s => Math.min(s + 1, 1));
  }

  async function handleStripeCheckout() {
    setPaying(true);
    try {
      console.log('Starting checkout process');
      console.log('Cart:', cart);
      console.log('Contact:', contact);
      console.log('Address:', address);
      console.log('Netlify function URL:', NETLIFY_STRIPE_FUNCTION_URL);

      await trackEvent({
        eventType: 'proceed_to_checkout',
        metadata: {
          cart: cart.map(item => ({
            id: item.id,
            title: item.title,
            quantity: item.quantity,
            price: item.price,
          })),
          contact,
          address,
          subtotal,
          tax,
          total,
        }
      });

      console.log('Making request to Netlify function');
      const response = await fetch(NETLIFY_STRIPE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          cart,
          customer_email: contact.email,
          shipping_address: address,
        })
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        console.error('Server error:', {
          status: response.status,
          statusText: response.statusText,
          data
        });
        
        if (data.error) {
          // Handle specific error types
          if (data.error.type === 'card_error') {
            Alert.alert(
              'Payment Error',
              data.error.message || 'There was an error with your card. Please check your details and try again.',
              [{ text: 'OK' }]
            );
          } else if (data.error.type === 'rate_limit') {
            Alert.alert(
              'Too Many Requests',
              'Please wait a moment and try again.',
              [{ text: 'OK' }]
            );
          } else {
            Alert.alert(
              'Error',
              data.error.message || 'Failed to create checkout session. Please try again later.',
              [{ text: 'OK' }]
            );
          }
          throw new Error(data.error.message || 'Failed to create checkout session');
        } else {
          Alert.alert(
            'Error',
            'Failed to create checkout session. Please try again later.',
            [{ text: 'OK' }]
          );
          throw new Error('Failed to create checkout session');
        }
      }

      console.log('Response data:', {
        id: data.id,
        status: response.status,
        ok: response.ok,
        timestamp: new Date().toISOString()
      });

      if (!data.id) {
        console.error('Invalid response format:', {
          data,
          timestamp: new Date().toISOString()
        });
        Alert.alert(
          'Error',
          'Invalid response from server. Please try again later.',
          [{ text: 'OK' }]
        );
        throw new Error('Invalid response format');
      }

      console.log('Redirecting to Stripe checkout');
      const url = `https://checkout.stripe.com/c/pay/${data.id}`;
      console.log('Opening Stripe checkout URL:', {
        url,
        timestamp: new Date().toISOString()
      });

      try {
        await Linking.openURL(url);
      } catch (linkError) {
        console.error('Error opening Stripe checkout URL:', {
          error: linkError,
          url,
          timestamp: new Date().toISOString()
        });
        Alert.alert(
          'Error',
          'Failed to open payment page. Please try again later.',
          [{ text: 'OK' }]
        );
        throw linkError;
      }
    } catch (error) {
      console.error('Checkout error:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        timestamp: new Date().toISOString()
      });

      // Log to analytics for tracking
      await trackEvent({
        eventType: 'checkout_error',
        metadata: {
          error: {
            message: error.message,
            name: error.name,
            stack: error.stack
          },
          cart,
          contact,
          address,
          subtotal,
          tax,
          total
        }
      });

      Alert.alert(
        'Error',
        error.message || 'Failed to process payment. Please try again later.',
        [{ text: 'OK' }]
      );
    } finally {
      setPaying(false);
      console.log('Checkout process completed', {
        success: !error,
        timestamp: new Date().toISOString()
      });
    }
  }

  const renderContactAndAddress = () => (
    <View style={styles.step}>
      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        value={contact.name}
        onChangeText={t => setContact({ ...contact, name: t })}
        placeholder="Full Name"
        autoCapitalize="words"
      />
      {!!errors.name && <Text style={styles.error}>{errors.name}</Text>}
      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={contact.email}
        onChangeText={t => setContact({ ...contact, email: t })}
        placeholder="Email Address"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      {!!errors.email && <Text style={styles.error}>{errors.email}</Text>}
      <Text style={styles.label}>Address</Text>
      <TextInput
        style={styles.input}
        value={address.line1}
        onChangeText={t => setAddress({ ...address, line1: t })}
        placeholder="Street address"
      />
      {!!errors.line1 && <Text style={styles.error}>{errors.line1}</Text>}
      <Text style={styles.label}>City</Text>
      <TextInput
        style={styles.input}
        value={address.city}
        onChangeText={t => setAddress({ ...address, city: t })}
        placeholder="City"
      />
      {!!errors.city && <Text style={styles.error}>{errors.city}</Text>}
      <Text style={styles.label}>ZIP</Text>
      <TextInput
        style={styles.input}
        value={address.zip}
        onChangeText={t => setAddress({ ...address, zip: t })}
        placeholder="ZIP Code"
        keyboardType="default"
      />
      {!!errors.zip && <Text style={styles.error}>{errors.zip}</Text>}
      <Pressable
        style={[styles.button, { marginTop: 24 }]}
        onPress={validateAndNext}
        disabled={loading}
      >
        <Text style={styles.buttonText}>Proceed to Payment</Text>
      </Pressable>
    </View>
  );

  const renderPayment = () => (
    <View style={styles.step}>
      <Text style={styles.summaryLabel}>Order Summary</Text>
      <Text>Subtotal: £{subtotal.toFixed(2)}</Text>
      <Text>Tax: £{tax.toFixed(2)}</Text>
      <Text>Total: £{total.toFixed(2)}</Text>
      <Pressable
        style={[styles.button, { marginTop: 24, backgroundColor: '#635BFF' }]}
        onPress={handleStripeCheckout}
        disabled={paying}
      >
        {paying ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Pay with Card / Apple Pay / Google Pay</Text>}
      </Pressable>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
      <Text style={styles.header}>Checkout</Text>
      {step === 0 && renderContactAndAddress()}
      {step === 1 && renderPayment()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ivory },
  header: { fontSize: 28, fontWeight: '900', color: '#BFA054', marginBottom: 18, marginTop: 16, textAlign: 'center' },
  step: { marginBottom: spacing.md, paddingHorizontal: 12 },
  label: { fontSize: 16, fontWeight: 'bold', marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#E5DCC3', borderRadius: 8, padding: 10, marginTop: 6, fontSize: 16, backgroundColor: '#fff' },
  error: { color: 'red', marginTop: 4 },
  button: { backgroundColor: '#BFA054', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  summaryLabel: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
});
