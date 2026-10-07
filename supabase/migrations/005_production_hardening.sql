-- Production hardening for web RPCs and policies.
-- Keeps the localbazaar-web schema in line with the app's later security fixes.

CREATE OR REPLACE FUNCTION is_super_admin_email(p_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_email IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM super_admin_emails
    WHERE lower(email) = lower(p_email)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
  current_email TEXT;
BEGIN
  SELECT email INTO current_email
  FROM profiles
  WHERE id = auth.uid();

  RETURN is_super_admin_email(current_email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP POLICY IF EXISTS "Only super admins can manage emails" ON super_admin_emails;
DROP POLICY IF EXISTS "super_admin_emails_admin_select" ON super_admin_emails;
DROP POLICY IF EXISTS "super_admin_emails_admin_insert" ON super_admin_emails;
DROP POLICY IF EXISTS "super_admin_emails_admin_delete" ON super_admin_emails;

CREATE POLICY "super_admin_emails_admin_select" ON super_admin_emails
  FOR SELECT USING (is_super_admin());

CREATE POLICY "super_admin_emails_admin_insert" ON super_admin_emails
  FOR INSERT WITH CHECK (is_super_admin());

CREATE POLICY "super_admin_emails_admin_delete" ON super_admin_emails
  FOR DELETE USING (is_super_admin());

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  IF p_action NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'invalid action';
  END IF;

  CASE p_entity_type
    WHEN 'shop' THEN
      UPDATE shops SET status = CASE WHEN p_action = 'approve' THEN 'approved'::shop_status ELSE 'rejected'::shop_status END WHERE id = p_entity_id;
    WHEN 'product' THEN
      UPDATE products SET is_listed = (p_action = 'approve'), is_active = (p_action = 'approve') WHERE id = p_entity_id;
    WHEN 'ad' THEN
      UPDATE advertisements SET approval_status = CASE WHEN p_action = 'approve' THEN 'approved' ELSE 'rejected' END, is_active = (p_action = 'approve') WHERE id = p_entity_id;
    WHEN 'travel' THEN
      UPDATE travel_services SET approval_status = CASE WHEN p_action = 'approve' THEN 'approved' ELSE 'rejected' END, is_active = (p_action = 'approve') WHERE id = p_entity_id;
    WHEN 'rental' THEN
      UPDATE rental_listings SET approval_status = CASE WHEN p_action = 'approve' THEN 'approved' ELSE 'rejected' END, is_active = (p_action = 'approve') WHERE id = p_entity_id;
    WHEN 'service' THEN
      UPDATE service_providers SET approval_status = CASE WHEN p_action = 'approve' THEN 'approved' ELSE 'rejected' END, is_active = (p_action = 'approve') WHERE id = p_entity_id;
    ELSE
      RAISE EXCEPTION 'invalid entity type';
  END CASE;

  SELECT json_build_object('entity_type', p_entity_type, 'entity_id', p_entity_id, 'action', p_action) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION delete_own_account()
RETURNS JSON AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF is_super_admin() THEN
    RAISE EXCEPTION 'super admin accounts cannot be self-deleted';
  END IF;

  DELETE FROM service_providers WHERE owner_id = v_user_id;
  DELETE FROM rental_listings WHERE owner_id = v_user_id;
  DELETE FROM travel_services WHERE provider_id = v_user_id;
  DELETE FROM shop_reviews WHERE user_id = v_user_id;
  DELETE FROM user_notifications WHERE user_id = v_user_id;
  DELETE FROM payment_transactions WHERE user_id = v_user_id;
  DELETE FROM shops WHERE owner_id = v_user_id;
  DELETE FROM profiles WHERE id = v_user_id;
  DELETE FROM auth.users WHERE id = v_user_id;

  RETURN json_build_object('deleted', true, 'user_id', v_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

CREATE OR REPLACE FUNCTION delete_account()
RETURNS JSON AS $$
BEGIN
  RETURN delete_own_account();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION is_super_admin_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_dashboard() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_moderate(TEXT, UUID, TEXT, DOUBLE PRECISION) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_own_account() TO authenticated;
GRANT EXECUTE ON FUNCTION delete_account() TO authenticated;
