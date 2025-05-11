import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, fontFamily, spacing, borderRadius, shadows } from '../../theme';
import { useStore } from '../../context/store';
import ProductsList from '../(components)/products/ProductsList';

import { useEffect } from 'react';
import { trackEvent } from '../../lib/trackEvent';

export default function ShopScreen() {
  const { addToCart } = useStore();

  useEffect(() => {
    trackEvent({ eventType: 'shop_page_view' });
  }, []);

  return (
    <View style={styles.screen}>
      <ProductsList />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.l,
  },
});
