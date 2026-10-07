export type UserRole = 'customer' | 'merchant' | 'admin';
export type ShopStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type AdMediaType = 'image' | 'video';

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  role: UserRole;
  avatar_url: string | null;
  address_line: string | null;
  city: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  onboarding_completed: boolean;
  terms_accepted: boolean;
  is_phone_verified: boolean;
  role_selected: boolean;
  phone_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface ShopTheme {
  id: string;
  code: string;
  name: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  is_premium: boolean;
  created_at: string;
}

export interface Shop {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  shop_photo_url: string | null;
  category_id: string | null;
  theme_id: string | null;
  status: ShopStatus;
  address_line: string | null;
  city: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  rating_avg: number;
  rating_count: number;
  delivery_time_mins: number | null;
  is_open: boolean;
  is_paywall_cleared: boolean;
  paywall_valid_until: string | null;
  map_link: string | null;
  opening_hours: string | null;
  social_links: Record<string, string> | null;
  credit_score: number;
  referral_code: string | null;
  local_shop_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  shop_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  unit: string | null;
  stock_quantity: number;
  image_url: string | null;
  emoji: string | null;
  rating_avg: number;
  rating_count: number;
  is_active: boolean;
  is_listed: boolean;
  media_urls: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Advertisement {
  id: string;
  shop_id: string | null;
  title: string;
  media_url: string;
  media_type: AdMediaType;
  target_url: string | null;
  sort_order: number;
  tier: string | null;
  product_id: string | null;
  approval_status: string | null;
  payment_status?: string | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  ad_position_details: string | null;
  created_at: string;
}

export interface TravelService {
  id: string;
  provider_id: string;
  service_type: string;
  departure_location: string;
  destination_location: string;
  scheduled_date: string;
  scheduled_time: string;
  price_inr: number | null;
  contact_phone: string | null;
  approval_status: string;
  payment_status: string;
  is_active: boolean;
  ride_duration_mins: number | null;
  distance_km: number | null;
  vehicle_type: string | null;
  capacity: number | null;
  vacancy: number | null;
  photo_urls: string[] | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export interface RentalListing {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  city: string | null;
  address_line: string | null;
  map_link: string | null;
  rent_inr: number;
  bedrooms: number | null;
  capacity: number | null;
  vacancy: number | null;
  contact_phone: string | null;
  approval_status: string;
  payment_status: string;
  is_active: boolean;
  media_urls: string[] | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export interface ServiceProvider {
  id: string;
  owner_id: string;
  trade_name: string;
  trade_slug: string;
  description: string | null;
  hourly_rate_inr: number | null;
  experience_years: number | null;
  city: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  contact_phone: string | null;
  portfolio_urls: string[] | null;
  is_active: boolean;
  approval_status: string;
  created_at: string;
}

export interface PaymentTransaction {
  id: string;
  user_id: string;
  phone_digits: string;
  purpose: string;
  amount_inr: number;
  amount_paise: number;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  status: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ShopReview {
  id: string;
  shop_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface UserNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
}
