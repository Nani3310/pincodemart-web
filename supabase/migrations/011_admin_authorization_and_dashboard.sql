-- Treat profiles with the admin role as superadmins. Keep the email allowlist
-- as a compatible fallback for existing deployments.
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
  current_email TEXT;
BEGIN
  SELECT email INTO current_email FROM profiles WHERE id = auth.uid();

  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) OR is_super_admin_email(current_email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION admin_dashboard()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  SELECT json_build_object(
    'stats', json_build_object(
      'user_count', (SELECT COUNT(*) FROM profiles),
      'merchant_count', (SELECT COUNT(*) FROM profiles WHERE role = 'merchant'),
      'revenue_inr', COALESCE((SELECT SUM(amount_inr) FROM payment_transactions WHERE status = 'completed'), 0),
      'pending_shops', (SELECT COUNT(*) FROM shops WHERE status = 'pending'),
      'pending_products', (SELECT COUNT(*) FROM products WHERE is_listed = false),
      'pending_ads', (SELECT COUNT(*) FROM advertisements WHERE approval_status = 'pending'),
      'pending_travel', (SELECT COUNT(*) FROM travel_services WHERE approval_status = 'pending'),
      'pending_rentals', (SELECT COUNT(*) FROM rental_listings WHERE approval_status = 'pending'),
      'pending_services', (SELECT COUNT(*) FROM service_providers WHERE approval_status = 'pending')
    ),
    'pending_shops', (SELECT COALESCE(json_agg(row_to_json(shop) ORDER BY shop.created_at ASC), '[]'::json) FROM shops shop WHERE shop.status = 'pending'),
    'pending_products', (SELECT COALESCE(json_agg(row_to_json(product)), '[]'::json) FROM products product WHERE product.is_listed = false),
    'pending_ads', (SELECT COALESCE(json_agg(row_to_json(ad)), '[]'::json) FROM advertisements ad WHERE ad.approval_status = 'pending'),
    'pending_travel', (SELECT COALESCE(json_agg(row_to_json(travel)), '[]'::json) FROM travel_services travel WHERE travel.approval_status = 'pending'),
    'pending_rentals', (SELECT COALESCE(json_agg(row_to_json(rental)), '[]'::json) FROM rental_listings rental WHERE rental.approval_status = 'pending'),
    'pending_services', (SELECT COALESCE(json_agg(row_to_json(service)), '[]'::json) FROM service_providers service WHERE service.approval_status = 'pending')
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION admin_update_shop_status(
  p_shop_id UUID,
  p_status TEXT
)
RETURNS JSON AS $$
DECLARE
  updated_shop shops;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'invalid shop status';
  END IF;

  UPDATE shops
  SET status = p_status::shop_status,
      is_paywall_cleared = CASE WHEN p_status = 'approved' THEN true ELSE is_paywall_cleared END,
      paywall_valid_until = CASE WHEN p_status = 'approved' THEN NOW() + INTERVAL '30 days' ELSE paywall_valid_until END,
      updated_at = NOW()
  WHERE id = p_shop_id
  RETURNING * INTO updated_shop;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'shop not found';
  END IF;

  IF p_status = 'approved' THEN
    UPDATE payment_transactions
    SET status = 'completed', razorpay_payment_id = COALESCE(razorpay_payment_id, 'admin-approved')
    WHERE purpose = 'marketplace_access'
      AND status = 'pending_admin'
      AND metadata ->> 'shop_id' = p_shop_id::TEXT;
  END IF;

  RETURN json_build_object(
    'id', updated_shop.id,
    'owner_id', updated_shop.owner_id,
    'status', updated_shop.status,
    'is_paywall_cleared', updated_shop.is_paywall_cleared,
    'paywall_valid_until', updated_shop.paywall_valid_until,
    'updated_at', updated_shop.updated_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_dashboard() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_shop_status(UUID, TEXT) TO authenticated;
