import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator, Text, Pressable, Platform } from 'react-native';
import { useWindowDimensions } from 'react-native';
import { useRouter, useGlobalSearchParams } from 'expo-router';
import { supabase } from '../../../lib/supabase/client';
import ProductCard from './ProductCard';
import { colors, spacing, borderRadius, fontFamily, shadows } from '../../../theme';

const CARD_MIN_WIDTH = 280;
const CARD_MAX_WIDTH = 320;
const CONTAINER_PADDING = 32;
const GRID_GAP = 32;
const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

export default function ProductsList() {
  const { width } = useWindowDimensions();
  const { category } = useGlobalSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const isMobile = width < MOBILE_BREAKPOINT;
  const isTablet = width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT;
  const numColumns = isMobile ? 1 : isTablet ? 2 : 4;
  
  const availableWidth = width - (CONTAINER_PADDING * 2);
  const cardWidth = isMobile 
    ? availableWidth
    : Math.min(
        Math.max(CARD_MIN_WIDTH, (availableWidth - (GRID_GAP * (numColumns - 1))) / numColumns),
        CARD_MAX_WIDTH
      );

  const loadMore = () => {
    if (!hasMore || loading) return;
    setPage(prev => prev + 1);
  };

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        setError(null);
        
        // Log the current category being fetched
        console.log('Fetching products with category:', category);
        
        // First, test the Supabase connection
        const { data: test, error: testError } = await supabase
          .from('products')
          .select('id')
          .limit(1);

        if (testError) {
          console.error('Supabase connection test failed:', testError);
          throw new Error(`Database connection error: ${testError.message}`);
        }

        console.log('Successfully connected to database');

        // Build the query
        let query = supabase
          .from('products')
          .select('id, name, price, image_url, category, description, stock, additional_images')
          .order('created_at', { ascending: false });

        if (category) {
          const formattedCategory = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
          console.log('Applying category filter:', formattedCategory);
          query = query.eq('category', formattedCategory);
        }

        // Add pagination
        query = query.range((page - 1) * 12, page * 12 - 1);

        console.log('Executing query...');
        const { data, error } = await query;

        if (error) {
          console.error('Supabase query error:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          throw new Error(`Query error: ${error.message}`);
        }

        if (!data || data.length === 0) {
          console.log('No products found');
          setHasMore(false);
          return;
        }

        console.log('Raw products data:', data);

        // Validate and transform the data
        const validProducts = data.map(product => {
          try {
            // Parse price from string format (e.g., '£50') to number
            let price = 0;
            if (typeof product.price === 'string') {
              // Remove currency symbol and any whitespace, then parse as float
              price = parseFloat(product.price.replace(/[£\s]/g, ''));
              if (isNaN(price)) {
                console.warn(`Invalid price format for product ${product.id}: ${product.price}`);
                price = 0;
              }
            } else if (typeof product.price === 'number') {
              price = product.price;
            }

            // Ensure image_url is a string
            const image_url = typeof product.image_url === 'string' ? product.image_url : null;

            // Validate required fields
            if (!product.id || !product.name) {
              console.warn(`Skipping invalid product:`, product);
              return null;
            }

            return {
              ...product,
              price, // Store as number
              image_url,
              // Map image_url to image_path for ProductCard
              image_path: image_url
            };
          } catch (parseError) {
            console.error(`Error processing product ${product.id}:`, parseError);
            return null;
          }
        }).filter(Boolean); // Remove null products

        console.log('Processed products:', validProducts);
        setProducts(prevProducts => {
          // If we're on the first page, replace products
          // If we're on subsequent pages, append products
          return page === 1 ? validProducts : [...prevProducts, ...validProducts];
        });
        setHasMore(data.length === 12); // Assuming 12 products per page
      } catch (err) {
        console.error('Error fetching products:', {
          message: err.message,
          stack: err.stack,
          name: err.name
        });
        setError(err.message || 'Failed to load products');
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [category, page]);

  const renderHeader = () => {
    if (!category) return null;
    
    const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1);
    const headerTitleFontSize = Platform.OS === 'web' ? 48 : 32;
    const headerSubtitleFontSize = Platform.OS === 'web' ? 22 : 18;
    return (
      <View style={styles.headerContainer}>
        <Text style={[styles.headerTitle, { fontSize: headerTitleFontSize }]}>{categoryTitle}</Text>
        <Text style={[styles.headerSubtitle, { fontSize: headerSubtitleFontSize }]}>
          {products.length} {products.length === 1 ? 'item' : 'items'} available
        </Text>
      </View>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.gold} />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              setPage(1);
              setHasMore(true);
              fetchProducts();
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      );
    }

    if (products.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No products found in this category</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={products}
        renderItem={({ item, index }) => (
          <View style={numColumns === 1 ? styles.mobileCardSpacing : undefined}>
            <ProductCard item={item} cardWidth={cardWidth} />
          </View>
        )}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.gold} />
            </View>
          ) : null
        }
        contentContainerStyle={[
          styles.contentContainer,
          { paddingVertical: spacing.xl }
        ]}
        columnWrapperStyle={numColumns > 1 ? [
          styles.columnWrapper,
          { gap: GRID_GAP }
        ] : undefined}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <View style={styles.container}>
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ivory,
  },
  // Add for mobile single-column card spacing
  mobileCardSpacing: {
    marginBottom: spacing.xl,
  },
  contentContainer: {
    paddingHorizontal: CONTAINER_PADDING,
    paddingVertical: spacing.xl,
    backgroundColor: colors.ivory,
    maxWidth: 1600,
    alignSelf: 'center',
    width: '100%',
  },
  columnWrapper: {
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: GRID_GAP,
  },
  headerContainer: {
    marginBottom: spacing.xl,
    paddingBottom: spacing.l,
    borderBottomWidth: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    padding: spacing.l,
    borderRadius: borderRadius.lg,
    ...shadows.card,
    shadowColor: colors.gold,
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    alignItems: 'center',
  },
  headerTitle: {
    // fontSize moved to component for Platform support
    fontFamily: fontFamily.serif,
    color: colors.gold,
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
    fontWeight: '700',
    textTransform: 'capitalize',
    textShadowColor: 'rgba(191,160,84,0.13)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    paddingHorizontal: spacing.l,
    paddingTop: spacing.sm,
    paddingBottom: 2,
    borderBottomWidth: 4,
    borderBottomColor: colors.gold,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    overflow: 'hidden',
  },
  headerSubtitle: {
    // fontSize moved to component for Platform support
    fontFamily: fontFamily.sans,
    color: colors.onyxBlack,
    letterSpacing: 0.4,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: spacing.xs,
    backgroundColor: 'rgba(255, 238, 200, 0.65)',
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    shadowColor: colors.gold,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    color: colors.ruby,
    textAlign: 'center',
    marginBottom: spacing.l,
    fontSize: 16,
    fontFamily: fontFamily.sans,
  },
  retryButton: {
    backgroundColor: colors.gold,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.l,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    // Platform-specific styles should be added inline in the component
  },
  retryButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 16,
    fontFamily: fontFamily.sans,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.ivory,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: 18,
    color: colors.gray,
    textAlign: 'center',
    fontFamily: fontFamily.sans,
  },
  listContent: {
    paddingVertical: spacing.xl,
  },
});
