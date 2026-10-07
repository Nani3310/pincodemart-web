-- Admin dashboard function
CREATE OR REPLACE FUNCTION admin_dashboard()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'stats', json_build_object(
      'user_count', (SELECT COUNT(*) FROM profiles),
      'merchant_count', (SELECT COUNT(*) FROM profiles WHERE role = 'merchant'),
      'revenue_inr', COALESCE((SELECT SUM(amount_inr) FROM payment_transactions WHERE status = 'completed'), 0),
      'pending_shops', (SELECT COUNT(*) FROM shops WHERE status = 'pending'),
      'pending_products', (SELECT COUNT(*) FROM products WHERE is_listed = false),
      'pending_travel', (SELECT COUNT(*) FROM travel_services WHERE approval_status = 'pending'),
      'pending_rentals', (SELECT COUNT(*) FROM rental_listings WHERE approval_status = 'pending'),
      'pending_services', (SELECT COUNT(*) FROM service_providers WHERE approval_status = 'pending'),
      'pending_skins', 0
    ),
    'pending_shops', (SELECT COALESCE(json_agg(row_to_json(shops)), '[]'::json) FROM shops WHERE status = 'pending'),
    'pending_products', (SELECT COALESCE(json_agg(row_to_json(products)), '[]'::json) FROM products WHERE is_listed = false),
    'pending_ads', (SELECT COALESCE(json_agg(row_to_json(advertisements)), '[]'::json) FROM advertisements WHERE approval_status = 'pending'),
    'pending_travel', (SELECT COALESCE(json_agg(row_to_json(travel_services)), '[]'::json) FROM travel_services WHERE approval_status = 'pending'),
    'pending_rentals', (SELECT COALESCE(json_agg(row_to_json(rental_listings)), '[]'::json) FROM rental_listings WHERE approval_status = 'pending'),
    'pending_services', (SELECT COALESCE(json_agg(row_to_json(service_providers)), '[]'::json) FROM service_providers WHERE approval_status = 'pending'),
    'pending_skins', '[]'::json,
    'approval_history', '[]'::json,
    'profiles', (SELECT COALESCE(json_agg(row_to_json(profiles)), '[]'::json) FROM profiles),
    'shops', (SELECT COALESCE(json_agg(row_to_json(shops)), '[]'::json) FROM shops)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin moderate function
CREATE OR REPLACE FUNCTION admin_moderate(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_action TEXT,
  p_amount_inr DOUBLE PRECISION DEFAULT 0.0
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  CASE p_entity_type
    WHEN 'shop' THEN
      IF p_action = 'approve' THEN
        UPDATE shops SET status = 'approved' WHERE id = p_entity_id;
      ELSIF p_action = 'reject' THEN
        UPDATE shops SET status = 'rejected' WHERE id = p_entity_id;
      END IF;
    
    WHEN 'product' THEN
      IF p_action = 'approve' THEN
        UPDATE products SET is_listed = true WHERE id = p_entity_id;
      ELSIF p_action = 'reject' THEN
        UPDATE products SET is_active = false WHERE id = p_entity_id;
      END IF;
    
    WHEN 'ad' THEN
      IF p_action = 'approve' THEN
        UPDATE advertisements SET approval_status = 'approved', is_active = true WHERE id = p_entity_id;
      ELSIF p_action = 'reject' THEN
        UPDATE advertisements SET approval_status = 'rejected', is_active = false WHERE id = p_entity_id;
      END IF;
    
    WHEN 'travel' THEN
      IF p_action = 'approve' THEN
        UPDATE travel_services SET approval_status = 'approved', is_active = true WHERE id = p_entity_id;
      ELSIF p_action = 'reject' THEN
        UPDATE travel_services SET approval_status = 'rejected', is_active = false WHERE id = p_entity_id;
      END IF;
    
    WHEN 'rental' THEN
      IF p_action = 'approve' THEN
        UPDATE rental_listings SET approval_status = 'approved', is_active = true WHERE id = p_entity_id;
      ELSIF p_action = 'reject' THEN
        UPDATE rental_listings SET approval_status = 'rejected', is_active = false WHERE id = p_entity_id;
      END IF;
    
    WHEN 'service' THEN
      IF p_action = 'approve' THEN
        UPDATE service_providers SET approval_status = 'approved', is_active = true WHERE id = p_entity_id;
      ELSIF p_action = 'reject' THEN
        UPDATE service_providers SET approval_status = 'rejected', is_active = false WHERE id = p_entity_id;
      END IF;
  END CASE;
  
  SELECT json_build_object(
    'entity_type', p_entity_type,
    'entity_id', p_entity_id,
    'action', p_action
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete account function
CREATE OR REPLACE FUNCTION delete_account()
RETURNS JSON AS $$
DECLARE
  user_id UUID;
BEGIN
  user_id := auth.uid();
  
  -- This will cascade delete all related data
  DELETE FROM profiles WHERE id = user_id;
  
  RETURN json_build_object('deleted', true, 'user_id', user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Is super admin email function
CREATE OR REPLACE FUNCTION is_super_admin_email(p_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM super_admin_emails WHERE email = p_email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profile exists for phone function
CREATE OR REPLACE FUNCTION profile_exists_for_phone(p_raw_phone TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE phone = p_raw_phone OR phone_number = p_raw_phone
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Nearby shops function
CREATE OR REPLACE FUNCTION nearby_shops(
  p_user_lat DOUBLE PRECISION,
  p_user_lng DOUBLE PRECISION,
  p_radius_km DOUBLE PRECISION
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  city TEXT,
  rating_avg NUMERIC,
  distance_km DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.city,
    s.rating_avg,
    (
      6371 * acos(
        cos(radians(p_user_lat)) * cos(radians(s.latitude)) *
        cos(radians(s.longitude) - radians(p_user_lng)) +
        sin(radians(p_user_lat)) * sin(radians(s.latitude))
      )
    ) AS distance_km
  FROM shops s
  WHERE s.status = 'approved'
    AND s.latitude IS NOT NULL
    AND s.longitude IS NOT NULL
    AND (
      6371 * acos(
        cos(radians(p_user_lat)) * cos(radians(s.latitude)) *
        cos(radians(s.longitude) - radians(p_user_lng)) +
        sin(radians(p_user_lat)) * sin(radians(s.latitude))
      )
    ) <= p_radius_km
  ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
