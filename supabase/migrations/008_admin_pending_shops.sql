CREATE OR REPLACE FUNCTION admin_pending_shops()
RETURNS JSON AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  RETURN (
    SELECT COALESCE(json_agg(row_to_json(shop) ORDER BY shop.created_at ASC), '[]'::json)
    FROM shops shop
    WHERE shop.status = 'pending'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION admin_pending_shops() TO authenticated;
