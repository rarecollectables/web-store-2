
import React from 'react';
import { View, StyleSheet, Image } from 'react-native';

// Define payment methods with official logo URLs
const paymentMethods = [
  // Primary payment methods in specified order
  { 
    name: 'Visa', 
    imageUrl: 'https://cdn.jsdelivr.net/gh/stripe/payment-element@latest/img/payment-methods/visa.svg'
  },
  { 
    name: 'American Express', 
    imageUrl: 'https://cdn.jsdelivr.net/gh/stripe/payment-element@latest/img/payment-methods/amex.svg'
  },
  { 
    name: 'Google Pay', 
    imageUrl: 'https://cdn.jsdelivr.net/gh/stripe/payment-element@latest/img/payment-methods/google-pay.svg'
  },
  { 
    name: 'Apple Pay', 
    imageUrl: 'https://cdn.jsdelivr.net/gh/stripe/payment-element@latest/img/payment-methods/apple-pay.svg'
  },
  { 
    name: 'Mastercard', 
    imageUrl: 'https://cdn.jsdelivr.net/gh/stripe/payment-element@latest/img/payment-methods/mastercard.svg'
  },
  
  // Other payment methods
  { 
    name: 'PayPal', 
    imageUrl: 'https://cdn.jsdelivr.net/gh/stripe/payment-element@latest/img/payment-methods/paypal.svg'
  },
  { 
    name: 'Klarna', 
    imageUrl: 'https://cdn.jsdelivr.net/gh/stripe/payment-element@latest/img/payment-methods/klarna.svg'
  },
  { 
    name: 'Discover', 
    imageUrl: 'https://cdn.jsdelivr.net/gh/stripe/payment-element@latest/img/payment-methods/discover.svg'
  },
  { 
    name: 'Diners Club', 
    imageUrl: 'https://cdn.jsdelivr.net/gh/stripe/payment-element@latest/img/payment-methods/diners.svg'
  },
  { 
    name: 'JCB', 
    imageUrl: 'https://cdn.jsdelivr.net/gh/stripe/payment-element@latest/img/payment-methods/jcb.svg'
  },
  { 
    name: 'Revolut', 
    imageUrl: 'https://cdn.jsdelivr.net/gh/stripe/payment-element@latest/img/payment-methods/revolut-pay.svg'
  },
];


export default function PaymentMethodsRow({ style = {}, iconSize = 38, pop = false }) {
  // Calculate dimensions based on iconSize
  const cardWidth = iconSize * 1.6;
  const cardHeight = iconSize * 1.0;
  
  return (
    <View style={[styles.row, style]}>
      {paymentMethods.map(({ name, imageUrl }) => (
        <View
          key={name}
          style={[
            styles.iconCard,
            {
              width: cardWidth,
              height: cardHeight,
              borderColor: pop ? '#e0e0e0' : '#f0f0f0',
              shadowOpacity: pop ? 0.15 : 0.08,
            },
          ]}
        >
          <Image
            source={{ uri: imageUrl }}
            style={{
              width: iconSize * 1.2,
              height: iconSize * 0.75,
              resizeMode: 'contain',
            }}
            accessibilityLabel={`${name} payment method`}
          />
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
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginHorizontal: 4,
    marginVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
});

