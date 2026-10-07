'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { ArrowLeft, Star, Package, Store as StoreIcon } from 'lucide-react';
import { Product, Shop } from '@/types';
import { BottomNav } from '@/components/ui/BottomNav';

export default function ProductDetailScreen() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [selectedImage, setSelectedImage] = useState(0);

  const loadProductData = useCallback(async () => {
    try {
      setLoading(true);

      const { data: productData } = await supabase
        .from('products')
        .select('id, shop_id, category_id, name, description, price, original_price, unit, stock_quantity, image_url, emoji, rating_avg, rating_count, is_active, is_listed, media_urls, created_at, updated_at, shops(id, owner_id, name, slug, description, logo_url, banner_url, shop_photo_url, category_id, theme_id, status, address_line, city, pincode, latitude, longitude, rating_avg, rating_count, delivery_time_mins, is_open, is_paywall_cleared, paywall_valid_until, map_link, opening_hours, social_links, credit_score, referral_code, local_shop_type, created_at, updated_at)')
        .eq('id', productId)
        .single();

      if (productData) {
        setProduct(productData);
        setShop(productData.shops as unknown as Shop);

        const { data: similarData } = await supabase
          .from('products')
          .select('id, shop_id, category_id, name, description, price, original_price, unit, stock_quantity, image_url, emoji, rating_avg, rating_count, is_active, is_listed, media_urls, created_at, updated_at')
          .eq('shop_id', productData.shop_id)
          .eq('is_active', true)
          .eq('is_listed', true)
          .neq('id', productId)
          .limit(6);

        if (similarData) setSimilarProducts(similarData);
      }
    } catch (error) {
      console.error('Error loading product data:', error);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void Promise.resolve().then(loadProductData);
  }, [loadProductData]);

  const handleShopClick = () => {
    if (shop) {
      router.push(`/shop/${shop.id}`);
    }
  };

  const handleSimilarProductClick = (similarProduct: Product) => {
    router.push(`/product/${similarProduct.id}`);
  };

  const images = product?.media_urls && product.media_urls.length > 0 
    ? product.media_urls 
    : product?.image_url 
      ? [product.image_url] 
      : [];

  if (loading) {
    return (
      <div className="min-h-dvh app-page-bg flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-dvh app-page-bg flex items-center justify-center">
        <p className="text-text-secondary">Product not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh app-page-bg pb-[calc(12rem+env(safe-area-inset-bottom))]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface/95 backdrop-blur-lg border-b border-primary/15 shadow-sm">
        <div className="flex items-center p-4 max-w-4xl mx-auto">
          <button onClick={() => router.back()} className="p-2 hover:bg-primary-light rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="flex-1 text-lg font-semibold text-text-primary truncate ml-2">
            {product.name}
          </h1>
        </div>
      </div>

      {/* Media Carousel */}
      <div className="relative max-w-4xl mx-auto">
        {images.length > 0 ? (
          <div className="h-80 bg-primary-light flex items-center justify-center">
            <img
              src={images[selectedImage]}
              alt={product.name}
              loading="eager"
              decoding="async"
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="h-80 bg-primary-light flex items-center justify-center">
            <Package className="w-16 h-16 text-primary-dark" />
          </div>
        )}

        {images.length > 1 && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setSelectedImage(index)}
                className={`w-2 h-2 rounded-full ${
                  index === selectedImage ? 'bg-primary' : 'bg-surface/70'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-text-primary">{product.name}</h1>
        
        {shop && (
          <button
            onClick={handleShopClick}
            className="text-text-secondary hover:text-primary mt-2 flex items-center gap-1"
          >
            <StoreIcon className="w-4 h-4" />
            {shop.name}
          </button>
        )}

        <div className="flex flex-wrap items-baseline gap-3 mt-3">
          <span className="text-3xl font-bold text-primary">₹{product.price}</span>
          {product.original_price && product.original_price > product.price && (
            <span className="text-lg text-text-secondary line-through">₹{product.original_price}</span>
          )}
          {product.unit && <span className="text-text-secondary">/ {product.unit}</span>}
        </div>

        {product.stock_quantity > 0 && (
          <p className="text-primary text-sm mt-2">
            {product.stock_quantity} in stock
          </p>
        )}

        {/* Tabs */}
        <div className="flex border-b border-border mt-6">
          <button className="flex-1 py-3 text-primary border-b-2 border-primary font-medium">
            Description
          </button>
          <button className="flex-1 py-3 text-text-secondary">
            Details
          </button>
        </div>

        {/* Tab Content */}
        <div className="py-4">
          <p className="text-text-secondary">
            {product.description || 'No description available.'}
          </p>
        </div>

        {/* Similar Products */}
        {similarProducts.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-bold text-text-primary mb-3">
              More from {shop?.name}
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {similarProducts.map((similarProduct) => (
                <Card
                  key={similarProduct.id}
                  onClick={() => handleSimilarProductClick(similarProduct)}
                  className="min-w-[140px] cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="aspect-[0.85] bg-primary-light rounded-t-lg flex items-center justify-center">
                    {similarProduct.image_url ? (
                      <img
                        src={similarProduct.image_url}
                        alt={similarProduct.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover rounded-t-lg"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary-light rounded-t-lg">
                        <Package className="w-8 h-8 text-primary-dark" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium text-text-primary text-sm truncate">
                      {similarProduct.name}
                    </h3>
                    <p className="text-primary font-bold mt-1">₹{similarProduct.price}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Shop Rating */}
        {shop && (
          <Card className="mt-6 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-text-primary">{shop.name}</h3>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-4 h-4 text-star fill-star" />
                  <span className="font-medium">{shop.rating_avg.toFixed(1)}</span>
                  <span className="text-text-secondary">({shop.rating_count} reviews)</span>
                </div>
              </div>
              <Button variant="outline" onClick={handleShopClick}>
                View Shop
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Bottom Bar */}
      <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-30 bg-surface/95 backdrop-blur-lg border-t border-primary/15 p-4">
        <Button
          onClick={handleShopClick}
          className="w-full max-w-2xl mx-auto flex"
          disabled={!shop}
        >
          Visit {shop?.name || 'Shop'}
        </Button>
      </div>
      <BottomNav />
    </div>
  );
}
