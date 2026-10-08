'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { Dialog } from '@/components/ui/Dialog';
import { Plus, Edit, Star, Package, CreditCard, Gift, Store, Image as ImageIcon, Upload } from 'lucide-react';
import { MerchantConsoleHeader } from './MerchantConsoleHeader';
import { ReelPublisher } from '@/components/reels/ReelPublisher';
import { Shop, Product } from '@/types';

type AdTier = 'tier_1' | 'tier_2' | 'tier_3';
const MERCHANT_MEDIA_BUCKET = 'merchant-media';
const PRODUCT_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

const emptyProductForm = {
  name: '',
  description: '',
  price: '',
  unit: '',
  stock: '',
  rulesAccepted: false,
};

const isProductImageFile = (file: File) => file.type.startsWith('image/');

const getSafeFileExtension = (file: File) => {
  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (extension) return extension;
  return file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
};

export default function MerchantStoreScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedTier, setSelectedTier] = useState<AdTier>('tier_1');
  const [promoteError, setPromoteError] = useState('');
  const [promoteMessage, setPromoteMessage] = useState('');
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [storeError, setStoreError] = useState('');
  const [productError, setProductError] = useState('');
  const [productMessage, setProductMessage] = useState('');
  const [productSaving, setProductSaving] = useState(false);
  const [productEditSaving, setProductEditSaving] = useState(false);
  const [productEditError, setProductEditError] = useState('');
  const [editFormData, setEditFormData] = useState({ name: '', description: '', price: '', unit: '', stock: '', isListed: false });
  const [formData, setFormData] = useState(emptyProductForm);
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState('');
  const autoOpenedAddDialog = useRef(false);

  const loadStoreData = useCallback(async () => {
    try {
      setLoading(true);
      setStoreError('');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { data: shopRows, error: shopError } = await supabase
        .from('shops')
        .select('id, owner_id, name, slug, description, logo_url, banner_url, shop_photo_url, category_id, theme_id, status, merchant_plan, address_line, city, pincode, latitude, longitude, rating_avg, rating_count, delivery_time_mins, is_open, is_paywall_cleared, paywall_valid_until, map_link, opening_hours, social_links, credit_score, referral_code, local_shop_type, created_at, updated_at')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (shopError) throw shopError;

      const shopData = shopRows?.find((candidate) => candidate.status === 'approved') || shopRows?.[0];

      if (shopData) {
        setShop(shopData);

        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('id, shop_id, category_id, name, description, price, original_price, unit, stock_quantity, image_url, emoji, rating_avg, rating_count, is_active, is_listed, media_urls, created_at, updated_at')
          .eq('shop_id', shopData.id)
          .order('created_at', { ascending: false });

        if (productsError) throw productsError;
        if (productsData) setProducts(productsData);
      }
    } catch (error) {
      console.error('Error loading store data:', error);
      setStoreError(error instanceof Error ? error.message : 'Store data could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void Promise.resolve().then(loadStoreData);
  }, [loadStoreData]);

  useEffect(() => {
    return () => {
      if (productImagePreview) URL.revokeObjectURL(productImagePreview);
    };
  }, [productImagePreview]);

  useEffect(() => {
    if (
      new URLSearchParams(window.location.search).get('open') === 'add' &&
      !autoOpenedAddDialog.current &&
      shop?.status === 'approved' &&
      shop.is_paywall_cleared &&
      !loading
    ) {
      autoOpenedAddDialog.current = true;
      const openTimer = window.setTimeout(() => setShowAddDialog(true), 0);
      return () => window.clearTimeout(openTimer);
    }
  }, [loading, shop]);

  const handleAddProduct = async () => {
    if (!shop || productSaving) return;

    try {
      setProductError('');
      setProductMessage('');
      const name = formData.name.trim();
      const price = Number(formData.price);
      const stock = Number(formData.stock);

      if (name.length < 2) throw new Error('Product name must be at least 2 characters.');
      if (!Number.isFinite(price) || price <= 0) throw new Error('Enter a valid product price.');
      if (!Number.isInteger(stock) || stock < 0) throw new Error('Enter a valid stock quantity.');
      if (!productImageFile) throw new Error('Add a product image file before submitting.');
      if (!formData.rulesAccepted) throw new Error('Accept the product rules to continue.');

      setProductSaving(true);
      let productImageUrl: string | null = null;
      let uploadedImagePath: string | null = null;

      if (productImageFile) {
        if (!isProductImageFile(productImageFile)) throw new Error('Choose a valid product image file.');
        if (productImageFile.size > PRODUCT_IMAGE_MAX_BYTES) throw new Error('Product image must be 8 MB or smaller.');

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Please sign in again before uploading a product image.');

        const imagePath = `${user.id}/products/${Date.now()}-${Math.random().toString(36).slice(2)}.${getSafeFileExtension(productImageFile)}`;
        const { error: uploadError } = await supabase.storage
          .from(MERCHANT_MEDIA_BUCKET)
          .upload(imagePath, productImageFile, {
            cacheControl: '31536000',
            contentType: productImageFile.type || 'image/jpeg',
            upsert: false,
          });

        if (uploadError) throw uploadError;
        uploadedImagePath = imagePath;
        const { data: publicUrlData } = supabase.storage.from(MERCHANT_MEDIA_BUCKET).getPublicUrl(imagePath);
        productImageUrl = publicUrlData.publicUrl;
      }

      const { error } = await supabase.from('products').insert({
        shop_id: shop.id,
        name,
        description: formData.description.trim() || null,
        price,
        unit: formData.unit.trim() || null,
        stock_quantity: stock,
        image_url: productImageUrl,
        media_urls: productImageUrl ? [productImageUrl] : null,
        is_active: true,
        is_listed: false,
      });

      if (error) {
        if (uploadedImagePath) {
          await supabase.storage.from(MERCHANT_MEDIA_BUCKET).remove([uploadedImagePath]);
        }
        throw error;
      }

      setShowAddDialog(false);
      setFormData(emptyProductForm);
      setProductImageFile(null);
      setProductImagePreview('');
      setProductMessage('Product submitted. It will appear in the marketplace after superadmin approval.');
      await loadStoreData();
    } catch (error) {
      console.error('Error adding product:', error);
      setProductError(error instanceof Error ? error.message : 'Product could not be submitted.');
    } finally {
      setProductSaving(false);
    }
  };

  const openAddProductDialog = () => {
    setProductError('');
    setProductMessage('');
    setShowAddDialog(true);
  };

  const openEditProductDialog = (product: Product) => {
    setEditingProduct(product);
    setProductEditError('');
    setEditFormData({
      name: product.name,
      description: product.description || '',
      price: String(product.price),
      unit: product.unit || '',
      stock: String(product.stock_quantity),
      isListed: product.is_listed,
    });
    setShowEditDialog(true);
  };

  const closeEditProductDialog = () => {
    setShowEditDialog(false);
    setEditingProduct(null);
    setProductEditError('');
  };

  const handleEditProduct = async () => {
    if (!shop || !editingProduct || productEditSaving) return;
    try {
      setProductEditError('');
      const name = editFormData.name.trim();
      const price = Number(editFormData.price);
      const stock = Number(editFormData.stock);
      if (name.length < 2) throw new Error('Product name must be at least 2 characters.');
      if (!Number.isFinite(price) || price <= 0) throw new Error('Enter a valid product price.');
      if (!Number.isInteger(stock) || stock < 0) throw new Error('Enter a valid stock quantity.');
      setProductEditSaving(true);
      const { error } = await supabase.from('products').update({
        name,
        description: editFormData.description.trim() || null,
        price,
        unit: editFormData.unit.trim() || null,
        stock_quantity: stock,
        is_listed: editFormData.isListed,
      }).eq('id', editingProduct.id).eq('shop_id', shop.id);
      if (error) throw error;
      closeEditProductDialog();
      setProductMessage('Product details updated.');
      await loadStoreData();
    } catch (error) {
      setProductEditError(error instanceof Error ? error.message : 'Product could not be updated.');
    } finally {
      setProductEditSaving(false);
    }
  };

  const closeAddProductDialog = () => {
    setProductError('');
    setProductImageFile(null);
    setProductImagePreview('');
    setShowAddDialog(false);
  };

  const handleProductImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setProductError('');

    if (productImagePreview) {
      URL.revokeObjectURL(productImagePreview);
      setProductImagePreview('');
    }

    if (!file) {
      setProductImageFile(null);
      return;
    }

    if (!isProductImageFile(file)) {
      setProductImageFile(null);
      setProductError('Choose a valid image file.');
      event.target.value = '';
      return;
    }

    if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
      setProductImageFile(null);
      setProductError('Product image must be 8 MB or smaller.');
      event.target.value = '';
      return;
    }

    setProductImageFile(file);
    setProductImagePreview(URL.createObjectURL(file));
  };

  const handlePromote = (product: Product) => {
    setSelectedProduct(product);
    setSelectedTier('tier_1');
    setPromoteError('');
    setPromoteMessage('');
    setShowPromoteDialog(true);
  };

  const handleStartPromotion = async () => {
    if (!shop || !selectedProduct) return;

      setPromoteError('');
      setPromoteMessage('');
      setPromoteLoading(true);
    try {
      if (shop.status !== 'approved' || !shop.is_paywall_cleared) {
        throw new Error('Your shop must be approved and marketplace access must be active before promoting a product.');
      }

      const { data: existingAds, error: existingAdsError } = await supabase
        .from('advertisements')
        .select('id, approval_status, tier')
        .eq('shop_id', shop.id)
        .eq('product_id', selectedProduct.id)
        .in('approval_status', ['pending', 'approved'])
        .limit(1);

      if (existingAdsError) throw existingAdsError;
      const existingAd = existingAds?.[0];
      if (existingAd) {
        throw new Error('This product already has an active or pending advertisement.');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please sign in again before promoting a product.');
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone, phone_number')
        .eq('id', user.id)
        .maybeSingle();
      const phone = profile?.phone || profile?.phone_number || user.phone || '';
      if (phone.replace(/\D/g, '').length < 10) throw new Error('Add a valid phone number before promoting a product.');

      const mediaUrl = selectedProduct.image_url?.trim() || `${window.location.origin}/assets/logoc.png`;
      const { error: adError } = await supabase.rpc('submit_ad_campaign', {
        p_raw_phone: phone,
        p_product_id: selectedProduct.id,
        p_shop_id: shop.id,
        p_title: selectedProduct.name,
        p_tier: selectedTier,
        p_media_url: mediaUrl,
        p_media_type: 'image',
        p_ad_position_details: `${selectedTier} product promotion`,
        p_amount_inr: selectedTier === 'tier_1' ? 500 : selectedTier === 'tier_2' ? 300 : 150,
      });
      if (adError) throw adError;

      setShowPromoteDialog(false);
      setPromoteMessage('Advertisement submitted and payment recorded. It is waiting for superadmin approval.');
      await loadStoreData();
    } catch (error) {
      setPromoteError(error instanceof Error ? error.message : 'Unable to start advertisement payment.');
    } finally {
      setPromoteLoading(false);
    }
  };

  const handlePaywall = () => {
    // Navigate to payment flow for marketplace access
    if (!shop) return;
    router.push(`/payment?purpose=marketplace_access&shop_id=${encodeURIComponent(shop.id)}`);
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
      <div className="min-h-dvh app-page-bg page-merchant"><MerchantConsoleHeader/><div className="merchant-empty"><h2>Merchant access is ready</h2><p>Create your shop with this account to start selling.</p><button onClick={()=>router.push('/auth/merchant-onboarding')}>Create shop</button>{storeError&&<p role="alert" className="auth-error">{storeError}</p>}</div></div>
    );
  }

  const listedProductCount = products.filter((product) => product.is_listed && product.is_active).length;

  return (
    <div className="min-h-dvh app-page-bg page-merchant pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <MerchantConsoleHeader shop={shop} onUpdated={loadStoreData} onManage={()=>document.getElementById('merchant-products')?.scrollIntoView({behavior:'smooth'})}/>
      <div className="p-4 max-w-6xl mx-auto">
        {storeError && (
          <div className="mb-4 rounded-lg border border-primary-accent/35 bg-primary-accent/10 p-3 text-sm text-error">
            {storeError}
          </div>
        )}
        {/* Store Profile Header */}
        <div className="bg-surface rounded-lg shadow-sm border border-border overflow-hidden mb-4">
          <div className="h-24 bg-gradient-to-r from-primary to-primary-accent" />
          <div className="p-4 -mt-8">
            <div className="flex items-end gap-4 mb-4">
              <div className="w-16 h-16 bg-primary-light rounded-full border-4 border-surface shadow-lg flex items-center justify-center">
                {shop.logo_url ? (
                  <img src={shop.logo_url} alt={shop.name} loading="eager" decoding="async" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <Store className="w-8 h-8 text-primary-dark" />
                )}
              </div>
              <div className="flex-1 pb-2">
                <h2 className="text-xl font-bold text-text-primary">{shop.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    shop.status === 'approved' ? 'bg-green-light text-primary-dark' :
                    shop.status === 'pending' ? 'bg-primary-light text-primary-deep' :
                    'bg-primary-accent/15 text-error'
                  }`}>
                    {shop.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Referral & Credits */}
            <Card className="p-4 mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-text-secondary">Referral Code</p>
                  <p className="font-bold text-primary">{shop.referral_code || 'N/A'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-text-secondary">Credit Score</p>
                  <p className="font-bold text-primary">{shop.credit_score}</p>
                </div>
              </div>
            </Card>

            {/* Stats */}
            <div className="flex gap-4 mb-4">
              <div>
              <p className="text-2xl font-bold text-text-primary">{listedProductCount}</p>
                <p className="text-sm text-text-secondary">Live products</p>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-star fill-star" />
                <span className="font-bold">{shop.rating_avg.toFixed(1)}</span>
                <span className="text-text-secondary">({shop.rating_count})</span>
              </div>
            </div>

            {/* Paywall Warning */}
            {shop.status === 'approved' && !shop.is_paywall_cleared && (
            <div className="bg-primary-light border border-primary/25 rounded-lg p-4 mb-4">
                <p className="font-semibold text-primary-deep mb-2">Unlock Marketplace Access</p>
                <p className="text-sm text-text-secondary mb-3">Pay ₹300 to publish your products for 30 days</p>
                <Button onClick={handlePaywall} className="w-full">
                  Pay ₹300 & Continue
                </Button>
              </div>
            )}

            {/* Request Custom Design */}
            <Button variant="outline" className="w-full mb-4">
              Request custom design
            </Button>
          </div>
        </div>

        {/* Products Section */}
        <div id="merchant-products" className="scroll-mt-20" />
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-text-primary">Products</h2>
            <span className="text-sm text-text-secondary">{products.length} items</span>
          </div>
          {productMessage && (
            <p className="mb-3 rounded-lg border border-primary/35 bg-green-light p-3 text-sm text-primary-dark">{productMessage}</p>
          )}

          {shop.status !== 'approved' ? (
            <Card className="p-8 text-center">
              <Package className="w-12 h-12 text-text-secondary mx-auto mb-3" />
              <p className="text-text-secondary mb-2">Your shop is pending approval</p>
              <p className="text-sm text-text-secondary">You can add products once approved</p>
            </Card>
          ) : !shop.is_paywall_cleared ? (
            <Card className="p-8 text-center">
              <CreditCard className="w-12 h-12 text-text-secondary mx-auto mb-3" />
              <p className="text-text-secondary mb-2">Marketplace access required</p>
              <p className="text-sm text-text-secondary mb-3">Pay ₹300 to start publishing products</p>
              <Button onClick={handlePaywall}>
                Pay ₹300 & Continue
              </Button>
            </Card>
          ) : products.length === 0 ? (
            <Card className="p-8 text-center">
              <Package className="w-12 h-12 text-text-secondary mx-auto mb-3" />
              <p className="text-text-secondary mb-2">No products yet</p>
              <p className="text-sm text-text-secondary mb-3">Add your first product to start selling</p>
              <Button onClick={openAddProductDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {products.map((product) => (
                <Card key={product.id} className="overflow-hidden">
                  <div className="aspect-[0.85] bg-primary-light flex items-center justify-center">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary-light">
                        <Package className="w-8 h-8 text-primary-dark" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium text-text-primary text-sm truncate">{product.name}</h3>
                    <p className="text-primary font-bold mt-1">₹{product.price}</p>
                    <span className={`mt-2 inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${
                      product.is_listed && product.is_active
                        ? 'border-primary/35 bg-green-light text-primary-dark'
                        : 'border-primary/30 bg-primary-light text-primary-deep'
                    }`}>
                      {product.is_listed && product.is_active ? 'Live' : 'Pending approval'}
                    </span>
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => openEditProductDialog(product)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handlePromote(product)}
                      >
                        <Gift className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <ReelPublisher shop={shop} products={products} />

        {/* FAB for adding products */}
        {shop.status === 'approved' && shop.is_paywall_cleared && (
          <button
            onClick={openAddProductDialog}
            className="fixed bottom-20 right-4 flex h-14 w-14 items-center justify-center rounded-full border border-primary/60 bg-primary-light text-text-primary shadow-lg transition-all hover:bg-green-light hover:border-primary hover:shadow-xl"
          >
            <Plus className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Add Product Dialog */}
      <Dialog
        isOpen={showAddDialog}
        onClose={closeAddProductDialog}
        title="Add Product"
      >
        <div className="space-y-4">
          {productError && (
            <p className="rounded-lg border border-primary-accent/35 bg-primary-accent/10 p-3 text-sm text-error">{productError}</p>
          )}
          <Input
            type="text"
            label="Product Name"
            placeholder="Product name"
            value={formData.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Textarea
            label="Description"
            placeholder="Product description"
            value={formData.description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
          />
          <Input
            type="number"
            label="Price (₹)"
            placeholder="0.00"
            value={formData.price}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, price: e.target.value })}
            required
          />
          <Input
            type="text"
            label="Unit"
            placeholder="kg, piece, etc."
            value={formData.unit}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, unit: e.target.value })}
          />
          <Input
            type="number"
            label="Stock Quantity"
            placeholder="0"
            value={formData.stock}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, stock: e.target.value })}
            required
          />
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Product image</label>
            <label className="flex min-h-28 cursor-pointer items-center gap-3 rounded-lg border border-dashed border-primary/45 bg-primary-light/30 p-3 text-sm text-text-secondary transition-all hover:border-primary hover:bg-primary-light/50">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleProductImageChange}
                className="sr-only"
              />
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-surface text-primary-dark">
                <Upload className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-text-primary">
                  {productImageFile ? productImageFile.name : 'Choose image file'}
                </span>
                <span className="mt-1 block text-xs text-text-secondary">JPG, PNG, WEBP or GIF up to 8 MB.</span>
              </span>
            </label>
            {productImagePreview ? (
              <div className="mt-3 overflow-hidden rounded-lg border border-border bg-primary-light">
                <img src={productImagePreview} alt="Product preview" className="h-44 w-full object-cover" />
              </div>
            ) : (
              <div className="mt-3 flex h-28 items-center justify-center rounded-lg border border-border bg-primary-light/45">
                <ImageIcon className="h-8 w-8 text-primary-dark" />
              </div>
            )}
          </div>
          <label className="flex items-start gap-3 rounded-lg border border-border bg-primary-light/30 p-3 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={formData.rulesAccepted}
              onChange={(e) => setFormData({ ...formData, rulesAccepted: e.target.checked })}
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            <span>I confirm that this product information and stock details are accurate.</span>
          </label>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={closeAddProductDialog}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddProduct}
              className="flex-1"
              disabled={productSaving || !formData.name || !formData.price || !formData.stock || !productImageFile || !formData.rulesAccepted}
            >
              {productSaving ? 'Submitting...' : 'Submit for approval'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Promote Dialog */}
      <Dialog
        isOpen={showEditDialog}
        onClose={closeEditProductDialog}
        title="Edit Product"
      >
        <div className="space-y-4">
          {productEditError && <p className="rounded-lg border border-primary-accent/35 bg-primary-accent/10 p-3 text-sm text-error">{productEditError}</p>}
          <Input label="Product Name" value={editFormData.name} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setEditFormData({ ...editFormData, name: event.target.value })} required />
          <Textarea label="Description" value={editFormData.description} onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setEditFormData({ ...editFormData, description: event.target.value })} rows={3} />
          <Input type="number" label="Price (₹)" value={editFormData.price} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setEditFormData({ ...editFormData, price: event.target.value })} required />
          <Input label="Unit" value={editFormData.unit} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setEditFormData({ ...editFormData, unit: event.target.value })} />
          <Input type="number" label="Stock Quantity" value={editFormData.stock} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setEditFormData({ ...editFormData, stock: event.target.value })} required />
          <label className="flex items-start gap-3 rounded-lg border border-border bg-primary-light/30 p-3 text-sm text-text-secondary"><input type="checkbox" checked={editFormData.isListed} onChange={(event) => setEditFormData({ ...editFormData, isListed: event.target.checked })} className="mt-0.5 h-4 w-4 accent-primary" /><span>List this product in the marketplace when it is approved.</span></label>
          <div className="flex gap-3"><Button variant="outline" onClick={closeEditProductDialog} className="flex-1">Cancel</Button><Button onClick={() => void handleEditProduct()} className="flex-1" disabled={productEditSaving}>{productEditSaving ? 'Saving...' : 'Save changes'}</Button></div>
        </div>
      </Dialog>

      <Dialog
        isOpen={showPromoteDialog}
        onClose={() => setShowPromoteDialog(false)}
        title={`Promote: ${selectedProduct?.name}`}
      >
        <div className="space-y-4">
          <p className="text-text-secondary">Select ad tier for promotion:</p>

          {promoteError && (
            <p className="rounded-lg border border-primary-accent/35 bg-primary-accent/10 p-3 text-sm text-error">{promoteError}</p>
          )}
          {promoteMessage && (
            <p className="rounded-lg border border-primary/35 bg-green-light p-3 text-sm text-primary-dark">{promoteMessage}</p>
          )}
          
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-4 border border-border rounded-lg cursor-pointer hover:border-primary">
              <input type="radio" name="tier" value="tier_1" checked={selectedTier === 'tier_1'} onChange={() => setSelectedTier('tier_1')} className="h-4 w-4" />
              <div className="flex-1">
                <p className="font-semibold">Tier 1 - Top Loop</p>
                <p className="text-sm text-text-secondary">₹500 - Below search bar</p>
              </div>
            </label>
            
            <label className="flex items-center gap-3 p-4 border border-border rounded-lg cursor-pointer hover:border-primary">
              <input type="radio" name="tier" value="tier_2" checked={selectedTier === 'tier_2'} onChange={() => setSelectedTier('tier_2')} className="h-4 w-4" />
              <div className="flex-1">
                <p className="font-semibold">Tier 2 - Mid Page</p>
                <p className="text-sm text-text-secondary">₹300 - Below categories</p>
              </div>
            </label>
            
            <label className="flex items-center gap-3 p-4 border border-border rounded-lg cursor-pointer hover:border-primary">
              <input type="radio" name="tier" value="tier_3" checked={selectedTier === 'tier_3'} onChange={() => setSelectedTier('tier_3')} className="h-4 w-4" />
              <div className="flex-1">
                <p className="font-semibold">Tier 3 - Footer</p>
                <p className="text-sm text-text-secondary">₹150 - Above bottom nav</p>
              </div>
            </label>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowPromoteDialog(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleStartPromotion}
              disabled={promoteLoading}
              className="flex-1"
            >
              {promoteLoading ? 'Preparing...' : 'Continue to pay'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
