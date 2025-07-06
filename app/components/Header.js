import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  Platform, 
  Animated,
  useWindowDimensions,
  TextInput
} from 'react-native';
import { Link, useRouter, usePathname } from 'expo-router';
import { Image } from 'expo-image';
import { FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../context/store';
import { colors, fontFamily, spacing, borderRadius } from '../../theme/index.js';
import { trackEvent } from '../../lib/trackEvent';

// Categories for navigation
const CATEGORIES = [
  { 
    name: 'SHOP', 
    path: '/(tabs)/shop', 
    icon: 'shopping-bag',
    subcategories: [] 
  },
  {
    name: 'TOP DEALS',
    path: '/(tabs)/shop?category=TopDeals',
    icon: 'tags',
    subcategories: [
      { name: 'Summer Steals Up to 40% Off Storewide', path: '/(tabs)/shop?category=TopDeals&subcategory=SummerSteals40' },
      { name: 'Summer Steals Up to 50% Off Select Styles', path: '/(tabs)/shop?category=TopDeals&subcategory=SummerSteals50' },
      { name: '20% off select Clearance', path: '/(tabs)/shop?category=TopDeals&subcategory=Clearance20' },
      { name: '40% Off SOKO', path: '/(tabs)/shop?category=TopDeals&subcategory=SOKO40' },
      { name: 'Summer Faves Under $250', path: '/(tabs)/shop?category=TopDeals&subcategory=SummerFaves250' },
      { name: 'Zales Essentials: Rings Designed and Priced For You', path: '/(tabs)/shop?category=TopDeals&subcategory=ZalesEssentials' },
      { name: 'Ear Party Under $250', path: '/(tabs)/shop?category=TopDeals&subcategory=EarParty250' },
      { name: 'Styles For Him Under $500', path: '/(tabs)/shop?category=TopDeals&subcategory=MensUnder500' },
      { name: 'Clearance 50% Off & Up', path: '/(tabs)/shop?category=TopDeals&subcategory=Clearance50' },
      { name: 'View All Offers', path: '/(tabs)/shop?category=TopDeals' },
    ]
  },
  {
    name: 'Clearance',
    path: '/(tabs)/shop?category=Clearance',
    icon: 'certificate',
    subcategories: [
      { name: 'Rings', path: '/(tabs)/shop?category=Clearance&subcategory=Rings' },
      { name: 'Necklaces', path: '/(tabs)/shop?category=Clearance&subcategory=Necklaces' },
      { name: 'Earrings', path: '/(tabs)/shop?category=Clearance&subcategory=Earrings' },
      { name: 'Bracelets', path: '/(tabs)/shop?category=Clearance&subcategory=Bracelets' },
      { name: 'Watches', path: '/(tabs)/shop?category=Clearance&subcategory=Watches' },
      { name: 'View All Clearance', path: '/(tabs)/shop?category=Clearance' },
    ]
  },
  {
    name: 'Rings',
    path: '/(tabs)/shop?category=Rings',
    icon: 'circle-o',
    subcategories: [
      { name: 'Engagement Rings', path: '/(tabs)/shop?category=Rings&subcategory=Engagement' },
      { name: 'Wedding Bands', path: '/(tabs)/shop?category=Rings&subcategory=WeddingBands' },
      { name: 'Fashion Rings', path: '/(tabs)/shop?category=Rings&subcategory=Fashion' },
      { name: 'View All Rings', path: '/(tabs)/shop?category=Rings' },
    ]
  },
  {
    name: 'Necklaces',
    path: '/(tabs)/shop?category=Necklaces',
    icon: 'diamond',
    subcategories: [
      { name: 'Pendants', path: '/(tabs)/shop?category=Necklaces&subcategory=Pendants' },
      { name: 'Chains', path: '/(tabs)/shop?category=Necklaces&subcategory=Chains' },
      { name: 'Chokers', path: '/(tabs)/shop?category=Necklaces&subcategory=Chokers' },
      { name: 'View All Necklaces', path: '/(tabs)/shop?category=Necklaces' },
    ]
  },
  {
    name: 'Earrings',
    path: '/(tabs)/shop?category=Earrings',
    icon: 'star-o',
    subcategories: [
      { name: 'Studs', path: '/(tabs)/shop?category=Earrings&subcategory=Studs' },
      { name: 'Hoops', path: '/(tabs)/shop?category=Earrings&subcategory=Hoops' },
      { name: 'Drops', path: '/(tabs)/shop?category=Earrings&subcategory=Drops' },
      { name: 'View All Earrings', path: '/(tabs)/shop?category=Earrings' },
    ]
  },
  {
    name: 'Pre-Owned',
    path: '/(tabs)/shop?category=PreOwned',
    icon: 'history',
    subcategories: [
      { name: 'Women\'s', path: '/(tabs)/shop?category=PreOwned&subcategory=Womens' },
      { name: 'Men\'s', path: '/(tabs)/shop?category=PreOwned&subcategory=Mens' },
      { name: 'View All Pre-Owned', path: '/(tabs)/shop?category=PreOwned' },
      { name: 'Zales at Rocksbox Pre-Owned', path: '/(tabs)/shop?category=PreOwned&subcategory=Rocksbox' },
    ]
  }
];

export default function Header() {
  const { width: windowWidth } = useWindowDimensions();
  const [logoSize, setLogoSize] = useState({ width: 200, height: 70 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(null);
  const [hoveredCategoryIndex, setHoveredCategoryIndex] = useState(null);
  const [mobileActiveCategoryIndex, setMobileActiveCategoryIndex] = useState(null);
  const [hoverTimeout, setHoverTimeout] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const store = useStore();
  
  // Debug log to check what's coming from the store
  useEffect(() => {
    console.log('Header - Store state:', { 
      cart: store.cart, 
      wishlist: store.wishlist,
      cartIsArray: Array.isArray(store.cart),
      wishlistIsArray: Array.isArray(store.wishlist)
    });
  }, [store.cart, store.wishlist]);
  
  const cart = Array.isArray(store.cart) ? store.cart : [];
  const wishlist = Array.isArray(store.wishlist) ? store.wishlist : [];
  
  // Calculate counts with safeguards
  const cartCount = cart.reduce((total, item) => {
    const quantity = item && item.quantity ? parseInt(item.quantity) || 1 : 1;
    return total + quantity;
  }, 0);
  
  const wishlistCount = wishlist.length;
  
  const isDesktop = windowWidth >= 768;
  const menuAnimation = React.useRef(new Animated.Value(0)).current;
  const categoryMenuRef = React.useRef(null);
  
  // Update logo size when window width changes
  useEffect(() => {
    function updateLogoSize() {
      if (windowWidth < 480) { // Small mobile
        setLogoSize({ width: 160, height: 55 });
      } else if (windowWidth < 768) { // Tablet/large mobile
        setLogoSize({ width: 180, height: 60 });
      } else if (windowWidth < 1024) { // Small desktop
        setLogoSize({ width: 200, height: 70 });
      } else { // Large desktop
        setLogoSize({ width: 220, height: 75 });
      }
    }
    
    updateLogoSize();
  }, [windowWidth]);
  
  // Add scroll listener to change header appearance on scroll
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleScroll = () => {
        const scrollPosition = window.scrollY;
        if (scrollPosition > 50) {
          setIsScrolled(true);
        } else {
          setIsScrolled(false);
        }
      };
      
      window.addEventListener('scroll', handleScroll);
      return () => {
        window.removeEventListener('scroll', handleScroll);
      };
    }
  }, []);
  
  // Handle mobile menu animation
  useEffect(() => {
    Animated.timing(menuAnimation, {
      toValue: mobileMenuOpen ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [mobileMenuOpen]);
  
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    trackEvent({ eventType: mobileMenuOpen ? 'mobile_menu_close' : 'mobile_menu_open' });
  };
  
  const handleSearch = () => {
    if (searchQuery.trim()) {
      // Log search event with consistent format and source information
      trackEvent({ 
        eventType: 'search', 
        searchQuery: searchQuery.trim(),
        searchSource: 'header',
        deviceType: isDesktop ? 'desktop' : 'mobile'
      });
      
      // Use router.push directly for more reliable navigation with search params
      router.push({
        pathname: '/(tabs)/shop',
        params: { search: searchQuery.trim() }
      });
      setSearchQuery('');
      
      // Close mobile menu if open
      if (mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    }
  };
  
  const handleNavigation = (path) => {
    if (path) {
      router.push(path);
      if (!isDesktop) {
        setMobileMenuOpen(false);
        setMobileActiveCategoryIndex(null);
      }
      setActiveCategoryIndex(null);
      setHoveredCategoryIndex(null);
      trackEvent({ 
        eventType: 'header_navigation', 
        metadata: { destination: path } 
      });
    }
  };
  
  const handleCategoryClick = (index, path, isDesktopView) => {
    if (isDesktopView) {
      // For desktop: navigate directly to the category page
      handleNavigation(path);
    } else {
      // For mobile: if category has subcategories, toggle them, otherwise navigate
      if (CATEGORIES[index].subcategories && CATEGORIES[index].subcategories.length > 0) {
        setMobileActiveCategoryIndex(mobileActiveCategoryIndex === index ? null : index);
      } else {
        handleNavigation(path);
      }
    }
  };
  
  // Close category dropdown when clicking outside
  useEffect(() => {
    if (isDesktop) {
      const handleClickOutside = (event) => {
        if (categoryMenuRef.current && !categoryMenuRef.current.contains(event.target)) {
          setActiveCategoryIndex(null);
        }
      };
      
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isDesktop]);
  
  // Handle hover events for desktop with delay to prevent menu disappearing too quickly
  const handleCategoryHover = (index) => {
    if (isDesktop) {
      clearTimeout(hoverTimeout);
      setHoveredCategoryIndex(index);
    }
  };
  
  const handleCategoryLeave = () => {
    if (isDesktop) {
      const timeout = setTimeout(() => {
        setHoveredCategoryIndex(null);
      }, 800);
      setHoverTimeout(timeout);
    }
  };
  
  const handleSubcategoryContainerEnter = () => {
    if (isDesktop) {
      clearTimeout(hoverTimeout);
      // Ensure the category stays hovered
      if (hoveredCategoryIndex === null) {
        // Find which category is showing this dropdown
        const categoryWithDropdown = CATEGORIES.findIndex(cat => 
          cat.subcategories && cat.subcategories.length > 0);
        if (categoryWithDropdown !== -1) {
          setHoveredCategoryIndex(categoryWithDropdown);
        }
      }
    }
  };
  
  const handleSubcategoryContainerLeave = () => {
    if (isDesktop) {
      const timeout = setTimeout(() => {
        setHoveredCategoryIndex(null);
      }, 800);
      setHoverTimeout(timeout);
    }
  };
  
  // Handle subcategory click
  const handleSubcategoryClick = (path) => {
    handleNavigation(path);
    setHoveredCategoryIndex(null);
  };

// Clean up timeout on unmount
useEffect(() => {
  return () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
  };
}, [hoverTimeout]);

// ... (rest of the code remains the same)

const mobileMenuOpacity = menuAnimation.interpolate({
  inputRange: [0, 1],
  outputRange: [0, 1],
});

const mobileMenuTranslateY = menuAnimation.interpolate({
  inputRange: [0, 1],
  outputRange: [-20, 0],
});

return (
  <>
    {/* Main Header Container - Top Row with Logo and Icons */}
    <View style={[
      styles.headerContainer, 
      { paddingTop: Platform.OS === 'ios' ? insets.top : 0 },
      isScrolled && styles.headerScrolled
    ]}>
        {/* Mobile Menu Toggle Button */}
        {!isDesktop && (
          <Pressable
            onPress={toggleMobileMenu}
            style={styles.menuButton}
            accessibilityRole="button"
            accessibilityLabel="Toggle menu"
          >
            <FontAwesome name={mobileMenuOpen ? 'times' : 'bars'} size={24} color={colors.gold} />
          </Pressable>
        )}
        
        {/* Logo */}
        <Link href="/(tabs)/" asChild>
          <Pressable style={styles.logoContainer}>
            <Image
              source={require('../../assets/images/rare-collectables-logo.png')}
              style={[styles.logo, { width: logoSize.width, height: logoSize.height }]}
              contentFit="contain"
              transition={300}
              accessibilityLabel="Rare Collectables logo"
            />
          </Pressable>
        </Link>
        
        {/* Desktop Search Bar */}
        {isDesktop && (
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              placeholderTextColor={colors.textLight}
              textAlign="center"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              accessibilityLabel="Search products"
            />
            <Pressable 
              style={styles.searchButton} 
              onPress={handleSearch}
              accessibilityRole="button"
              accessibilityLabel="Submit search"
            >
              <FontAwesome name="search" size={18} color={colors.white} />
            </Pressable>
          </View>
        )}
        
        {/* Header Icons (Cart & Wishlist) */}
        <View style={styles.headerIcons}>
          {/* Wishlist Icon */}
          <Pressable
            style={styles.iconButton}
            onPress={() => handleNavigation('/(tabs)/wishlist')}
            accessibilityRole="button"
            accessibilityLabel="Wishlist"
          >
            <FontAwesome name="heart" size={22} color={colors.gold} />
            {wishlistCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{wishlistCount}</Text>
              </View>
            )}
          </Pressable>
          
          {/* Cart Icon */}
          <Pressable
            style={styles.iconButton}
            onPress={() => handleNavigation('/(tabs)/cart')}
            accessibilityRole="button"
            accessibilityLabel="Shopping cart"
          >
            <FontAwesome name="shopping-cart" size={22} color={colors.gold} />
            {cartCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cartCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>
      
      {/* Desktop Navigation - Categories Row */}
      {isDesktop && (
        <View style={styles.categoriesRow}>
          <View style={styles.desktopNav} ref={categoryMenuRef}>
            {/* Categories Menu */}
            <View style={styles.categoriesContainer}>
              {CATEGORIES.map((category, index) => (
                <View key={category.name} style={styles.categoryWrapper}>
                  <Pressable
                    style={[
                      styles.navItem,
                      styles.categoryItem,
                      (pathname === category.path || 
                       pathname.includes(category.path + '?')) && styles.activeNavItem,
                      (activeCategoryIndex === index || hoveredCategoryIndex === index) && 
                        styles.hoveredCategoryItem
                    ]}
                    onPress={() => handleCategoryClick(index, category.path, true)}
                    onHoverIn={() => handleCategoryHover(index)}
                    onHoverOut={handleCategoryLeave}
                    accessibilityRole="button"
                    accessibilityLabel={category.name}
                    accessibilityHint={`Show ${category.name} subcategories`}
                  >
                    <Text style={[
                      styles.navText,
                      styles.categoryText,
                      (pathname === category.path || 
                       pathname.includes(category.path + '?')) && styles.activeNavText,
                      (activeCategoryIndex === index || hoveredCategoryIndex === index) && 
                        styles.hoveredCategoryText
                    ]}>
                      {category.name}
                    </Text>
                    {category.subcategories && category.subcategories.length > 0 && (
                      <FontAwesome 
                        name="angle-down" 
                        size={14} 
                        color={(activeCategoryIndex === index || hoveredCategoryIndex === index) ? 
                          colors.white : colors.gold} 
                        style={styles.dropdownIcon}
                      />
                    )}
                  </Pressable>
                  
                  {/* Subcategories Dropdown */}
                  {category.subcategories && category.subcategories.length > 0 && 
                   (hoveredCategoryIndex === index || activeCategoryIndex === index) && (
                    <View 
                      style={styles.subcategoriesDropdown}
                      onMouseEnter={handleSubcategoryContainerEnter}
                      onMouseLeave={handleSubcategoryContainerLeave}
                    >
                      {category.subcategories.map((subcategory) => (
                        <Pressable
                          key={subcategory.name}
                          style={styles.subcategoryItem}
                          onPress={() => handleSubcategoryClick(subcategory.path)}
                          accessibilityRole="link"
                          accessibilityLabel={subcategory.name}
                        >
                          <Text style={styles.subcategoryText}>
                            {subcategory.name}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        </View>
      )}
      
      {/* Mobile Menu Dropdown */}
      {!isDesktop && (
        <Animated.View 
          style={[
            styles.mobileMenu,
            {
              transform: [{ translateY: mobileMenuTranslateY }],
              opacity: mobileMenuOpacity,
              display: mobileMenuOpen ? 'flex' : 'none'
            }
          ]}
        >
          {/* Mobile Search Bar */}
          <View style={styles.mobileSearchContainer}>
            <TextInput
              style={styles.mobileSearchInput}
              placeholder="Search products..."
              placeholderTextColor={colors.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              accessibilityLabel="Search products"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable 
              style={styles.mobileSearchButton} 
              onPress={handleSearch}
              accessibilityRole="button"
              accessibilityLabel="Submit search"
            >
              <FontAwesome name="search" size={16} color={colors.white} />
            </Pressable>
          </View>
          {/* Main Menu Items removed as requested */}
          
          {/* Categories Menu */}
          <View style={styles.mobileCategoriesContainer}>
            {CATEGORIES.map((category, index) => (
              <View key={category.name} style={styles.mobileCategoryWrapper}>
                <Pressable
                  style={[
                    styles.mobileNavItem,
                    pathname === category.path && styles.activeMobileNavItem,
                    mobileActiveCategoryIndex === index && styles.expandedMobileCategoryItem
                  ]}
                  onPress={() => handleCategoryClick(index, category.path, false)}
                  accessibilityRole="button"
                  accessibilityLabel={category.name}
                  accessibilityHint={category.subcategories && category.subcategories.length > 0 ? 
                    `Show ${category.name} subcategories` : `Navigate to ${category.name}`}
                >
                  <FontAwesome 
                    name={category.icon} 
                    size={18} 
                    color={pathname === category.path || mobileActiveCategoryIndex === index ? 
                      colors.white : colors.gold} 
                    style={styles.mobileNavIcon}
                  />
                  <Text style={[
                    styles.mobileNavText,
                    (pathname === category.path || mobileActiveCategoryIndex === index) && 
                      styles.activeMobileNavText
                  ]}>
                    {category.name}
                  </Text>
                  {category.subcategories && category.subcategories.length > 0 && (
                    <FontAwesome 
                      name={mobileActiveCategoryIndex === index ? "angle-up" : "angle-down"} 
                      size={18} 
                      color={mobileActiveCategoryIndex === index ? colors.white : colors.gold} 
                      style={styles.mobileDropdownIcon}
                    />
                  )}
                </Pressable>
                
                {/* Mobile Subcategories */}
                {category.subcategories && 
                 category.subcategories.length > 0 && 
                 mobileActiveCategoryIndex === index && (
                  <View style={styles.mobileSubcategoriesContainer}>
                    {category.subcategories.map((subcategory) => (
                      <Pressable
                        key={subcategory.name}
                        style={styles.mobileSubcategoryItem}
                        onPress={() => handleNavigation(subcategory.path)}
                        accessibilityRole="link"
                        accessibilityLabel={subcategory.name}
                      >
                        <Text style={styles.mobileSubcategoryText}>
                          {subcategory.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        </Animated.View>
      )}
      
      {/* Overlay for mobile menu */}
      {!isDesktop && mobileMenuOpen && (
        <Pressable
          style={styles.overlay}
          onPress={() => setMobileMenuOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Close menu"
        />
      )}

    </>
  );
}

const styles = StyleSheet.create({
  /* Announcement bar styles removed */
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(191, 161, 74, 0.2)',
    position: 'sticky',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    ...(Platform.OS === 'web' ? {
      transition: 'all 0.3s ease',
    } : {}),
  },
  headerScrolled: {
    paddingVertical: spacing.s,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 3,
    }),
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  logo: {
    resizeMode: 'contain',
  },
  menuButton: {
    padding: spacing.sm,
    zIndex: 1100,
  },
  categoriesRow: {
    width: '100%',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(191, 161, 74, 0.2)',
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.xl,
    zIndex: 99,
  },
  desktopNav: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoriesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 0,
    gap: spacing.xl,
  },
  categoryWrapper: {
    position: 'relative',
    marginHorizontal: spacing.l,
    marginBottom: spacing.m,
  },
  navItem: {
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.m,
    marginHorizontal: 0,
    borderRadius: 0,
    position: 'relative',
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeNavItem: {
    borderBottomWidth: 3,
    borderBottomColor: colors.gold,
    backgroundColor: 'transparent',
  },
  hoveredCategoryItem: {
    backgroundColor: 'transparent',
    borderBottomWidth: 3,
    borderBottomColor: colors.gold,
  },
  navText: {
    color: colors.darkGray,
    fontSize: 15,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  categoryText: {
    color: colors.darkGray,
    fontWeight: '500',
  },
  activeNavText: {
    color: colors.gold,
    fontWeight: '600',
  },
  hoveredCategoryText: {
    color: colors.gold,
  },
  dropdownIcon: {
    marginLeft: spacing.xs,
  },
  subcategoriesDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(191, 161, 74, 0.3)',
    borderRadius: borderRadius.sm,
    padding: 0,
    minWidth: 280,
    zIndex: 200,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 5,
    }),
  },
  subcategoryItem: {
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.l,
    borderRadius: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(191, 161, 74, 0.1)',
    marginBottom: 0,
    transition: 'all 0.2s ease',
    ...(Platform.OS === 'web' ? {
      ':hover': {
        backgroundColor: 'rgba(191, 161, 74, 0.05)',
      }
    } : {}),
  },
  subcategoryText: {
    color: colors.darkGray,
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: spacing.xs,
    fontFamily: fontFamily.sans,
    letterSpacing: 0.3,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: spacing.md,
    minWidth: 100,
  },
  iconButton: {
    padding: spacing.sm,
    marginLeft: spacing.sm,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#e53935', // Red color for better visibility
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: colors.white,
    zIndex: 10,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  mobileMenu: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 70 : 60,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderBottomLeftRadius: borderRadius.md,
    borderBottomRightRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    zIndex: 999,
    maxHeight: '80vh',
    overflow: 'auto',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  mobileCategoriesContainer: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(191, 161, 74, 0.2)',
    paddingTop: spacing.md,
  },
  mobileCategoryWrapper: {
    marginBottom: spacing.xs,
  },
  mobileNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  expandedMobileCategoryItem: {
    backgroundColor: colors.gold,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 0,
  },
  activeMobileNavItem: {
    backgroundColor: colors.gold,
  },
  mobileNavIcon: {
    marginRight: spacing.sm,
  },
  mobileDropdownIcon: {
    marginLeft: 'auto',
  },
  mobileNavText: {
    fontFamily: fontFamily.sans,
    fontSize: 18,
    color: colors.text,
    flex: 1,
  },
  activeMobileNavText: {
    color: colors.white,
    fontWeight: '600',
  },
  mobileSubcategoriesContainer: {
    backgroundColor: colors.ivory,
    borderBottomLeftRadius: borderRadius.sm,
    borderBottomRightRadius: borderRadius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  mobileSubcategoryItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(191, 161, 74, 0.2)',
  },
  mobileSubcategoryText: {
    fontFamily: fontFamily.sans,
    fontSize: 16,
    color: colors.onyxBlack,
    paddingLeft: spacing.xl,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 998,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    maxWidth: 400,
    marginHorizontal: spacing.l,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: colors.softGoldBorder,
    borderTopLeftRadius: borderRadius.sm,
    borderBottomLeftRadius: borderRadius.sm,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs,
    fontFamily: fontFamily.sans,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.white,
    textAlign: 'center',
  },
  searchButton: {
    backgroundColor: colors.gold,
    height: 40,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopRightRadius: borderRadius.sm,
    borderBottomRightRadius: borderRadius.sm,
    marginLeft: -1,
  },
  mobileSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.m,
    width: '100%',
  },
  mobileSearchInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: colors.softGoldBorder,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs,
    fontFamily: fontFamily.sans,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.white,
  },
  mobileSearchButton: {
    backgroundColor: colors.gold,
    height: 40,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopRightRadius: borderRadius.sm,
    borderBottomRightRadius: borderRadius.sm,
    marginLeft: -1,
  },
});
