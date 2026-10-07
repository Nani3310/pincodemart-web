-- One moderation path for products, ads, rides/tickets, rentals, and services.
CREATE OR REPLACE FUNCTION admin_moderate(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_action TEXT,
  p_amount_inr DOUBLE PRECISION DEFAULT 0.0
)
RETURNS JSON AS $$
DECLARE
  changed_count INTEGER := 0;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  IF p_action NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'invalid action';
  END IF;

  IF p_entity_type = 'product' THEN
    UPDATE products
    SET is_listed = (p_action = 'approve'), is_active = (p_action = 'approve'), updated_at = NOW()
    WHERE id = p_entity_id;
    GET DIAGNOSTICS changed_count = ROW_COUNT;
  ELSIF p_entity_type = 'ad' THEN
    UPDATE advertisements
    SET approval_status = CASE WHEN p_action = 'approve' THEN 'approved' ELSE 'rejected' END,
        is_active = (p_action = 'approve')
    WHERE id = p_entity_id;
    GET DIAGNOSTICS changed_count = ROW_COUNT;
  ELSIF p_entity_type = 'travel' THEN
    UPDATE travel_services
    SET approval_status = CASE WHEN p_action = 'approve' THEN 'approved' ELSE 'rejected' END,
        is_active = (p_action = 'approve')
    WHERE id = p_entity_id;
    GET DIAGNOSTICS changed_count = ROW_COUNT;
  ELSIF p_entity_type = 'rental' THEN
    UPDATE rental_listings
    SET approval_status = CASE WHEN p_action = 'approve' THEN 'approved' ELSE 'rejected' END,
        is_active = (p_action = 'approve')
    WHERE id = p_entity_id;
    GET DIAGNOSTICS changed_count = ROW_COUNT;
  ELSIF p_entity_type = 'service' THEN
    UPDATE service_providers
    SET approval_status = CASE WHEN p_action = 'approve' THEN 'approved' ELSE 'rejected' END,
        is_active = (p_action = 'approve')
    WHERE id = p_entity_id;
    GET DIAGNOSTICS changed_count = ROW_COUNT;
  ELSE
    RAISE EXCEPTION 'invalid entity type';
  END IF;

  IF changed_count = 0 THEN
    RAISE EXCEPTION 'listing not found';
  END IF;

  RETURN json_build_object(
    'entity_type', p_entity_type,
    'entity_id', p_entity_id,
    'action', p_action,
    'updated', true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION admin_moderate(TEXT, UUID, TEXT, DOUBLE PRECISION) TO authenticated;
