import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, fontFamily, spacing, borderRadius, shadows } from '../../theme';
import { useStore } from '../../context/store';
import ProductsList from '../(components)/products/ProductsList';
import SpringPromoModal from '../components/SpringPromoModal';
import { trackEvent } from '../../lib/trackEvent';

export default function ShopScreen() {
  const { addToCart } = useStore();
  const [showPromo, setShowPromo] = useState(false);

  useEffect(() => {
    trackEvent({ eventType: 'shop_page_view' });
    // Show promo only if not already shown
    if (typeof window !== 'undefined' && window.localStorage) {
      const hasSeenPromo = localStorage.getItem('hasSeenSpringPromo');
      if (!hasSeenPromo) {
        setShowPromo(true);
        localStorage.setItem('hasSeenSpringPromo', 'true');
      }
    }
  }, []);

  return (
    <View style={styles.screen}>
      <ProductsList />
      <SpringPromoModal visible={showPromo} onClose={() => setShowPromo(false)} />
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
