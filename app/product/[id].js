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
import CollapsibleSection from '../components/CollapsibleSection';

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
  // --- Ring size state ---
  const [selectedSize, setSelectedSize] = useState('');
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
      style={[
        styles.image,
        width < 600
          ? { width: carouselWidth - 32, maxHeight: 230, resizeMode: 'contain', aspectRatio: undefined }
          : {}
      ]}
      onPress={() => {
        setZoomImage(item);
        setZoomVisible(true);
      }}
    />
  ),
  [styles.image, width, carouselWidth]
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
    // For rings, require a size selection
    if (product.category === 'Rings' && Array.isArray(product.size_options) && product.size_options.length > 0 && !selectedSize) {
      Alert.alert('Please select a ring size before adding to cart.');
      return;
    }
    Animated.sequence([
      Animated.timing(addCartAnim.current, { toValue: 1.15, duration: 120, useNativeDriver: true }),
      Animated.spring(addCartAnim.current, { toValue: 1, friction: 3, useNativeDriver: true })
    ]).start();
    const imageUri = (Array.isArray(images) && images[0]?.uri) ? images[0].uri : (product?.image_url || product?.image || '');
    addToCart({
      ...product,
      selectedSize: product.category === 'Rings' ? selectedSize : undefined,
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
      metadata: { productName: product?.title || product?.name, price: product?.price, selectedSize: product.category === 'Rings' ? selectedSize : undefined }
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
        <View style={{ ...styles.container, ...desktopContainer, marginBottom: 8 }}>
          {/* --- Product Media Section --- */}
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
                      setCurrentIndex(idx => Math.max(0, idx - 1));
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
                  renderItem={({ item, index }) => (
                    <View style={{ marginHorizontal: 8 }}>
                      <MemoCarouselImage
                        item={item}
                        style={[
                          styles.image,
                          width < 600
                            ? { width: carouselWidth - 32, maxHeight: 230, resizeMode: 'contain', aspectRatio: undefined }
                            : { width: carouselWidth - 32 }
                        ]}
                        onPress={() => {
                          setZoomImage(item);
                          setZoomVisible(true);
                        }}
                      />
                    </View>
                  )}
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
                  contentContainerStyle={{ paddingHorizontal: 0 }}
                  snapToInterval={carouselWidth}
                  decelerationRate={Platform.OS === 'ios' ? 0 : 0.98}
                />
                {/* Right Arrow */}
                <Pressable
                  style={[styles.carouselArrow, styles.carouselArrowRight]}
                  onPress={() => {
                    if (currentIndex < images.length - 1 && flatListRef.current) {
                      flatListRef.current.scrollToIndex({ index: currentIndex + 1, animated: true });
                      setCurrentIndex(idx => Math.min(images.length - 1, idx + 1));
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

          {/* --- Main Info Section --- */}
          <View style={[
            { flex: 1.5 },
            width < 600
              ? { paddingHorizontal: 16, width: '100%', alignSelf: 'center', boxSizing: 'border-box' }
              : desktopInfo
          ]}>
            {/* --- Product Summary Section --- */}
            <View style={{ marginBottom: 18, width: '100%' }}>
              {/* Title & Brand */}
              <Text
                style={[
                  styles.title,
                  {
                    fontSize: width < 600 ? 17 : 22,
                    fontWeight: 'bold',
                    marginBottom: 4,
                    textAlign: width >= 1024 ? 'left' : 'center',
                    marginLeft: width >= 1024 ? 0 : undefined,
                  },
                ]}
                accessibilityRole="header"
              >
                {product?.title || product?.name || 'Untitled Product'}
              </Text>
              {/* Brand Placeholder */}
              {/* <Text style={{ color: '#888', fontSize: 14, marginBottom: 4 }}>Brand: {product?.brand || 'N/A'}</Text> */}
              {/* Star Ratings Placeholder */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', width: '100%' }}>
                {/* Placeholder stars */}
                {[1,2,3,4,5].map(i => (
                  <FontAwesome key={i} name="star" size={16} color={i <= 4 ? '#FFD700' : '#ccc'} style={{ marginRight: 2 }} />
                ))}
                <Text style={{ color: '#888', fontSize: 13, marginLeft: 6 }}>(12 reviews)</Text>
              </View>
              {/* Short Description */}
              <Text style={{ color: '#555', fontSize: 16, marginBottom: 8, width: '100%', flexShrink: 1 }} numberOfLines={2}>{product?.short_description || 'A rare and unique collectable item.'}</Text>
              {/* Price & Shipping Info */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 12, flexWrap: 'wrap', width: '100%' }}>
                <Text style={[styles.price, { fontSize: 19, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, marginRight: 8, backgroundColor: colors.gold, color: colors.white, borderWidth: 1, borderColor: colors.softGoldBorder, ...desktopPrice }]}>{product?.price}</Text>
                <Text style={{ fontSize: 14, color: '#4caf50', fontWeight: '600' }}>Free shipping & Free returns</Text>
              </View>
            </View>

            {/* --- Purchase Actions Section --- */}
            {/* On mobile, render size selector above actions; on desktop, keep inline */}
            {width < 600 && product.category === 'Rings' && Array.isArray(product.size_options) && product.size_options.length > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 15, marginRight: 6 }}>Size</Text>
                <View style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, minWidth: 36, alignItems: 'center', backgroundColor: '#fff' }}>
                  <select
                    value={selectedSize}
                    onChange={e => setSelectedSize(e.target.value)}
                    style={{ fontSize: 15, border: 'none', background: 'transparent', outline: 'none' }}
                  >
                    <option value="">Select</option>
                    {product.size_options.map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </View>
              </View>
            )}
            <View style={{
              width: '100%',
              flexDirection: width < 600 ? 'row' : 'row',
              alignItems: 'center',
              gap: width < 600 ? 8 : 18,
              marginTop: 0,
              marginBottom: 24,
              paddingBottom: 0,
              borderBottomWidth: 0,
              ...desktopActionContainer
            }}>
              {/* Ring Size Selector for Rings (desktop/tablet only) */}
              {width >= 600 && product.category === 'Rings' && Array.isArray(product.size_options) && product.size_options.length > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 18, flexShrink: 1, marginBottom: 0 }}>
                  <Text style={{ fontSize: 15, marginRight: 6 }}>Size</Text>
                  <View style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, minWidth: 36, alignItems: 'center', backgroundColor: '#fff' }}>
                    <select
                      value={selectedSize}
                      onChange={e => setSelectedSize(e.target.value)}
                      style={{ fontSize: 15, border: 'none', background: 'transparent', outline: 'none' }}
                    >
                      <option value="">Select</option>
                      {product.size_options.map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </View>
                </View>
              )}
              {/* Quantity Selector */}
              {/* Quantity Selector */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: width < 600 ? 8 : 18, flexShrink: 1, marginBottom: 0 }}>
                <Text style={{ fontSize: 15, marginRight: 6 }}>Qty</Text>
                <View style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, minWidth: 36, alignItems: 'center' }}>
                  <Text style={{ fontSize: 15 }}>1</Text>
                </View>
              </View>
              {/* Add to Cart Button */}
              <Pressable
                style={{
                  ...styles.button,
                  ...desktopButton,
                  flex: 1,
                  marginRight: 0,
                  minWidth: width < 600 ? 0 : 140,
                  paddingHorizontal: width < 600 ? 0 : 24,
                  justifyContent: 'center',
                }}
                onPress={handleAddToCart}
                accessibilityLabel="Add to cart"
              >
                <Text style={styles.buttonText}>Add to Cart</Text>
              </Pressable>
              {/* Wishlist Button */}
              <Pressable
                style={{
                  height: 48,
                  width: 48,
                  borderRadius: 24,
                  backgroundColor: '#fff',
                  borderWidth: 1.5,
                  borderColor: colors.gold,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: width < 600 ? 8 : 12,
                  shadowColor: '#000',
                  shadowOpacity: 0.07,
                  shadowRadius: 4,
                  elevation: 2,
                  position: 'relative',
                  zIndex: 2,
                }}
                onPress={handleWishlist}
                accessibilityLabel="Add to wishlist"
              >
                <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                  <FontAwesome name={isWishlisted ? 'heart' : 'heart-o'} size={24} color={colors.gold} />
                </Animated.View>
              </Pressable>
            </View>

            </View>
          </View>
          {/* Feature Tiles */}
          <View style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: 18,
            marginBottom: 24,
            maxWidth: width >= 1024 ? 900 : '100%',
            alignSelf: width >= 1024 ? 'center' : 'stretch',
            width: '100%',
          }}>
            {/* Waterproof, sweat and heat-resistant */}
            <View style={{ flex: 1, minWidth: 170, maxWidth: 220, flexDirection: 'column', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 18, marginHorizontal: 6, marginBottom: 8, boxShadow: '0 2px 12px rgba(0,0,0,.04)', borderWidth: 1, borderColor: '#f1e7d0' }}>
              <FontAwesome name="tint" size={28} color="#bfa14a" style={{ marginBottom: 8 }} />
              <Text style={{ fontWeight: '600', fontSize: 15, color: '#333', textAlign: 'center', marginBottom: 2 }}>Waterproof, sweat and heat-resistant</Text>
            </View>
            {/* 2 year warranty and 100 day returns */}
            <View style={{ flex: 1, minWidth: 170, maxWidth: 220, flexDirection: 'column', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 18, marginHorizontal: 6, marginBottom: 8, boxShadow: '0 2px 12px rgba(0,0,0,.04)', borderWidth: 1, borderColor: '#f1e7d0' }}>
              <FontAwesome name="shield" size={28} color="#bfa14a" style={{ marginBottom: 8 }} />
              <Text style={{ fontWeight: '600', fontSize: 15, color: '#333', textAlign: 'center', marginBottom: 2 }}>Lifetime warranty & 60 day returns</Text>
            </View>
            {/* High-quality plating means no tarnishing */}
            <View style={{ flex: 1, minWidth: 170, maxWidth: 220, flexDirection: 'column', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 18, marginHorizontal: 6, marginBottom: 8, boxShadow: '0 2px 12px rgba(0,0,0,.04)', borderWidth: 1, borderColor: '#f1e7d0' }}>
              <FontAwesome name="diamond" size={28} color="#bfa14a" style={{ marginBottom: 8 }} />
              <Text style={{ fontWeight: '600', fontSize: 15, color: '#333', textAlign: 'center', marginBottom: 2 }}>High-quality plating means no tarnishing</Text>
            </View>
            {/* Luxury gift packaging */}
            <View style={{ flex: 1, minWidth: 170, maxWidth: 220, flexDirection: 'column', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 18, marginHorizontal: 6, marginBottom: 8, boxShadow: '0 2px 12px rgba(0,0,0,.04)', borderWidth: 1, borderColor: '#f1e7d0' }}>
              <FontAwesome name="gift" size={28} color="#bfa14a" style={{ marginBottom: 8 }} />
              <Text style={{ fontWeight: '600', fontSize: 15, color: '#333', textAlign: 'center', marginBottom: 2 }}>Luxury gift packaging</Text>
            </View>
          </View>
        {/* --- Detailed Product Info Section --- */}
        <View style={{ maxWidth: 900, width: '100%', alignSelf: 'center', backgroundColor: '#f8f8f8', borderRadius: 18, padding: 28, marginTop: 16, marginBottom: 32, gap: 16, boxShadow: '0 4px 24px rgba(0,0,0,.04)' }}>

          {/* Description */}
          <CollapsibleSection title="Description" initiallyCollapsed={false}>
            <Text style={{ fontSize: 16, color: '#444', marginBottom: 8 }}>{product?.description}</Text>
          </CollapsibleSection>
          {/* Features */}
          <CollapsibleSection title="Product Features">
            {Array.isArray(product?.features) ? (
              <View style={{ marginTop: 2 }}>
                {product.features.map((f, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 }}>
                    <Text style={{ color: '#bfa14a', fontWeight: 'bold', fontSize: 15, marginRight: 8 }}>•</Text>
                    <Text style={{ color: '#444', fontSize: 15, flex: 1 }}>{f}</Text>
                  </View>
                ))}
              </View>
            ) : product?.features ? (
              <Text style={{ color: '#444', fontSize: 15 }}>{product.features}</Text>
            ) : null}

            {/* --- Structured Features Table --- */}
            {(() => {
               const sizeLabel = product.category === 'Rings'
                 ? 'Ring Size'
                 : product.category === 'Bracelets'
                 ? 'Bracelet Size'
                 : 'Size';
               const rows = [
                 product.material && { label: 'Material', value: product.material },
                 product.size && { label: sizeLabel, value: product.size },
                 product.length && { label: 'Length', value: product.length },
                 product.stone && { label: 'Stone', value: product.stone },
               ].filter(Boolean);
              if (!rows.length) return null;
              return (
                <View style={{ marginTop: 16, marginBottom: 2, borderWidth: 1, borderColor: '#e5dec7', borderRadius: 10, overflow: 'hidden' }}>
                  {rows.map((row, idx) => (
                    <View
                      key={idx}
                      style={{
                        flexDirection: 'row',
                        backgroundColor: idx % 2 === 0 ? '#faf8f3' : '#fff',
                        paddingVertical: 10,
                        paddingHorizontal: 14,
                        borderBottomWidth: idx !== rows.length - 1 ? 1 : 0,
                        borderBottomColor: '#eee5c2',
                      }}
                    >
                      <Text style={{ flex: 1.2, color: '#bfa14a', fontWeight: '600', fontSize: 15 }}>{row.label}</Text>
                      <Text style={{ flex: 2, color: '#444', fontSize: 15 }}>{row.value}</Text>
                    </View>
                  ))}
                </View>
              );
            })()}
          </CollapsibleSection>

          {/* Packaging */}
          <CollapsibleSection title="Packaging">
            <Text style={{ color: '#444', fontSize: 15 }}>
              {product?.packaging || 'Each item is carefully packaged in our signature luxury gift box, ready for gifting or safe storage.'}
            </Text>
          </CollapsibleSection>
          {/* Shipping */}
          <CollapsibleSection title="Shipping">
            <Text style={{ color: '#444', fontSize: 15 }}>
              {product?.shipping || 'Free shipping and returns on all orders. Orders are dispatched within 1-2 business days and include tracking.'}
            </Text>
          </CollapsibleSection>
        </View>

        {/* --- Customer Reviews Section (Placeholder) --- */}
        {/* <View style={{ maxWidth: 900, width: '100%', alignSelf: 'center', marginBottom: 32, backgroundColor: '#fff', borderRadius: 18, padding: 28, gap: 16, borderWidth: 1, borderColor: '#f1e7d0', boxShadow: '0 2px 12px rgba(0,0,0,.03)' }}>
          <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#bfa14a', marginBottom: 8 }}>Customer Reviews</Text>
          <Text style={{ color: '#888', fontStyle: 'italic' }}>No reviews yet. Be the first to review this product!</Text>
        </View> */}

        {/* --- Related Products Section --- */}
        {product && product.category && (
          <View style={{ maxWidth: 900, width: '100%', alignSelf: 'center', marginTop: 8, marginBottom: 40, backgroundColor: '#fff', borderRadius: 18, padding: 28, borderWidth: 1, borderColor: '#f1e7d0', boxShadow: '0 2px 12px rgba(0,0,0,.03)' }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#bfa14a', marginLeft: 10, marginBottom: 10 }}>
              Similar Collectables You'd Love 💎🫶
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

    
    <View style={{ width: '100%', backgroundColor: '#faf8f3', borderTopWidth: 1, borderTopColor: '#eee', paddingVertical: 24, paddingHorizontal: 0, alignItems: 'center', marginTop: 0 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => router.push('/privacy-policy')} accessibilityRole="link" accessibilityLabel="Privacy Policy">
            <Text style={{ color: '#bfa14a', fontWeight: '600', fontSize: 15, marginHorizontal: 8, marginVertical: 2 }}>Privacy Policy</Text>
          </Pressable>
          <Text style={{ color: '#bbb', fontSize: 18, marginHorizontal: 2 }}>|</Text>
          <Pressable onPress={() => router.push('/terms-of-service')} accessibilityRole="link" accessibilityLabel="Terms of Service">
            <Text style={{ color: '#bfa14a', fontWeight: '600', fontSize: 15, marginHorizontal: 8, marginVertical: 2 }}>Terms of Service</Text>
          </Pressable>
          <Text style={{ color: '#bbb', fontSize: 18, marginHorizontal: 2 }}>|</Text>
          <Pressable onPress={() => router.push('/return-policy')} accessibilityRole="link" accessibilityLabel="Return Policy">
            <Text style={{ color: '#bfa14a', fontWeight: '600', fontSize: 15, marginHorizontal: 8, marginVertical: 2 }}>Return Policy</Text>
          </Pressable>
          <Text style={{ color: '#bbb', fontSize: 18, marginHorizontal: 2 }}>|</Text>
          <Pressable onPress={() => router.push('/contact')} accessibilityRole="link" accessibilityLabel="Contact">
            <Text style={{ color: '#bfa14a', fontWeight: '600', fontSize: 15, marginHorizontal: 8, marginVertical: 2 }}>Contact</Text>
          </Pressable>
        </View>
      </View>
      </ScrollView>
      {zoomImage && (
        <ZoomableImage
          source={zoomImage}
          visible={zoomVisible}
          onClose={() => setZoomVisible(false)}
        />
      )}
    </View>
  );
}

// Move this footer JSX inside the ScrollView, just before <ZoomableImage />
// Find the end of your ScrollView content and add:
// <View style={{ width: '100%', backgroundColor: '#faf8f3', borderTopWidth: 1, borderTopColor: '#eee', paddingVertical: 24, paddingHorizontal: 0, alignItems: 'center', marginTop: 0 }}>
//   ...footer links...
// </View>


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