import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ScrollView } from 'react-native';
import { colors, fontFamily, spacing, borderRadius, shadows } from '../../theme';
import { Image as ExpoImage } from 'expo-image';
import { useStore } from '../../context/store';
import { useRouter } from 'expo-router';
import { PRODUCTS } from '../(data)/products';
import { trackEvent } from '../../lib/trackEvent';

function parsePrice(val) {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const clean = val.replace(/[^0-9.]/g, '');
    return parseFloat(clean) || 0;
  }
  return 0;
}

import CheckoutModal from '../components/CheckoutModal';
import ConfirmationModal from '../components/ConfirmationModal';

export default function CartScreen() {
  const { cart, updateCartItem, removeFromCart } = useStore();
  const router = useRouter();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [contact, setContact] = useState({ name: '', email: '' });
  const [address, setAddress] = useState({ line1: '', city: '', postcode: '' });

  // When checkout is successful, show confirmation modal
  const handleCheckoutSuccess = () => {
    setCheckoutOpen(false);
    setConfirmationOpen(true);
  };
  const handleContinueShopping = () => {
    setConfirmationOpen(false);
    router.replace('/(tabs)/shop');
  };

  const subtotal = cart.reduce((sum, item) => {
    let price = parsePrice(item.price);
    if (!price) {
      const product = PRODUCTS.find(p => p.id === item.id);
      price = product ? parsePrice(product.price) : 0;
    }
    return sum + price * item.quantity;
  }, 0);
  const shipping = 0.0; // Free UK shipping
  const total = subtotal + shipping;

  React.useEffect(() => {
    // Track cart view event
    trackEvent({ eventType: 'cart_view' });
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>

      <Text style={styles.header}>Your Cart</Text>
      <FlatList
        data={cart}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => {
          let price = parsePrice(item.price);
          if (!price) {
            const product = PRODUCTS.find(p => p.id === item.id);
            price = product ? parsePrice(product.price) : 0;
          }
          return (
            <View style={styles.itemRow}>
              <ExpoImage source={item.image} style={styles.image} contentFit="cover" />
              <View style={styles.itemDetails}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.price}>{`₤${price > 0 ? (price * item.quantity).toFixed(2) : 'N/A'}`}</Text>
                <View style={styles.quantityRow}>
                  <Pressable
                    style={styles.qtyBtn}
                    onPress={() => {
                      updateCartItem(item.id, Math.max(1, item.quantity - 1));
                      trackEvent({ eventType: 'cart_quantity_decrease', productId: item.id, quantity: item.quantity - 1 });
                    }}
                    accessibilityLabel="Decrease quantity"
                  >
                    <Text style={styles.qtyBtnText}>-</Text>
                  </Pressable>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <Pressable
                    style={styles.qtyBtn}
                    onPress={() => {
                      updateCartItem(item.id, item.quantity + 1);
                      trackEvent({ eventType: 'cart_quantity_increase', productId: item.id, quantity: item.quantity + 1 });
                    }}
                    accessibilityLabel="Increase quantity"
                  >
                    <Text style={styles.qtyBtnText}>+</Text>
                  </Pressable>
                </View>
                <Pressable
                  style={styles.removeBtn}
                  onPress={() => {
                    removeFromCart(item.id);
                    trackEvent({ eventType: 'remove_from_cart', productId: item.id });
                  }}
                  accessibilityLabel="Remove from cart"
                >
                  <Text style={styles.removeBtnText}>Remove</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.emptyText}>Your cart is empty.</Text>}
        contentContainerStyle={cart.length === 0 ? { flex: 1, justifyContent: 'center' } : {}}
        showsVerticalScrollIndicator={false}
      />
      <View style={styles.summary}>
        <View style={styles.summaryRow}><Text style={styles.label}>Subtotal</Text><Text style={styles.value}>{`₤${subtotal.toFixed(2)}`}</Text></View>
        <View style={styles.summaryRow}><Text style={styles.label}>Shipping (UK)</Text><Text style={styles.value}>{`₤${shipping.toFixed(2)}`}</Text></View>
        <View style={styles.summaryRow}><Text style={styles.labelTotal}>Total</Text><Text style={styles.valueTotal}>{`₤${total.toFixed(2)}`}</Text></View>
        <Pressable
          style={styles.checkoutBtn}
          onPress={() => setCheckoutOpen(true)}
          disabled={cart.length === 0}
          accessibilityLabel="Proceed to checkout"
        >
          <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
        </Pressable>
      </View>
    {/* Checkout Modal */}
    <CheckoutModal
      open={checkoutOpen}
      onClose={() => setCheckoutOpen(false)}
      cart={cart}
      contact={contact}
      address={address}
      setCart={() => {}}
      onSuccess={handleCheckoutSuccess}
    />
    {/* Confirmation Modal */}
    <ConfirmationModal
      open={confirmationOpen}
      onClose={handleContinueShopping}
      autoCloseMs={4000}
      onContinue={handleContinueShopping}
    />
    {/* Footer with compliance links */}
    <View style={styles.footer}>
      <Pressable onPress={() => router.push('/privacy-policy')} accessibilityRole="link" accessibilityLabel="Privacy Policy">
        <Text style={styles.footerLink}>Privacy Policy</Text>
      </Pressable>
      <Text style={styles.footerSeparator}>|</Text>
      <Pressable onPress={() => router.push('/terms-of-service')} accessibilityRole="link" accessibilityLabel="Terms of Service">
        <Text style={styles.footerLink}>Terms of Service</Text>
      </Pressable>
      <Text style={styles.footerSeparator}>|</Text>
      <Pressable onPress={() => router.push('/return-policy')} accessibilityRole="link" accessibilityLabel="Return Policy">
        <Text style={styles.footerLink}>Return Policy</Text>
      </Pressable>
      <Text style={styles.footerSeparator}>|</Text>
      <Pressable onPress={() => router.push('/contact')} accessibilityRole="link" accessibilityLabel="Contact">
        <Text style={styles.footerLink}>Contact</Text>
      </Pressable>
    </View>
  </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF7F0', padding: 16 },
  header: { fontSize: 28, fontWeight: '900', color: '#BFA054', marginBottom: 18 },
    footer: {
      flexDirection: 'row', flexWrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: spacing.md,
      backgroundColor: colors.ivory,
      borderTopWidth: 1,
      borderColor: colors.softGoldBorder,
      marginTop: spacing.lg,
    },
    footerLink: {
      color: colors.gold,
      fontSize: 15,
      fontFamily: fontFamily.sans,
      marginHorizontal: spacing.sm,
      textDecorationLine: 'underline',
    },
    footerSeparator: {
      color: colors.onyxBlack,
      fontSize: 16,
      marginHorizontal: 2,
    },
  itemRow: { flexDirection: 'row', marginBottom: 20, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 12, shadowColor: '#BFA054', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 8, elevation: 4, borderWidth: 1, borderColor: '#E5DCC3', width: 360 },
  image: { width: 72, height: 90, borderRadius: 12, marginRight: 16, backgroundColor: '#FAF7F0' },
  itemDetails: { flex: 1, justifyContent: 'center', marginLeft: 16 },
  title: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', marginBottom: 4 },
  price: { fontSize: 15, color: '#BFA054', marginBottom: 2 },
  quantityRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 6 },
  qtyBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#BFA054', alignItems: 'center', justifyContent: 'center', marginHorizontal: 6 },
  qtyBtnText: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  qtyText: { fontSize: 16, color: '#1A1A1A', fontWeight: '700', minWidth: 24, textAlign: 'center' },
  removeBtn: { alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 12, backgroundColor: '#FAF7F0', borderWidth: 1, borderColor: '#BFA054' },
  removeBtnText: { color: '#BFA054', fontWeight: '700', fontSize: 14 },
  emptyText: { textAlign: 'center', color: '#7C7C7C', fontSize: 18, marginTop: 60 },
  summary: { marginTop: 18, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, shadowColor: '#BFA054', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 8, elevation: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { color: '#1A1A1A', fontSize: 16 },
  value: { color: '#1A1A1A', fontSize: 16 },
  labelTotal: { color: '#BFA054', fontWeight: '900', fontSize: 18 },
  valueTotal: { color: '#BFA054', fontWeight: '900', fontSize: 18 },
  checkoutBtn: { marginTop: 18, backgroundColor: '#BFA054', borderRadius: 24, paddingVertical: 16, alignItems: 'center', shadowColor: '#BFA054', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 2, opacity: 1 },
  checkoutBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 18 },
});
