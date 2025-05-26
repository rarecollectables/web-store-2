import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, Text, ScrollView } from 'react-native';
import { colors, fontFamily, spacing, borderRadius, shadows } from '../../theme';
import { useStore } from '../../context/store';
import ProductsList from '../(components)/products/ProductsList';
import SpringPromoModal from '../components/SpringPromoModal';
import { trackEvent } from '../../lib/trackEvent';
import { useRouter } from 'expo-router';

export default function ShopScreen() {
  const router = useRouter();
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
    <ScrollView contentContainerStyle={styles.screen}>
      <ProductsList />
      <SpringPromoModal visible={showPromo} onClose={() => setShowPromo(false)} />
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
  footer: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
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
  screen: {
    backgroundColor: colors.background,
    padding: spacing.l,
  },
});
