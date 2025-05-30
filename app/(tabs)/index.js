import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions, ImageBackground, ScrollView, TextInput, Alert, Linking } from 'react-native';
import { trackEvent } from '../../lib/trackEvent';
import { useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { colors, fontFamily, spacing, borderRadius, shadows } from '../../theme/index.js';
import ChatScreen from '../chat/index.js';


// Category definitions for homepage
const CATEGORIES = [
  { id: 'necklaces', title: 'Necklaces' },
  { id: 'earrings', title: 'Earrings' },
  { id: 'bracelets', title: 'Bracelets' },
  { id: 'rings', title: 'Rings' }
];

// Local category image assets mapping
const CATEGORY_IMAGES = {
  necklaces: [
    require('../../assets/images/products/1-2-Necklace.avif'),
    require('../../assets/images/products/1-5-Necklace.avif'),
    require('../../assets/images/products/3-1-Necklace.avif'),
    require('../../assets/images/products/3-5-Necklace.avif')
  ],
  bracelets: [
    require('../../assets/images/products/6-1.avif'),
    require('../../assets/images/products/6-4.avif'),
    require('../../assets/images/products/3-4.avif'),
    require('../../assets/images/products/3-1.avif')
  ],
  rings: [
    require('../../assets/images/products/7-1.avif'),
    require('../../assets/images/products/7-5.avif'),
    require('../../assets/images/products/4-1-ring.avif'),
    require('../../assets/images/products/4-2-ring.avif')
  ],
  earrings: [
    require('../../assets/images/products/8-1.avif'),
    require('../../assets/images/products/8-5.avif'),
    require('../../assets/images/products/1-1-earrings.avif'),
    require('../../assets/images/products/1-5-earrings.avif')
  ]
};

// Animated Category Card
function CategoryCard({ id, title, cardSize, marginRight, onPress, images }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 3200);
    return () => clearInterval(interval);
  }, [images.length]);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`View ${title} category`}
      style={({ pressed }) => [
        styles.categoryCard,
        { width: cardSize, height: cardSize, marginRight, opacity: pressed ? 0.85 : 1 },
        { borderColor: colors.softGoldBorder, backgroundColor: colors.white },
        { shadowColor: colors.gold, shadowOpacity: 0.18 },
      ]}
    >
      <ImageBackground
        source={images[currentIndex]}
        style={styles.categoryImage}
        imageStyle={{ borderRadius: borderRadius.md }}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      >
        <View style={styles.categoryOverlay} />
        <Text style={styles.categoryTitle}>{title}</Text>
      </ImageBackground>
    </Pressable>
  );
}

import SpringPromoModal from '../components/SpringPromoModal';
import BestSellersSection from '../components/BestSellersSection';
import ReviewsCarousel from '../components/ReviewsCarousel';

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const isDark = colorScheme === 'dark';
  const [searchQuery, setSearchQuery] = useState('');
  const [email, setEmail] = useState('');
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [showPromo, setShowPromo] = useState(false);

  useEffect(() => {
    // Only show promo if not previously shown (per device)
    const seen = typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('springPromoSeen');
    if (!seen) setShowPromo(true);
  }, []);

  const handleClosePromo = () => {
    setShowPromo(false);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('springPromoSeen', '1');
    }
  };

  // Responsive columns for category grid
  const columns = width > 900 ? 4 : width > 600 ? 3 : 2;
  const paddingHorizontal = spacing.md;
  const cardSpacing = spacing.md;
  const totalSpacing = paddingHorizontal * 2 + cardSpacing * (columns - 1);
  const cardSize = (width - totalSpacing) / columns;

  return (
    <View style={styles.container}>

      <SpringPromoModal visible={showPromo} onClose={handleClosePromo} />
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: 'center',
          paddingTop: insets.top,
          paddingBottom: insets.bottom + 20,
          backgroundColor: 'transparent'
        }}
        keyboardShouldPersistTaps="handled"
      >
          <View style={styles.content}>
            <ImageBackground
                source={{ uri: 'https://fhybeyomiivepmlrampr.supabase.co/storage/v1/object/public/utils//homepage-herobanner.webp' }}
                style={[styles.heroContainer, { width: width }]}
                imageStyle={{ opacity: 0.8 }}
            >
              <View style={styles.overlay} />
              <Text style={styles.heroText}>Rare Collectables</Text>
              <Pressable
                style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.8 : 1 }]}
                onPress={() => router.push('/shop')}
                accessibilityRole="button"
                accessibilityLabel="Shop Now"
              >
                <Text style={styles.ctaText}>Shop Now</Text>
              </Pressable>
            </ImageBackground>

            {/* Best Sellers Section */}
            <View style={styles.categoriesContainer}>

              {CATEGORIES.map((cat, index) => {
                const marginRight = (index + 1) % columns === 0 ? 0 : cardSpacing;
                const images = CATEGORY_IMAGES[cat.id] || [];
                return (
                  <CategoryCard
                    key={cat.id}
                    id={cat.id}
                    title={cat.title}
                    cardSize={cardSize}
                    marginRight={marginRight}
                    images={images}
                    onPress={() => router.push(`/shop?category=${cat.id}`)}
                  />
                );
              })}
            </View>
            {/* Best Sellers Section */}
            <BestSellersSection cardWidth={cardSize} numColumns={columns} bestSellerIds={['ec75311c-c851-45b8-b1a5-22a364e12449', '7c01ba23-db05-43cc-b38a-eb394b379853', '1-bracelets', '2-bracelets']} />

            {/* Reviews Carousel */}
            <ReviewsCarousel />

             <View style={styles.newsletterSectionRedesign}>
              <FontAwesome name="envelope-o" size={32} color={colors.gold} style={{ marginBottom: 8 }} />
              <Text style={styles.newsletterTitleRedesign}>Join our newsletter</Text>
              <Text style={styles.newsletterSubtitle}>Exclusive offers, new arrivals & more. Only the good stuff!</Text>
              <View style={styles.newsletterFormRedesign}>
                <TextInput
                  style={styles.newsletterInputRedesign}
                  placeholder="Your email address"
                  placeholderTextColor={colors.platinumGrey}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  accessibilityLabel="Email address"
                  returnKeyType="done"
                />
                <Pressable
                  style={({ pressed }) => [styles.newsletterButtonRedesign, { opacity: pressed ? 0.8 : 1 }]}
                  onPress={async () => {
                    await trackEvent({ eventType: 'newsletter_subscribe_click', metadata: { email } });
                    if (email.includes('@')) {
                      Alert.alert('Subscribed', `Thanks for subscribing, ${email}!`);
                      setEmail('');
                    } else {
                      Alert.alert('Invalid email', 'Please enter a valid email address.');
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Subscribe to newsletter"
                >
                  <Text style={styles.newsletterButtonTextRedesign}>Subscribe</Text>
                </Pressable>
              </View>
              <View style={styles.socialRowRedesign}>
                <Pressable onPress={() => Linking.openURL('https://www.facebook.com/profile.php?id=61573565127513')} accessibilityRole="link" accessibilityLabel="Facebook">
                  <FontAwesome name="facebook" size={28} color="#4267B2" />
                </Pressable>
                <Pressable onPress={() => Linking.openURL('https://instagram.com/rarecollectablesshop')} style={styles.socialIconRedesign} accessibilityRole="link" accessibilityLabel="Instagram">
                  <FontAwesome name="instagram" size={28} color="#C13584" />
                </Pressable>
              </View>
            </View>
          </View>
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

      {!isChatVisible && (
        <Pressable
          style={styles.chatButton}
          onPress={() => setIsChatVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Toggle chat"
        >
          <FontAwesome name="comment" size={24} color={colors.onyxBlack} />
        </Pressable>
      )}
      {isChatVisible && (
        <ChatScreen isChatVisible={isChatVisible} setIsChatVisible={setIsChatVisible} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  newsletterSectionRedesign: {
    backgroundColor: colors.ivory,
    borderColor: colors.softGoldBorder,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    marginVertical: spacing.xl,
    shadowColor: colors.gold,
    shadowOpacity: 0.09,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    maxWidth: 480,
    alignSelf: 'center',
    width: '95%',
  },
  newsletterTitleRedesign: {
    fontSize: 22,
    fontFamily: fontFamily.serif,
    color: colors.onyxBlack,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  newsletterSubtitle: {
    fontSize: 15,
    color: colors.platinumGrey,
    marginBottom: 18,
    textAlign: 'center',
    fontFamily: fontFamily.sans,
  },
  newsletterFormRedesign: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
  },
  newsletterInputRedesign: {
    flex: 1,
    height: 48,
    backgroundColor: colors.white,
    borderColor: colors.gold,
    borderWidth: 1.2,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    fontFamily: fontFamily.sans,
    marginRight: 8,
  },
  newsletterButtonRedesign: {
    backgroundColor: colors.gold,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.gold,
    shadowOpacity: 0.13,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  newsletterButtonTextRedesign: {
    color: colors.white,
    fontFamily: fontFamily.sans,
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  socialRowRedesign: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    gap: 18,
  },
  socialIconRedesign: {
    marginLeft: 18,
  },

  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap', 
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
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  safeArea: {
    flex: 1,
  },
  chatButton: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.xl,
    backgroundColor: colors.gold,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    ...shadows.card,
    elevation: 4,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  chatIcon: {
    fontSize: 24,
    color: colors.white,
    fontFamily,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: 'transparent',
    padding: 0,
  },
  heroContainer: {
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    // borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.onyxBlack,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(26,26,26,0.30)',
  },
  heroText: {
    fontSize: 38,
    fontWeight: '900',
    color: colors.gold,
    marginBottom: spacing.md,
    fontFamily: fontFamily.serif,
    textShadowColor: 'rgba(26,26,26,0.22)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    letterSpacing: 1.2,
  },
  cta: {
    backgroundColor: colors.gold,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    ...shadows.card,
    elevation: 4,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  ctaText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  categoryCard: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.softGoldBorder,
    backgroundColor: colors.white,
    ...shadows.card,
    elevation: 4,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },
  categoryImage: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.md,
    opacity: 1,
  },
  categoryOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
    padding: spacing.md,
  },
  categoryTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
    fontFamily: fontFamily.serif,
    letterSpacing: 0.5,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  newsletterContainer: {
    width: '100%',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    ...shadows.card,
  },
  newsletterTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: spacing.sm + 4,
  },
  newsletterForm: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  newsletterInput: {
    flex: 1,
    backgroundColor: colors.ivory,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.softGoldBorder,
    fontFamily: fontFamily.sans,
    fontSize: 16,
    color: colors.onyxBlack,
  },
  newsletterButton: {
    backgroundColor: colors.emerald,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    ...shadows.card,
  },
  newsletterButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: fontFamily.sans,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  socialIcon: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.white,
    ...shadows.card,
  },
});
