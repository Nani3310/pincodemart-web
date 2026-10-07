ALTER TABLE advertisements
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'completed';

CREATE OR REPLACE FUNCTION create_merchant_shop(
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_pincode TEXT DEFAULT NULL,
  p_map_link TEXT DEFAULT NULL,
  p_category_slug TEXT DEFAULT NULL,
  p_local_shop_type TEXT DEFAULT NULL,
  p_latitude DOUBLE PRECISION DEFAULT NULL,
  p_longitude DOUBLE PRECISION DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  current_user_id UUID := auth.uid();
  existing_shop shops;
  new_shop shops;
  category_uuid UUID;
  theme_uuid UUID;
  base_slug TEXT;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NULLIF(trim(p_name), '') IS NULL OR char_length(trim(p_name)) < 2 THEN
    RAISE EXCEPTION 'shop name must be at least 2 characters';
  END IF;

  IF p_pincode IS NOT NULL AND p_pincode !~ '^[0-9]{6}$' THEN
    RAISE EXCEPTION 'pincode must be 6 digits';
  END IF;

  SELECT * INTO existing_shop
  FROM shops
  WHERE owner_id = current_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF existing_shop.id IS NOT NULL THEN
    RETURN json_build_object('created', false, 'shop', row_to_json(existing_shop));
  END IF;

  SELECT id INTO category_uuid
  FROM categories
  WHERE slug = NULLIF(trim(p_category_slug), '')
    AND is_active = true
  LIMIT 1;

  SELECT id INTO theme_uuid
  FROM shop_themes
  WHERE code = 'default'
  LIMIT 1;

  base_slug := regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  IF base_slug = '' THEN
    base_slug := 'shop';
  END IF;
  base_slug := left(base_slug, 80) || '-' || left(replace(current_user_id::text, '-', ''), 8);

  INSERT INTO shops (
    owner_id, name, slug, description, city, pincode, map_link,
    category_id, local_shop_type, theme_id, latitude, longitude,
    status, is_paywall_cleared, rating_avg, rating_count, is_open, credit_score
  ) VALUES (
    current_user_id, trim(p_name), base_slug, NULLIF(trim(p_description), ''),
    NULLIF(trim(p_city), ''), NULLIF(trim(p_pincode), ''), NULLIF(trim(p_map_link), ''),
    category_uuid, NULLIF(trim(p_local_shop_type), ''), theme_uuid, p_latitude, p_longitude,
    'pending', false, 0, 0, true, 0
  )
  RETURNING * INTO new_shop;

  RETURN json_build_object('created', true, 'shop', row_to_json(new_shop));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION create_merchant_shop(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;

CREATE OR REPLACE FUNCTION prevent_unpaid_ad_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.approval_status = 'approved' AND NEW.payment_status = 'pending' THEN
    RAISE EXCEPTION 'advertisement payment must be completed before approval';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS advertisements_require_payment ON advertisements;
CREATE TRIGGER advertisements_require_payment
  BEFORE INSERT OR UPDATE ON advertisements
  FOR EACH ROW EXECUTE FUNCTION prevent_unpaid_ad_approval();
