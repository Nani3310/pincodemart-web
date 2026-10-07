'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { Dialog } from '@/components/ui/Dialog';
import { ArrowLeft, Mail, Phone, MapPin, Shield, LogOut, Trash2, User, Bell, FileText, ChevronRight } from 'lucide-react';
import { Profile, Shop, UserNotification } from '@/types';
import { BottomNav } from '@/components/ui/BottomNav';

export default function SettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [merchantShop, setMerchantShop] = useState<Shop | null>(null);
  const [merchantProductCount, setMerchantProductCount] = useState(0);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, phone, email, role, avatar_url, address_line, city, pincode, latitude, longitude, onboarding_completed, terms_accepted, is_phone_verified, role_selected, phone_number, created_at, updated_at')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);

        if (profileData.role === 'merchant') {
          const { data: shopData } = await supabase
            .from('shops')
            .select('id, owner_id, name, slug, description, logo_url, banner_url, shop_photo_url, category_id, theme_id, status, address_line, city, pincode, latitude, longitude, rating_avg, rating_count, delivery_time_mins, is_open, is_paywall_cleared, paywall_valid_until, map_link, opening_hours, social_links, credit_score, referral_code, local_shop_type, created_at, updated_at')
            .eq('owner_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          setMerchantShop(shopData || null);
          if (shopData) {
            const { data: productRows } = await supabase
              .from('products')
              .select('id')
              .eq('shop_id', shopData.id);
            setMerchantProductCount(productRows?.length || 0);
          }
        }

        // Check if super admin
        if (profileData.email) {
          const { data: isAdmin } = await supabase.rpc('is_super_admin_email', {
            p_email: profileData.email
          });
          setIsSuperAdmin(isAdmin || false);
        }

        // Load notifications
        const { data: notificationsData } = await supabase
          .from('user_notifications')
          .select('id, user_id, title, body, entity_type, entity_id, is_read, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (notificationsData) setNotifications(notificationsData);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void Promise.resolve().then(loadProfile);
  }, [loadProfile]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const handleDeleteAccount = async () => {
    try {
      const { error } = await supabase.rpc('delete_own_account');
      if (error) {
        const fallback = await supabase.rpc('delete_account');
        if (fallback.error) throw fallback.error;
      }
      await supabase.auth.signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('Error deleting account:', error);
    }
  };

  const handleNotificationClick = async (notification: UserNotification) => {
    if (!notification.is_read) {
      await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('id', notification.id);
      
      setNotifications(notifications.map(n => 
        n.id === notification.id ? { ...n, is_read: true } : n
      ));
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh app-page-bg flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh app-page-bg page-settings pb-[calc(6rem+env(safe-area-inset-bottom))]">
      {/* Header */}
      <div className="lb-card-gold bg-surface/95 backdrop-blur-lg p-4 sticky top-0 z-10 border-b border-primary/15 shadow-sm">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => router.back()} className="p-2 hover:bg-primary-light rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-text-primary">Account & settings</h1>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        {/* Profile Header */}
        <Card className="lb-card-coral p-6 mb-4">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-primary-light rounded-full flex items-center justify-center mb-4 ring-4 ring-primary/10">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" loading="eager" decoding="async" className="w-full h-full object-cover rounded-full" />
              ) : (
                <User className="w-10 h-10 text-primary" />
              )}
            </div>
            <h2 className="text-2xl font-bold text-text-primary">
              {profile?.full_name || 'User'}
            </h2>
            <span className="text-primary font-medium capitalize">
              {profile?.role}
            </span>
          </div>
        </Card>

        {/* Notifications */}
        {profile?.role === 'merchant' && (
          <div className="mb-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary">My shop</h3>
              <span className="text-sm font-medium text-primary">{merchantProductCount} products</span>
            </div>
            <Card className="lb-card-teal p-4">
              {merchantShop ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="truncate text-lg font-semibold text-text-primary">{merchantShop.name}</h4>
                      <p className="mt-1 text-sm text-text-secondary">{merchantShop.city || 'Location not set'}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-1 text-xs font-semibold ${
                      merchantShop.status === 'approved'
                        ? 'border-primary/35 bg-green-light text-primary-dark'
                        : merchantShop.status === 'pending'
                          ? 'border-primary/30 bg-primary-light text-primary-deep'
                          : 'border-primary-accent/35 bg-primary-accent/10 text-error'
                    }`}>
                      {merchantShop.status}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-lg border border-border bg-primary-light/35 p-3">
                      <p className="text-text-secondary">Products</p>
                      <p className="mt-1 text-lg font-bold text-text-primary">{merchantProductCount}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-primary-light/35 p-3">
                      <p className="text-text-secondary">Marketplace</p>
                      <p className="mt-1 font-semibold text-text-primary">
                        {merchantShop.is_paywall_cleared ? 'Active' : 'Needs access'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => router.push('/merchant/store')}>
                      Manage shop
                    </Button>
                    <Button className="flex-1" onClick={() => router.push('/merchant/store?open=add')}>
                      Add product
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-text-secondary">Your shop has not been created yet.</p>
                  <Button className="mt-3" onClick={() => router.push('/auth/merchant-onboarding')}>Create shop</Button>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="mb-4">
            <h3 className="text-lg font-bold text-text-primary mb-3">Notifications</h3>
            <div className="space-y-2">
              {notifications.map((notification) => (
                <Card
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 cursor-pointer ${!notification.is_read ? 'bg-green-light/70' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <Bell className="w-5 h-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-text-primary">{notification.title}</h4>
                      <p className="text-text-secondary text-sm">{notification.body}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Account Section */}
        <div className="mb-4">
          <h3 className="text-lg font-bold text-text-primary mb-3">Account</h3>
          <Card className="lb-card-cream divide-y divide-border">
            {profile?.email && (
              <div className="p-4 flex items-center gap-3">
                <Mail className="w-5 h-5 text-text-secondary" />
                <div>
                  <p className="text-sm text-text-secondary">Email</p>
                  <p className="font-medium">{profile.email}</p>
                </div>
              </div>
            )}
            {profile?.phone && (
              <div className="p-4 flex items-center gap-3">
                <Phone className="w-5 h-5 text-text-secondary" />
                <div>
                  <p className="text-sm text-text-secondary">Phone</p>
                  <p className="font-medium">{profile.phone}</p>
                </div>
              </div>
            )}
            {(profile?.city || profile?.pincode) && (
              <div className="p-4 flex items-center gap-3">
                <MapPin className="w-5 h-5 text-text-secondary" />
                <div>
                  <p className="text-sm text-text-secondary">Location</p>
                  <p className="font-medium">{profile?.city}, {profile?.pincode}</p>
                </div>
              </div>
            )}
            {isSuperAdmin && (
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="w-full p-4 flex items-center gap-3 hover:bg-primary-light transition-colors text-left"
              >
                <Shield className="w-5 h-5 text-primary" />
                <span className="font-medium text-primary">Super Admin Panel</span>
              </button>
            )}
          </Card>
        </div>

        {/* Legal & Support */}
        <div className="mb-4">
          <h3 className="text-lg font-bold text-text-primary mb-3">Legal & support</h3>
          <Card className="lb-card-gold divide-y divide-border">
            <button
              onClick={() => router.push('/legal')}
              className="w-full p-4 text-left font-medium text-text-primary hover:text-primary flex items-center gap-3"
            >
              <FileText className="h-5 w-5 text-primary" />
              <span className="flex-1">Terms, Privacy & Payments</span>
              <ChevronRight className="h-4 w-4 text-text-hint" />
            </button>
            <button
              onClick={() => router.push('/delete-account')}
              className="w-full p-4 text-left font-medium text-text-primary hover:text-primary flex items-center gap-3"
            >
              <Trash2 className="h-5 w-5 text-error" />
              <span className="flex-1">Delete account policy</span>
              <ChevronRight className="h-4 w-4 text-text-hint" />
            </button>
          </Card>
        </div>

        {/* Sign Out Button (Highlighted) */}
        <div className="pt-2">
          <Button
            variant="logout"
            onClick={handleSignOut}
            className="w-full text-sm font-black py-3 mb-3 shadow-md"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign out / Log out
          </Button>
        </div>

        {/* Delete Account */}
        <Button
          variant="outline"
          onClick={() => setShowDeleteDialog(true)}
          className="w-full text-xs text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50 font-bold"
        >
          <Trash2 className="w-4 h-4 mr-2 text-red-500" />
          Delete account
        </Button>
        <p className="text-center text-[11px] text-text-secondary mt-1.5">
          Removes your account and all associated data
        </p>
      </div>

      {/* Delete Account Confirmation Dialog */}
      <Dialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        title="Delete account permanently?"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            This will permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="reject"
              onClick={handleDeleteAccount}
              className="flex-1"
            >
              Delete forever
            </Button>
          </div>
        </div>
      </Dialog>
      <BottomNav />
    </div>
  );
}
