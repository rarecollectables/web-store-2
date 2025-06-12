
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import ApplePayIcon from '../assets/payment-logos/ApplePayIcon';
import GooglePayIcon from '../assets/payment-logos/GooglePayIcon';
import KlarnaIcon from '../assets/payment-logos/KlarnaIcon';
import RevolutIcon from '../assets/payment-logos/RevolutIcon';

const paymentMethods = [
  { name: 'Visa', icon: <FontAwesome name="cc-visa" />, color: '#1a1f71' },
  { name: 'Mastercard', icon: <FontAwesome name="cc-mastercard" />, color: '#EB001B' },
  { name: 'American Express', icon: <FontAwesome name="cc-amex" />, color: '#2e77bb' },
  { name: 'PayPal', icon: <FontAwesome name="cc-paypal" />, color: '#003087' },
  { name: 'Discover', icon: <FontAwesome name="cc-discover" />, color: '#FF6000' },
  { name: 'Diners Club', icon: <FontAwesome name="cc-diners-club" />, color: '#006BA6' },
  { name: 'JCB', icon: <FontAwesome name="cc-jcb" />, color: '#0A7EBA' },
  { name: 'Apple Pay', svg: <ApplePayIcon /> },
  { name: 'Google Pay', svg: <GooglePayIcon /> },
  { name: 'Klarna', svg: <KlarnaIcon /> },
  { name: 'Revolut Pay', svg: <RevolutIcon /> },
];


export default function PaymentMethodsRow({ style = {}, iconSize = 38, pop = false }) {
  return (
    <View style={[styles.row, style]}>
      {paymentMethods.map(({ name, icon, color, svg }) => (
        <View
          key={name}
          style={[
            styles.iconCard,
            {
              width: iconSize + 12,
              height: iconSize + 12,
              borderColor: pop ? '#e0e0e0' : '#f0f0f0',
              shadowOpacity: pop ? 0.18 : 0.08,
            },
          ]}
        >
          {icon
            ? React.cloneElement(icon, { size: iconSize, color })
            : svg && React.cloneElement(svg, { width: iconSize, height: iconSize })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  iconCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1.5,
    marginHorizontal: 3,
    marginVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4285F4',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
});

