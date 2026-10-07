'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { ArrowLeft, MapPin, Star, Clock, Phone, ExternalLink, MessageCircle, Store, Package } from 'lucide-react';
import { Shop, Product, ShopTheme } from '@/types';
import { BottomNav } from '@/components/ui/BottomNav';

export default function ShopDetailScreen() {
  const router = useRouter();
  const params = useParams();
  const shopId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<Shop | null>(null);
  const [theme, setTheme] = useState<ShopTheme | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  const loadShopData = useCallback(async () => {
    try {
      setLoading(true);

      const { data: shopData } = await supabase
        .from('shops')
        .select('id, owner_id, name, slug, description, logo_url, banner_url, shop_photo_url, category_id, theme_id, status, address_line, city, pincode, latitude, longitude, rating_avg, rating_count, delivery_time_mins, is_open, is_paywall_cleared, paywall_valid_until, map_link, opening_hours, social_links, credit_score, referral_code, local_shop_type, created_at, updated_at, shop_themes(id, code, name, primary_color, secondary_color, accent_color, background_color, is_premium, created_at)')
        .eq('id', shopId)
        .single();

      if (shopData) {
        setShop(shopData);
        setTheme(shopData.shop_themes as unknown as ShopTheme);

        const { data: productsData } = await supabase
          .from('products')
          .select('id, shop_id, category_id, name, description, price, original_price, unit, stock_quantity, image_url, emoji, rating_avg, rating_count, is_active, is_listed, media_urls, created_at, updated_at')
          .eq('shop_id', shopId)
          .eq('is_active', true)
          .eq('is_listed', true)
          .limit(20);

        if (productsData) setProducts(productsData);
      }
    } catch (error) {
      console.error('Error loading shop data:', error);
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    void Promise.resolve().then(loadShopData);
  }, [loadShopData]);

  const handleProductClick = (product: Product) => {
    router.push(`/product/${product.id}`);
  };

  const handleMapClick = () => {
    if (shop?.map_link) {
      window.open(shop.map_link, '_blank');
    }
  };

  const colors = theme || {
    primary_color: '#249D8F',
    secondary_color: '#E76F51',
    accent_color: '#E9C46A',
    background_color: '#F2D49C',
  };

  if (loading) {
    return (
      <div className="min-h-dvh app-page-bg flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-dvh app-page-bg flex items-center justify-center">
        <p className="text-text-secondary">Shop not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh app-page-bg pb-[calc(6rem+env(safe-area-inset-bottom))]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-transparent">
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 p-2 bg-surface/90 backdrop-blur rounded-full shadow-md z-20"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Hero Section */}
      <div
        className="h-48 relative"
        style={{
          background: `linear-gradient(to bottom, ${colors.primary_color}, ${colors.secondary_color})`,
        }}
      >
        {shop.banner_url && (
          <img src={shop.banner_url} alt="Banner" loading="eager" decoding="async" className="w-full h-full object-cover" />
        )}
      </div>

      {/* Shop Info */}
      <div className="max-w-6xl mx-auto px-4 -mt-12 relative z-10">
        <div className="flex items-end gap-4 mb-4">
          <div
            className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-full border-4 border-surface shadow-lg flex items-center justify-center"
            style={{ backgroundColor: colors.accent_color }}
          >
            {shop.logo_url ? (
              <img src={shop.logo_url} alt={shop.name} loading="eager" decoding="async" className="w-full h-full object-cover rounded-full" />
            ) : (
              <Store className="w-10 h-10 text-primary-dark" />
            )}
          </div>
          <div className="flex-1 min-w-0 pb-2">
            <h1 className="text-2xl font-bold" style={{ color: colors.primary_color }}>
              {shop.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-star fill-star" />
                <span className="font-medium" style={{ color: colors.primary_color }}>
                  {shop.rating_avg.toFixed(1)}
                </span>
              </div>
              <span className="text-text-secondary">({shop.rating_count} reviews)</span>
            </div>
          </div>
        </div>

        {shop.description && <p className="text-text-secondary mb-4">{shop.description}</p>}

        <div className="flex items-center gap-2 text-text-secondary mb-2">
          <MapPin className="w-4 h-4" style={{ color: colors.primary_color }} />
          <span>{shop.city}, {shop.pincode}</span>
        </div>

        {shop.opening_hours && (
          <div className="flex items-center gap-2 text-text-secondary mb-4">
            <Clock className="w-4 h-4" style={{ color: colors.primary_color }} />
            <span>{shop.opening_hours}</span>
          </div>
        )}

        {shop.map_link && (
          <Button
            variant="outline"
            onClick={handleMapClick}
            className="w-full mb-4"
            style={{ borderColor: colors.primary_color, color: colors.primary_color }}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View Location
          </Button>
        )}

        {/* Social Links */}
        {shop.social_links && Object.keys(shop.social_links).length > 0 && (
          <Card className="p-4 mb-4">
            <div className="grid grid-cols-2 gap-2">
              {shop.social_links.phone && (
                <a
                  href={`tel:${shop.social_links.phone}`}
                  className="flex items-center justify-center gap-2 p-3 bg-primary-light rounded-lg hover:bg-green-light text-primary-dark"
                >
                  <Phone className="w-4 h-4" />
                  <span className="text-sm">Call</span>
                </a>
              )}
              {shop.social_links.whatsapp && (
                <a
                  href={shop.social_links.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 p-3 bg-green-light rounded-lg hover:bg-primary-light text-primary"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="text-sm">WhatsApp</span>
                </a>
              )}
            </div>
          </Card>
        )}

        {/* Products */}
        <div className="mt-6">
          <h2 className="text-lg font-bold mb-3" style={{ color: colors.primary_color }}>
            Products
          </h2>
          {products.length === 0 ? (
            <p className="text-text-secondary text-center py-8">No products listed yet</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {products.map((product) => (
                <Card
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="aspect-[0.85] bg-primary-light rounded-t-lg flex items-center justify-center">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} loading="lazy" decoding="async" className="w-full h-full object-cover rounded-t-lg" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary-light rounded-t-lg">
                        <Package className="w-8 h-8 text-primary-dark" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium text-text-primary text-sm truncate">{product.name}</h3>
                    <p className="font-bold mt-1" style={{ color: colors.primary_color }}>
                      ₹{product.price}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
