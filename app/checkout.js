import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ActivityIndicator, Linking, Alert } from 'react-native';
import { loadStripe } from '@stripe/stripe-js';
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

function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { cart, removeFromCart } = useStore();
  const [contact, setContact] = useState({ name: '', email: '' });
  const [address, setAddress] = useState({ line1: '', city: '', zip: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [stripe, setStripe] = useState(null);
  const [cardElement, setCardElement] = useState(null);

  // Calculate cart totals
  const subtotal = cart.reduce((sum, item) => sum + (typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0) * (item.quantity || 1), 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  useEffect(() => {
    const initStripe = async () => {
      try {
        const stripe = await loadStripe(process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY);
        if (stripe) {
          setStripe(stripe);
          const elements = stripe.elements();
          const card = elements.create('card');
          card.mount('#card-element');
          setCardElement(card);
        }
      } catch (error) {
        console.error('Failed to initialize Stripe:', error);
      }
    };
    initStripe();
  }, []);

  useEffect(() => {
    if (stripe) {
      const elements = stripe.elements();
      const card = elements.create('card');
      card.mount('#card-element');
      setCardElement(card);
    }
  }, [stripe]);

  const handleStripeCheckout = async () => {
    setPaying(true);
    setLoading(true);

    try {
      // Validate form
      if (!validateForm()) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      if (!stripe) {
        throw new Error('Stripe is not initialized. Please try again.');
      }

      if (!cardElement) {
        throw new Error('Card element not initialized. Please try again.');
      }

      // Create payment intent
      const response = await fetch(NETLIFY_STRIPE_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart, customer_email: contact.email, shipping_address: address }),
      });

      const data = await response.json();
      console.log('Payment Intent response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment intent');
      }

      // Confirm card payment
      const { error } = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: contact.name,
            email: contact.email,
            address: {
              line1: address.line1,
              city: address.city,
              postal_code: address.zip,
              country: 'GB'
            }
          }
        }
      });

      if (error) {
        throw error;
      }

      // Payment successful
      Alert.alert('Success', 'Payment completed successfully!');
      // Clear cart and navigate to confirmation
      removeFromCart(cart);
      router.push('/confirmation');
    } catch (error) {
      console.error('Payment error:', error);

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
      setLoading(false);
      console.log('Checkout process completed', {
        success: !error,
        timestamp: new Date().toISOString()
      });
    }
  };

  const renderContactAndAddress = () => (
    <>
      <Text style={styles.label}>Full Name</Text>
      <TextInput
        style={styles.input}
        value={contact.name}
        onChangeText={t => setContact({ ...contact, name: t })}
        placeholder="Full Name"
      />
      {!!errors.name && <Text style={styles.error}>{errors.name}</Text>}
      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={contact.email}
        onChangeText={t => setContact({ ...contact, email: t })}
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      {!!errors.email && <Text style={styles.error}>{errors.email}</Text>}
      <Text style={styles.label}>Shipping Address</Text>
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
      <Text style={styles.label}>Postal Code</Text>
      <TextInput
        style={styles.input}
        value={address.zip}
        onChangeText={t => setAddress({ ...address, zip: t })}
        placeholder="Postal Code"
        keyboardType="default"
      />
      {!!errors.zip && <Text style={styles.error}>{errors.zip}</Text>}
    </>
  );

  const renderPayment = () => (
    <>
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryLabel}>Order Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>Subtotal:</Text>
          <Text style={styles.summaryValue}>£{subtotal.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>Tax (10%):</Text>
          <Text style={styles.summaryValue}>£{tax.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>Total:</Text>
          <Text style={[styles.summaryValue, styles.summaryTotal]}>£{total.toFixed(2)}</Text>
        </View>
      </View>

      {/* Card Element Container */}
      <View style={styles.cardContainer}>
        <div id="card-element" style={styles.cardElement} />
      </View>

      <Pressable
        style={[styles.button, { marginTop: 24, backgroundColor: '#BFA054' }]}
        onPress={handleStripeCheckout}
        disabled={paying}
      >
        {paying ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Pay with Card</Text>
        )}
      </Pressable>
    </>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
      <Text style={styles.header}>Checkout</Text>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        {renderContactAndAddress()}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Information</Text>
        {renderPayment()}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ivory },
  section: { marginBottom: 24, paddingHorizontal: 12, backgroundColor: '#fff', borderRadius: 8, padding: 16 },
  header: { fontSize: 28, fontWeight: '900', color: '#BFA054', marginBottom: 18, marginTop: 16, textAlign: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#BFA054' },
  summaryContainer: { marginBottom: 24 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryText: { fontSize: 16 },
  summaryValue: { fontSize: 16, fontWeight: 'bold', color: '#BFA054' },
  summaryTotal: { color: '#635BFF' },
  label: { fontSize: 16, fontWeight: 'bold', marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#E5DCC3', borderRadius: 8, padding: 10, marginTop: 6, fontSize: 16, backgroundColor: '#fff' },
  error: { color: 'red', marginTop: 4 },
  button: { backgroundColor: '#BFA054', borderRadius: 8, padding: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cardContainer: { 
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
  },
  cardElement: { 
    width: '100%',
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#333'
  },
  summaryLabel: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 }
});

export default CheckoutScreen;
