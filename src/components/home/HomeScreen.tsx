'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { Button } from '@/components/ui/Button';
import Image from 'next/image';
import { Search, ChevronRight, ChevronDown, RotateCw, Star, Plus, ShoppingCart, Package, Home as HomeIcon, Store } from 'lucide-react';
import { Category, Product, Advertisement, Shop } from '@/types';
import { DeliveryLocationDialog, useDeliveryLocation } from '@/components/ui/DeliveryLocationDialog';
import { ConcernButton } from '@/components/ui/ConcernButton';
import { BottomNav } from '@/components/ui/BottomNav';
import { calculateDistanceKm, compareDistance, Coordinates, formatDistanceKm } from '@/lib/utils';

const fallbackImageSrc = '/assets/logoc.png';

const handleImageLoadError = (event: React.SyntheticEvent<HTMLImageElement>) => {
  if (event.currentTarget.src.endsWith(fallbackImageSrc)) return;
  event.currentTarget.src = fallbackImageSrc;
};

const reverseGeocode = async (latitude: number, longitude: number): Promise<string> => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'LocalBazaarApp/1.0',
        },
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const area = addr.suburb || addr.neighbourhood || addr.village || addr.town || addr.city_district || addr.city || addr.county || addr.state;
        if (area) {
          return area;
        }
      }
    }
  } catch (error) {
    console.error('Error reverse geocoding:', error);
  }
  
  if (Math.abs(latitude - 15.7590) < 0.05 && Math.abs(longitude - 78.0391) < 0.05) {
    return 'Kurnool, Andhra Pradesh';
  }
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
};

const isRenderableAd = (ad: Advertisement) => {
  const now = Date.now();
  const startsAt = ad.starts_at ? Date.parse(ad.starts_at) : null;
  const endsAt = ad.ends_at ? Date.parse(ad.ends_at) : null;

  return Boolean(ad.media_url?.trim()) &&
    (!startsAt || startsAt <= now) &&
    (!endsAt || endsAt >= now);
};

const openAd = (ad: Advertisement, fallback: (productId: string) => void) => {
  if (ad.product_id) {
    fallback(ad.product_id);
    return;
  }

  if (ad.target_url) {
    window.open(ad.target_url, '_blank', 'noopener,noreferrer');
  }
};

const AdvertisementRail = ({
  ads,
  label,
  description,
  onOpen,
}: {
  ads: Advertisement[];
  label: string;
  description: string;
  onOpen: (ad: Advertisement) => void;
}) => {
  const railRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || ads.length < 2) return;

    const interval = window.setInterval(() => {
      if (pausedRef.current) return;
      const step = Math.min(rail.clientWidth * 0.86, 360);
      const reachedEnd = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 8;
      rail.scrollTo({ left: reachedEnd ? 0 : rail.scrollLeft + step, behavior: 'smooth' });
    }, 4200);

    return () => window.clearInterval(interval);
  }, [ads.length]);

  if (ads.length === 0) return null;

  return (
    <section className="mb-5" aria-label={label}>
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-text-primary">{label}</h2>
          <p className="text-xs text-text-secondary">{description}</p>
        </div>
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-primary">{ads.length} live</span>
      </div>
      <div
        ref={railRef}
        className="grid auto-cols-[minmax(0,82vw)] grid-flow-col gap-3 overflow-x-auto overscroll-x-contain scroll-smooth pb-3 snap-x snap-mandatory [scrollbar-width:thin] sm:auto-cols-[20rem] md:auto-cols-[22rem]"
        onPointerEnter={() => { pausedRef.current = true; }}
        onPointerLeave={() => { pausedRef.current = false; }}
        onFocus={() => { pausedRef.current = true; }}
        onBlur={() => { pausedRef.current = false; }}
      >
        {ads.map((ad) => (
          <button
            key={ad.id}
            type="button"
            onClick={() => onOpen(ad)}
            className="group relative snap-start overflow-hidden rounded-lg border border-primary/25 bg-primary-deep text-left shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="relative h-28 sm:h-32">
              {ad.media_type === 'video' ? (
                <video src={ad.media_url} className="h-full w-full object-cover" muted playsInline />
              ) : (
                <img src={ad.media_url} alt={ad.title} loading="lazy" onError={handleImageLoadError} className="h-full w-full object-cover" />
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary-deep/90 via-primary-deep/35 to-transparent p-3 pt-8">
                <span className="line-clamp-2 text-sm font-bold text-primary-light">{ad.title}</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 bg-primary-deep px-3 py-2 text-[11px] font-semibold text-primary-light">
              <span>Explore nearby</span>
              <ChevronRight className="h-4 w-4 text-primary-light transition-transform group-hover:translate-x-0.5" />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

type ProductWithShop = Product & {
  shops?: Pick<Shop, 'id' | 'name' | 'city' | 'pincode' | 'latitude' | 'longitude'> |
    Pick<Shop, 'id' | 'name' | 'city' | 'pincode' | 'latitude' | 'longitude'>[] |
    null;
  distanceKm?: number | null;
};

const getProductShop = (product: ProductWithShop) => {
  if (Array.isArray(product.shops)) return product.shops[0] ?? null;
  return product.shops ?? null;
};

const HomeScreen = () => {
  const router = useRouter();
  const deliveryLocation=useDeliveryLocation();
  const [showDelivery,setShowDelivery]=useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories,setExpandedCategories]=useState(false);
  const [shopCounts,setShopCounts]=useState<Record<string,number>>({});
  const [location, setLocation] = useState('Getting location...');
  const [areaName, setAreaName] = useState<string | null>(null);
  const [userCoordinates, setUserCoordinates] = useState<Coordinates | null>(null);
  const effectiveCoordinates=useMemo(()=>deliveryLocation.latitude!==null&&deliveryLocation.longitude!==null?{latitude:deliveryLocation.latitude,longitude:deliveryLocation.longitude}:userCoordinates,[deliveryLocation.latitude,deliveryLocation.longitude,userCoordinates]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [ads, setAds] = useState<{ tier1: Advertisement[]; tier2: Advertisement[]; tier3: Advertisement[] }>({
    tier1: [],
    tier2: [],
    tier3: [],
  });
  const [isMerchant, setIsMerchant] = useState(false);
  const [allProducts, setAllProducts] = useState<ProductWithShop[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const result = await Promise.race([
        Promise.all([
        supabase
          .from('categories')
          .select('id, slug, name, icon, sort_order, is_active, created_at')
          .eq('is_active', true)
          .order('sort_order')
          .limit(8),
        supabase
          .from('advertisements')
          .select('id, shop_id, title, media_url, media_type, target_url, sort_order, tier, product_id, approval_status, is_active, starts_at, ends_at, ad_position_details, created_at')
          .eq('is_active', true)
          .eq('approval_status', 'approved')
          .in('tier', ['tier_1', 'tier_2', 'tier_3'])
          .order('sort_order')
          .limit(30),
        supabase
          .from('products')
          .select('id, shop_id, category_id, name, description, price, original_price, unit, stock_quantity, image_url, emoji, rating_avg, rating_count, is_active, is_listed, media_urls, created_at, updated_at, shops(id, name, city, pincode, latitude, longitude)')
          .eq('is_active', true)
          .eq('is_listed', true)
          .order('created_at', { ascending: false })
          .limit(24),
        supabase.from('shops').select('category_id').eq('status','approved'),
        ]),
        new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 8000)),
      ]);

      if (!result) {
        console.warn('Home data load timed out');
        return;
      }

      const [categoriesData, adsData, productsData, shopsData] = result;
      const counts: Record<string,number> = {};
      for (const shop of shopsData.data ?? []) { if(shop.category_id) counts[shop.category_id]=(counts[shop.category_id] ?? 0)+1; }
      setShopCounts(counts);
      
      if (categoriesData.data) setCategories(categoriesData.data);
      
      if (adsData.data) {
        const visibleAds = adsData.data.filter((ad: Advertisement) => isRenderableAd(ad));
        setAds({
          tier1: visibleAds.filter((ad: Advertisement) => ad.tier === 'tier_1').slice(0, 10),
          tier2: visibleAds.filter((ad: Advertisement) => ad.tier === 'tier_2').slice(0, 10),
          tier3: visibleAds.filter((ad: Advertisement) => ad.tier === 'tier_3').slice(0, 10),
        });
      }
      
      if (productsData.data) {
        setAllProducts(productsData.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, [loadData]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setUserCoordinates({
            latitude: lat,
            longitude: lon,
          });
          void reverseGeocode(lat, lon).then(setAreaName);
        },
        () => undefined,
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 }
      );
    }

    const determineLocationText = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('city, pincode, role')
            .eq('id', user.id)
            .single();
          if (profile) {
            if (profile.role === 'merchant') {
              setIsMerchant(true);
            }
            if (profile.city || profile.pincode) {
              const locStr = [profile.city, profile.pincode].filter(Boolean).join(', ');
              setLocation(locStr);
              return;
            }
          }
        }
      } catch (error) {
        console.error('Error fetching profile location:', error);
      }

      if (navigator.geolocation) {
        setLocation('Nearest first from your location');
      } else {
        setLocation('Location unavailable');
      }
    };

    void determineLocationText();
  }, []);

  const handleProductClick = useCallback((product: Product) => {
    router.push(`/product/${product.id}`);
  }, [router]);

  const handleTravelClick = useCallback((type: string) => {
    router.push(`/travel?type=${type}`);
  }, [router]);


  const sortedProducts = useMemo(() => {
    return allProducts
      .map((product) => {
        const shop = getProductShop(product);
        const distanceKm = effectiveCoordinates && shop?.latitude != null && shop.longitude != null
          ? calculateDistanceKm(effectiveCoordinates, { latitude: shop.latitude, longitude: shop.longitude })
          : null;

        return { ...product, distanceKm };
      })
      .sort((a, b) => {const pin=deliveryLocation.pincode;const pinOrder=pin?Number(getProductShop(b)?.pincode===pin)-Number(getProductShop(a)?.pincode===pin):0;return pinOrder||compareDistance(a.distanceKm,b.distanceKm);});
  }, [allProducts, effectiveCoordinates, deliveryLocation.pincode]);

  const trendingProducts = useMemo(() => sortedProducts.slice(0, 10), [sortedProducts]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return sortedProducts;
    const query = searchQuery.toLowerCase();
    return sortedProducts.filter(p =>
      p.name.toLowerCase().includes(query) || 
      p.description?.toLowerCase().includes(query) ||
      getProductShop(p)?.name.toLowerCase().includes(query) ||
      getProductShop(p)?.city?.toLowerCase().includes(query)
    );
  }, [searchQuery, sortedProducts]);

  return (
    <div className="min-h-dvh app-page-bg page-home pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <header className="home-header reference-container"><div className="home-delivery-row"><button className="delivery-location" onClick={()=>setShowDelivery(true)}><span>Deliver to</span><strong>{deliveryLocation.pincode ? [getProductShop(allProducts.find(p=>getProductShop(p)?.pincode===deliveryLocation.pincode) ?? {} as ProductWithShop)?.city || 'Pincode', deliveryLocation.pincode].join(', ') : areaName || location}</strong></button><button aria-label="Change delivery location" onClick={()=>setShowDelivery(true)} className="location-chevron"><ChevronDown/></button><button aria-label="Refresh marketplace" onClick={()=>void loadData()} className="refresh-market"><RotateCw/></button><button aria-label="Open merchant console" onClick={()=>router.push('/merchant/store')} className="profile-logo"><Image src="/assets/logoc.png" alt="PinCode Mart" width={42} height={42}/></button></div><Input placeholder="Search products, shops..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} icon={<Search size={22}/>} className="reference-search"/></header>

      <div className="p-3 sm:p-4 max-w-6xl mx-auto">
        {/* Merchant Mode Shortcut for Shop Owners */}
        {isMerchant && (
          <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-[#1665D8] via-[#1D4ED8] to-[#1E40AF] text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-blue-400/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                <Store className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-white leading-tight">🏪 Merchant Mode Active</p>
                <p className="text-xs text-blue-100 mt-0.5">You can browse the marketplace as a customer or manage your shop & catalog.</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => router.push('/merchant/store')}
              className="bg-white text-[#1665D8] hover:bg-blue-50 font-black text-xs px-4 py-2 shrink-0 self-end sm:self-auto shadow-sm"
            >
              Open Store Dashboard →
            </Button>
          </div>
        )}

        <AdvertisementRail
          ads={ads.tier1}
          label="Featured near you"
          description="Top local picks from approved businesses"
          onOpen={(ad) => openAd(ad, (productId) => router.push(`/product/${productId}`))}
        />

        {loading && (
          <div className="mb-4 rounded-lg border border-border bg-surface/90 p-3 text-xs text-text-secondary shadow-sm">
            <div className="flex items-center gap-3">
              <Loading size="sm" />
              Loading local products and shops...
            </div>
          </div>
        )}

        {!loading && categories.length === 0 && allProducts.length === 0 && (
          <div className="mb-4 rounded-lg border border-border bg-surface/90 p-3 text-xs text-text-secondary shadow-sm">
            No local marketplace data is available yet. Pull to refresh or try again shortly.
          </div>
        )}

        <section className="category-panel"><div className="category-panel-heading"><div><h2>Explore categories</h2><p>Most popular near you first</p></div><button onClick={()=>setExpandedCategories(!expandedCategories)} aria-expanded={expandedCategories}>{expandedCategories?'Collapse':'Expand'}<ChevronDown size={16}/></button></div><div className="reference-category-grid">{(categories.length ? categories : [{id:'jewellery',slug:'jewellery',name:'Jewellery'},{id:'local-shops',slug:'local-shops',name:'Local Shops'},{id:'fashion',slug:'fashion',name:'Fashion'},{id:'medical',slug:'medical',name:'Medical'},{id:'restaurants',slug:'restaurants',name:'Restaurants'},{id:'home-decors',slug:'home-decors',name:'Home Decors'}]).slice(0,expandedCategories?undefined:6).map((category,index)=>{const Icon=index===0?Star:index===3?Plus:index===4?HomeIcon:ShoppingCart;return <button className={`reference-category category-tone-${index%6}`} key={category.id} onClick={()=>router.push('/shops?category='+category.slug)}><Icon size={22}/><strong>{category.name}</strong><span>{shopCounts[category.id] ?? 0} {(shopCounts[category.id] ?? 0)===1 ? 'shop' : 'shops'}</span></button>})}</div></section>

        <AdvertisementRail
          ads={ads.tier2}
          label="Popular local picks"
          description="Discover more from your neighborhood"
          onOpen={(ad) => openAd(ad, (productId) => router.push(`/product/${productId}`))}
        />

        {/* Trending Products */}
        <div className="mb-4">
          <h2 className="text-base font-bold text-text-primary mb-2">Trending Near You</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
            {trendingProducts.map((product, index) => (
              <Card
                key={product.id}
                onClick={() => handleProductClick(product)}
                className={`reference-product-card trending-product cursor-pointer snap-start ${
                  index % 3 === 0 ? 'lb-card-gold' :
                  index % 3 === 1 ? 'lb-card-cream' :
                  'lb-card-teal'
                }`}
              >
                <div className="aspect-square bg-primary-light rounded-t-lg flex items-center justify-center overflow-hidden">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} loading="lazy" decoding="async" onError={handleImageLoadError} className="w-full h-full object-cover rounded-t-lg" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary-light rounded-t-lg">
                      <Package className="w-7 h-7 text-primary-dark" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-text-primary text-xs truncate">{product.name}</h3>
                  <p className="text-primary font-bold mt-1 text-sm"><span className="product-shop-label">Shop</span>₹{product.price}</p>
                  {formatDistanceKm(product.distanceKm) && (
                    <p className="text-[11px] text-text-secondary mt-0.5">{formatDistanceKm(product.distanceKm)} away</p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        <section className="home-travel-section"><h2>Rentals & Travel</h2><div className="home-travel-grid"><button onClick={()=>handleTravelClick('rentals')}>Rent a Home</button><button onClick={()=>handleTravelClick('tickets')}>Tickets</button><button onClick={()=>handleTravelClick('rides')}>Rides</button></div></section>

        <AdvertisementRail
          ads={ads.tier3}
          label="More from nearby businesses"
          description="Useful local offers, services, and updates"
          onOpen={(ad) => openAd(ad, (productId) => router.push(`/product/${productId}`))}
        />

        {/* All Products */}
        <div>
          <h2 className="text-base font-bold text-text-primary mb-2">Recently Added</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {filteredProducts.map((product, index) => (
              <Card
                key={product.id}
                onClick={() => handleProductClick(product)}
                className={`reference-product-card cursor-pointer hover:shadow-md transition-shadow ${
                  index % 4 === 0 ? 'lb-card-cream' :
                  index % 4 === 1 ? 'lb-card-gold' :
                  index % 4 === 2 ? 'lb-card-teal' :
                  'lb-card-coral'
                }`}
              >
                <div className="aspect-[0.85] bg-primary-light rounded-t-lg flex items-center justify-center">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} loading="lazy" decoding="async" onError={handleImageLoadError} className="w-full h-full object-cover rounded-t-lg" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary-light rounded-t-lg">
                      <Package className="w-7 h-7 text-primary-dark" />
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  <h3 className="font-medium text-text-primary text-xs truncate">{product.name}</h3>
                  <p className="text-primary font-bold mt-1 text-sm">₹{product.price}</p>
                  {formatDistanceKm(product.distanceKm) && (
                    <p className="text-[11px] text-text-secondary mt-0.5">{formatDistanceKm(product.distanceKm)} away</p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <DeliveryLocationDialog open={showDelivery} onClose={()=>setShowDelivery(false)} />
      <ConcernButton />
      <BottomNav />
    </div>
  );
};

export default HomeScreen;
