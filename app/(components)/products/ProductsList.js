import React, { useState, useEffect, useRef, useCallback } from 'react';
import { trackEvent } from '../../../lib/trackEvent';
import { View, FlatList, StyleSheet, ActivityIndicator, Text, Pressable, Platform } from 'react-native';
import { useWindowDimensions } from 'react-native';
import { useRouter, useGlobalSearchParams } from 'expo-router';
import { supabase } from '../../../lib/supabase/client';
import ProductCard from './ProductCard';
import { colors, spacing, borderRadius, fontFamily, shadows } from '../../../theme';

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;



import { TextInput, ScrollView } from 'react-native';

const CATEGORY_OPTIONS = [
  'All',
  'Necklaces',
  'Earrings',
  'Bracelets',
  'Rings',
  // Add more categories as needed
];

export default function ProductsList() {
  const { width } = useWindowDimensions();

  // Improved density for mobile
  const CARD_MIN_WIDTH = width < MOBILE_BREAKPOINT ? 160 : 280;
  const CARD_MAX_WIDTH = 320;
  const CONTAINER_PADDING = width < MOBILE_BREAKPOINT ? 8 : 32;
  const GRID_GAP = width < MOBILE_BREAKPOINT ? 16 : 32;

  const isMobile = width < MOBILE_BREAKPOINT;
  const isTablet = width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT;
  // For mobile, always use 2 columns
  const numColumns = isMobile ? 2 : isTablet ? 2 : 4;

  const availableWidth = width - (CONTAINER_PADDING * 2);
  const cardWidth = Math.min(
    Math.max(CARD_MIN_WIDTH, (availableWidth - (GRID_GAP * (numColumns - 1))) / numColumns),
    CARD_MAX_WIDTH
  );

  const { category } = useGlobalSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const ITEMS_PER_PAGE = 12; // Number of items per page
  const [sortOption, setSortOption] = useState('newest'); // Default sort by newest
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Function to change page
  const changePage = useCallback((newPage) => {
    if (newPage < 1 || newPage > totalPages || loading) return;
    
    // Scroll to top when changing pages
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
    
    setPage(newPage);
  }, [totalPages, loading]);

  // State for search, category, and sorting
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Sync selectedCategory with URL param on mount and whenever category param changes
  useEffect(() => {
    if (
      category &&
      CATEGORY_OPTIONS.includes(
        category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()
      ) &&
      (selectedCategory === 'All' || selectedCategory.toLowerCase() !== category.toLowerCase())
    ) {
      setSelectedCategory(
        category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()
      );
    }
  }, [category]);

  
  // Sort options
  const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
    { value: 'name_asc', label: 'Name: A to Z' },
    { value: 'name_desc', label: 'Name: Z to A' }
  ];

  // The loadMoreProducts function is now handled by our custom hook

  // Define fetchProducts outside of useEffect so it can be called from multiple places
  const fetchProducts = async () => {
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

        // First, get the total count for pagination
        let countQuery = supabase
          .from('products')
          .select('id', { count: 'exact' });
          
        // Apply category filters to count query
        if (selectedCategory && selectedCategory !== 'All') {
          countQuery = countQuery.eq('category', selectedCategory);
        }
        
        // Apply search filter to count query if needed
        if (search.trim() !== '') {
          const lowerSearch = search.trim().toLowerCase();
          countQuery = countQuery.or(`name.ilike.%${lowerSearch}%,description.ilike.%${lowerSearch}%`);
        }
        
        const { count, error: countError } = await countQuery;
        
        if (countError) {
          console.error('Error getting count:', countError);
          throw new Error(`Count error: ${countError.message}`);
        }
        
        // Calculate total pages
        const calculatedTotalPages = Math.ceil(count / ITEMS_PER_PAGE) || 1;
        setTotalPages(calculatedTotalPages);
        setTotalCount(count);
        
        // Build the main query
        let query = supabase
          .from('products')
          .select('id, name, price, image_url, category, description, stock, additional_images');
          
        // Apply sorting
        console.log('Applying sort:', sortOption);
        let sortInJs = false;
        switch (sortOption) {
          case 'newest':
            query = query.order('created_at', { ascending: false });
            break;
          case 'price_asc':
          case 'price_desc':
            console.log('Sorting by price in JS');
            query = query.not('price', 'is', null);
            sortInJs = true;
            break;
          case 'name_asc':
            query = query.order('name', { ascending: true });
            break;
          case 'name_desc':
            query = query.order('name', { ascending: false });
            break;
          default:
            console.log('Using default sort (newest)');
            query = query.order('created_at', { ascending: false });
        }

        // Apply selectedCategory filter (overrides URL param if not 'All')
        if (selectedCategory && selectedCategory !== 'All') {
          query = query.eq('category', selectedCategory);
        } else if (!selectedCategory && category) {
          const formattedCategory = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
          query = query.eq('category', formattedCategory);
        }
        
        // Apply search filter if needed
        if (search.trim() !== '') {
          const lowerSearch = search.trim().toLowerCase();
          query = query.or(`name.ilike.%${lowerSearch}%,description.ilike.%${lowerSearch}%`);
        }

        // Add pagination
        query = query.range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1);

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
          setProducts([]);
          return;
        }

        // If sorting by price, sort in JS
        let sortedData = data;
        if (sortInJs) {
          sortedData = [...data].sort((a, b) => {
            const parsePrice = (p) => {
              if (typeof p === 'number') return p;
              if (typeof p === 'string') {
                // Remove everything except digits, dot, and comma
                let cleaned = p.replace(/[^\d.,-]/g, '').replace(/,/g, '.');
                // Handle multiple dots (keep only the first as decimal)
                const parts = cleaned.split('.');
                if (parts.length > 2) cleaned = parts.slice(0,2).join('.') + parts.slice(2).join('');
                const val = parseFloat(cleaned);
                return isNaN(val) ? null : val;
              }
              return null;
            };
            const priceA = parsePrice(a.price);
            const priceB = parsePrice(b.price);
            // Debug log
            console.log(`Parsed priceA: ${a.price} =>`, priceA, ' | priceB:', b.price, '=>', priceB);
            // Place invalid or missing prices at the end
            if (priceA === null && priceB === null) return 0;
            if (priceA === null) return 1;
            if (priceB === null) return -1;
            if (sortOption === 'price_asc') return priceA - priceB;
            return priceB - priceA;
          });
        }

        console.log('Raw products data:', data);

        // Validate and transform the data
        let validProducts = data.map(product => {
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

        // Filter by search
        if (search.trim() !== '') {
          const lowerSearch = search.trim().toLowerCase();
          validProducts = validProducts.filter(product =>
            product.name.toLowerCase().includes(lowerSearch) ||
            (product.description && product.description.toLowerCase().includes(lowerSearch))
          );
        }
        console.log('Processed products:', validProducts);
        // Set products directly (no appending since we're using pagination)
        setProducts(validProducts);
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
  };

  useEffect(() => {
    // Reset everything when search, category, or sort option changes
    console.log('Filter changed - sortOption:', sortOption);
    setPage(1);
    setProducts([]);
    
    // Scroll to top when filters change
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
    
    // Fetch products whenever filters change
    fetchProducts();
  }, [search, selectedCategory, sortOption]);

  useEffect(() => {
    fetchProducts();
  }, [page, category]);

  const renderHeader = () => {
    // Prefer selectedCategory if not 'All', else fallback to URL param
    const activeCategory =
      selectedCategory && selectedCategory !== 'All'
        ? selectedCategory
        : category;

    let categoryTitle;
    if (!activeCategory || activeCategory === 'All') {
      categoryTitle = 'All Products';
    } else {
      categoryTitle = activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1);
    }

    const headerTitleFontSize = Platform.OS === 'web' ? 48 : 32;
    const headerSubtitleFontSize = Platform.OS === 'web' ? 22 : 18;

    return (
      <View style={styles.headerContainer}>
        <Text style={[styles.headerTitle, { fontSize: headerTitleFontSize }]}>
          {categoryTitle}
        </Text>
        <Text style={[styles.headerSubtitle, { fontSize: headerSubtitleFontSize }]}>
          {totalCount} {totalCount === 1 ? 'item' : 'items'} available
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
      <View style={{ flex: 1 }}>
        {/* Product Grid */}
        <FlatList
          data={products}
          style={{ flex: 1 }}
          renderItem={({ item, index }) => (
            <View style={numColumns === 1 ? styles.mobileCardSpacing : undefined}>
              <ProductCard item={item} cardWidth={cardWidth} />
            </View>
          )}
          keyExtractor={(item) => item.id.toString()}
          numColumns={numColumns}
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
            { paddingHorizontal: CONTAINER_PADDING, paddingVertical: spacing.xl }
          ]}
          columnWrapperStyle={numColumns > 1 ? [
            styles.columnWrapper,
            { marginBottom: GRID_GAP }
          ] : undefined}
          showsVerticalScrollIndicator={false}
        />
        
        {/* Pagination Controls */}
        {!loading && products.length > 0 && totalPages > 1 && (
          <View style={styles.paginationContainer}>
            <Pressable
              style={[styles.paginationButton, page === 1 && styles.paginationButtonDisabled]}
              onPress={() => changePage(1)}
              disabled={page === 1}
            >
              <Text style={styles.paginationButtonText}>«</Text>
            </Pressable>
            
            <Pressable
              style={[styles.paginationButton, page === 1 && styles.paginationButtonDisabled]}
              onPress={() => changePage(page - 1)}
              disabled={page === 1}
            >
              <Text style={styles.paginationButtonText}>‹</Text>
            </Pressable>
            
            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              // Logic to show pages around current page
              let pageNum;
              if (totalPages <= 5) {
                // Show all pages if 5 or fewer
                pageNum = i + 1;
              } else if (page <= 3) {
                // At start, show first 5 pages
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                // At end, show last 5 pages
                pageNum = totalPages - 4 + i;
              } else {
                // In middle, show current page and 2 on each side
                pageNum = page - 2 + i;
              }
              
              return (
                <Pressable
                  key={pageNum}
                  style={[
                    styles.paginationButton,
                    page === pageNum && styles.paginationButtonActive
                  ]}
                  onPress={() => changePage(pageNum)}
                >
                  <Text 
                    style={[
                      styles.paginationButtonText,
                      page === pageNum && styles.paginationButtonTextActive
                    ]}
                  >
                    {pageNum}
                  </Text>
                </Pressable>
              );
            })}
            
            <Pressable
              style={[styles.paginationButton, page === totalPages && styles.paginationButtonDisabled]}
              onPress={() => changePage(page + 1)}
              disabled={page === totalPages}
            >
              <Text style={styles.paginationButtonText}>›</Text>
            </Pressable>
            
            <Pressable
              style={[styles.paginationButton, page === totalPages && styles.paginationButtonDisabled]}
              onPress={() => changePage(totalPages)}
              disabled={page === totalPages}
            >
              <Text style={styles.paginationButtonText}>»</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  };

  // Render compact category filter and search bar
  const renderFilters = () => (
    <View
      style={{
        flexDirection: width > 600 ? 'row' : 'column',
        alignItems: 'center',
        gap: width > 600 ? 12 : 6,
        marginTop: spacing.lg,
        marginBottom: spacing.md,
        marginHorizontal: spacing.lg,
        zIndex: 10,
      }}
    >
      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, marginBottom: width > 600 ? 0 : 6, minWidth: width > 600 ? 320 : undefined }}
        contentContainerStyle={{ flexDirection: 'row', alignItems: 'center' }}
      >
        {CATEGORY_OPTIONS.map(cat => (
          <Pressable
            key={cat}
            style={({ pressed }) => [
              {
                paddingVertical: 4,
                paddingHorizontal: 10,
                borderRadius: 14,
                backgroundColor: selectedCategory === cat ? colors.gold : colors.white,
                marginRight: 6,
                borderWidth: 1,
                borderColor: colors.gold,
                opacity: pressed ? 0.7 : 1,
                minWidth: 60,
              }
            ]}
            onPress={() => {
               trackEvent({
                 eventType: 'category_click',
                 metadata: { categoryId: cat, source: 'shop' }
               });
               setSelectedCategory(cat);
               setProducts([]); // reset products
               setPage(1);
             }}
            accessibilityRole="button"
            accessibilityLabel={`Filter by ${cat}`}
          >
            <Text style={{ color: selectedCategory === cat ? colors.white : colors.gold, fontWeight: 'bold', fontSize: 13 }}>{cat}</Text>
          </Pressable>
        ))}
      </ScrollView>
      
      {/* Search Bar */}
      <TextInput
        value={search}
        onChangeText={async text => {
          setSearch(text);
          setProducts([]); // reset products
          setPage(1);
          // Log search if not empty
          if (text.trim() !== '') {
            try {
              await fetch('/.netlify/functions/logSearch', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query: text }),
              });
            } catch (err) {
              // Fail silently, do not block UI
              console.error('Failed to log search:', err);
            }
          }
        }}
        placeholder="Search products..."
        style={{
          flex: 1,
          backgroundColor: colors.white,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: colors.gold,
          paddingHorizontal: 10,
          paddingVertical: Platform.OS === 'web' ? 6 : 4,
          fontSize: 14,
          minWidth: width > 600 ? 220 : undefined,
          maxWidth: 320,
        }}
        accessibilityLabel="Search products"
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      
      {/* Custom Sort Dropdown */}
      <View style={{ minWidth: 180, maxWidth: width > 600 ? 220 : undefined }}>
        <Pressable
          style={({ pressed }) => [{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderWidth: 1,
            borderColor: colors.gold,
            borderRadius: 10,
            backgroundColor: colors.white,
            paddingVertical: 8,
            paddingHorizontal: 14,
            minHeight: 40,
            shadowColor: '#000',
            shadowOpacity: pressed ? 0.10 : 0.06,
            shadowRadius: pressed ? 10 : 6,
            shadowOffset: { width: 0, height: 2 },
            elevation: pressed ? 4 : 2,
          }]}
          onPress={() => setDropdownOpen((open) => !open)}
          accessibilityRole="button"
          accessibilityLabel="Sort products"
        >
          <Text style={{ color: colors.darkGray, fontSize: 15, fontWeight: '500' }}>
            {SORT_OPTIONS.find(opt => opt.value === sortOption)?.label || 'Newest'}
          </Text>
          <View style={{ marginLeft: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
          </View>
        </Pressable>
        {dropdownOpen && (
          <>
            {/* Overlay to close dropdown when clicking outside */}
            <Pressable
              onPress={() => setDropdownOpen(false)}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 99,
                backgroundColor: 'transparent',
              }}
            />
            <View
              style={{
                position: 'absolute',
                top: 48,
                left: 0,
                right: 0,
                backgroundColor: colors.white,
                borderWidth: 1,
                borderColor: colors.gold,
                borderRadius: 10,
                zIndex: 100,
                shadowColor: '#000',
                shadowOpacity: 0.12,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 8 },
                elevation: 8,
                marginTop: 4,
                overflow: 'hidden',
              }}
            >
              {SORT_OPTIONS.map(option => (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    console.log('Sort option selected:', option.value);
                    setSortOption(option.value);
                    setProducts([]);
                    setPage(1);
                    setDropdownOpen(false);
                  }}
                  style={({ pressed }) => [{
                    paddingVertical: 12,
                    paddingHorizontal: 18,
                    backgroundColor: sortOption === option.value ? colors.gold : pressed ? colors.lightGold : 'white',
                    borderBottomWidth: 1,
                    borderBottomColor: '#f0e6d2',
                  }]}
                >
                  <Text style={{ color: sortOption === option.value ? 'white' : colors.darkGray, fontWeight: sortOption === option.value ? '700' : '400', fontSize: 15 }}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderFilters()}
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ivory,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  paginationButton: {
    minWidth: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gold,
    paddingHorizontal: spacing.sm,
  },
  paginationButtonActive: {
    backgroundColor: colors.gold,
  },
  paginationButtonDisabled: {
    opacity: 0.5,
    borderColor: colors.lightGray,
  },
  paginationButtonText: {
    color: colors.gold,
    fontWeight: 'bold',
    fontSize: 16,
  },
  paginationButtonTextActive: {
    color: colors.white,
  },
  // Add for mobile single-column card spacing
  mobileCardSpacing: {
    marginBottom: spacing.xl * 2, // Increased spacing for mobile rows
  },
  contentContainer: {
    backgroundColor: colors.ivory,
    maxWidth: 1600,
    alignSelf: 'center',
    width: '100%',
  },
  columnWrapper: {
    justifyContent: 'space-between',
    width: '100%',
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