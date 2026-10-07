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
      updated_at = NOW()
  WHERE id = p_shop_id
  RETURNING * INTO updated_shop;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'shop not found';
  END IF;

  RETURN json_build_object(
    'id', updated_shop.id,
    'owner_id', updated_shop.owner_id,
    'status', updated_shop.status,
    'updated_at', updated_shop.updated_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION admin_update_shop_status(UUID, TEXT) TO authenticated;
