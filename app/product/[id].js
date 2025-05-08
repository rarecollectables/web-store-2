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

function MemoCarouselImage({ item, style }) {
  return <ExpoImage source={item} style={style} contentFit="cover" transition={300} />;
}

export default function ProductDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();
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

  const renderCarouselImage = useCallback(
    ({ item }) => <MemoCarouselImage item={item} style={styles.image} />, 
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
      price: typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0,
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
    if (!isWishlisted && product) addToWishlist(product);
    Animated.sequence([
      Animated.timing(heartScale, { toValue: 1.3, duration: 120, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1, friction: 3, useNativeDriver: true })
    ]).start(() => setWishAnimating(false));
    if (!isWishlisted && product) {
      Alert.alert('Added to Wishlist', `${product.title} has been added to your wishlist.`);
    }
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
      <View style={styles.modal}>
        <Pressable style={styles.close} onPress={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/');
        }}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <Text style={{ margin: 20, color: colors.text }}>{error || 'Product not found.'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.modal}>
      <Pressable style={styles.close} onPress={() => {
        if (router.canGoBack()) router.back();
        else router.replace('/');
      }}>
        <Text style={styles.closeText}>✕</Text>
      </Pressable>
      <View style={styles.imageWrapper}>
        <FlatList
          ref={flatListRef}
          data={images}
          keyExtractor={(_, idx) => idx.toString()}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          renderItem={renderCarouselImage}
          style={styles.carousel}
          initialScrollIndex={0}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          snapToAlignment="center"
          decelerationRate={Platform.OS === 'ios' ? 0 : 0.98}
        />
      </View>
      <View style={styles.pagination}>
        {images.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === currentIndex && styles.activeDot
            ]}
          />
        ))}
      </View>
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: 120 + insets.bottom, paddingHorizontal: 8 }]} > 
        <Text style={styles.title}>{product.title}</Text>
        <View style={styles.pricePillWrapper}>
          <Text style={styles.price}>{product.price}</Text>
        </View>
        <Text style={styles.description}>{product.description || 'Featuring exceptional craftsmanship and timeless design, this piece is a perfect addition to your collection.'}</Text>
        <Text style={styles.details}>{product.details}</Text>

        {/* Features Table */}
        {(() => {
          const features = [];
          const category = (product.category || '').toLowerCase();
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
          if (product.material) features.push({ label: labels.material, value: product.material });
          if (product.stone) features.push({ label: labels.stone, value: product.stone });
          if (product.size) features.push({ label: labels.size, value: product.size });
          if (product.length) features.push({ label: labels.length, value: product.length });
          if (features.length === 0) return null;
          return (
            <View style={{ marginTop: 18, marginBottom: 10, backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#eee' }}>
              <Text style={{ fontWeight: 'bold', fontSize: 16, padding: 10, backgroundColor: '#faf6e8', color: '#bfa14a' }}>Product Features</Text>
              {features.map((f, idx) => (
                <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 14, borderBottomWidth: idx === features.length - 1 ? 0 : 1, borderBottomColor: '#f5e9c8' }}>
                  <Text style={{ fontWeight: '500', color: '#444' }}>{f.label}</Text>
                  <Text style={{ color: '#333' }}>{f.value}</Text>
                </View>
              ))}
            </View>
          );
        })()}

        <View style={styles.divider} />
      </ScrollView>
      <View style={[styles.actionContainerFixed, { paddingBottom: insets.bottom + 12 }]}> 
        <Animated.View style={{ transform: [{ scale: addCartAnim.current }] }}>
          <Pressable
            style={styles.button}
            onPress={handleAddToCart}
            accessibilityLabel="Add to Cart"
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>Add to Cart</Text>
          </Pressable>
        </Animated.View>
        <Pressable
          style={styles.heartButton}
          onPress={handleWishlist}
          accessibilityLabel={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
          accessibilityRole="button"
        >
          <Animated.View style={{ transform: [{ scale: heartScale }] }}>
            <FontAwesome
              name={isWishlisted ? 'heart' : 'heart-o'}
              size={30}
              color={isWishlisted ? colors.ruby : colors.softGoldBorder}
            />
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 26,
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
