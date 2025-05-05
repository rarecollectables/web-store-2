import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, fontFamily, spacing, borderRadius, shadows } from '../../theme';
import { useStore } from '../../context/store';
import ProductsList from '../(components)/products/ProductsList';

export default function ShopScreen() {
  const { addToCart } = useStore();

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
