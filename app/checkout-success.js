import React from 'react';
import { useRouter } from 'expo-router';

export default function CheckoutSuccess() {
  const router = useRouter();

  return (
    <div className="checkout-success-page" style={{ maxWidth: 540, margin: '60px auto', padding: 32, background: '#fff', borderRadius: 12, boxShadow: '0 2px 18px rgba(44,62,80,0.10)' }}>
      <h1 style={{ color: '#38a169', fontSize: 32, marginBottom: 12 }}>Thank you for your purchase!</h1>
      <p style={{ fontSize: 18, marginBottom: 24 }}>
        Your order has been placed successfully. You will receive a confirmation email soon.
      </p>
      <button
        style={{ background: '#BFA054', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 32px', fontSize: 18, cursor: 'pointer', marginBottom: 12 }}
        onClick={() => router.replace('/')}>
        Continue Shopping
      </button>
      <div style={{ marginTop: 18, color: '#374151', fontSize: 16 }}>
        <span role="img" aria-label="delivery">🚚</span> Estimated delivery: 2-4 business days
      </div>
    </div>
  );
}
