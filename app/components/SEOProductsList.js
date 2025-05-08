import React from 'react';
import SEO from './SEO';

export default function SEOProductsList({ category, products }) {
  // Generate SEO meta for product list/category page
  const title = category
    ? `${category.charAt(0).toUpperCase() + category.slice(1)} | Rare Collectables`
    : 'Shop Rare Collectables';
  const description = category
    ? `Browse unique items in the ${category} category. Discover rare and luxury collectables.`
    : 'Discover rare and luxury collectables. Shop unique products with detailed descriptions, secure checkout, and worldwide shipping.';
  const keywords = category
    ? `${category}, rare, collectables, shop, luxury, unique`
    : 'rare, collectables, luxury, shop, unique, products';
  const url = category
    ? `https://rarecollectables1.netlify.app/shop?category=${encodeURIComponent(category)}`
    : 'https://rarecollectables1.netlify.app/shop';

  // Structured data for a product list page (ItemList)
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: products.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: url.replace('/shop', `/product/${product.id}`),
      name: product.name
    }))
  };

  return (
    <SEO
      title={title}
      description={description}
      keywords={keywords}
      url={url}
      type="website"
      structuredData={structuredData}
    />
  );
}
