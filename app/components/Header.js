import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  Platform, 
  Animated,
  useWindowDimensions 
} from 'react-native';
import { Link, useRouter, usePathname } from 'expo-router';
import { Image } from 'expo-image';
import { FontAwesome } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../context/store';
import { colors, fontFamily, spacing, borderRadius } from '../../theme/index.js';
import { trackEvent } from '../../lib/trackEvent';

// Removed MENU_ITEMS as requested

const CATEGORIES = [
  { 
    name: 'Shop', 
    path: '/(tabs)/shop', 
    icon: 'shopping-bag',
    subcategories: [] 
  },
  {
    name: 'Top Deals',
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
  const [logoSize, setLogoSize] = useState({ width: 240, height: 80 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(null);
  const [mobileActiveCategoryIndex, setMobileActiveCategoryIndex] = useState(null);
  const [hoveredCategoryIndex, setHoveredCategoryIndex] = useState(null);
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { cart = [], wishlist = [] } = useStore();
  const cartCount = Array.isArray(cart) ? cart.reduce((total, item) => total + (item.quantity || 1), 0) : 0;
  const wishlistCount = Array.isArray(wishlist) ? wishlist.length : 0;
  
  const isDesktop = windowWidth >= 768;
  const menuAnimation = React.useRef(new Animated.Value(0)).current;
  const categoryMenuRef = React.useRef(null);
  
  // Update logo size when window width changes
  useEffect(() => {
    function updateLogoSize() {
      if (windowWidth < 480) { // Small mobile
        setLogoSize({ width: 180, height: 60 });
      } else if (windowWidth < 768) { // Tablet/large mobile
        setLogoSize({ width: 220, height: 70 });
      } else if (windowWidth < 1024) { // Small desktop
        setLogoSize({ width: 240, height: 80 });
      } else { // Large desktop
        setLogoSize({ width: 280, height: 90 });
      }
    }
    
    updateLogoSize();
  }, [windowWidth]);
  
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
    trackEvent({ 
      eventType: mobileMenuOpen ? 'mobile_menu_close' : 'mobile_menu_open'
    });
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
      // For desktop: toggle dropdown visibility
      setActiveCategoryIndex(activeCategoryIndex === index ? null : index);
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
  
  // Handle hover events for desktop
  const handleCategoryHover = (index) => {
    if (isDesktop) {
      setHoveredCategoryIndex(index);
    }
  };
  
  const handleCategoryLeave = () => {
    if (isDesktop) {
      setHoveredCategoryIndex(null);
    }
  };
  
  const mobileMenuTranslateY = menuAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 0],
  });
  
  const mobileMenuOpacity = menuAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <>
      {/* Main Header Container */}
      <View style={[
        styles.headerContainer, 
        { paddingTop: Platform.OS === 'ios' ? insets.top : 0 }
      ]}>
        {/* Mobile Menu Toggle Button */}
        {!isDesktop && (
          <Pressable 
            style={styles.menuButton} 
            onPress={toggleMobileMenu}
            accessibilityRole="button"
            accessibilityLabel={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            <FontAwesome 
              name={mobileMenuOpen ? "times" : "bars"} 
              size={24} 
              color={colors.gold} 
            />
          </Pressable>
        )}
        
        {/* Logo */}
        <Link href="/" asChild>
          <Pressable style={styles.logoContainer}>
            <Image
              source={require('../../assets/images/rare-collectables-logo.png')}
              style={[styles.logo, { width: logoSize.width, height: logoSize.height }]}
              contentFit="contain"
              accessibilityLabel="Rare Collectables logo"
            />
          </Pressable>
        </Link>
        
        {/* Desktop Navigation */}
        {isDesktop && (
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
                   (activeCategoryIndex === index || hoveredCategoryIndex === index) && (
                    <View style={styles.subcategoriesDropdown}>
                      {category.subcategories.map((subcategory) => (
                        <Pressable
                          key={subcategory.name}
                          style={styles.subcategoryItem}
                          onPress={() => handleNavigation(subcategory.path)}
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
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    position: 'relative',
    zIndex: 1000,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      position: 'sticky',
      top: 0,
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    }),
  },
  logoContainer: {
    flex: 1,
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
  desktopNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 2,
    flexWrap: 'wrap',
  },
  categoriesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: spacing.sm,
    flexWrap: 'wrap',
    ...(Platform.OS === 'web' ? {
      position: 'relative',
    } : {}),
  },
  categoryWrapper: {
    position: 'relative',
    marginHorizontal: spacing.xs,
    marginBottom: spacing.xs,
    ...(Platform.OS === 'web' ? {
      zIndex: 1001,
    } : {}),
  },
  navItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ivory,
    borderWidth: 1,
    borderColor: colors.softGoldBorder,
  },
  hoveredCategoryItem: {
    backgroundColor: colors.gold,
  },
  activeNavItem: {
    backgroundColor: colors.gold,
  },
  navText: {
    fontFamily: fontFamily.sans,
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  categoryText: {
    color: colors.onyxBlack,
  },
  hoveredCategoryText: {
    color: colors.white,
  },
  activeNavText: {
    color: colors.white,
    fontWeight: '600',
  },
  dropdownIcon: {
    marginLeft: spacing.xs,
  },
  subcategoriesDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    width: 280,
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
    zIndex: 1002,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 5,
    }),
  },
  subcategoryItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.softGoldBorder,
  },
  subcategoryText: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    color: colors.onyxBlack,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 100,
  },
  iconButton: {
    padding: spacing.sm,
    marginLeft: spacing.sm,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.accent,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: 'bold',
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
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 5,
    }),
  },
  mobileCategoriesContainer: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.softGoldBorder,
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
    borderBottomColor: colors.softGoldBorder,
  },
  mobileSubcategoryText: {
    fontFamily: fontFamily.sans,
    fontSize: 16,
    color: colors.onyxBlack,
    paddingLeft: spacing.xl,
  },
  overlay: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 70 : 60,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 998,
  },
});
