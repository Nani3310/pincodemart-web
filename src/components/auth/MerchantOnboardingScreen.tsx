'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Input';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { MapPin, ArrowLeft, AlertCircle, Store as StoreIcon } from 'lucide-react';

const getErrorMessage = (error: unknown, fallback: string) => {
  return error instanceof Error ? error.message : fallback;
};

export default function MerchantOnboardingScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    shopName: '',
    description: '',
    city: '',
    pincode: '',
    mapLink: '',
    category: '',
    localShopType: '',
  });
  const [location, setLocation] = useState({ latitude: null as number | null, longitude: null as number | null });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleUseLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          setError('Could not get your location. Please enter city and pincode manually.');
        }
      );
    } else {
      setError('Geolocation is not supported by your browser');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const shopName = formData.shopName.trim();
    const city = formData.city.trim();
    const pincode = formData.pincode.trim();

    if (shopName.length < 2) {
      setError('Shop name must be at least 2 characters');
      return;
    }

    if (!city || !pincode) {
      setError('City and pincode are required');
      return;
    }

    if (!/^\d{6}$/.test(pincode)) {
      setError('Pincode must be 6 digits');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { data, error: shopError } = await supabase.rpc('create_merchant_shop', {
        p_name: shopName,
        p_description: formData.description.trim() || null,
        p_city: city,
        p_pincode: pincode,
        p_map_link: formData.mapLink.trim() || null,
        p_category_slug: formData.category || null,
        p_local_shop_type: formData.localShopType.trim() || null,
        p_latitude: location.latitude,
        p_longitude: location.longitude,
      });

      if (shopError) throw shopError;

      const shop = data?.shop;
      if (!shop) throw new Error('Shop was not created. Please try again.');
      router.push(shop.status === 'approved' ? '/merchant/store' : '/auth/merchant-pending');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to create shop'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh app-page-bg auth-splash-bg flex flex-col items-center justify-center p-4">
      <Card className="max-w-md w-full border-primary/30 shadow-2xl">
        <CardHeader>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="text-center">
            <StoreIcon className="w-12 h-12 text-primary mx-auto mb-2" />
            <h1 className="text-2xl font-bold text-text-primary">Create Your Shop</h1>
            <p className="text-text-secondary mt-2">Tell us about your business</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-primary-accent/10 border border-primary-accent/35 rounded-lg text-error text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <Input
              type="text"
              name="shopName"
              label="Shop Name"
              placeholder="My Awesome Shop"
              value={formData.shopName}
              onChange={handleChange}
              required
            />

            <Textarea
              name="description"
              label="Description (Optional)"
              placeholder="Tell customers about your shop..."
              value={formData.description}
              onChange={handleChange}
              rows={3}
            />

            <Input
              type="text"
              name="city"
              label="City"
              placeholder="Hyderabad"
              value={formData.city}
              onChange={handleChange}
              required
              icon={<MapPin className="w-4 h-4 text-text-secondary" />}
            />

            <Input
              type="text"
              name="pincode"
              label="Pincode"
              placeholder="500001"
              value={formData.pincode}
              onChange={handleChange}
              maxLength={6}
              required
            />

            <button
              type="button"
              onClick={handleUseLocation}
              className="w-full text-sm text-primary hover:underline flex items-center gap-2"
            >
              <MapPin className="w-4 h-4" />
              Use my current location
            </button>

            <Input
              type="url"
              name="mapLink"
              label="Location Link (Optional)"
              placeholder="https://maps.google.com/..."
              value={formData.mapLink}
              onChange={handleChange}
            />

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Select a category</option>
                <option value="fashion">Fashion</option>
                <option value="medical">Medical</option>
                <option value="jewelry">Jewellery</option>
                <option value="food">Restaurants</option>
                <option value="local_shops">Local Shops</option>
              </select>
            </div>

            <Input
              type="text"
              name="localShopType"
              label="Shop Type (Optional)"
              placeholder="Grocery, Electronics, etc."
              value={formData.localShopType}
              onChange={handleChange}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Creating shop...' : 'Create Shop'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
