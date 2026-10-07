-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
CREATE TYPE user_role AS ENUM ('customer', 'merchant', 'admin');
CREATE TYPE shop_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
CREATE TYPE ad_media_type AS ENUM ('image', 'video');

-- Create profiles table
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    phone TEXT,
    email TEXT,
    role user_role NOT NULL DEFAULT 'customer',
    avatar_url TEXT,
    address_line TEXT,
    city TEXT,
    pincode TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    is_phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    role_selected BOOLEAN NOT NULL DEFAULT FALSE,
    phone_number TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create categories table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    icon TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create shop_themes table
CREATE TABLE shop_themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    primary_color TEXT NOT NULL,
    secondary_color TEXT NOT NULL,
    accent_color TEXT NOT NULL,
    background_color TEXT NOT NULL,
    is_premium BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create shops table
CREATE TABLE shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    logo_url TEXT,
    banner_url TEXT,
    shop_photo_url TEXT,
    category_id UUID REFERENCES categories(id),
    theme_id UUID REFERENCES shop_themes(id),
    status shop_status NOT NULL DEFAULT 'pending',
    address_line TEXT,
    city TEXT,
    pincode TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    rating_avg NUMERIC(2,1) NOT NULL DEFAULT 0,
    rating_count INT NOT NULL DEFAULT 0,
    delivery_time_mins INT DEFAULT 30,
    is_open BOOLEAN NOT NULL DEFAULT TRUE,
    is_paywall_cleared BOOLEAN NOT NULL DEFAULT FALSE,
    paywall_valid_until TIMESTAMPTZ,
    map_link TEXT,
    opening_hours TEXT,
    social_links JSONB,
    credit_score INT DEFAULT 0,
    referral_code TEXT,
    local_shop_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    original_price NUMERIC(10,2),
    unit TEXT,
    stock_quantity INT NOT NULL DEFAULT 0,
    image_url TEXT,
    emoji TEXT,
    rating_avg NUMERIC(2,1) NOT NULL DEFAULT 0,
    rating_count INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_listed BOOLEAN NOT NULL DEFAULT FALSE,
    media_urls TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create advertisements table
CREATE TABLE advertisements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    media_url TEXT NOT NULL,
    media_type ad_media_type NOT NULL DEFAULT 'image',
    target_url TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    tier TEXT,
    product_id UUID,
    approval_status TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    ad_position_details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create travel_services table
CREATE TABLE travel_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL,
    departure_location TEXT NOT NULL,
    destination_location TEXT NOT NULL,
    scheduled_date TEXT NOT NULL,
    scheduled_time TEXT NOT NULL,
    price_inr DOUBLE PRECISION,
    contact_phone TEXT,
    approval_status TEXT NOT NULL DEFAULT 'pending',
    payment_status TEXT NOT NULL DEFAULT 'pending',
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    ride_duration_mins INT,
    distance_km DOUBLE PRECISION,
    vehicle_type TEXT,
    capacity INT,
    vacancy INT,
    photo_urls TEXT[],
    pincode TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create rental_listings table
CREATE TABLE rental_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    city TEXT,
    address_line TEXT,
    map_link TEXT,
    rent_inr DOUBLE PRECISION NOT NULL,
    bedrooms INT,
    capacity INT,
    vacancy INT,
    contact_phone TEXT,
    approval_status TEXT NOT NULL DEFAULT 'pending',
    payment_status TEXT NOT NULL DEFAULT 'pending',
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    media_urls TEXT[],
    pincode TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create service_providers table
CREATE TABLE service_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    trade_name TEXT NOT NULL,
    trade_slug TEXT NOT NULL DEFAULT 'general',
    description TEXT,
    hourly_rate_inr DOUBLE PRECISION,
    experience_years INT,
    city TEXT,
    pincode TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    contact_phone TEXT,
    portfolio_urls TEXT[],
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    approval_status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create payment_transactions table
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    phone_digits TEXT NOT NULL,
    purpose TEXT NOT NULL,
    amount_inr DOUBLE PRECISION NOT NULL,
    amount_paise INT NOT NULL,
    razorpay_order_id TEXT NOT NULL,
    razorpay_payment_id TEXT,
    status TEXT NOT NULL DEFAULT 'created',
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create shop_reviews table
CREATE TABLE shop_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (shop_id, user_id)
);

-- Create user_notifications table
CREATE TABLE user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create super_admin_emails table
CREATE TABLE super_admin_emails (
    email TEXT PRIMARY KEY
);

-- Create indexes for performance
CREATE INDEX idx_shops_owner ON shops(owner_id);
CREATE INDEX idx_shops_location ON shops(latitude, longitude);
CREATE INDEX idx_shops_category ON shops(category_id);
CREATE INDEX idx_shops_status ON shops(status);
CREATE INDEX idx_products_shop ON products(shop_id);
CREATE INDEX idx_products_active ON products(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_products_listed ON products(is_listed) WHERE is_listed = TRUE;
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_travel_service_type ON travel_services(service_type);
CREATE INDEX idx_rental_city ON rental_listings(city);
CREATE INDEX idx_service_trade ON service_providers(trade_slug);
CREATE INDEX idx_notifications_user ON user_notifications(user_id);
CREATE INDEX idx_notifications_read ON user_notifications(is_read);
