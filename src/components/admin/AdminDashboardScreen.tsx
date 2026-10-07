'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, LogOut, Check, X, Users, Store, AlertCircle, IndianRupee, RefreshCw } from 'lucide-react';
import { Advertisement, Shop, Product, TravelService, RentalListing, ServiceProvider } from '@/types';

type AdminTab = 'shops' | 'products' | 'ads' | 'travel' | 'rentals' | 'services' | 'skins' | 'admins' | 'history';
type AdminItem = Advertisement | Shop | Product | TravelService | RentalListing | ServiceProvider;
type AdTier = 'tier_1' | 'tier_2' | 'tier_3';

const isMissingRpcError = (error: { code?: string; message?: string } | null) =>
  Boolean(error && (error.code === '42883' || /function .* does not exist/i.test(error.message || '')));

const adTiers: { id: AdTier; label: string; placement: string }[] = [
  { id: 'tier_1', label: 'Tier 1', placement: 'Top loop' },
  { id: 'tier_2', label: 'Tier 2', placement: 'Mid page' },
  { id: 'tier_3', label: 'Tier 3', placement: 'Lower loop' },
];

export default function AdminDashboardScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<AdminTab>('shops');
  const [stats, setStats] = useState({
    userCount: 0,
    merchantCount: 0,
    revenueInr: 0,
    pendingShops: 0,
    pendingProducts: 0,
    pendingAds: 0,
    pendingTravel: 0,
    pendingRentals: 0,
    pendingServices: 0,
  });
  const [pendingShops, setPendingShops] = useState<Shop[]>([]);
  const [pendingProducts, setPendingProducts] = useState<Product[]>([]);
  const [pendingAds, setPendingAds] = useState<Advertisement[]>([]);
  const [approvedAds, setApprovedAds] = useState<Advertisement[]>([]);
  const [pendingTravel, setPendingTravel] = useState<TravelService[]>([]);
  const [pendingRentals, setPendingRentals] = useState<RentalListing[]>([]);
  const [pendingServices, setPendingServices] = useState<ServiceProvider[]>([]);
  const [superAdminEmails, setSuperAdminEmails] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<AdminItem | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [adsMessage, setAdsMessage] = useState('');
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [moderatingId, setModeratingId] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError('');

      // Use the current Android/web contract, with compatibility for older web migrations.
      let { data: dashboardData, error: dashboardError } = await supabase.rpc('admin_load_dashboard');
      if (dashboardError && isMissingRpcError(dashboardError)) {
        ({ data: dashboardData, error: dashboardError } = await supabase.rpc('admin_dashboard'));
      }
      if (dashboardError) {
        console.error('Error loading admin dashboard:', dashboardError);
        setLoadError(dashboardError.message || 'The approval queue could not be refreshed. Please try again.');
      }
      if (dashboardData) {
        const rawStats = dashboardData.stats || {};
        setStats({
          userCount: Number(rawStats.user_count ?? 0),
          merchantCount: Number(rawStats.merchant_count ?? 0),
          revenueInr: Number(rawStats.revenue_inr ?? 0),
          pendingShops: Number(rawStats.pending_shops ?? dashboardData.pending_shops?.length ?? 0),
          pendingProducts: Number(rawStats.pending_products ?? dashboardData.pending_products?.length ?? 0),
          pendingAds: Number(rawStats.pending_ads ?? dashboardData.pending_ads?.length ?? 0),
          pendingTravel: Number(rawStats.pending_travel ?? dashboardData.pending_travel?.length ?? 0),
          pendingRentals: Number(rawStats.pending_rentals ?? dashboardData.pending_rentals?.length ?? 0),
          pendingServices: Number(rawStats.pending_services ?? dashboardData.pending_services?.length ?? 0),
        });
        setPendingShops(dashboardData.pending_shops || []);
        setPendingProducts(dashboardData.pending_products || []);
        setPendingAds(dashboardData.pending_ads || []);
        setPendingTravel(dashboardData.pending_travel || []);
        setPendingRentals(dashboardData.pending_rentals || []);
        setPendingServices(dashboardData.pending_services || []);
      }

      const { data: advertisements, error: advertisementError } = await supabase
        .from('advertisements')
        .select('id, shop_id, title, media_url, media_type, target_url, sort_order, tier, product_id, approval_status, is_active, starts_at, ends_at, ad_position_details, created_at')
        .eq('approval_status', 'approved')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (!advertisementError && advertisements) {
        setApprovedAds(advertisements as Advertisement[]);
      }

      // Load super admin emails
      const { data: emails } = await supabase.from('super_admin_emails').select('email');
      if (emails) {
        setSuperAdminEmails(emails.map(e => e.email));
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setLoadError(error instanceof Error ? error.message : 'The approval queue could not be refreshed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadDashboardData);
    const refreshTimer = window.setInterval(() => {
      void loadDashboardData();
    }, 30000);
    return () => window.clearInterval(refreshTimer);
  }, [loadDashboardData]);

  const handleModerate = async (entityType: string, entityId: string, action: 'approve' | 'reject') => {
    try {
      setActionError('');
      setModeratingId(entityId);
      const canonicalAction = action === 'approve' ? 'approved' : 'rejected';
      let { data, error } = await supabase.rpc('admin_moderate_entity', {
        p_entity_type: entityType,
        p_entity_id: entityId,
        p_action: canonicalAction,
      });

      // Keep older web migrations working while the shared database is being upgraded.
      if (error && isMissingRpcError(error)) {
        if (entityType === 'shop') {
          ({ data, error } = await supabase.rpc('admin_update_shop_status', {
            p_shop_id: entityId,
            p_status: action === 'approve' ? 'approved' : 'rejected',
          }));
        } else {
          ({ data, error } = await supabase.rpc('admin_moderate', {
            p_entity_type: entityType,
            p_entity_id: entityId,
            p_action: action,
          }));
        }
      }

      if (error) throw error;
      const actionConfirmed = data?.action === canonicalAction || data?.action === action || data?.updated === true ||
        (entityType === 'shop' && data?.status === (action === 'approve' ? 'approved' : 'rejected'));
      if (!actionConfirmed) {
        throw new Error('The listing status could not be confirmed after the approval action.');
      }
      await loadDashboardData();
      setShowDetailDialog(false);
    } catch (error) {
      console.error('Error moderating:', error);
      setActionError(error instanceof Error ? error.message : 'Approval action failed. Please try again.');
    } finally {
      setModeratingId(null);
    }
  };

  const handleSetAdTier = async (adId: string, tier: AdTier | '') => {
    setAdsMessage('');
    try {
      const { error } = await supabase.rpc('admin_set_ad_tier', {
        p_ad_id: adId,
        p_tier: tier || null,
      });
      if (error) throw error;
      setAdsMessage('Ad tier updated. The home page will use the new placement.');
      await loadDashboardData();
    } catch (error) {
      setAdsMessage(error instanceof Error ? error.message : 'Unable to update ad tier.');
    }
  };

  const handleAddAdmin = async () => {
    try {
      await supabase.from('super_admin_emails').insert({ email: newAdminEmail });
      setNewAdminEmail('');
      await loadDashboardData();
    } catch (error) {
      console.error('Error adding admin:', error);
    }
  };

  const handleRemoveAdmin = async (email: string) => {
    try {
      await supabase.from('super_admin_emails').delete().eq('email', email);
      await loadDashboardData();
    } catch (error) {
      console.error('Error removing admin:', error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  if (loading) {
    return (
      <div className="min-h-dvh app-page-bg flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  const tabs = [
    { id: 'shops', label: 'Shops', count: pendingShops.length },
    { id: 'products', label: 'Products', count: stats.pendingProducts },
    { id: 'ads', label: 'Ads', count: stats.pendingAds },
    { id: 'travel', label: 'Travel', count: stats.pendingTravel },
    { id: 'rentals', label: 'Rentals', count: stats.pendingRentals },
    { id: 'services', label: 'Services', count: stats.pendingServices },
    { id: 'skins', label: 'Skins', count: 0 },
    { id: 'admins', label: 'Admins', count: null },
    { id: 'history', label: 'History', count: null },
  ];

  return (
    <div className="min-h-dvh app-page-bg pb-[calc(6rem+env(safe-area-inset-bottom))]">
      {/* Header */}
      <div className="bg-surface/95 backdrop-blur-lg p-4 sticky top-0 z-10 border-b border-primary/15 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSignOut}
              aria-label="Sign out"
              title="Sign out"
              className="p-2 rounded-lg border border-primary/35 bg-primary-light/60 text-text-primary hover:bg-primary-light hover:border-primary"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-text-primary">Super Admin</h1>
          </div>
          <button
            onClick={handleSignOut}
            aria-label="Sign out"
            title="Sign out"
            className="p-2 rounded-lg border border-primary-accent/35 bg-green-light text-text-primary hover:bg-primary-light hover:border-primary-accent"
          >
            <LogOut className="w-5 h-5" />
          </button>
          <button
            onClick={() => void loadDashboardData()}
            aria-label="Refresh approval queue"
            title="Refresh approval queue"
            className="mr-2 rounded-lg border border-primary/35 bg-primary-light/60 p-2 text-text-primary hover:border-primary hover:bg-primary-light"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="p-4 max-w-6xl mx-auto">
        {(loadError || actionError) && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-primary-accent/35 bg-primary-accent/10 p-3 text-sm text-error">
            <span>{loadError || actionError}</span>
            <button type="button" className="font-semibold underline" onClick={() => void loadDashboardData()}>Retry</button>
          </div>
        )}
        {/* Overview Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-primary" />
              <span className="text-text-secondary text-sm">App Users</span>
            </div>
            <p className="text-2xl font-bold text-text-primary">{stats.userCount}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Store className="w-5 h-5 text-primary" />
              <span className="text-text-secondary text-sm">Merchants</span>
            </div>
            <p className="text-2xl font-bold text-text-primary">{stats.merchantCount}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <IndianRupee className="w-5 h-5 text-primary" />
              <span className="text-text-secondary text-sm">Revenue</span>
            </div>
            <p className="text-2xl font-bold text-text-primary">₹{stats.revenueInr}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-primary" />
              <span className="text-text-secondary text-sm">Pending</span>
            </div>
            <p className="text-2xl font-bold text-text-primary">
              {stats.pendingShops + stats.pendingProducts + stats.pendingTravel + stats.pendingRentals + stats.pendingServices}
            </p>
          </Card>
        </div>

        {/* Approval Queue */}
        <h2 className="text-lg font-bold text-text-primary mb-3">Approval queue</h2>
        
        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as AdminTab)}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                selectedTab === tab.id
                  ? 'bg-primary-light text-text-primary border border-primary/40'
                  : 'bg-surface text-text-secondary border border-border'
              }`}
            >
              {tab.label}
              {tab.count !== null && tab.count > 0 && (
                <span className="ml-2 rounded-full border border-primary-accent/40 bg-primary-accent/15 px-2 py-0.5 text-xs font-bold text-text-primary">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {selectedTab === 'shops' && (
          <div className="space-y-3">
            {pendingShops.length === 0 ? (
              <p className="text-center text-text-secondary py-8">No pending shops</p>
            ) : (
              pendingShops.map((shop) => (
                <Card key={shop.id} className="p-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div>
                      <h3 className="font-bold text-text-primary text-base">{shop.name}</h3>
                      <p className="text-text-secondary text-xs">{shop.city}, {shop.pincode}</p>
                      <p className="text-[11px] text-amber-600 font-semibold mt-0.5">Status: {shop.status}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedItem(shop);
                          setShowDetailDialog(true);
                        }}
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="accept"
                        onClick={() => handleModerate('shop', shop.id, 'approve')}
                      >
                        <Check className="w-4 h-4" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="reject"
                        onClick={() => handleModerate('shop', shop.id, 'reject')}
                      >
                        <X className="w-4 h-4" /> Reject
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {selectedTab === 'products' && (
          <div className="space-y-3">
            {pendingProducts.length === 0 ? (
              <p className="text-center text-text-secondary py-8">No pending products</p>
            ) : (
              pendingProducts.map((product) => (
                <Card key={product.id} className="p-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div>
                      <h3 className="font-bold text-text-primary text-base">{product.name}</h3>
                      <p className="text-primary font-bold">₹{product.price}</p>
                      <p className="text-[11px] text-text-secondary mt-0.5">Awaiting listing approval</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="accept"
                        aria-label={`Approve ${product.name}`}
                        title={`Approve ${product.name}`}
                        disabled={moderatingId === product.id}
                        onClick={() => void handleModerate('product', product.id, 'approve')}
                      >
                        <Check className="w-4 h-4" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="reject"
                        aria-label={`Reject ${product.name}`}
                        title={`Reject ${product.name}`}
                        disabled={moderatingId === product.id}
                        onClick={() => void handleModerate('product', product.id, 'reject')}
                      >
                        <X className="w-4 h-4" /> Reject
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {selectedTab === 'ads' && (
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <div className="border-b border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-text-primary">Pending ad approvals</h3>
                    <p className="mt-1 text-sm text-text-secondary">Review creative and destination before assigning a home-page tier.</p>
                  </div>
                  <span className="rounded-full border border-primary/30 bg-primary-light px-3 py-1 text-xs font-bold text-text-primary">
                    {pendingAds.length} waiting
                  </span>
                </div>
              </div>
              {pendingAds.length === 0 ? (
                <p className="p-4 text-center text-sm text-text-secondary">No ads awaiting approval.</p>
              ) : (
                <div className="divide-y divide-border">
                  {pendingAds.map((ad) => (
                    <div key={ad.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                      <div className="h-20 w-full shrink-0 overflow-hidden rounded-lg border border-border bg-primary-deep sm:w-36">
                        {ad.media_type === 'video' ? (
                          <video src={ad.media_url} className="h-full w-full object-cover" muted playsInline />
                        ) : (
                          <img src={ad.media_url} alt={ad.title} loading="lazy" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate font-semibold text-text-primary">{ad.title}</h4>
                        <p className="mt-1 text-xs text-text-secondary">{ad.target_url || 'No destination URL'}</p>
                        <p className="mt-1 text-xs text-text-secondary">Submitted {new Date(ad.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button size="sm" variant="accept" onClick={() => handleModerate('ad', ad.id, 'approve')}>
                          <Check className="h-4 w-4" /> Approve
                        </Button>
                        <Button size="sm" variant="reject" onClick={() => handleModerate('ad', ad.id, 'reject')}>
                          <X className="h-4 w-4" /> Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-text-primary">Live ad tiers</h3>
                  <p className="mt-1 text-sm text-text-secondary">Each horizontal home-page rail supports up to 10 active approved ads.</p>
                </div>
                {adsMessage && <p className="max-w-sm text-right text-xs font-medium text-primary-dark">{adsMessage}</p>}
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                {adTiers.map((tier) => {
                  const tierAds = approvedAds.filter((ad) => ad.tier === tier.id).sort((a, b) => a.sort_order - b.sort_order);
                  return (
                    <div key={tier.id} className="min-w-0 rounded-lg border border-border bg-primary-light/35 p-3">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div>
                          <h4 className="font-semibold text-text-primary">{tier.label}</h4>
                          <p className="text-xs text-text-secondary">{tier.placement}</p>
                        </div>
                        <span className="rounded-full border border-primary/25 bg-surface px-2 py-1 text-xs font-bold text-text-primary">{tierAds.length}/10</span>
                      </div>
                      {tierAds.length === 0 ? (
                        <p className="rounded-md border border-dashed border-border p-3 text-center text-xs text-text-secondary">No ads assigned</p>
                      ) : (
                        <div className="space-y-2">
                          {tierAds.map((ad) => (
                            <div key={ad.id} className="flex items-center gap-2 rounded-md border border-border bg-surface p-2">
                              <div className="h-10 w-14 shrink-0 overflow-hidden rounded bg-primary-deep">
                                <img src={ad.media_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                              </div>
                              <p className="min-w-0 flex-1 truncate text-xs font-semibold text-text-primary">{ad.title}</p>
                              <button
                                type="button"
                                aria-label={`Remove ${ad.title} from ${tier.label}`}
                                className="rounded border border-primary/30 px-2 py-1 text-xs font-semibold text-text-secondary hover:border-primary hover:text-primary-dark"
                                onClick={() => handleSetAdTier(ad.id, '')}
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {approvedAds.filter((ad) => !ad.tier).length > 0 && (
                <div className="mt-4 border-t border-border pt-4">
                  <h4 className="mb-2 text-sm font-semibold text-text-primary">Approved and unassigned</h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {approvedAds.filter((ad) => !ad.tier).map((ad) => (
                      <div key={ad.id} className="flex items-center gap-2 rounded-md border border-border bg-surface p-2">
                        <p className="min-w-0 flex-1 truncate text-xs font-semibold text-text-primary">{ad.title}</p>
                        <select
                          aria-label={`Assign tier for ${ad.title}`}
                          defaultValue=""
                          className="rounded border border-border bg-surface px-2 py-1 text-xs text-text-primary"
                          onChange={(event) => handleSetAdTier(ad.id, event.target.value as AdTier | '')}
                        >
                          <option value="">Assign tier</option>
                          {adTiers.map((tier) => <option key={tier.id} value={tier.id}>{tier.label}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}

        {selectedTab === 'travel' && (
          <div className="space-y-3">
            {pendingTravel.length === 0 ? (
              <p className="text-center text-text-secondary py-8">No pending travel listings</p>
            ) : (
              pendingTravel.map((travel) => (
                <Card key={travel.id} className="p-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div>
                      <h3 className="font-bold text-text-primary text-base">
                        {travel.departure_location} → {travel.destination_location}
                      </h3>
                      <p className="text-text-secondary text-xs">{travel.scheduled_date} at {travel.scheduled_time}</p>
                      <p className="text-primary font-bold">₹{travel.price_inr}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="accept"
                        onClick={() => handleModerate('travel', travel.id, 'approve')}
                      >
                        <Check className="w-4 h-4" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="reject"
                        onClick={() => handleModerate('travel', travel.id, 'reject')}
                      >
                        <X className="w-4 h-4" /> Reject
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {selectedTab === 'rentals' && (
          <div className="space-y-3">
            {pendingRentals.length === 0 ? (
              <p className="text-center text-text-secondary py-8">No pending rentals</p>
            ) : (
              pendingRentals.map((rental) => (
                <Card key={rental.id} className="p-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div>
                      <h3 className="font-bold text-text-primary text-base">{rental.title}</h3>
                      <p className="text-text-secondary text-xs">{rental.city}</p>
                      <p className="text-primary font-bold">₹{rental.rent_inr}/month</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="accept"
                        onClick={() => handleModerate('rental', rental.id, 'approve')}
                      >
                        <Check className="w-4 h-4" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="reject"
                        onClick={() => handleModerate('rental', rental.id, 'reject')}
                      >
                        <X className="w-4 h-4" /> Reject
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {selectedTab === 'services' && (
          <div className="space-y-3">
            {pendingServices.length === 0 ? (
              <p className="text-center text-text-secondary py-8">No pending service providers</p>
            ) : (
              pendingServices.map((service) => (
                <Card key={service.id} className="p-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div>
                      <h3 className="font-bold text-text-primary text-base">{service.trade_name}</h3>
                      <p className="text-primary text-xs capitalize font-semibold">{service.trade_slug}</p>
                      <p className="text-text-secondary text-xs">{service.city}</p>
                      {service.hourly_rate_inr && (
                        <p className="text-primary font-bold">₹{service.hourly_rate_inr}/hr</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="accept"
                        onClick={() => handleModerate('service', service.id, 'approve')}
                      >
                        <Check className="w-4 h-4" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="reject"
                        onClick={() => handleModerate('service', service.id, 'reject')}
                      >
                        <X className="w-4 h-4" /> Reject
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {selectedTab === 'admins' && (
          <Card className="p-4">
            <h3 className="font-semibold text-text-primary mb-4">Super Admin Emails</h3>
            <div className="space-y-3 mb-4">
              {superAdminEmails.map((email) => (
                <div key={email} className="flex justify-between items-center p-3 bg-primary-light/55 rounded-lg">
                  <span className="text-text-primary">{email}</span>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleRemoveAdmin(email)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Add admin email"
                value={newAdminEmail}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAdminEmail(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleAddAdmin}>Add</Button>
            </div>
          </Card>
        )}

        {selectedTab === 'history' && (
          <p className="text-center text-text-secondary py-8">Approval history coming soon</p>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog
        isOpen={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        title="Request Details"
      >
        {selectedItem && (
          <div className="space-y-4">
            <pre className="bg-primary-light/55 p-4 rounded-lg overflow-auto text-sm">
              {JSON.stringify(selectedItem, null, 2)}
            </pre>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowDetailDialog(false)}
                className="flex-1"
              >
                Close
              </Button>
              <Button
                variant="accept"
                onClick={() => handleModerate('shop', selectedItem.id, 'approve')}
                className="flex-1 font-bold"
              >
                <Check className="w-4 h-4 mr-1" /> Approve
              </Button>
              <Button
                variant="reject"
                onClick={() => handleModerate('shop', selectedItem.id, 'reject')}
                className="flex-1 font-bold"
              >
                <X className="w-4 h-4 mr-1" /> Reject
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
