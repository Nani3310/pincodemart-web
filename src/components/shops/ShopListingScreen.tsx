'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { Search } from 'lucide-react';
import { Category, Shop } from '@/types';
import { useDeliveryLocation } from '@/components/ui/DeliveryLocationDialog';
import { ConcernButton } from '@/components/ui/ConcernButton';
import { BottomNav } from '@/components/ui/BottomNav';
import { calculateDistanceKm, compareDistance, Coordinates, formatDistanceKm } from '@/lib/utils';

interface ShopListingScreenProps {
  categorySlug?: string | null;
}

type ShopWithDistance = Shop & {
  distanceKm?: number | null;
};

export default function ShopListingScreen({ categorySlug }: ShopListingScreenProps) {
  const router = useRouter();
  const deliveryLocation=useDeliveryLocation();
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [shops, setShops] = useState<Shop[]>([]);
  const [userCoordinates, setUserCoordinates] = useState<Coordinates | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(categorySlug ?? '');
  const [minimumRating, setMinimumRating] = useState('');
  const [openOnly, setOpenOnly] = useState(false);
  const [error, setError] = useState('');

  const loadShops = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const { data: categoryRows } = await supabase
        .from('categories')
        .select('id, slug, name, icon, sort_order, is_active, created_at')
        .eq('is_active', true)
        .order('sort_order');
      setCategories(categoryRows ?? []);

      let query = supabase
        .from('shops')
        .select('id, owner_id, name, slug, description, logo_url, banner_url, shop_photo_url, category_id, theme_id, status, address_line, city, pincode, latitude, longitude, rating_avg, rating_count, delivery_time_mins, is_open, is_paywall_cleared, paywall_valid_until, map_link, opening_hours, social_links, credit_score, referral_code, local_shop_type, created_at, updated_at')
        .eq('status', 'approved')
        .order('rating_avg', { ascending: false })
        .limit(50);

      if (categorySlug) {
        if (categorySlug === 'other') {
          const mainCategorySlugs = ['fashion', 'clothing', 'medical', 'pharmacy', 'jewelry', 'jewellery', 'restaurants', 'food-dining', 'food', 'restaurant'];
          const mainCategoryIds = (categoryRows ?? [])
            .filter(c => mainCategorySlugs.some(slug => c.slug.toLowerCase().includes(slug)))
            .map(c => c.id);
          if (mainCategoryIds.length > 0) {
            query = query.not('category_id', 'in', `(${mainCategoryIds.join(',')})`);
          }
        } else {
          const { data: category } = await supabase
            .from('categories')
            .select('id')
            .eq('slug', categorySlug)
            .single();

          if (!category) {
            setShops([]);
            return;
          }

          query = query.eq('category_id', category.id);
        }
      }

      const { data } = await query;
      setShops(data ?? []);
    } catch (error) {
      console.error('Error loading shops:', error);
      setError('Could not load shops. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [categorySlug]);

  useEffect(() => {
    void Promise.resolve().then(loadShops);
  }, [loadShops]);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => undefined,
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 },
    );
  }, []);

  const filteredShops = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const category = categories.find((item) => item.slug === selectedCategory);
    const rating = Number(minimumRating || 0);

    const mainCategorySlugs = ['fashion', 'clothing', 'medical', 'pharmacy', 'jewelry', 'jewellery', 'restaurants', 'food-dining', 'food', 'restaurant'];
    const mainCategoryIds = categories
      .filter(c => mainCategorySlugs.some(slug => c.slug.toLowerCase().includes(slug)))
      .map(c => c.id);

    const coordinates=deliveryLocation.latitude!==null&&deliveryLocation.longitude!==null?{latitude:deliveryLocation.latitude,longitude:deliveryLocation.longitude}:userCoordinates;
    return shops.map<ShopWithDistance>((shop) => {
      const distanceKm = coordinates && shop.latitude != null && shop.longitude != null
        ? calculateDistanceKm(coordinates, { latitude: shop.latitude, longitude: shop.longitude })
        : null;

      return { ...shop, distanceKm };
    }).filter(shop => {
      const matchesSearch = !query ||
        shop.name.toLowerCase().includes(query) ||
        shop.city?.toLowerCase().includes(query) ||
        shop.pincode?.includes(query) ||
        shop.description?.toLowerCase().includes(query);
      
      const matchesCategory = selectedCategory === 'other'
        ? (!shop.category_id || !mainCategoryIds.includes(shop.category_id))
        : (!category || shop.category_id === category.id);

      const matchesRating = !rating || Number(shop.rating_avg || 0) >= rating;
      const matchesOpen = !openOnly || shop.is_open;

      return matchesSearch && matchesCategory && matchesRating && matchesOpen;
    }).sort((a, b) => {const pin=deliveryLocation.pincode;return (pin?Number(b.pincode===pin)-Number(a.pincode===pin):0)||compareDistance(a.distanceKm,b.distanceKm);});
  }, [categories, minimumRating, openOnly, searchQuery, selectedCategory, shops, userCoordinates, deliveryLocation.pincode, deliveryLocation.latitude, deliveryLocation.longitude]);

  const handleShopClick = (shop: Shop) => {
    router.push(`/shop/${shop.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-dvh app-page-bg flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh app-page-bg page-shops pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <header className="shops-header reference-container">
        <div className="flex justify-between items-start gap-3"><div><h1>Shops near you</h1><p>{deliveryLocation.city || (deliveryLocation.pincode ? 'Pincode '+deliveryLocation.pincode : 'Your neighbourhood')} · Nearest first</p></div><button className="shops-filter-toggle" onClick={()=>setShowFilters(!showFilters)}>Filters</button></div>
        <Input placeholder="Search shops..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} icon={<Search size={22}/>} className="reference-search"/>
        <div className="shop-category-pills"><button className={!selectedCategory?'active':''} onClick={()=>setSelectedCategory('')}>All</button>{categories.map(cat=><button key={cat.id} className={selectedCategory===cat.slug?'active':''} onClick={()=>setSelectedCategory(selectedCategory===cat.slug?'':cat.slug)}>{cat.name}</button>)}</div>
      </header>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white p-4 border-b border-slate-200 max-w-6xl mx-auto shadow-sm">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">Rating</label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/25"
                value={minimumRating}
                onChange={(event) => setMinimumRating(event.target.value)}
              >
                <option value="">All Ratings</option>
                <option value="4">4+ Stars</option>
                <option value="3">3+ Stars</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 block">Availability</label>
              <label className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={openOnly}
                  onChange={(event) => setOpenOnly(event.target.checked)}
                  className="h-4 w-4 accent-blue-600 rounded"
                />
                Open now only
              </label>
            </div>
          </div>
          <Button variant="primary" size="sm" className="w-full font-bold" onClick={() => setShowFilters(false)}>Apply Filters</Button>
        </div>
      )}

      {/* Shop List (matching ss3.png) */}
      <div className="p-4 max-w-6xl mx-auto">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">{error}</div>
        ) : filteredShops.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500 font-medium">No shops found in this category</p>
            <p className="text-xs text-slate-400 mt-1">Try clearing your filters</p>
          </div>
        ) : (
          <div className="reference-shop-grid">
            {filteredShops.map((shop,index)=><Card key={shop.id} onClick={()=>handleShopClick(shop)} className={`reference-shop-card shop-tone-${index % 3}`}>
              <div className="shop-cover">{(shop.banner_url || shop.shop_photo_url || shop.logo_url)?<img src={shop.banner_url || shop.shop_photo_url || shop.logo_url || ''} alt={shop.name} loading="lazy"/>:<span>{shop.name.slice(0,2).toUpperCase()}</span>}</div>
              <div className="shop-card-body"><div className="flex items-center justify-between gap-1"><h2 className="truncate">{shop.name}</h2><span className={shop.is_open?'shop-open':'shop-closed'}>{shop.is_open?'OPEN':'CLOSED'}</span></div><p className="shop-distance">★ · {shop.rating_avg ? shop.rating_avg.toFixed(1) : '–'} · {formatDistanceKm(shop.distanceKm) ? formatDistanceKm(shop.distanceKm)+' away' : shop.city}</p><p className="shop-description truncate">{shop.description || 'Local shop'}</p></div>
            </Card>)}
          </div>
        )}
      </div>
      <ConcernButton />
      <BottomNav />
    </div>
  );
}
