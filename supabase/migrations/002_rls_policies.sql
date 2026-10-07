-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_admin_emails ENABLE ROW LEVEL SECURITY;

-- Profiles RLS
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Shops RLS
CREATE POLICY "Public can view approved shops" ON shops
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Shop owners can view own shops" ON shops
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Shop owners can insert shops" ON shops
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Shop owners can update own shops" ON shops
  FOR UPDATE USING (auth.uid() = owner_id);

-- Products RLS
CREATE POLICY "Public can view active listed products from approved shops" ON products
  FOR SELECT USING (
    is_active = true AND 
    is_listed = true AND 
    shop_id IN (SELECT id FROM shops WHERE status = 'approved')
  );

CREATE POLICY "Shop owners can view own products" ON products
  FOR SELECT USING (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));

CREATE POLICY "Shop owners can insert products" ON products
  FOR INSERT WITH CHECK (
    shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
  );

CREATE POLICY "Shop owners can update own products" ON products
  FOR UPDATE USING (
    shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
  );

-- Categories RLS (Public read)
CREATE POLICY "Public can view active categories" ON categories
  FOR SELECT USING (is_active = true);

-- Shop Themes RLS (Public read)
CREATE POLICY "Public can view shop themes" ON shop_themes
  FOR SELECT USING (true);

-- Advertisements RLS
CREATE POLICY "Public can view active approved ads" ON advertisements
  FOR SELECT USING (is_active = true AND approval_status = 'approved');

CREATE POLICY "Shop owners can view own ads" ON advertisements
  FOR SELECT USING (shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid()));

CREATE POLICY "Shop owners can insert ads" ON advertisements
  FOR INSERT WITH CHECK (
    shop_id IN (SELECT id FROM shops WHERE owner_id = auth.uid())
  );

-- Travel Services RLS
CREATE POLICY "Public can view active approved travel services" ON travel_services
  FOR SELECT USING (is_active = true AND approval_status = 'approved');

CREATE POLICY "Providers can view own travel services" ON travel_services
  FOR SELECT USING (provider_id = auth.uid());

CREATE POLICY "Providers can insert travel services" ON travel_services
  FOR INSERT WITH CHECK (provider_id = auth.uid());

-- Rental Listings RLS
CREATE POLICY "Public can view active approved rentals" ON rental_listings
  FOR SELECT USING (is_active = true AND approval_status = 'approved');

CREATE POLICY "Owners can view own rentals" ON rental_listings
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Owners can insert rentals" ON rental_listings
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Service Providers RLS
CREATE POLICY "Public can view active approved service providers" ON service_providers
  FOR SELECT USING (is_active = true AND approval_status = 'approved');

CREATE POLICY "Providers can view own profile" ON service_providers
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Providers can insert profile" ON service_providers
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Payment Transactions RLS
CREATE POLICY "Users can view own transactions" ON payment_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON payment_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Shop Reviews RLS
CREATE POLICY "Public can view reviews" ON shop_reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own review" ON shop_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own review" ON shop_reviews
  FOR UPDATE USING (auth.uid() = user_id);

-- User Notifications RLS
CREATE POLICY "Users can view own notifications" ON user_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON user_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Super Admin Emails RLS (Admin only)
CREATE POLICY "Only super admins can manage emails" ON super_admin_emails
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM super_admin_emails 
      WHERE email = (SELECT email FROM profiles WHERE id = auth.uid())
    )
  );
