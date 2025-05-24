import { View, Text, StyleSheet, Image as RNImage, ScrollView, Pressable, useWindowDimensions, FlatList, Platform, Animated } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { FontAwesome } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useRef, memo, useCallback } from 'react';
import { PRODUCTS, LOCAL_IMAGES as DATA_IMAGES } from '../(data)/products';
import { useStore } from '../../context/store';
import { Alert } from 'react-native';
import { colors, fontFamily, spacing, borderRadius, shadows } from '../../theme/index.js';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchProductById } from '../../lib/supabase/fetchProductById';
import { trackEvent } from '../../lib/trackEvent';
import LuxuryModal from '../components/LuxuryModal';

import ZoomableImage from '../components/ZoomableImage';

function MemoCarouselImage({ item, style, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel="Zoom image" accessibilityRole="imagebutton">
      <ExpoImage source={item} style={style} contentFit="cover" transition={300} />
    </Pressable>
  );
}

export default function ProductDetail() {
  const { width } = useWindowDimensions();
  const [carouselWidth, setCarouselWidth] = useState(width); // <-- new state
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [wishAnimating, setWishAnimating] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const heartScale = useRef(new Animated.Value(1)).current;
  const flatListRef = useRef(null);
  const addCartAnim = useRef(new Animated.Value(1));
  const { addToCart, addToWishlist } = useStore();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  let images = [];
  if (product) {
    if (DATA_IMAGES[product.id]) {
      images = DATA_IMAGES[product.id];
    } else if (product.additional_images && Array.isArray(product.additional_images) && product.additional_images.length > 0) {
      images = [
        ...(product.image_url ? [{ uri: product.image_url }] : (product.image ? [{ uri: product.image }] : [])),
        ...product.additional_images.filter(Boolean).map(url => ({ uri: url }))
      ];
    } else {
      images = product.image_url ? [{ uri: product.image_url }] : (product.image ? [{ uri: product.image }] : []);
    }
  }
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems && viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;
  const viewabilityConfig = { viewAreaCoveragePercentThreshold: 60 };

  const [zoomVisible, setZoomVisible] = useState(false);
const [zoomImage, setZoomImage] = useState(null);

const renderCarouselImage = useCallback(
  ({ item }) => (
    <MemoCarouselImage
      item={item}
      style={styles.image}
      onPress={() => {
        setZoomImage(item);
        setZoomVisible(true);
      }}
    />
  ),
  [styles.image]
);

  useEffect(() => {
    let isMounted = true;
    async function loadProduct() {
      try {
        const supaProduct = await fetchProductById(id);
        if (!isMounted) return;
        setProduct(supaProduct);
        setLoading(false);
      } catch (err) {
        if (!isMounted) return;
        setError('Product not found.');
        setLoading(false);
      }
    }
    loadProduct();
    return () => { isMounted = false; };
  }, [id]);

  useEffect(() => {
    if (!images || images.length < 2) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        const nextIdx = (prev + 1) % images.length;
        if (flatListRef.current) {
          flatListRef.current.scrollToIndex({ index: nextIdx, animated: true });
        }
        return nextIdx;
      });
    }, 6000);
    return () => clearInterval(interval);
  }, [images.length]);

  function handleAddToCart() {
    Animated.sequence([
      Animated.timing(addCartAnim.current, { toValue: 1.15, duration: 120, useNativeDriver: true }),
      Animated.spring(addCartAnim.current, { toValue: 1, friction: 3, useNativeDriver: true })
    ]).start();
    const imageUri = (Array.isArray(images) && images[0]?.uri) ? images[0].uri : (product?.image_url || product?.image || '');
    addToCart({
      ...product,
      price: typeof product.price === 'number'
        ? product.price
        : parseFloat(String(product.price).replace(/[£\s]/g, '')) || 0,
      image: imageUri,
      quantity: 1,
    });
    trackEvent({
      eventType: 'add_to_cart',
      productId: product?.id,
      quantity: 1,
      metadata: { productName: product?.title || product?.name, price: product?.price }
    });
    Alert.alert('Added to Cart', `${product?.title || 'Product'} has been added to your cart.`);
  }

  function handleWishlist() {
    setWishAnimating(true);
    setIsWishlisted((prev) => !prev);
    const eventType = isWishlisted ? 'remove_from_wishlist' : 'add_to_wishlist';
    if (product) {
      if (!isWishlisted) {
        addToWishlist(product);
      }
      trackEvent({
        eventType,
        productId: product.id,
        metadata: { productName: product.title || product.name, price: product.price }
      });
    }
    Animated.sequence([
      Animated.timing(heartScale, { toValue: 1.3, duration: 120, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1, friction: 3, useNativeDriver: true })
    ]).start(() => {
      setWishAnimating(false);
      if (!isWishlisted) {
        Alert.alert('Added to Wishlist', `${product.title} has been added to your wishlist.`);
      } else {
        Alert.alert('Removed from Wishlist', `${product.title} has been removed from your wishlist.`);
      }
    });
  }

  if (loading) {
    return (
      <View style={styles.modal}>
        <Text style={{ margin: 20, color: colors.text }}>Loading...</Text>
      </View>
    );
  }
  if (error || !product) {
    return (
      <LuxuryModal visible={true} showClose={false} animation="fade">
        <View style={{ alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
          <Text style={{ color: colors.gold, fontSize: 24, fontWeight: 'bold', marginBottom: spacing.md, fontFamily, letterSpacing: 0.5, textAlign: 'center' }}>
            Welcome to Rare Collectables!
          </Text>
          <Text style={{ color: colors.platinum, fontSize: 16, marginBottom: spacing.lg, fontFamily, textAlign: 'center', maxWidth: 340 }}>
            We couldn't find that product, but you can search our shop for it or explore other luxury items.
          </Text>
          <Pressable
            style={{ backgroundColor: colors.gold, borderRadius: borderRadius.md, paddingVertical: 12, paddingHorizontal: 36, marginTop: 8 }}
            onPress={() => router.replace('/shop')}
            accessibilityLabel="Go to Shop"
          >
            <Text style={{ color: colors.white, fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5, fontFamily }}>Go to Shop</Text>
          </Pressable>
        </View>
      </LuxuryModal>
    );
  }

  const isDesktop = width >= 1024;
  const desktopContainer = isDesktop ? {
    flexDirection: 'row',
    maxWidth: 1160,
    marginHorizontal: 'auto',
    alignItems: 'flex-start',
    padding: 48,
    gap: 48,
    minHeight: '70vh',
  } : {};
  const desktopImageWrapper = isDesktop ? {
    flex: 1.15,
    maxWidth: 440,
    minWidth: 340,
    marginRight: 48,
    marginBottom: 0,
    boxShadow: '0 8px 32px rgba(0,0,0,.10)',
    backgroundColor: '#f8f8f8',
    alignSelf: 'flex-start',
  } : {};
  const desktopInfo = isDesktop ? {
    flex: 1.5,
    alignItems: 'flex-start',
    textAlign: 'left',
    justifyContent: 'center',
    gap: 18,
  } : {};
  const desktopTitle = isDesktop ? { fontSize: 26, textAlign: 'left', marginTop: 0 } : {};
  const desktopPrice = isDesktop ? { fontSize: 22, paddingHorizontal: 30, paddingVertical: 12 } : {};
  const desktopDescription = isDesktop ? { fontSize: 16, textAlign: 'left', lineHeight: 26, maxHeight: 72, overflow: 'hidden', textOverflow: 'ellipsis' } : {};
  const desktopActionContainer = isDesktop ? { justifyContent: 'flex-start', gap: 24 } : {};
  const desktopButton = isDesktop ? { fontSize: 18, paddingVertical: 14, paddingHorizontal: 32, minWidth: 140 } : {};

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <Pressable
        style={styles.closeButton}
        onPress={() => {
          if (router.canGoBack && router.canGoBack()) {
            router.back();
          } else {
            router.replace('/shop');
          }
        }}
        accessibilityLabel="Close product detail"
      >
        <FontAwesome name="close" size={26} color="#bfa14a" />
      </Pressable>
      <ScrollView>
        <View style={{ ...styles.container, ...desktopContainer }}>
          {/* Left: Image or Carousel */}
          <View style={{ ...styles.imageWrapper, ...desktopImageWrapper }}>
            {/* Enhanced Carousel with Arrows and Dots */}
{images.length > 1 ? (
  <View
  style={styles.enhancedCarouselWrapper}
  onLayout={e => {
    const w = e.nativeEvent.layout.width;
    if (w && w !== carouselWidth) setCarouselWidth(w);
  }}
>
    {/* Left Arrow */}
    <Pressable
      style={[styles.carouselArrow, styles.carouselArrowLeft]}
      onPress={() => {
        if (currentIndex > 0 && flatListRef.current) {
          flatListRef.current.scrollToIndex({ index: currentIndex - 1, animated: true });
          setCurrentIndex(currentIndex - 1);
        }
      }}
      accessibilityLabel="Previous image"
      accessibilityRole="button"
      disabled={currentIndex === 0}
    >
      <FontAwesome name="chevron-left" size={28} color={currentIndex === 0 ? '#ccc' : colors.gold} />
    </Pressable>
    {/* Image Carousel */}
    <FlatList
      ref={flatListRef}
      data={images}
      renderItem={renderCarouselImage}
      keyExtractor={(_, idx) => String(idx)}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      style={[styles.carousel, { width: carouselWidth }]}
      getItemLayout={(data, index) => ({ length: carouselWidth, offset: carouselWidth * index, index })}
      onScrollToIndexFailed={({ index, highestMeasuredFrameIndex }) => {
        if (flatListRef.current && highestMeasuredFrameIndex >= 0) {
          flatListRef.current.scrollToIndex({
            index: highestMeasuredFrameIndex,
            animated: true,
          });
        }
      }}
      extraData={currentIndex}
    />
    {/* Right Arrow */}
    <Pressable
      style={[styles.carouselArrow, styles.carouselArrowRight]}
      onPress={() => {
        if (currentIndex < images.length - 1 && flatListRef.current) {
          flatListRef.current.scrollToIndex({ index: currentIndex + 1, animated: true });
          setCurrentIndex(currentIndex + 1);
        }
      }}
      accessibilityLabel="Next image"
      accessibilityRole="button"
      disabled={currentIndex === images.length - 1}
    >
      <FontAwesome name="chevron-right" size={28} color={currentIndex === images.length - 1 ? '#ccc' : colors.gold} />
    </Pressable>
    {/* Dots Indicator */}
    <View style={styles.carouselDotsWrapper}>
      {images.map((_, idx) => (
        <Pressable
          key={idx}
          style={[styles.carouselDot, currentIndex === idx && styles.carouselDotActive]}
          onPress={() => {
            if (flatListRef.current) {
              flatListRef.current.scrollToIndex({ index: idx, animated: true });
              setCurrentIndex(idx);
            }
          }}
          accessibilityLabel={`Go to image ${idx + 1}`}
          accessibilityRole="button"
        />
      ))}
    </View>
  </View>
) : (
  images[0] && <ExpoImage source={images[0]} style={styles.image} contentFit="cover" />
)}
          </View>

    {/* Zoomable Image Modal */}
    <ZoomableImage
      source={zoomImage}
      visible={zoomVisible}
      onClose={() => setZoomVisible(false)}
    />

          {/* Right: Info */}
          <View style={{ flex: 1.5, ...desktopInfo }}>
            {/* Title */}
            <Text style={{ ...styles.title, ...desktopTitle }}>{product?.title || product?.name || 'Untitled Product'}</Text>
            {/* Price */}
            <View style={styles.pricePillWrapper}>
              <Text style={{ ...styles.price, ...desktopPrice }}>{product?.price}</Text>
            </View>
            {/* Description */}
            <Text style={{ ...styles.description, ...desktopDescription }}>{product?.description}</Text>
            {/* Action Buttons */}
            <View style={{ ...styles.actionContainer, ...desktopActionContainer }}>
              <Pressable style={{ ...styles.button, ...desktopButton }} onPress={handleAddToCart}>
                <Text style={styles.buttonText}>Add to Cart</Text>
              </Pressable>
              <Pressable style={{ ...styles.button, ...desktopButton }} onPress={handleWishlist}>
                <FontAwesome name={isWishlisted ? 'heart' : 'heart-o'} size={24} color={colors.onyxBlack} />
              </Pressable>
            </View>
          </View>
        </View>
        {/* Product Features Table (below main info) */}
        {(() => {
          const features = [];
          const category = (product?.category || '').toLowerCase();
          const labels = {
            material:
              category.includes('necklace') ? 'Necklace Material' :
              category.includes('bracelet') ? 'Bracelet Material' :
              category.includes('ring') ? 'Ring Material' :
              'Material',
            stone: 'Stone',
            size:
              category.includes('necklace') ? 'Pendant Size' :
              category.includes('bracelet') ? 'Bracelet Size' :
              category.includes('ring') ? 'Ring Size' :
              'Size',
            length:
              category.includes('necklace') ? 'Chain Length' :
              category.includes('bracelet') ? 'Bracelet Length' :
              category.includes('ring') ? 'Ring Length' :
              'Length',
          };
          if (product?.material) features.push({ label: labels.material, value: product.material });
          if (product?.stone) features.push({ label: labels.stone, value: product.stone });
          if (product?.size) features.push({ label: labels.size, value: product.size });
          if (product?.length) features.push({ label: labels.length, value: product.length });
          if (features.length === 0) return null;
          return (
            <View style={{ marginTop: 18, marginBottom: 10, backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#eee', alignSelf: 'center', maxWidth: 420, width: '90%' }}>
              <Text style={{ fontWeight: 'bold', fontSize: 16, padding: 10, backgroundColor: '#faf6e8', color: '#bfa14a' }}>Product Features</Text>
              {features.map((f, idx) => (
                <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 14, borderBottomWidth: idx === features.length - 1 ? 0 : 1, borderBottomColor: '#f5e9c8' }}>
                  <Text style={{ color: '#bfa14a', fontWeight: '500', fontSize: 15 }}>{f.label}</Text>
                  <Text style={{ color: '#444', fontSize: 15 }}>{f.value}</Text>
                </View>
              ))}
            </View>
          );
        })()}

        {/* Related Products Section */}
        {product && product.category && (
          <View style={{ marginTop: 32, marginBottom: 24 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#bfa14a', marginLeft: 10, marginBottom: 10 }}>
              Related Products
            </Text>
            <FlatList
              data={PRODUCTS.filter(
                p => p.category === product.category && p.id !== product.id
              ).slice(0, 6)}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={item => String(item.id)}
              contentContainerStyle={{ paddingHorizontal: 10 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => router.replace(`/product/${item.id}`)}
                  style={{
                    width: 140,
                    marginRight: 16,
                    backgroundColor: '#fff',
                    borderRadius: 10,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: '#eee',
                    shadowColor: '#000',
                    shadowOpacity: 0.06,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: 2,
                  }}
                >
                  {item.image ? (
                    <ExpoImage
                      source={item.image}
                      style={{ width: '100%', height: 100, backgroundColor: '#f8f8f8' }}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={{ width: '100%', height: 100, backgroundColor: '#e0e0e0', alignItems: 'center', justifyContent: 'center' }}>
                      <FontAwesome name="image" size={32} color="#bfa14a" />
                    </View>
                  )}
                  <View style={{ padding: 10 }}>
                    <Text style={{ fontWeight: '600', fontSize: 15, color: '#222', marginBottom: 4 }} numberOfLines={1}>
                      {item.title || item.name}
                    </Text>
                    <Text style={{ color: '#bfa14a', fontWeight: 'bold', fontSize: 15 }}>
                      {item.price}
                    </Text>
                  </View>
                </Pressable>
              )}
            />
          </View>
        )}
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
    </View>
  );
}

const styles = StyleSheet.create({
  enhancedCarouselWrapper: {
    position: 'relative',
    width: '100%',
    height: 320,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  carouselArrow: {
    position: 'absolute',
    top: '50%',
    zIndex: 2,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 22,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    marginTop: -22,
  },
  carouselArrowLeft: {
    left: 10,
  },
  carouselArrowRight: {
    right: 10,
  },
  carouselDotsWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    zIndex: 3,
  },
  carouselDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#e0d6b8',
    marginHorizontal: 4,
    opacity: 0.5,
    borderWidth: 1,
    borderColor: '#bfa14a',
  },
  carouselDotActive: {
    backgroundColor: '#bfa14a',
    opacity: 1,
    width: 16,
    borderRadius: 8,
  },

  footer: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'center', alignItems: 'center',
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
  imageWrapper: {
    marginTop: 24,
    marginBottom: 22,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#f8f8f8',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    resizeMode: 'contain',
    maxHeight: 320,
    backgroundColor: '#f8f8f8',
    alignSelf: 'center',
    borderRadius: 18,
  },
  modal: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    margin: spacing.lg,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.softGoldBorder,
    ...shadows.card,
    paddingBottom: spacing.lg,
  },
  container: {
    padding: spacing.lg,
    alignItems: 'center',
    width: '100%',
    backgroundColor: colors.white,
  },
  carousel: {
    width: '100%',
    height: 320,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  image: {
    width: '100%',
    height: 320,
    aspectRatio: 1,
    borderRadius: borderRadius.md,
    backgroundColor: colors.softGoldBorder,
    alignSelf: 'center',
    marginBottom: 0,
    marginTop: 0,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    color: colors.onyxBlack,
    fontFamily,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    letterSpacing: 0.2,
    lineHeight: 32,
  },
  pricePillWrapper: {
    alignSelf: 'center',
    marginBottom: spacing.md,
    marginTop: 0,
  },
  price: {
    fontSize: 20,
    color: colors.white,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.gold,
    overflow: 'hidden',
    fontFamily,
    letterSpacing: 0.2,
    borderWidth: 1,
    borderColor: colors.softGoldBorder,
    ...shadows.card,
  },
  description: {
    fontSize: 17,
    textAlign: 'center',
    marginBottom: spacing.md,
    color: colors.platinum,
    fontFamily,
    lineHeight: 24,
    opacity: 0.92,
  },
  details: {
    fontSize: 15,
    color: colors.muted,
    marginVertical: spacing.sm,
    textAlign: 'center',
    fontFamily,
    lineHeight: 20,
    opacity: 0.8,
  },
  divider: {
    width: '70%',
    height: 1,
    backgroundColor: colors.softGoldBorder,
    alignSelf: 'center',
    marginVertical: spacing.md,
    opacity: 0.5,
    borderRadius: 1,
  },
  actionContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  actionContainerFixed: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.softGoldBorder,
    ...shadows.card,
    zIndex: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 18,
    right: 18,
    zIndex: 100,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#eee5c2',
  },
  button: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginRight: 8,
    marginLeft: 8,
    marginVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
    minWidth: 140,
  },
  buttonText: {
    color: colors.onyxBlack,
    fontSize: 18,
    fontWeight: '700',
    fontFamily,
    letterSpacing: 0.2,
  },
  close: {
    alignSelf: 'flex-end',
    marginTop: spacing.md,
    marginRight: spacing.md,
    marginBottom: spacing.sm,
    zIndex: 10,
    backgroundColor: colors.ivory,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    ...shadows.card,
  },
  closeText: { fontSize: 24, color: colors.platinum },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.softGoldBorder,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: colors.gold,
  },
  heartButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.white,
    alignItems: 'center',
      backgroundColor: '#f8f8f8',
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 5,
    },
    image: {
      width: '100%',
      aspectRatio: 1,
      resizeMode: 'contain',
      maxHeight: 320,
      backgroundColor: '#f8f8f8',
      alignSelf: 'center',
      borderRadius: 18,
    },
    modal: {
      flex: 1,
      backgroundColor: colors.white,
      borderRadius: borderRadius.lg,
      margin: spacing.lg,
      overflow: 'hidden',
      borderWidth: 1.5,
      borderColor: colors.softGoldBorder,
      ...shadows.card,
      paddingBottom: spacing.lg,
    },
    container: {
      padding: spacing.lg,
      alignItems: 'center',
      width: '100%',
      backgroundColor: colors.white,
    },
    carousel: {
      width: '100%',
      height: 320,
      borderRadius: borderRadius.md,
      overflow: 'hidden',
      marginBottom: spacing.md,
    },
    image: {
      width: '100%',
      height: 320,
      aspectRatio: 1,
      borderRadius: borderRadius.md,
      backgroundColor: colors.softGoldBorder,
      alignSelf: 'center',
      marginBottom: 0,
      marginTop: 0,
    },
    title: {
      fontSize: 22,
      fontWeight: 'bold',
      textAlign: 'center',
      color: colors.onyxBlack,
      fontFamily,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
      letterSpacing: 0.2,
      lineHeight: 32,
    },
    pricePillWrapper: {
      alignSelf: 'center',
      marginBottom: spacing.md,
      marginTop: 0,
    },
    price: {
      fontSize: 20,
      color: colors.white,
      fontWeight: '700',
      textAlign: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.gold,
      overflow: 'hidden',
      fontFamily,
      letterSpacing: 0.2,
      borderWidth: 1,
      borderColor: colors.softGoldBorder,
      ...shadows.card,
    },
    description: {
      fontSize: 17,
      textAlign: 'center',
      marginBottom: spacing.md,
      color: colors.platinum,
      fontFamily,
      lineHeight: 24,
      opacity: 0.92,
    },
    details: {
      fontSize: 15,
      color: colors.muted,
      marginVertical: spacing.sm,
      textAlign: 'center',
      fontFamily,
      lineHeight: 20,
      opacity: 0.8,
    },
    divider: {
      width: '70%',
      height: 1,
      backgroundColor: colors.softGoldBorder,
      alignSelf: 'center',
      marginVertical: spacing.md,
      opacity: 0.5,
      borderRadius: 1,
    },
    actionContainer: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.md,
      marginTop: spacing.md,
      marginBottom: spacing.md,
    },
    actionContainerFixed: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.white,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.softGoldBorder,
      ...shadows.card,
      zIndex: 20,
    },
    button: {
      backgroundColor: colors.gold,
      borderColor: colors.gold,
      borderRadius: borderRadius.md,
      paddingVertical: 12,
      paddingHorizontal: 24,
      marginRight: 8,
      marginLeft: 8,
      marginVertical: 8,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.gold,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 2,
      minWidth: 140,
    },
    buttonText: {
      color: colors.onyxBlack,
      fontSize: 18,
      fontWeight: '700',
      fontFamily,
      letterSpacing: 0.2,
    },
    close: {
      alignSelf: 'flex-end',
      marginTop: spacing.md,
      marginRight: spacing.md,
      marginBottom: spacing.sm,
      zIndex: 10,
      backgroundColor: colors.ivory,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      ...shadows.card,
    },
    closeText: { fontSize: 24, color: colors.platinum },
    pagination: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: spacing.md,
      marginTop: spacing.xs,
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.softGoldBorder,
      marginHorizontal: 4,
    },
    activeDot: {
      backgroundColor: colors.gold,
    },
    heartButton: {
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: colors.softGoldBorder,
      marginLeft: spacing.md,
      shadowColor: colors.ruby,
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 2,
    },
  });