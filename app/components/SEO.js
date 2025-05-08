import React from 'react';

export default function SEO({
  title = 'Rare Collectables',
  description = 'Discover rare and luxury collectables. Shop unique products with detailed descriptions, secure checkout, and worldwide shipping.',
  keywords = 'rare, collectables, luxury, shop, unique, products',
  image = 'https://rarecollectables1.netlify.app/default-og-image.jpg',
  url = 'https://rarecollectables1.netlify.app',
  type = 'website',
  children,
  structuredData
}) {
  return (
    <>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      {/* Open Graph / Facebook */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      {/* Canonical URL */}
      <link rel="canonical" href={url} />
      {/* Structured Data (JSON-LD) */}
      {structuredData && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      )}
      {children}
    </>
  );
}
