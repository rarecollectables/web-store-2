import React, { useState } from 'react';

// You may want to fetch these from your backend in the future
const TEMPLATES = [
  { value: 'order-confirmation', label: 'Order Confirmation' },
  { value: 'order-update', label: 'Order Update / Shipment Tracking' },
  { value: 'enquiry-reply', label: 'Enquiry Reply' },
];

export default function AdminEmailsPage() {
  const [to, setTo] = useState('');
  const [template, setTemplate] = useState('order-confirmation');
  const [subject, setSubject] = useState('');
  const [orderData, setOrderData] = useState(''); // JSON string for order/enquiry
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault(); // Prevent full page reload
    setStatus('');
    setLoading(true);
    try {
      const payload = {
        to,
        template,
        subject,
        data: orderData ? JSON.parse(orderData) : {},
      };
      const res = await fetch('/api/sendAdminEmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      let result = null;
      try {
        result = await res.json();
      } catch (err) {
        setStatus('Failed to parse response as JSON.');
        console.error('Failed to parse response as JSON:', err);
        return;
      }
      if (result.success) {
        setStatus('Email sent successfully!');
      } else {
        setStatus('Failed: ' + (result.error || 'Unknown error'));
      }
      if (result.logs) {
        console.log('Email send logs:', result.logs);
      }
    } catch (err) {
      setStatus('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div style={{ maxWidth: 520, margin: '40px auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #eee', padding: 32 }}>
      <h2 style={{ marginBottom: 18, color: '#bfa054' }}>Send Email to Customer</h2>
      <form onSubmit={handleSend}>
        <label>Email address:</label>
        <input
          type="email"
          required
          value={to}
          onChange={e => setTo(e.target.value)}
          style={{ width: '100%', marginBottom: 16, padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
        />
        <label>Template:</label>
        <select
          value={template}
          onChange={e => setTemplate(e.target.value)}
          style={{ width: '100%', marginBottom: 16, padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
        >
          {TEMPLATES.map(t => <option value={t.value} key={t.value}>{t.label}</option>)}
        </select>
        <label>Subject (optional):</label>
        <input
          type="text"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          style={{ width: '100%', marginBottom: 16, padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
          placeholder="Leave blank for default"
        />
        <label>Order/Enquiry Data (JSON):</label>
        <textarea
          value={orderData}
          onChange={e => setOrderData(e.target.value)}
          rows={7}
          style={{ width: '100%', marginBottom: 18, padding: 8, borderRadius: 6, border: '1px solid #ccc', fontFamily: 'monospace' }}
          placeholder='{"customerName":"Jane Doe","id":"ORDER123", ...}'
        />
        <button type="submit" disabled={loading} style={{ background: '#bfa054', color: '#fff', padding: '12px 28px', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Sending...' : 'Send Email'}
        </button>
        {status && <div style={{ marginTop: 16, color: status.startsWith('Email sent') ? 'green' : 'crimson' }}>{status}</div>}
      </form>
      <div style={{ marginTop: 28, fontSize: 13, color: '#888' }}>
        <b>Tip:</b> Paste order or enquiry data as JSON.<br />
        Templates and logic can be extended in your functions.
      </div>
    </div>
  );
}
