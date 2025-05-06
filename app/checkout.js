import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { useStore } from '../context/store';
import { z } from 'zod';
import { storeOrder } from './components/orders-modal';
import { trackEvent } from '../lib/trackEvent';
import './checkout.css';

console.log('hCaptcha site key being used:', process.env.EXPO_PUBLIC_HCAPTCHA_SITE_KEY);

// Get Stripe keys from environment
const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const NETLIFY_STRIPE_FUNCTION_URL = 'https://rarecollectables1.netlify.app/.netlify/functions/create-checkout-session';

const contactSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Enter a valid email'),
});
const addressSchema = z.object({
  line1: z.string().min(3, 'Address required'),
  city: z.string().min(2, 'City required'),
  postcode: z.string().min(3, 'Postcode required'),
});

function StripePaymentForm({ cart, contact, address, errors, setErrors, paying, setPaying, validateForm, removeFromCart }) {
  const stripe = useStripe();
  const elements = useElements();

  const handleStripeCheckout = async () => {
    if (!validateForm()) return;
    try {
      setPaying(true);
      const response = await fetch(NETLIFY_STRIPE_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY || ''}` },
        body: JSON.stringify({ cart, contact, address }),
      });
      if (!response.ok) {
        const errText = await response.text();
        console.error('Stripe backend error:', response.status, errText);
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
        console.error('Stripe payment error:', result.error);
        throw new Error(`Stripe payment failed: ${result.error.message}`);
      }
      if (result.paymentIntent && result.paymentIntent.status !== 'succeeded') {
        console.error('Stripe payment not successful:', result.paymentIntent);
        throw new Error(`Payment not successful: ${result.paymentIntent.status}`);
      }
      await storeOrder({
        items: cart,
        contact,
        address,
        total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
        paymentIntentId: result.paymentIntent.id,
      });
      trackEvent('Order Completed', {
        total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
        items: cart.length,
      });
      cart.forEach(item => removeFromCart(item.id));
      window.location.href = '/checkout-success';
    } catch (error) {
      console.error('Checkout error:', error);
      window.alert(error.message || 'An error occurred during checkout. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="form-section payment-section-expert">
      <div className="section-header">
        <h2>Payment Information</h2>
        <p>Secure payment processing</p>
      </div>
      <div className="payment-section-flex">
        <div className="stripe-payment-form">
          <label htmlFor="card-element" className="input-label">Card Details</label>
          <div className="card-element-container">
            <CardElement id="card-element" className="stripe-card-element" options={{ style: { base: { fontSize: '16px', color: '#2D3748', letterSpacing: '0.025em', fontFamily: 'Inter-SemiBold', backgroundColor: '#fff', '::placeholder': { color: '#aab7c4' }, }, invalid: { color: '#E53E3E' } } }} />
          </div>
        </div>
      </div>
      <div className="button-container">
        <button className={`checkout-button ${paying ? 'checkout-button-disabled' : ''}`} onClick={handleStripeCheckout} disabled={paying}>
          {paying ? (
            <div className="button-loading">
              <div className="button-spinner"></div>
            </div>
          ) : (
            <span>Pay with Card</span>
          )}
        </button>
      </div>
    </div>
  );
}

export default function CheckoutScreen() {
  const { cart, removeFromCart } = useStore();
  const [contact, setContact] = useState({ name: '', email: '' });
  const [address, setAddress] = useState({ line1: '', city: '', postcode: '' });
  const [errors, setErrors] = useState({});
  const [stripeLoading, setStripeLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [stripe, setStripe] = useState(null);
  const [stripeError, setStripeError] = useState(null);

  useEffect(() => {
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
        console.error('Failed to initialize Stripe:', error);
      } finally {
        setStripeLoading(false);
      }
    };
    initializeStripe();
  }, []);

  const handleInputChange = (type, field, value) => {
    if (type === 'contact') setContact(prev => ({ ...prev, [field]: value }));
    else if (type === 'address') setAddress(prev => ({ ...prev, [field]: value }));
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

  const renderContactAndAddress = () => (
    <div className="contact-address-form">
      <div className="form-section-header">
        <h2>Contact Information</h2>
        <p>Required for order confirmation</p>
      </div>
      <div className="form-section">
        {Object.entries(errors).map(([type, errorList]) => (
          errorList.map((error, index) => (
            <div key={index} className="error-message">{error}</div>
          ))
        ))}
        <div className="input-group">
          <input className={`form-input ${errors.contact?.includes('Name is required') ? 'error-input' : ''}`} placeholder="Full Name" value={contact.name} onChange={e => handleInputChange('contact', 'name', e.target.value)} autoComplete="name" />
          <input className={`form-input ${errors.contact?.includes('Enter a valid email') ? 'error-input' : ''}`} placeholder="Email" value={contact.email} onChange={e => handleInputChange('contact', 'email', e.target.value)} type="email" autoComplete="email" />
          <input className={`form-input ${errors.address?.includes('Address required') ? 'error-input' : ''}`} placeholder="Address Line 1" value={address.line1} onChange={e => handleInputChange('address', 'line1', e.target.value)} autoComplete="address-line1" />
          <input className={`form-input ${errors.address?.includes('City required') ? 'error-input' : ''}`} placeholder="City" value={address.city} onChange={e => handleInputChange('address', 'city', e.target.value)} autoComplete="address-level2" />
          <input className={`form-input ${errors.address?.includes('Postcode required') ? 'error-input' : ''}`} placeholder="Postcode" value={address.postcode} onChange={e => handleInputChange('address', 'postcode', e.target.value)} type="text" autoComplete="postal-code" />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {stripeLoading && (
        <div className="stripe-loading">
          <div className="loading-spinner"></div>
          <div>Loading secure payment form...</div>
        </div>
      )}
      {stripeError && !stripeLoading && (
        <div className="stripe-error">
          <div style={{ color: '#E53E3E', fontWeight: 'bold', marginBottom: 16 }}>{stripeError}</div>
          <div>Please contact support or try again later.</div>
        </div>
      )}
      {stripe && !stripeLoading && !stripeError && (
        <Elements stripe={stripe}>
          <div className="checkout-container expert-layout">
            <div className="checkout-content">
              <button className="back-to-cart-btn" onClick={() => { window.location.href = '/cart'; }}>
                ← Back to Cart
              </button>
              <div className="checkout-header">
                <h1>Checkout</h1>
                <p>Please fill in your details to complete your order</p>
              </div>
              <div className="form-container">
                <div className="form-section">
                  <div className="section-header">
                    <h2>Contact Information</h2>
                    <p>Required for order confirmation</p>
                  </div>
                  {renderContactAndAddress()}
                </div>
                <div className="form-section order-summary-section">
                  <div className="section-header">
                    <h2>Order Summary</h2>
                    <p>Review your order details</p>
                  </div>
                  <div className="summary-container">
                    <div className="summary-item">
                      <span className="summary-label">Subtotal:</span>
                      <span className="summary-value">£{cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Tax (10%):</span>
                      <span className="summary-value">£{(cart.reduce((sum, item) => sum + item.price * item.quantity, 0) * 0.1).toFixed(2)}</span>
                    </div>
                    <div className="summary-item total">
                      <span className="summary-label total-label">Total:</span>
                      <span className="summary-value total-value">£{(cart.reduce((sum, item) => sum + item.price * item.quantity, 0) + (cart.reduce((sum, item) => sum + item.price * item.quantity, 0) * 0.1)).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
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
                />
              </div>
            </div>
          </div>
        </Elements>
      )}
    </>
  );
}
