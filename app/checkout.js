import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, ScrollView, Platform } from 'react-native';
import PaymentMethodsRow from './(components)/PaymentMethodsRow';
import { useStore } from '../context/store';
// import { PRODUCTS } from './(data)/products';
import { fetchProductsShipping } from '../lib/supabase/products';
import { getGuestSession } from '../lib/supabase/client';
import { checkoutAttemptService } from '../lib/supabase/services';
import { z } from 'zod';
import { storeOrder } from './components/orders-modal';
import { trackEvent } from '../lib/trackEvent';
import { colors, fontFamily, spacing, borderRadius, shadows } from '../theme';
import ConfirmationModal from './components/ConfirmationModal';
import { useRouter } from 'expo-router';
import { CardElement, useElements, useStripe, Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

// Stripe keys from env
const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const NETLIFY_STRIPE_FUNCTION_URL = 'https://rarecollectables.co.uk/.netlify/functions/create-checkout-session';

const contactSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Enter a valid email'),
});
const ukPostcodeRegex = /^(GIR 0AA|[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2})$/i;
const addressSchema = z.object({
  line1: z.string().min(3, 'Address required'),
  city: z.string().min(2, 'City required'),
  postcode: z.string()
    .min(5, 'Postcode required')
    .max(8, 'Postcode too long')
    .regex(ukPostcodeRegex, 'Enter a valid UK postcode (e.g., SW1A 1AA)'),
});



export function StripePaymentForm({ cart, contact, address, errors, setErrors, paying, setPaying, validateForm, removeFromCart, onSuccess, coupon, discountAmount }) {
  const stripe = useStripe();
  const elements = useElements();

  const handleStripeCheckout = async () => {
    if (!validateForm()) return;
    try {
      setPaying(true);
      // Calculate discounted total
      const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const discountedSubtotal = Math.max(0, subtotal - (discountAmount || 0));
      const total = Math.max(0, discountedSubtotal); // No tax applied
      // Track payment start
      trackEvent({ eventType: 'checkout_payment_started', total, items: cart.length, coupon });
      const response = await fetch(NETLIFY_STRIPE_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart, contact, address }), // backend still calculates amount, but we track discount in analytics and order
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to create payment intent: ${response.status} ${errText}`);
      }
      const { clientSecret } = await response.json();
      const cardElement = elements.getElement(CardElement);
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: contact.name,
            email: contact.email,
            address: { line1: address.line1, city: address.city, postal_code: address.postcode },
          },
        },
      });
      if (result.error) {
        throw new Error(`Stripe payment failed: ${result.error.message}`);
      }
      if (result.paymentIntent && result.paymentIntent.status !== 'succeeded') {
        throw new Error(`Payment not successful: ${result.paymentIntent.status}`);
      }
      await storeOrder({
        items: cart,
        contact,
        address,
        total,
        discount: discountAmount || 0,
        coupon: coupon || null,
        paymentIntentId: result.paymentIntent.id,
      });
      // Track payment success
      trackEvent({ eventType: 'checkout_payment_success', total, items: cart.length, coupon });
      trackEvent({ eventType: 'order_completed', total, items: cart.length, coupon });
      cart.forEach(item => removeFromCart(item.id));
      if (onSuccess) onSuccess();
    } catch (error) {
      // Track payment failure
      trackEvent({ eventType: 'checkout_payment_failed', error: error.message, total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0), items: cart.length, coupon });
      setErrors({ ...errors, payment: [error.message || 'An error occurred during checkout. Please try again.'] });
    } finally {
      setPaying(false);
    }
  };


  return (
    <View style={styles.paymentSection}>
      <Text style={styles.sectionTitle}>Payment Information</Text>
      {errors.payment && errors.payment.map((msg, idx) => (
        <Text key={idx} style={styles.errorText}>{msg}</Text>
      ))}
      <View style={styles.cardElementLuxuryContainer}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Text style={styles.secureIcon}>🔒</Text>
          <Text style={styles.secureLabel}>Secure Card Payment</Text>
        </View>
        <Text style={styles.inputLabel}>Card Details</Text>
        <View style={styles.stripeCardLuxuryWrapper}>
          <CardElement options={{
            style: {
              base: {
                fontSize: 18,
                color: colors.onyxBlack,
                fontFamily,
                backgroundColor: colors.white,
                border: 'none',
                padding: '14px 14px',
                '::placeholder': { color: '#bfa054', fontStyle: 'italic' },
              },
              invalid: {
                color: colors.ruby,
                borderColor: colors.ruby,
              },
            },
          }} />
        </View>
        <Text style={styles.cardHelperText}>All transactions are encrypted and processed securely.</Text>
        <Pressable
          style={({ pressed }) => [
            styles.checkoutButton,
            paying && styles.checkoutButtonDisabled,
            pressed && !paying && { opacity: 0.93 },
          ]}
          onPress={handleStripeCheckout}
          disabled={paying}
          accessibilityRole="button"
          accessibilityLabel="Pay with Card"
        >
          {paying ? (
            <ActivityIndicator color={colors.gold} style={{ marginVertical: 2 }} />
          ) : (
            <Text style={styles.checkoutButtonText}>Pay with Card</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

export default function CheckoutScreen() {
  // Coupon state (must be defined before use)
  const [coupon, setCoupon] = useState('');
  const [couponStatus, setCouponStatus] = useState(null); // { valid: bool, discount: {type, value}, error }
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const router = useRouter();
  const { cart, removeFromCart } = useStore();
  const [contact, setContact] = useState({ name: '', email: '' });
  const [address, setAddress] = useState({ line1: '', city: '', postcode: '' });
  // Debounce timer for logging checkout attempts
  const [debounceTimer, setDebounceTimer] = useState(null);
  const [errors, setErrors] = useState({});
  const [stripeLoading, setStripeLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [stripe, setStripe] = useState(null);
  const [stripeError, setStripeError] = useState(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);

  // Called after successful payment
  const handleCheckoutSuccess = () => {
    setConfirmationOpen(true);
  };

  // Called when user closes modal or continues shopping
  const handleContinueShopping = () => {
    setConfirmationOpen(false);
    router.replace('/(tabs)/shop'); // Redirect to shop tab after order success
  };

  useEffect(() => {
    // Track when user views the checkout page
    trackEvent({ eventType: 'checkout_view' });
    // Track when user proceeds to checkout (from cart)
    trackEvent({ eventType: 'proceed_to_checkout', items: cart.length, metadata: { cart } });
    const initializeStripe = async () => {
      try {
        setStripeLoading(true);
        setStripeError(null);
        if (!STRIPE_PUBLISHABLE_KEY) {
          setStripeError('Stripe publishable key is missing. Please check your environment configuration.');
          return;
        }
        const stripeInstance = await loadStripe(STRIPE_PUBLISHABLE_KEY);
        if (stripeInstance) setStripe(stripeInstance);
        else setStripeError('Failed to initialize Stripe. Please check your publishable key and network connection.');
      } catch (error) {
        setStripeError('Failed to initialize Stripe: ' + (error.message || error));
      } finally {
        setStripeLoading(false);
      }
    };
    initializeStripe();
  }, []);

  const handleInputChange = (type, field, value) => {
    // Compute the next state for contact and address
    let nextContact = contact;
    let nextAddress = address;
    if (type === 'contact') {
      nextContact = { ...contact, [field]: value };
      setContact(nextContact);
    } else if (type === 'address') {
      nextAddress = { ...address, [field]: value };
      setAddress(nextAddress);
    }
    // Debounced log to Supabase with the latest state
    if (debounceTimer) clearTimeout(debounceTimer);
    setDebounceTimer(setTimeout(async () => {
      try {
        const guest_session_id = await getGuestSession();
        const payload = {
          guest_session_id,
          email: type === 'contact' && field === 'email' ? value : nextContact.email,
          contact: nextContact,
          address: nextAddress,
          cart,
          status: 'started',
          metadata: {}
        };
        console.log('[CHECKOUT_ATTEMPT_PAYLOAD]', payload);
        await checkoutAttemptService.upsertAttempt(payload);
      } catch (e) {
        console.error('Checkout attempt logging failed:', e);
      }
    }, 600));
  };

  // Coupon validation handler
  const handleApplyCoupon = async () => {
    if (!coupon) return;
    setApplyingCoupon(true);
    setCouponStatus(null);
    try {
      const response = await fetch('/.netlify/functions/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coupon }),
      });
      const data = await response.json();
      if (response.ok && data.valid) {
        setCouponStatus({ valid: true, discount: data.discount, promo: data.promo });
      } else {
        setCouponStatus({ valid: false, error: data.error || 'Invalid or expired coupon code.' });
      }
    } catch (err) {
      setCouponStatus({ valid: false, error: err.message || 'Failed to validate coupon.' });
    } finally {
      setApplyingCoupon(false);
    }
  };

  const validateForm = () => {
    const contactErrors = {};
    const addressErrors = {};
    try { contactSchema.parse(contact); } catch (error) {
      if (error.errors) error.errors.forEach(err => { contactErrors[err.path[0]] = err.message; });
    }
    try { addressSchema.parse(address); } catch (error) {
      if (error.errors) error.errors.forEach(err => { addressErrors[err.path[0]] = err.message; });
    }
    setErrors({ contact: Object.values(contactErrors), address: Object.values(addressErrors) });
    return Object.keys(contactErrors).length === 0 && Object.keys(addressErrors).length === 0;
  };

  // Shipping selection: 'free' or 'next_day'
  const [shippingOption, setShippingOption] = useState('free');
  // Dynamic shipping eligibility from Supabase
  const [shippingLoading, setShippingLoading] = useState(false);
  const [allNextDayEligible, setAllNextDayEligible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchShipping = async () => {
      if (cart.length === 0) {
        setAllNextDayEligible(false);
        return;
      }
      setShippingLoading(true);
      try {
        const shippingData = await fetchProductsShipping(cart.map(item => item.id));
        if (!cancelled) {
          const eligible = shippingData.length > 0 && shippingData.every(product => product.shipping_label === 'next_day');
          setAllNextDayEligible(eligible);
        }
      } catch (e) {
        if (!cancelled) setAllNextDayEligible(false);
      } finally {
        if (!cancelled) setShippingLoading(false);
      }
    };
    fetchShipping();
    return () => { cancelled = true; };
  }, [cart]);

  const SHIPPING_OPTIONS = [
    { key: 'free', label: 'Free Shipping (2-4 business days)', cost: 0 },
    ...(allNextDayEligible ? [{ key: 'next_day', label: 'Next Day Delivery (£3.99)', cost: 3.99 }] : [])
  ];

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  let discountAmount = 0;
  if (couponStatus?.valid && couponStatus.discount) {
    if (couponStatus.discount.type === 'percent') {
      discountAmount = subtotal * (couponStatus.discount.value / 100);
    } else if (couponStatus.discount.type === 'amount') {
      discountAmount = couponStatus.discount.value;
    }
  }
  // Calculate shipping cost
  const shippingCost = SHIPPING_OPTIONS.find(opt => opt.key === shippingOption)?.cost || 0;
  const total = Math.max(0, subtotal - discountAmount + shippingCost);

  if (stripeLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={styles.loadingText}>Loading secure payment form...</Text>
      </View>
    );
  }
  if (stripeError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>{stripeError}</Text>
        <Text style={styles.errorText}>Please contact support or try again later.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.container, { flexGrow: 1, minHeight: '100vh', paddingHorizontal: 16 }]} keyboardShouldPersistTaps="handled">
      <View style={[styles.checkoutBox, { width: '100%', maxWidth: undefined, padding: 0, margin: 0 }]}>
        <Text style={styles.header}>Checkout</Text>
        <Text style={styles.subHeader}>Please fill in your details to complete your order</Text>

        {/* Contact & Address */}
        {/* Rendered ONCE below payment section */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <Text style={styles.sectionSubtitle}>Required for order confirmation</Text>
          {errors.contact && errors.contact.map((msg, idx) => (
            <Text key={idx} style={styles.errorText}>{msg}</Text>
          ))}
          <TextInput
            style={[styles.input, errors.contact?.includes('Name is required') && styles.inputError]}
            placeholder="Full Name"
            value={contact.name}
            onChangeText={v => handleInputChange('contact', 'name', v)}
            autoComplete="name"
            placeholderTextColor={colors.platinum}
          />
          <TextInput
            style={[styles.input, errors.contact?.includes('Enter a valid email') && styles.inputError]}
            placeholder="Email"
            value={contact.email}
            onChangeText={v => handleInputChange('contact', 'email', v)}
            keyboardType="email-address"
            autoComplete="email"
            placeholderTextColor={colors.platinum}
          />
        </View>
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <Text style={styles.sectionSubtitle}>Where should we send your order?</Text>
          {errors.address && errors.address.map((msg, idx) => (
            <Text key={idx} style={styles.errorText}>{msg}</Text>
          ))}
          <TextInput
            style={[styles.input, errors.address?.includes('Address required') && styles.inputError]}
            placeholder="Address Line 1"
            value={address.line1}
            onChangeText={v => handleInputChange('address', 'line1', v)}
            autoComplete="address-line1"
            placeholderTextColor={colors.platinum}
          />
          <TextInput
            style={[styles.input, errors.address?.includes('City required') && styles.inputError]}
            placeholder="City"
            value={address.city}
            onChangeText={v => handleInputChange('address', 'city', v)}
            autoComplete="address-level2"
            placeholderTextColor={colors.platinum}
          />
          <TextInput
            style={[styles.input, errors.address?.includes('Postcode required') && styles.inputError]}
            placeholder="Postcode"
            value={address.postcode}
            onChangeText={v => handleInputChange('address', 'postcode', v)}
            autoComplete="postal-code"
            placeholderTextColor={colors.platinum}
          />
        </View>
        {/* Coupon Code Input */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Discount Code</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <TextInput
              style={[styles.input, { flex: 1, marginRight: 12 }]}
              placeholder="Enter coupon code"
              value={coupon}
              onChangeText={setCoupon}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholderTextColor={colors.platinum}
            />
            <Pressable
              style={({ pressed }) => [styles.checkoutButton, applyingCoupon && styles.checkoutButtonDisabled, pressed && !applyingCoupon && { opacity: 0.93 }]}
              onPress={handleApplyCoupon}
              disabled={applyingCoupon}
              accessibilityRole="button"
              accessibilityLabel="Apply Coupon"
            >
              {applyingCoupon ? (
                <ActivityIndicator color={colors.gold} style={{ marginVertical: 2 }} />
              ) : (
                <Text style={styles.checkoutButtonText}>Apply</Text>
              )}
            </Pressable>
          </View>
          {couponStatus && (
            couponStatus.valid ? (
              <Text style={[styles.successText, { marginBottom: 4 }]}>Coupon applied: {coupon.toUpperCase()} {couponStatus.discount.type === 'percent' ? `(${couponStatus.discount.value}% off)` : `(-₤${couponStatus.discount.value.toFixed(2)})`}</Text>
            ) : (
              <Text style={[styles.errorText, { marginBottom: 4 }]}>{couponStatus.error}</Text>
            )
          )}
        </View>
        {/* Shipping Options */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Shipping Options</Text>
          {shippingLoading ? (
            <ActivityIndicator color={colors.gold} style={{ marginVertical: 8 }} />
          ) : (
            SHIPPING_OPTIONS.map(opt => (
              <Pressable
                key={opt.key}
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}
                onPress={() => setShippingOption(opt.key)}
                accessibilityRole="radio"
                accessibilityState={{ selected: shippingOption === opt.key }}
              >
                <View style={{
                  width: 20, height: 20, borderRadius: 10, borderWidth: 2,
                  borderColor: shippingOption === opt.key ? colors.gold : colors.platinum,
                  alignItems: 'center', justifyContent: 'center', marginRight: 10
                }}>
                  {shippingOption === opt.key && (
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.gold }} />
                  )}
                </View>
                <Text style={{ color: colors.text, fontSize: 16 }}>{opt.label}</Text>
              </Pressable>
            ))
          )}
        </View>
        {/* Order Summary */}
        <View style={styles.orderSummarySection}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Subtotal</Text><Text style={styles.summaryValue}>{`₤${subtotal.toFixed(2)}`}</Text></View>
          {couponStatus?.valid && discountAmount > 0 && (
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Discount</Text><Text style={[styles.summaryValue, { color: colors.gold }]}>-₤{discountAmount.toFixed(2)}</Text></View>
          )}
          <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Shipping</Text><Text style={styles.summaryValue}>{shippingCost === 0 ? 'Free' : `₤${shippingCost.toFixed(2)}`}</Text></View>
          <View style={styles.summaryRow}><Text style={styles.summaryLabelTotal}>Total</Text><Text style={styles.summaryValueTotal}>{`₤${total.toFixed(2)}`}</Text></View>
        </View>
        {/* Stripe Payment */}
        {stripe && (
          <Elements stripe={stripe} options={{ locale: 'en-GB' }}>
            <StripePaymentForm
              cart={cart}
              contact={contact}
              address={address}
              errors={errors}
              setErrors={setErrors}
              paying={paying}
              setPaying={setPaying}
              validateForm={validateForm}
              removeFromCart={removeFromCart}
              onSuccess={handleCheckoutSuccess}
              coupon={couponStatus?.valid ? coupon : null}
              discountAmount={discountAmount}
            />
          </Elements>
        )}
      
        {/* Confirmation Modal */}
        <ConfirmationModal
          open={confirmationOpen}
          onClose={handleContinueShopping}
          onContinue={handleContinueShopping}
          autoCloseMs={15000}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: colors.white,
  },
  checkoutBox: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 20,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subHeader: {
    fontSize: 16,
    color: colors.grey,
    marginBottom: 20,
  },
  formSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.grey,
    marginBottom: 10,
  },
  input: {
    height: 40,
    borderColor: colors.grey,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 10,
  },
  inputError: {
    borderColor: colors.ruby,
  },
  cardElementLuxuryContainer: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.gold,
    boxShadow: '0 2px 16px rgba(191,160,84,0.08)',
    padding: 22,
    marginTop: 16,
    marginBottom: 18,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
    elevation: 3,
  },
  stripeCardLuxuryWrapper: {
    backgroundColor: colors.white,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.gold,
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginBottom: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  secureIcon: {
    fontSize: 18,
    color: colors.gold,
    marginRight: 6,
  },
  secureLabel: {
    fontSize: 16,
    color: colors.gold,
    fontFamily,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  cardHelperText: {
    fontSize: 13,
    color: colors.platinum,
    marginBottom: 8,
    marginTop: 2,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 14,
    color: colors.ruby,
    marginBottom: 10,
  },
  orderSummarySection: {
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 16,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  summaryLabelTotal: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  summaryValueTotal: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.grey,
    marginTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  checkoutButton: {
    backgroundColor: colors.gold,
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
    marginTop: 18,
    marginBottom: 10,
  },
  checkoutButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    fontFamily: fontFamily.serif,
    textShadowColor: '#e6c98b',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  checkoutButtonDisabled: {
    backgroundColor: '#e5d9c3',
    opacity: 0.6,
  },
});


