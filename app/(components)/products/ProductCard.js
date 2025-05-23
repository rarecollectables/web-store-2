import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Platform, ImageBackground, Animated, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, fontFamily } from '../../../theme';
import { useStore } from '../../../context/store';
import { trackEvent } from '../../../lib/trackEvent';

export default function ProductCard({ item, cardWidth }) {
  const router = useRouter();
  const { addToCart, addToWishlist, removeFromWishlist, wishlist } = useStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [failedIndexes, setFailedIndexes] = useState([]);
  const intervalRef = useRef(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [isWishlisted, setIsWishlisted] = useState(() => wishlist?.some(w => w.id === item.id));
  const wishAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setIsWishlisted(wishlist?.some(w => w.id === item.id));
  }, [wishlist, item.id]);

  // Get all images for the product
  // Combine main image and additional_images (TEXT[]), filter for valid strings
  const getProductImages = () => {
    const images = [];
    if (typeof item.image_url === 'string' && item.image_url.trim() !== '') {
      images.push(item.image_url);
    }
    if (Array.isArray(item.additional_images)) {
      images.push(...item.additional_images.filter(img => typeof img === 'string' && img.trim() !== ''));
    }
    return images;
  };

  let images = getProductImages();
  // Filter out images that have failed to load
  images = images.filter((_, idx) => !failedIndexes.includes(idx));

  // If all images failed, use the branded placeholder
  const allImagesFailed = images.length === 0;
  const PLACEHOLDER_IMAGE = 'https://fhybeyomiivepmlrampr.supabase.co/storage/v1/object/public/utils//brandLogo.webp';

  useEffect(() => {
    if (images.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
      }, 3200);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [images.length]);

  // Reset failedIndexes if item changes
  useEffect(() => {
    setFailedIndexes([]);
    setCurrentIndex(0);
  }, [item.id]);

  const handlePress = () => {
    // Track product view event
    trackEvent({
      eventType: 'product_view',
      productId: item.id,
      metadata: { productName: item.name }
    });
    router.push(`/product/${item.id}`);
  };

  const handleAddToCart = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.15, duration: 120, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true })
    ]).start();

    const imageUri = images[0] || '';
    const price = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
    // Track add to cart event
    trackEvent({
      eventType: 'add_to_cart',
      productId: item.id,
      quantity: 1,
      metadata: { productName: item.name, price }
    });
    addToCart({
      ...item,
      price,
      image: imageUri,
      quantity: 1,
    });
    
    Alert.alert('Added to Cart', `${item.name} has been added to your cart.`);
  };

  const formatPrice = (price) => {
    const numericPrice = typeof price === 'number' ? price : 
                        typeof price === 'string' ? parseFloat(price.replace(/[£\s]/g, '')) : 0;
    
    if (isNaN(numericPrice)) {
      return 'Price N/A';
    }
    
    return `£${numericPrice.toFixed(2)}`;
  };

  // Wishlist button handler
  const handleWishlist = (e) => {
    e.stopPropagation();
    Animated.sequence([
      Animated.timing(wishAnim, { toValue: 1.25, duration: 120, useNativeDriver: true }),
      Animated.spring(wishAnim, { toValue: 1, friction: 3, useNativeDriver: true })
    ]).start();
    const price = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
    if (!isWishlisted) {
      addToWishlist(item);
      trackEvent({
        eventType: 'add_to_wishlist',
        productId: item.id,
        metadata: { productName: item.name, price }
      });
    } else {
      removeFromWishlist(item.id);
      trackEvent({
        eventType: 'remove_from_wishlist',
        productId: item.id,
        metadata: { productName: item.name, price }
      });
    }
    setIsWishlisted(prev => !prev);
  };

  return (
    <Pressable
      style={[styles.container, { width: cardWidth }]}
      onPress={handlePress}
    >
      <View style={styles.imageContainer}>
        {imageLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.gold} />
          </View>
        )}
        {allImagesFailed ? (
          <ImageBackground
            source={{ uri: PLACEHOLDER_IMAGE }}
            style={styles.image}
            imageStyle={styles.imageStyle}
            onLoadStart={() => setImageLoading(true)}
            onLoad={() => setImageLoading(false)}
          >
            {/* Optionally, show a logo or fallback text here */}
          </ImageBackground>
        ) : (
          <ImageBackground
            source={typeof images[currentIndex] === 'string' && images[currentIndex].trim() !== '' ? { uri: images[currentIndex] } : undefined}
            style={styles.image}
            imageStyle={styles.imageStyle}
            onLoadStart={() => setImageLoading(true)}
            onLoad={() => setImageLoading(false)}
            onError={() => {
              setImageLoading(false);
              setFailedIndexes(prev => {
                // Mark this index as failed
                const failed = [...prev, currentIndex];
                // If all images failed, show placeholder
                if (failed.length >= getProductImages().length) {
                  setImageError(true);
                } else {
                  // Instantly skip to next valid image
                  const nextValid = getProductImages().findIndex((_, idx) => !failed.includes(idx) && idx !== currentIndex);
                  setCurrentIndex(nextValid !== -1 ? nextValid : 0);
                }
                return failed;
              });
            }}
          >
            {images.length > 1 && (
              <View style={styles.imageIndicators}>
                {images.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.indicator,
                      index === currentIndex && styles.activeIndicator
                    ]}
                  />
                ))}
              </View>
            )}
          </ImageBackground>
        )}
      </View>
      <View style={styles.wishlistIconWrapper}>
        <Animated.View style={{ transform: [{ scale: wishAnim }] }}>
          <Pressable
            onPress={handleWishlist}
            accessibilityLabel={isWishlisted ? `Remove ${item.name} from wishlist` : `Add ${item.name} to wishlist`}
            accessibilityRole="button"
            style={[styles.wishlistButton, isWishlisted && styles.wishlistActive]}
          >
            <Text style={{ fontSize: 22, color: isWishlisted ? colors.gold : colors.gray }}>
              {isWishlisted ? '♥' : '♡'}
            </Text>
          </Pressable>
        </Animated.View>
      </View>
      <View style={styles.contentContainer}>
        <View style={styles.textContainer}>
          <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.price}>{formatPrice(item.price)}</Text>
        </View>
        <Animated.View style={[styles.buttonContainer, { transform: [{ scale: scaleAnim }] }]}>
          <Pressable
            style={styles.addToCartButton}
            onPress={(e) => {
              e.stopPropagation();
              handleAddToCart();
            }}
          >
            <Text style={styles.addToCartText}>Add to Cart</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wishlistIconWrapper: {
    position: 'absolute',
    top: 10,
    right: 12,
    zIndex: 10,
  },
  wishlistButton: {
    backgroundColor: 'transparent',
    padding: 4,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wishlistActive: {
    // Optionally add a highlight or shadow
  },
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: spacing.l,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.ivory,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageStyle: {
    resizeMode: 'cover',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.ivory,
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.ivory,
  },
  errorText: {
    color: colors.gray,
    fontFamily: fontFamily.sans,
    fontSize: 14,
  },
  contentContainer: {
    padding: spacing.l,
    flex: 1,
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
    marginBottom: spacing.m,
    alignItems: 'center',
  },
  name: {
    fontSize: 15,
    fontFamily: fontFamily.serif,
    color: colors.onyxBlack,
    marginBottom: spacing.m,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  price: {
    fontSize: 22,
    fontFamily: fontFamily.sans,
    color: colors.gold,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    paddingVertical: spacing.xs,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
  },
  addToCartButton: {
    backgroundColor: colors.gold,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.l,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    width: '100%',
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      ':hover': {
        backgroundColor: colors.darkGold,
      },
    } : {}),
  },
  addToCartText: {
    color: colors.white,
    fontFamily: fontFamily.sans,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  imageIndicators: {
    position: 'absolute',
    bottom: spacing.sm,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
    opacity: 0.5,
  },
  activeIndicator: {
    opacity: 1,
    backgroundColor: colors.gold,
  },
});
